#!/usr/bin/env node
/**
 * Create (or reset) a set of Legal Connect TEST accounts, one per role.
 *
 * It uses the real sign-up and admin-approval APIs, so a successful run also
 * proves registration, identity approval and chamber invites work.
 * Only the admin account is created directly in the database, because admin
 * accounts cannot be self-registered (by design).
 *
 * Usage (local or staging):
 *   DATABASE_URL=postgres://... API_URL=http://localhost:3000 node scripts/seed-test-accounts.js
 *   node scripts/seed-test-accounts.js --cleanup        # delete every test account
 *
 * Options (env):
 *   API_URL            Base URL of the running server (default http://localhost:3000)
 *   DATABASE_URL       Same database the server uses (needed for the admin bootstrap and cleanup)
 *   TEST_EMAIL_BASE    Mailbox that receives test mail via plus-addressing (default legalconnect0s@gmail.com)
 *
 * Safety:
 *   - Refuses to run against legal-connect.in / onrender.com or NODE_ENV=production
 *     unless you pass --allow-production.
 *   - Passwords are random each run and are printed once; nothing is hard-coded.
 *   - Every test email carries the tag "+lc-test-" so test data is easy to find and remove.
 */
const crypto = require("crypto");

const args = new Set(process.argv.slice(2));
const API_URL = String(process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");
const EMAIL_BASE = String(process.env.TEST_EMAIL_BASE || "legalconnect0s@gmail.com").trim().toLowerCase();
const TAG = "lc-test-";

function testEmail(slug) {
  const [local, domain] = EMAIL_BASE.split("@");
  return `${local}+${TAG}${slug}@${domain}`;
}

function randomPassword() {
  // 16 chars, letters + digits + one symbol; always >= 8 as the server requires.
  return `${crypto.randomBytes(9).toString("base64url")}#${crypto.randomInt(10, 99)}`;
}

function hashPassword(password) {
  // Same format as strictHashPassword() in server.js.
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function looksLikeProduction() {
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") return true;
  return /legal-connect\.in|onrender\.com/i.test(API_URL);
}

const ACCOUNTS = [
  { slug: "admin", role: "admin", name: "Test Admin (LC Ops)" },
  {
    slug: "client", role: "client", name: "Test Client One",
    extra: { aadhaarNumber: "999999990019", address: "Test address, Subhash Nagar, New Delhi 110027" },
  },
  {
    slug: "client2", role: "client", name: "Test Client Two",
    extra: { aadhaarNumber: "999999990027", address: "Test address, Rajouri Garden, New Delhi 110027" },
  },
  {
    slug: "advocate", role: "advocate", name: "Adv. Test Chamber Owner",
    extra: { enrollmentNo: "D/TEST/0001/2018", stateBarCouncil: "Bar Council of Delhi", practiceCourts: "Tis Hazari, Saket", practiceAreas: "Civil, Criminal", yearsPractice: 8, officeAddress: "Test Chamber 1, Tis Hazari" },
  },
  {
    slug: "associate", role: "advocate", name: "Adv. Test Associate",
    extra: { enrollmentNo: "D/TEST/0002/2022", stateBarCouncil: "Bar Council of Delhi", practiceCourts: "Tis Hazari", practiceAreas: "Civil", yearsPractice: 3, officeAddress: "Test Chamber 1, Tis Hazari" },
  },
  {
    slug: "proxy", role: "advocate", name: "Adv. Test Proxy Counsel",
    extra: { enrollmentNo: "D/TEST/0003/2020", stateBarCouncil: "Bar Council of Delhi", practiceCourts: "Tis Hazari, Rohini, Saket", practiceAreas: "Civil, Criminal", yearsPractice: 5, officeAddress: "Test Chamber 9, Rohini" },
  },
  {
    slug: "intern", role: "intern", name: "Test Intern",
    extra: { collegeId: "TEST-LLB-0001", lawSchool: "Test Law School, Delhi", studyYear: "3rd year" },
  },
];

async function api(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: response.status, json };
}

function dbPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required (same database the server uses).");
  }
  const { Pool } = require("pg");
  const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "false" || local ? false : { rejectUnauthorized: false },
  });
}

