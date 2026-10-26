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

function isComplimentaryProxyOrder({ razorpayOrderId, mode, masterFree, production = false } = {}) {
  const orderId = String(razorpayOrderId || "");
  const orderMode = String(mode || "").toLowerCase().trim();
  // Demo order ids are only honoured outside production; in production they are just unknown orders.
  if (!production && orderId.startsWith("order_proxy_demo_")) {
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

const DB_ERROR_MESSAGE = /\b(relation|column|constraint|violates|duplicate key|syntax error|database|postgres|password authentication|connection terminated|timeout exceeded when trying to connect)\b/i;
const DB_CONNECTION_CODES = new Set(["ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH"]);

/** PostgreSQL / driver errors carry schema, constraint and sometimes row values — never client-safe. */
function isDatabaseError(error) {
  if (!error || typeof error !== "object") {
    return DB_ERROR_MESSAGE.test(String(error || ""));
  }
  const code = String(error.code || "");
  if (/^[0-9A-Z]{5}$/.test(code) && (error.severity || error.routine || /^[0-9]/.test(code))) return true;
  if (DB_CONNECTION_CODES.has(code)) return true;
  if (error.severity || error.routine || error.constraint || error.table || error.schema) return true;
  return DB_ERROR_MESSAGE.test(String(error.message || ""));
}

/** Never send internal demo-store / infra / database throws to the browser. */
function clientSafeErrorDetail(error) {
  const detail = safeErrorDetail(error);
  if (!detail) return null;
  if (/local demo storage is disabled/i.test(detail)) return null;
  if (/demo storage/i.test(detail)) return null;
  if (isDatabaseError(error)) return null;
  return detail;
}

/** Short opaque id that ties a client-facing failure to its server log line. */
function proxyRequestRef(randomBytes) {
  return randomBytes(6).toString("hex");
}

/**
 * Razorpay ids are safe to log for reconciliation; the signature and secrets are not.
 * Demo/complimentary orders carry no real payment, so they log nulls.
 */
function proxyPaymentLogContext({ requestId, orderId, paymentId, userId, taskId = null, stage = null, complimentary = false } = {}) {
  return {
    requestId: requestId || null,
    stage,
    orderId: complimentary ? null : orderId || null,
    paymentId: complimentary ? null : paymentId || null,
    userId: userId == null ? null : String(userId),
    taskId: taskId == null ? null : String(taskId),
  };
}

/**
 * Process-local guard so concurrent verify-payment calls for one Razorpay payment
 * cannot both pass the duplicate check. Cross-instance protection relies on the
 * payment-id lookup in findProxyMissionByPaymentId.
 */
function createPaymentInFlightGuard() {
  const active = new Set();
  return {
    acquire(key) {
      if (!key) return true;
      if (active.has(key)) return false;
      active.add(key);
      return true;
    },
    release(key) {
      if (key) active.delete(key);
    },
    size() {
      return active.size;
    },
  };
}

/** One Razorpay payment opens at most one ProxyHub mission. */
async function findProxyMissionByPaymentId({ db, demoTasks, paymentId }) {
  const id = String(paymentId || "").trim();
  if (!id) return null;
  if (db?.dbAvailable) {
    const result = await db.query(
      `SELECT * FROM tasks WHERE payload->>'razorpayPaymentId' = $1 ORDER BY created_at ASC LIMIT 1`,
      [id],
    );
    return result.rows[0] ? { row: result.rows[0] } : null;
  }
  const match = (demoTasks || []).find((task) => String(task?.razorpayPaymentId || "") === id);
  return match ? { task: match } : null;
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
  isDatabaseError,
  proxyRequestRef,
  proxyPaymentLogContext,
  createPaymentInFlightGuard,
  findProxyMissionByPaymentId,
  resolveMasterFreeUser,
  isUndefinedColumnError,
  buildProxyMissionRecord,
  ensureProxyTaskColumns,
  insertProxyMission,
};
