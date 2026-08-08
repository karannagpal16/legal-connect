/**
 * Identity Credentials Vault — encrypted storage for Aadhaar, Bar enrollment, college IDs.
 * Full values are AES-256-GCM ciphertext; profiles/APIs only expose masked last4 + status.
 */
const crypto = require("crypto");
const { encryptText, decryptText } = require("./security");

const CREDENTIAL_KINDS = new Set(["aadhaar", "bar_enrollment", "college_id"]);

const KIND_LABELS = {
  aadhaar: "Aadhaar number",
  bar_enrollment: "Bar enrollment / Bar ID",
  college_id: "College ID",
};

function normalizeCredentialValue(kind, raw) {
  if (kind === "aadhaar") return String(raw || "").replace(/\D/g, "");
  return String(raw || "").trim().toUpperCase();
}

function validateCredential(kind, value) {
  if (!CREDENTIAL_KINDS.has(kind)) return "Unsupported credential type.";
  if (kind === "aadhaar") {
    if (!/^\d{12}$/.test(value)) return "Enter a valid 12-digit Aadhaar number.";
    return "";
  }
  if (!value || value.length < 4) return `${KIND_LABELS[kind]} is required.`;
  if (value.length > 64) return `${KIND_LABELS[kind]} is too long.`;
  return "";
}

function maskCredential(kind, last4) {
  if (kind === "aadhaar") return `XXXX XXXX ${last4 || "XXXX"}`;
  return `•••• ${last4 || "----"}`;
}

function credentialHash(value, secret) {
  return crypto.createHmac("sha256", secret).update(`identity:${String(value)}`).digest("hex");
}