async function cleanup(pool) {
  const like = `%+${TAG}%`;
  const users = await pool.query("SELECT id, email FROM users WHERE email LIKE $1", [like]);
  const ids = users.rows.map((row) => row.id);
  if (!ids.length) {
    console.log("No test accounts found.");
    return;
  }
  // Remove rows that reference the test users first; ignore tables that do not exist.
  const dependents = [
    "DELETE FROM chamber_members WHERE user_id = ANY($1::uuid[]) OR email LIKE $2",
    "DELETE FROM chambers WHERE owner_id = ANY($1::uuid[])",
    "DELETE FROM bookings WHERE user_id = ANY($1::uuid[])",
    "DELETE FROM sessions WHERE user_id = ANY($1::uuid[])",
    "DELETE FROM notifications WHERE user_id = ANY($1::uuid[])",
    "DELETE FROM receipts WHERE user_id = ANY($1::uuid[])",
  ];
  for (const sql of dependents) {
    await pool.query(sql, sql.includes("$2") ? [ids, like] : [ids]).catch(() => undefined);
  }
  const deleted = await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING email", [ids]).catch((error) => {
    console.warn(`Some test users could not be deleted (they still own records): ${error.message}`);
    return { rows: [] };
  });
  console.log(`Deleted ${deleted.rows.length} test account(s).`);
}

async function upsertAdmin(pool, account, password) {
  const role = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1").catch(() => ({ rows: [] }));
  const email = testEmail(account.slug);
  // users.email has no unique constraint, so look up first instead of ON CONFLICT.
  const existing = await pool.query("SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1", [email]);
  const result = existing.rows[0]
    ? await pool.query(
      "UPDATE users SET password_hash = $2, role = 'admin', role_id = $3, name = $4 WHERE id = $1 RETURNING id",
      [existing.rows[0].id, hashPassword(password), role.rows[0]?.id || null, account.name],
    )
    : await pool.query(
      `INSERT INTO users (name, email, role, role_id, password_hash, consent_at, email_verified_at)
       VALUES ($1, $2, 'admin', $3, $4, now(), now()) RETURNING id`,
      [account.name, email, role.rows[0]?.id || null, hashPassword(password)],
    );
  await pool.query(
    `INSERT INTO profile_admins (user_id, display_name, access_scope) VALUES ($1, $2, 'platform')
     ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()`,
    [result.rows[0].id, account.name],
  ).catch(() => undefined);
}

async function resetPassword(pool, email, password) {
  await pool.query("UPDATE users SET password_hash = $2 WHERE email = $1", [email, hashPassword(password)]);
}

