/**
 * Legal Connect supervision layer.
 *
 * The LC Admin portal is the supervisor of the platform. This module holds the controls
 * that make that true on the server, not only in the UI:
 *   - account suspension / reactivation (enforced on every request and at sign-in)
 *   - verified-advocate gate: unverified advocates cannot take money-bearing or client work
 *   - admin assignment targets must be verified advocates
 *   - SOS and account-deletion requests are handled and closed by admin
 *   - one "needs attention" queue for everything waiting on LC
 * Every admin action requires a reason where it affects someone, and is audit-logged.
 */

const SUSPENDED = "suspended";

// Advocate actions that touch client money, client matters or court work.
const ADVOCATE_GATED = [
  /^\/api\/proxy-hub\/(create-order|verify-payment)$/,
  /^\/api\/tasks\/[^/]+\/(interest|proxy-accept|accept|check-in|proof|conflict-declare|counsel-accept|service-record)$/,
  /^\/api\/intakes\/[^/]+\/advocate-accept$/,
  /^\/api\/workspaces\/advocate\/cases\/[^/]+\/status$/,
  /^\/api\/chamber\/(members|tasks)$/,
  /^\/api\/chamber\/tasks\/[^/]+\/status$/,
  /^\/api\/chamber\/today\/hearings\/[^/]+\/(assign|accept|close|order-upload-url)$/,
  /^\/api\/chamber\/orders\/[^/]+\/(complete|verify)$/,
  /^\/api\/chamber\/subscription\/(create-order|verify)$/,
  /^\/api\/chamber\/invitations\/[^/]+\/accept$/,
  /^\/api\/advocate\/payout-account$/,
  /^\/api\/cases\/[^/]+$/,
];

// Admin routes that hand work to an advocate: the target must be verified.
const ASSIGNMENT_ROUTES = [
  /^\/api\/admin\/proxy-tasks\/[^/]+\/assign-proxy$/,
  /^\/api\/admin\/cases\/[^/]+\/assign$/,
  /^\/api\/admin\/bookings\/[^/]+\/assign$/,
  /^\/api\/admin\/intakes\/[^/]+\/assign$/,
  /^\/api\/admin\/gateway\/retention\/[^/]+\/assign-panel$/,
];

const SOS_STATUSES = ["acknowledged", "in_progress", "resolved", "closed"];
const DELETION_STATUSES = ["in_review", "completed", "rejected"];