function createIdentityVault({ db, config, writeAuditLog }) {
  let schemaReady = false;

  async function ensureSchema() {
    if (!db.dbAvailable) return false;
    if (schemaReady) return true;
    await db.query(`
      CREATE TABLE IF NOT EXISTS identity_credentials_vault (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_kind text NOT NULL,
        ciphertext text NOT NULL,
        key_version text NOT NULL DEFAULT 'v1',
        reference_hash text NOT NULL,
        reference_last4 text,
        status text NOT NULL DEFAULT 'sealed',
        label text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        deposited_at timestamptz DEFAULT now(),
        rotated_at timestamptz,
        last_revealed_at timestamptz,
        last_revealed_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (user_id, credential_kind)
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS identity_vault_user_idx ON identity_credentials_vault (user_id, credential_kind)`);
    await db.query(`CREATE INDEX IF NOT EXISTS identity_vault_status_idx ON identity_credentials_vault (status, updated_at DESC)`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS identity_vault_access_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id uuid REFERENCES identity_credentials_vault(id) ON DELETE SET NULL,
        user_id uuid,
        actor_id uuid,
        action text NOT NULL,
        detail jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS identity_vault_access_idx ON identity_vault_access_log (vault_id, created_at DESC)`);
    schemaReady = true;
    return true;
  }

  async function logAccess({ vaultId, userId, actorId, action, detail = {}, executor = db }) {
    if (!db.dbAvailable) return;
    const query = executor.query ? executor.query.bind(executor) : db.query.bind(db);
    await query(
      `INSERT INTO identity_vault_access_log (vault_id, user_id, actor_id, action, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [vaultId || null, userId || null, actorId || null, action, JSON.stringify(detail)],
    ).catch(() => undefined);
  }

  async function depositCredential({
    userId,
    kind,
    value,
    label,
    metadata = {},
    actor = null,
    executor = db,
    skipSideEffects = false,
  }) {
    await ensureSchema();
    const normalizedKind = String(kind || "").toLowerCase();
    const normalizedValue = normalizeCredentialValue(normalizedKind, value);
    const error = validateCredential(normalizedKind, normalizedValue);
    if (error) return { ok: false, error };
    if (!userId) return { ok: false, error: "User is required." };

    const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "legal-connect-local-vault";
    const hash = credentialHash(normalizedValue, secret);
    const last4 = normalizedValue.slice(-4);
    const ciphertext = encryptText(normalizedValue);
    if (!ciphertext) return { ok: false, error: "Vault encryption is not configured." };

    const query = executor.query.bind(executor);
    const result = await query(
      `INSERT INTO identity_credentials_vault
         (user_id, credential_kind, ciphertext, key_version, reference_hash, reference_last4, status, label, metadata, deposited_at, rotated_at)
       VALUES ($1, $2, $3, 'v1', $4, $5, 'sealed', $6, $7::jsonb, now(), now())
       ON CONFLICT (user_id, credential_kind) DO UPDATE SET
         ciphertext = EXCLUDED.ciphertext,
         reference_hash = EXCLUDED.reference_hash,
         reference_last4 = EXCLUDED.reference_last4,
         status = 'sealed',
         label = COALESCE(EXCLUDED.label, identity_credentials_vault.label),
         metadata = identity_credentials_vault.metadata || EXCLUDED.metadata,
         rotated_at = now(),
         updated_at = now()
       RETURNING id, user_id, credential_kind, reference_last4, status, label, deposited_at, rotated_at, updated_at`,
      [
        userId,
        normalizedKind,
        ciphertext,
        hash,
        last4,
        label || KIND_LABELS[normalizedKind],
        JSON.stringify(metadata || {}),
      ],
    );
    const row = result.rows[0];
    await logAccess({
      vaultId: row.id,
      userId,
      actorId: actor?.id || userId,
      action: "deposit",
      detail: { kind: normalizedKind, last4 },
      executor,
    });
    if (!skipSideEffects && writeAuditLog) {
      await writeAuditLog(actor || { id: userId }, "identity_vault_deposit", "identity_vault", row.id, "Credential sealed in Identity Vault.", {
        kind: normalizedKind,
        last4,
      }).catch(() => undefined);
    }
    return {
      ok: true,
      entry: publicVaultEntry(row),
      hash,
      last4,
      kind: normalizedKind,
      value: normalizedValue,
    };
  }

  function publicVaultEntry(row) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.credential_kind,
      label: row.label || KIND_LABELS[row.credential_kind] || row.credential_kind,
      masked: maskCredential(row.credential_kind, row.reference_last4),
      last4: row.reference_last4,
      status: row.status || "sealed",
      depositedAt: row.deposited_at,
      rotatedAt: row.rotated_at,
      updatedAt: row.updated_at,
    };
  }

  async function listForUser(userId) {
    await ensureSchema();
    if (!db.dbAvailable || !userId) return [];
    const result = await db.query(
      `SELECT id, user_id, credential_kind, reference_last4, status, label, deposited_at, rotated_at, updated_at
       FROM identity_credentials_vault
       WHERE user_id = $1
       ORDER BY deposited_at DESC`,
      [userId],
    );
    return result.rows.map(publicVaultEntry);
  }

  async function listAllMasked({ limit = 100 } = {}) {
    await ensureSchema();
    if (!db.dbAvailable) return [];
    const result = await db.query(
      `SELECT v.id, v.user_id, v.credential_kind, v.reference_last4, v.status, v.label,
              v.deposited_at, v.rotated_at, v.updated_at, u.name, u.email, u.role,
              iv.status AS verification_status
       FROM identity_credentials_vault v
       JOIN users u ON u.id = v.user_id
       LEFT JOIN identity_verifications iv
         ON iv.user_id = v.user_id AND iv.credential_kind = v.credential_kind
       ORDER BY v.updated_at DESC
       LIMIT $1`,
      [Math.min(Number(limit) || 100, 300)],
    );
    return result.rows.map((row) => ({
      ...publicVaultEntry(row),
      name: row.name,
      role: row.role,
      verificationStatus: row.verification_status || "pending",
    }));
  }

  async function revealForAdmin({ vaultId, actor }) {
    await ensureSchema();
    if (!db.dbAvailable) return { ok: false, error: "Vault unavailable." };
    if (!actor?.id) return { ok: false, error: "Admin authentication required." };
    const result = await db.query(
      `SELECT v.*, u.name, u.email, u.role
       FROM identity_credentials_vault v
       JOIN users u ON u.id = v.user_id
       WHERE v.id = $1
       LIMIT 1`,
      [vaultId],
    );
    const row = result.rows[0];
    if (!row) return { ok: false, error: "Vault entry not found." };
    let plaintext;
    try {
      plaintext = decryptText(row.ciphertext);
    } catch {
      return { ok: false, error: "Vault entry could not be decrypted." };
    }
    if (!plaintext) return { ok: false, error: "Vault entry is empty." };
    await db.query(
      `UPDATE identity_credentials_vault
       SET last_revealed_at = now(), last_revealed_by = $2, updated_at = now()
       WHERE id = $1`,
      [vaultId, actor.id],
    );
    await logAccess({
      vaultId,
      userId: row.user_id,
      actorId: actor.id,
      action: "admin_reveal",
      detail: { kind: row.credential_kind },
    });
    if (writeAuditLog) {
      await writeAuditLog(actor, "identity_vault_reveal", "identity_vault", vaultId, "Admin revealed a sealed credential.", {
        userId: row.user_id,
        kind: row.credential_kind,
      }).catch(() => undefined);
    }
    return {
      ok: true,
      reveal: {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        role: row.role,
        kind: row.credential_kind,
        label: row.label || KIND_LABELS[row.credential_kind],
        value: plaintext,
        masked: maskCredential(row.credential_kind, row.reference_last4),
        revealedAt: new Date().toISOString(),
      },
    };
  }

  /** One-time: move leftover plaintext profile IDs into the encrypted vault. */
  async function migratePlaintextProfiles() {
    await ensureSchema();
    if (!db.dbAvailable) return { advocates: 0, interns: 0, clients: 0 };
    let advocates = 0;
    let interns = 0;
    let clients = 0;

    const adv = await db.query(
      `SELECT user_id, enrollment_no, bar_council_id
       FROM profile_advocates
       WHERE COALESCE(enrollment_no, bar_council_id, '') <> ''
         AND length(COALESCE(enrollment_no, bar_council_id, '')) > 4`,
    ).catch(() => ({ rows: [] }));
    for (const row of adv.rows) {
      const value = row.enrollment_no || row.bar_council_id;
      const deposited = await depositCredential({
        userId: row.user_id,
        kind: "bar_enrollment",
        value,
        metadata: { migratedFrom: "profile_advocates" },
        skipSideEffects: true,
      });
      if (deposited.ok) {
        await db.query(
          `UPDATE profile_advocates
           SET enrollment_no = $2, bar_council_id = $2, updated_at = now()
           WHERE user_id = $1`,
          [row.user_id, deposited.last4],
        );
        advocates += 1;
      }
    }

    const intn = await db.query(
      `SELECT user_id, college_id_no
       FROM profile_interns
       WHERE COALESCE(college_id_no, '') <> ''
         AND length(college_id_no) > 4`,
    ).catch(() => ({ rows: [] }));
    for (const row of intn.rows) {
      const deposited = await depositCredential({
        userId: row.user_id,
        kind: "college_id",
        value: row.college_id_no,
        metadata: { migratedFrom: "profile_interns" },
        skipSideEffects: true,
      });
      if (deposited.ok) {
        await db.query(
          `UPDATE profile_interns SET college_id_no = $2, updated_at = now() WHERE user_id = $1`,
          [row.user_id, deposited.last4],
        );
        interns += 1;
      }
    }

    // Clients already store last4 only — nothing to migrate from profiles.
    return { advocates, interns, clients };
  }

  return {
    ensureSchema,
    depositCredential,
    listForUser,
    listAllMasked,
    revealForAdmin,
    migratePlaintextProfiles,
    maskCredential,
    KIND_LABELS,
    CREDENTIAL_KINDS,
    normalizeCredentialValue,
    validateCredential,
  };
}

module.exports = {
  createIdentityVault,
  maskCredential,
  KIND_LABELS,
  CREDENTIAL_KINDS,
  normalizeCredentialValue,
  validateCredential,
};
