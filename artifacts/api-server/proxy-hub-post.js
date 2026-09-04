/**
 * ProxyHub posting helpers — keep Pay & Post fail-closed on payment,
 * fail-soft on schema drift, and never leak an uncaught 500.
 */

const { isWorkHoldActive } = require("./work-hold");

function roleOf(user) {
  return String(user?.role || "").toLowerCase().trim();
}

function canPostProxyMission(authUser) {
  const role = roleOf(authUser);
  return Boolean(authUser) && (role === "advocate" || role === "admin" || role === "rna");
}

function isComplimentaryProxyOrder({ razorpayOrderId, mode, masterFree } = {}) {
  const orderId = String(razorpayOrderId || "");
  const orderMode = String(mode || "").toLowerCase().trim();
  if (orderId.startsWith("order_proxy_demo_")) {
    return { demo: true, master: false };
  }
  const masterIntent = orderId.startsWith("order_proxy_master_") || orderMode === "master_test_free";
  if (masterIntent && masterFree) {
    return { demo: true, master: true };
  }
  return { demo: false, master: false };
}

function safeErrorDetail(error) {
  const message = error?.message || (typeof error === "string" ? error : null);
  if (message) return String(message).slice(0, 240);
  try {
    return String(error).slice(0, 240);
  } catch {
    return "unknown error";
  }
}

/** Never send internal demo-store / infra throws to the browser. */
function clientSafeErrorDetail(error) {
  const detail = safeErrorDetail(error);
  if (!detail) return null;
  if (/local demo storage is disabled/i.test(detail)) return null;
  if (/demo storage/i.test(detail)) return null;
  return detail;
}

/**
 * Master-free must be decided from JWT/DB email only in production.
 * Never read demoStore as a fallback — that proxy throws in production and
 * was aborting ProxyHub create-order for every non-immediately-allowlisted user.
 */
function resolveMasterFreeUser({ jwtEmail, dbEmail, production = false, demoEmail = "", isAllowlisted }) {
  const listed = typeof isAllowlisted === "function" ? isAllowlisted : () => false;
  if (listed(jwtEmail)) return true;
  if (dbEmail !== undefined) return listed(dbEmail);
  if (production) return false;
  return listed(demoEmail);
}

function isUndefinedColumnError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || error || "");
  return code === "42703" || /column .* does not exist/i.test(message) || /proof_status/i.test(message);
}

function buildProxyMissionRecord({
  authUser,
  posting,
  fee,
  title,
  court,
  complimentary,
  razorpayOrderId,
  razorpayPaymentId,
}) {
  const master = Boolean(complimentary?.master);
  const demo = Boolean(complimentary?.demo);
  const mode = master ? "master_test_free" : demo ? "demo" : "razorpay";
  const task = {
    id: `task-${Date.now()}`,
    postedBy: authUser.id,
    title,
    court: court || null,
    taskType: posting.fields.appearanceType,
    amount: fee,
    escrowStatus: "Locked",
    status: "pending_admin_review",
    paymentVerified: !demo || master,
    masterTestFree: master,
    mode,
    paymentMode: mode,
    razorpayOrderId: demo ? null : razorpayOrderId || null,
    razorpayPaymentId: demo ? null : razorpayPaymentId || null,
    cnr: posting.fields.cnr,
    roomNo: posting.fields.roomNo,
    itemNo: posting.fields.itemNo,
    passoverScript: posting.fields.passoverScript,
    passoverInstructions: posting.fields.passoverScript.slice(0, 500),
    appearanceType: posting.fields.appearanceType,
    hearingDate: posting.fields.hearingDate,
    urgency: posting.fields.urgency,
    timingTier: posting.fields.timingTier,
    slaAfterAssign: posting.fields.slaAfterAssign,
    urgencyLabel: posting.fields.urgencyLabel,
    proofStatus: "none",
    transparencyLayer: "posting",
    workflowStatus: "pending_admin_review",
    createdAt: new Date().toISOString(),
  };
  task.workHoldActive = isWorkHoldActive(task);
  return task;
}

async function ensureProxyTaskColumns(db) {
  if (!db?.dbAvailable || typeof db.query !== "function") return;
  await db.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_hash text").catch(() => undefined);
  await db.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_status text DEFAULT 'none'").catch(() => undefined);
}

async function insertProxyMission(db, task) {
  if (!db?.dbAvailable) {
    throw new Error("Database is not available.");
  }
  await ensureProxyTaskColumns(db);
  const payload = JSON.stringify({ ...task, user_id: task.postedBy });
  const status = task.status || "pending_admin_review";
  const escrow = task.escrowStatus || "Locked";
  const proof = task.proofStatus || "none";
  try {
    return await db.query(
      `INSERT INTO tasks (title, court, task_type, amount, escrow_status, status, posted_by, proof_url, proof_status, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9) RETURNING *`,
      [task.title, task.court, task.taskType, task.amount, escrow, status, task.postedBy, proof, payload],
    );
  } catch (error) {
    if (!isUndefinedColumnError(error)) throw error;
    return db.query(
      `INSERT INTO tasks (title, court, task_type, amount, escrow_status, status, posted_by, proof_url, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8) RETURNING *`,
      [task.title, task.court, task.taskType, task.amount, escrow, status, task.postedBy, payload],
    );
  }
}

module.exports = {
  canPostProxyMission,
  isComplimentaryProxyOrder,
  safeErrorDetail,
  clientSafeErrorDetail,
  resolveMasterFreeUser,
  isUndefinedColumnError,
  buildProxyMissionRecord,
  ensureProxyTaskColumns,
  insertProxyMission,
};