function createSupervision(deps) {
  const {
    db,
    sendJson,
    readBody,
    getAuthUser,
    canSeeAll,
    writeAuditLog,
    notify,
    resolveRecipients,
    portalUrl,
    isUuid,
    resolveDatabaseUserId,
    isMasterTestUser,
  } = deps;

  let schemaReady = null;
  function ensureSchema() {
    if (!db.dbAvailable) return Promise.resolve(false);
    if (!schemaReady) {
      schemaReady = (async () => {
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at timestamptz");
        await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason text");
        await db.query("ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS handled_by uuid");
        await db.query("ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS handled_at timestamptz");
        await db.query("ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS admin_note text");
        return true;
      })().catch((error) => {
        schemaReady = null;
        throw error;
      });
    }
    return schemaReady;
  }

  async function accountStatus(userId) {
    if (!db.dbAvailable || !isUuid(String(userId || ""))) return "active";
    await ensureSchema();
    const result = await db.query("SELECT account_status FROM users WHERE id = $1 LIMIT 1", [userId]);
    return String(result.rows[0]?.account_status || "active");
  }

  async function isVerifiedAdvocate(userId) {
    if (!db.dbAvailable || !isUuid(String(userId || ""))) return false;
    const result = await db.query(
      `SELECT 1 FROM users u
       LEFT JOIN profile_advocates pa ON pa.user_id = u.id
       WHERE u.id = $1 AND u.role = 'advocate' AND (
         COALESCE(pa.verification_status, '') IN ('approved', 'verified')
         OR EXISTS (SELECT 1 FROM identity_verifications iv WHERE iv.user_id = u.id AND iv.credential_kind = 'bar_enrollment' AND iv.status = 'approved')
       ) LIMIT 1`,
      [userId],
    );
    return Boolean(result.rows[0]);
  }

  /**
   * Runs before every /api route. Returns { status, body } to block, or null to continue.
   */
  async function guard(req, url) {
    if (!db.dbAvailable) return null;
    const path = url.pathname;
    if (req.__lcBodyTooLarge) return { status: 413, body: { ok: false, error: "Request is too large." } };
    const authUser = getAuthUser(req);
    if (!authUser) return null;
    const userId = isUuid(String(authUser.id || "")) ? authUser.id : await resolveDatabaseUserId(authUser).catch(() => null);

    if (userId && (await accountStatus(userId)) === SUSPENDED && !/^\/api\/(health|healthz|app-version|support-routing)$/.test(path)) {
      return { status: 403, body: { ok: false, code: "ACCOUNT_SUSPENDED", error: "This account is suspended. Contact Legal Connect support." } };
    }

    const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
    if (mutating && String(authUser.role) === "advocate" && ADVOCATE_GATED.some((pattern) => pattern.test(path))) {
      if (!(await isMasterTestUser(authUser)) && !(await isVerifiedAdvocate(userId))) {
        return {
          status: 403,
          body: {
            ok: false,
            code: "ADVOCATE_NOT_VERIFIED",
            error: "Legal Connect must verify your Bar enrollment before you can take paid or client work.",
            nextStep: { href: "/advocate/identity-vault" },
          },
        };
      }
    }

    if (mutating && canSeeAll(authUser) && ASSIGNMENT_ROUTES.some((pattern) => pattern.test(path))) {
      const body = await readBody(req);
      const target = String(body.proxyAdvocateId || body.advocateId || body.assignedAdvocateId || body.assignedTo || body.proxyId || body.panelAdvocateId || "").trim();
      if (target && isUuid(target) && !(await isVerifiedAdvocate(target))) {
        return { status: 409, body: { ok: false, code: "ASSIGNEE_NOT_VERIFIED", error: "That advocate's Bar enrollment is not verified yet. Approve their verification first." } };
      }
    }
    return null;
  }

  async function requireAdmin(req, res) {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: "Admin access required." });
      return null;
    }
    if (!db.dbAvailable) {
      sendJson(res, 503, { ok: false, error: "Supervision needs the database." });
      return null;
    }
    await ensureSchema();
    return authUser;
  }

  function reasonFrom(body) {
    return String(body.reason || body.note || "").trim().slice(0, 1000);
  }

  async function handle(req, res, url) {
    const path = url.pathname;

    // ---------- Needs-attention queue ----------
    if (path === "/api/admin/supervision" && req.method === "GET") {
      const admin = await requireAdmin(req, res);
      if (!admin) return true;
      const count = (sql, params = []) => db.query(sql, params).then((r) => Number(r.rows[0]?.n || 0)).catch(() => 0);
      const [
        verifications, caseUpdates, paidUnassigned, proofsToVerify, disputes,
        grievances, sos, deletions, clientMessages, paymentMismatches, suspended,
      ] = await Promise.all([
        count("SELECT count(*) AS n FROM identity_verifications WHERE status = 'pending'"),
        count("SELECT count(*) AS n FROM case_updates WHERE status = 'pending_lc_review'"),
        count(`SELECT count(*) AS n FROM bookings WHERE payment_status = 'paid'
               AND COALESCE(assigned_advocate_id, payload->>'assignedAdvocateId', '') = ''
               AND COALESCE(stage_status, '') NOT IN ('cancelled', 'concluded', 'refunded')`),
        count("SELECT count(*) AS n FROM tasks WHERE lower(COALESCE(payload->>'proofStatus', '')) = 'submitted'"),
        count("SELECT count(*) AS n FROM locked_payments WHERE status = 'DISPUTED'"),
        count("SELECT count(*) AS n FROM grievances WHERE lower(COALESCE(status, 'open')) NOT IN ('resolved', 'closed', 'rejected')"),
        count("SELECT count(*) AS n FROM sos_requests WHERE lower(COALESCE(status, 'open')) NOT IN ('resolved', 'closed')"),
        count("SELECT count(*) AS n FROM account_deletion_requests WHERE lower(COALESCE(status, 'pending')) NOT IN ('completed', 'rejected')"),
        count(`SELECT count(*) AS n FROM case_communications cc
               WHERE COALESCE(cc.payload->>'senderRole', '') = 'client'
               AND NOT EXISTS (SELECT 1 FROM case_communications r WHERE r.case_id = cc.case_id
                 AND COALESCE(r.payload->>'senderRole', '') IN ('admin', 'rna') AND r.created_at > cc.created_at)`),
        count("SELECT count(*) AS n FROM bookings WHERE payment_status = 'amount_mismatch'"),
        count("SELECT count(*) AS n FROM users WHERE account_status = 'suspended'"),
      ]);
      const queue = [
        { key: "verifications", label: "Identity / Bar verifications to review", count: verifications, href: "/admin/verifications" },
        { key: "caseUpdates", label: "Counsel updates waiting for LC review", count: caseUpdates, href: "/admin/pending-updates" },
        { key: "paidUnassigned", label: "Paid bookings without counsel", count: paidUnassigned, href: "/admin/control" },
        { key: "proofsToVerify", label: "ProxyHub order sheets to verify", count: proofsToVerify, href: "/admin/missions" },
        { key: "disputes", label: "Disputed ProxyHub payments", count: disputes, href: "/admin/missions" },
        { key: "grievances", label: "Open grievances", count: grievances, href: "/admin/control" },
        { key: "sos", label: "Open Legal SOS requests", count: sos, href: "/admin/control" },
        { key: "deletions", label: "Account deletion requests", count: deletions, href: "/admin/users" },
        { key: "clientMessages", label: "Client messages awaiting an LC reply", count: clientMessages, href: "/admin/cases" },
        { key: "paymentMismatches", label: "Payments that did not match the price", count: paymentMismatches, href: "/admin/bookings" },
      ];
      sendJson(res, 200, {
        ok: true,
        generatedAt: new Date().toISOString(),
        totalNeedingAttention: queue.reduce((sum, item) => sum + item.count, 0),
        queue,
        suspendedAccounts: suspended,
      });
      return true;
    }

    // ---------- Suspend / reactivate ----------
    const suspendMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/(suspend|reactivate)$/);
    if (suspendMatch && req.method === "POST") {
      const admin = await requireAdmin(req, res);
      if (!admin) return true;
      const [, targetId, action] = suspendMatch;
      if (!isUuid(targetId)) {
        sendJson(res, 404, { ok: false, error: "User not found." });
        return true;
      }
      const adminId = await resolveDatabaseUserId(admin);
      if (String(adminId) === String(targetId)) {
        sendJson(res, 400, { ok: false, error: "You cannot suspend or reactivate your own account." });
        return true;
      }
      const body = await readBody(req);
      const reason = reasonFrom(body);
      if (reason.length < 8) {
        sendJson(res, 400, { ok: false, error: "Give a reason of at least 8 characters. It is recorded in the audit log." });
        return true;
      }
      const target = await db.query("SELECT id, name, email, role, account_status FROM users WHERE id = $1 LIMIT 1", [targetId]);
      if (!target.rows[0]) {
        sendJson(res, 404, { ok: false, error: "User not found." });
        return true;
      }
      const suspend = action === "suspend";
      const updated = await db.query(
        `UPDATE users SET account_status = $2, suspended_at = CASE WHEN $2 = 'suspended' THEN now() ELSE NULL END,
           suspension_reason = CASE WHEN $2 = 'suspended' THEN $3 ELSE NULL END
         WHERE id = $1 RETURNING id, name, role, account_status, suspended_at`,
        [targetId, suspend ? SUSPENDED : "active", reason],
      );
      if (suspend) {
        await db.query("UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL", [targetId]).catch(() => undefined);
      }
      await writeAuditLog(admin, suspend ? "account_suspended" : "account_reactivated", "user", targetId,
        suspend ? "Account suspended by LC Admin." : "Account reactivated by LC Admin.",
        { reason, role: target.rows[0].role, previousStatus: target.rows[0].account_status });
      await notify({
        eventType: suspend ? "account_suspended" : "account_reactivated",
        title: suspend ? "Your Legal Connect account is suspended" : "Your Legal Connect account is active again",
        message: suspend ? "Contact Legal Connect support if you think this is a mistake." : "You can sign in again.",
        recipients: await resolveRecipients([targetId]),
        payload: { userId: targetId },
        sendEmail: true,
      }).catch(() => undefined);
      sendJson(res, 200, { ok: true, user: updated.rows[0] });
      return true;
    }

    // ---------- Legal SOS handling ----------
    if (path === "/api/admin/sos" && req.method === "GET") {
      const admin = await requireAdmin(req, res);
      if (!admin) return true;
      const status = String(url.searchParams.get("status") || "open").toLowerCase();
      const rows = await db.query(
        `SELECT s.id, s.service_type, s.urgency, s.status, s.created_at, s.handled_at, s.admin_note,
                u.name AS requester_name, u.email AS requester_email, u.phone AS requester_phone
         FROM sos_requests s LEFT JOIN users u ON u.id = s.user_id
         WHERE ($1 = 'all') OR ($1 = 'open' AND lower(COALESCE(s.status, 'open')) NOT IN ('resolved', 'closed'))
            OR lower(COALESCE(s.status, '')) = $1
         ORDER BY s.created_at DESC LIMIT 200`,
        [status],
      );
      await writeAuditLog(admin, "sos_list_viewed", "sos", "list", "LC Admin viewed SOS requests (contact details shown).", { status, count: rows.rows.length }).catch(() => undefined);
      sendJson(res, 200, { ok: true, sos: rows.rows });
      return true;
    }
    const sosMatch = path.match(/^\/api\/admin\/sos\/([^/]+)$/);
    if (sosMatch && req.method === "PATCH") {
      const admin = await requireAdmin(req, res);
      if (!admin) return true;
      if (!isUuid(sosMatch[1])) {
        sendJson(res, 404, { ok: false, error: "SOS request not found." });
        return true;
      }
      const body = await readBody(req);
      const status = String(body.status || "").toLowerCase();
      if (!SOS_STATUSES.includes(status)) {
        sendJson(res, 400, { ok: false, error: `Status must be one of: ${SOS_STATUSES.join(", ")}.` });
        return true;
      }
      const note = reasonFrom(body);
      if (["resolved", "closed"].includes(status) && note.length < 8) {
        sendJson(res, 400, { ok: false, error: "Say what was done (at least 8 characters) before resolving an SOS." });
        return true;
      }
      const adminId = await resolveDatabaseUserId(admin);
      const updated = await db.query(
        `UPDATE sos_requests SET status = $2, admin_note = COALESCE(NULLIF($3, ''), admin_note), handled_by = $4, handled_at = now()
         WHERE id = $1 RETURNING id, user_id, status, admin_note, handled_at`,
        [sosMatch[1], status, note, isUuid(String(adminId || "")) ? adminId : null],
      );
      if (!updated.rows[0]) {
        sendJson(res, 404, { ok: false, error: "SOS request not found." });
        return true;
      }
      await writeAuditLog(admin, `sos_${status}`, "sos", sosMatch[1], `SOS marked ${status}.`, { note });
      await notify({
        eventType: "sos_status_changed",
        title: "Update on your Legal SOS request",
        message: status === "acknowledged" ? "Legal Connect has seen your request and is on it." : `Your SOS request is now ${status.replace("_", " ")}.`,
        recipients: await resolveRecipients([updated.rows[0].user_id].filter(Boolean)),
        payload: { sosId: sosMatch[1], status },
        sendEmail: true,
        priority: "high",
      }).catch(() => undefined);
      sendJson(res, 200, { ok: true, sos: updated.rows[0] });
      return true;
    }

    // ---------- Account deletion requests ----------
    const deletionMatch = path.match(/^\/api\/admin\/deletion-requests\/([^/]+)$/);
    if (deletionMatch && req.method === "PATCH") {
      const admin = await requireAdmin(req, res);
      if (!admin) return true;
      if (!isUuid(deletionMatch[1])) {
        sendJson(res, 404, { ok: false, error: "Deletion request not found." });
        return true;
      }
      const body = await readBody(req);
      const status = String(body.status || "").toLowerCase();
      const note = reasonFrom(body);
      if (!DELETION_STATUSES.includes(status)) {
        sendJson(res, 400, { ok: false, error: `Status must be one of: ${DELETION_STATUSES.join(", ")}.` });
        return true;
      }
      if (status !== "in_review" && note.length < 8) {
        sendJson(res, 400, { ok: false, error: "Record what was done or why it was refused (at least 8 characters)." });
        return true;
      }
      const updated = await db.query(
        `UPDATE account_deletion_requests SET status = $2, updated_at = now(),
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
         WHERE id = $1 RETURNING id, user_id, status, updated_at`,
        [deletionMatch[1], status, JSON.stringify({ adminNote: note, handledAt: new Date().toISOString() })],
      );
      if (!updated.rows[0]) {
        sendJson(res, 404, { ok: false, error: "Deletion request not found." });
        return true;
      }
      await writeAuditLog(admin, `deletion_request_${status}`, "account_deletion_request", deletionMatch[1], `Deletion request marked ${status}.`, { note, userId: updated.rows[0].user_id });
      await notify({
        eventType: "deletion_request_updated",
        title: "Update on your account deletion request",
        message: status === "completed" ? "Your account data has been deleted as requested, except records the law requires us to keep." : status === "rejected" ? `We could not complete your request: ${note}` : "We are reviewing your request.",
        recipients: await resolveRecipients([updated.rows[0].user_id].filter(Boolean)),
        payload: { requestId: deletionMatch[1], status },
        sendEmail: true,
      }).catch(() => undefined);
      sendJson(res, 200, { ok: true, request: updated.rows[0] });
      return true;
    }

    return false;
  }

  return { ensureSchema, guard, handle, isVerifiedAdvocate, accountStatus, ADVOCATE_GATED, ASSIGNMENT_ROUTES };
}

module.exports = { createSupervision, ADVOCATE_GATED, ASSIGNMENT_ROUTES, SOS_STATUSES, DELETION_STATUSES };