async function main() {
  if (looksLikeProduction() && !args.has("--allow-production")) {
    console.error(`Refusing to run: ${API_URL} looks like production. Use a staging server, or pass --allow-production if you really mean it.`);
    process.exit(2);
  }
  const pool = dbPool();
  try {
    if (args.has("--cleanup")) {
      await cleanup(pool);
      return;
    }

    const health = await api("/api/health");
    if (health.status !== 200 || health.json.db !== "connected") {
      throw new Error(`Server at ${API_URL} is not healthy or has no database: ${JSON.stringify(health.json)}`);
    }

    const created = [];
    for (const account of ACCOUNTS) {
      const email = testEmail(account.slug);
      const password = randomPassword();
      if (account.role === "admin") {
        await upsertAdmin(pool, account, password);
        created.push({ ...account, email, password, note: "created in database" });
        continue;
      }
      const register = await api("/api/auth/strict/register", {
        method: "POST",
        body: { name: account.name, email, password, role: account.role, privacyConsent: true, ...account.extra },
      });
      if (register.status === 409) {
        await resetPassword(pool, email, password);
        created.push({ ...account, email, password, note: "already existed, password reset" });
      } else if (register.status >= 200 && register.status < 300) {
        created.push({ ...account, email, password, note: "registered through the sign-up API" });
      } else {
        throw new Error(`Registering ${email} failed (${register.status}): ${JSON.stringify(register.json)}`);
      }
    }

    const login = async (slug) => {
      const account = created.find((item) => item.slug === slug);
      const response = await api("/api/auth/strict/login", { method: "POST", body: { email: account.email, password: account.password } });
      if (response.status !== 200 || !response.json.token) {
        throw new Error(`Login failed for ${account.email} (${response.status}): ${JSON.stringify(response.json)}`);
      }
      return response.json.token;
    };

    // Approve identity for every non-admin test account through the admin API.
    const adminToken = await login("admin");
    const pending = await pool.query(
      `SELECT iv.id, u.email FROM identity_verifications iv JOIN users u ON u.id = iv.user_id
       WHERE u.email LIKE $1 AND iv.status <> 'approved'`,
      [`%+${TAG}%`],
    );
    for (const row of pending.rows) {
      const approve = await api(`/api/admin/verifications/${row.id}`, {
        method: "PATCH",
        token: adminToken,
        body: { status: "approved", note: "Test account (seed script)" },
      });
      if (approve.status !== 200) {
        throw new Error(`Approving ${row.email} failed (${approve.status}): ${JSON.stringify(approve.json)}`);
      }
    }

    // Give the test chamber a 30-day complimentary Chamber Pro plan. This is an entitlement on the
    // chamber row only: no payment or subscription-order record is faked.
    const owner = created.find((item) => item.slug === "advocate");
    await pool.query(
      `UPDATE chambers SET plan_tier = 'growth', subscription_status = 'test_complimentary',
         paid_until = now() + interval '30 days', updated_at = now()
       WHERE owner_id = (SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1)`,
      [owner.email],
    );

    // Put the associate into the chamber owner's Chamber Vault.
    const ownerToken = await login("advocate");
    const associate = created.find((item) => item.slug === "associate");
    const invite = await api("/api/chamber/members", {
      method: "POST",
      token: ownerToken,
      body: { displayName: associate.name, email: associate.email, memberRole: "associate" },
    });
    let inviteNote = invite.status < 300 || invite.status === 409 ? "associate invited" : `chamber invite returned ${invite.status}: ${JSON.stringify(invite.json).slice(0, 200)}`;
    // The associate accepts the invitation themselves (consent), which links their account.
    const associateToken = await login("associate");
    const invitations = await api("/api/chamber/invitations", { token: associateToken });
    for (const item of invitations.json.invitations || []) {
      const accepted = await api(`/api/chamber/invitations/${item.id}/accept`, { method: "POST", token: associateToken });
      inviteNote += accepted.status === 200 ? " and accepted" : `; accept returned ${accepted.status}`;
    }

    const outIndex = process.argv.indexOf("--out");
    if (outIndex > -1 && process.argv[outIndex + 1]) {
      // Local file for the e2e script. Keep it out of git (it holds passwords).
      require("fs").writeFileSync(process.argv[outIndex + 1], JSON.stringify({ apiUrl: API_URL, accounts: created.map(({ slug, role, email, password }) => ({ slug, role, email, password })) }, null, 2), { mode: 0o600 });
    }

    console.log("\nLegal Connect test accounts (passwords are shown only now):\n");
    console.table(created.map(({ role, slug, email, password }) => ({ role, account: slug, email, password })));
    console.log(`Server: ${API_URL}`);
    console.log(`Identity approvals: ${pending.rows.length} approved through PATCH /api/admin/verifications/:id`);
    console.log(`Chamber: ${inviteNote}`);
    console.log("Sign in on the Login page with 'Password' mode. Remove everything later with --cleanup.\n");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});
