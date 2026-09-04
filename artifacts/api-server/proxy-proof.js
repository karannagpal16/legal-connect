/**
 * ProxyHub order-sheet uniqueness.
 * A scan may be retried on the same mission, reused on the same CNR/booking,
 * and reused by the same posting counsel while that other mission never paid out.
 * A scan that already released (or is still live for a different counsel / case)
 * must not unlock a second lock.
 */

const crypto = require("crypto");

const TERMINAL_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "rejected",
  "disputed",
]);

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCnr(value) {
  return String(value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function taskField(row, ...keys) {
  const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
  for (const key of keys) {
    const value = row?.[key] ?? payload[key];
    if (value != null && String(value).trim() !== "") return value;
  }
  return "";
}

function hashProxyProof({ buffer, proofUrl } = {}) {
  if (buffer?.length) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }
  return crypto.createHash("sha256").update(String(proofUrl || "")).digest("hex");
}

function isTerminalProofRow(row) {
  const status = lower(taskField(row, "status"));
  const escrow = lower(taskField(row, "escrowStatus", "escrow_status"));
  const proof = lower(taskField(row, "proofStatus", "proof_status"));
  const lock = lower(taskField(row, "paymentLockStatus"));
  return (
    TERMINAL_STATUSES.has(status)
    || TERMINAL_STATUSES.has(escrow)
    || TERMINAL_STATUSES.has(proof)
    || TERMINAL_STATUSES.has(lock)
  );
}

function isReleasedProofRow(row) {
  const status = lower(taskField(row, "status"));
  const escrow = lower(taskField(row, "escrowStatus", "escrow_status"));
  const lock = lower(taskField(row, "paymentLockStatus"));
  return /released|completed|closed/.test(`${status} ${escrow} ${lock}`);
}

function sameMissionIdentity(current, existing) {
  if (!existing) return false;
  if (String(existing.id) === String(current.taskId)) return true;
  const currentBooking = String(current.bookingId || "").trim();
  const existingBooking = String(taskField(existing, "bookingId", "booking_id")).trim();
  if (currentBooking && existingBooking && currentBooking === existingBooking) return true;
  const currentCnr = normalizeCnr(current.cnr);
  const existingCnr = normalizeCnr(taskField(existing, "cnr"));
  return Boolean(currentCnr && existingCnr && currentCnr === existingCnr);
}

/**
 * @returns {object|null} the conflicting row, or null if the scan may be stored
 */
function findConflictingProofRow(current, candidates = []) {
  const hash = String(current.proofHash || "");
  if (!hash) return null;
  for (const existing of candidates) {
    const existingHash = String(taskField(existing, "proofHash", "proof_hash"));
    if (!existingHash || existingHash !== hash) continue;
    if (sameMissionIdentity(current, existing)) continue;
    if (isTerminalProofRow(existing)) continue;
    const samePoster = String(current.postedBy || "") && String(taskField(existing, "postedBy", "posted_by")) === String(current.postedBy);
    if (samePoster && !isReleasedProofRow(existing)) continue;
    return existing;
  }
  return null;
}

const PROOF_REUSE_ERROR = "This order sheet scan was already used on another mission. Upload a fresh scan.";
const PROOF_MISSING_ERROR = "The order sheet was recorded but the file was not stored. Ask the proxy to re-upload the scan.";

function proofViewPath(taskId) {
  return `/api/tasks/${encodeURIComponent(String(taskId))}/proof`;
}

function isViewableProofStatus(status) {
  return ["submitted", "lc_verified", "poster_approved", "approved", "rejected"].includes(lower(status));
}

function canViewTaskProof(authUser, task) {
  if (!authUser || !task) return false;
  const role = lower(authUser.role);
  if (role === "admin" || role === "rna") return true;
  const uid = String(authUser.id || "");
  if (!uid) return false;
  const posted = String(taskField(task, "postedBy", "posted_by") || "");
  const accepted = String(taskField(task, "acceptedBy", "accepted_by", "assignedProxyId") || "");
  return uid === posted || uid === accepted;
}

function inferProofMime(contentType, fileName) {
  const mime = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (mime === "application/pdf" || mime.startsWith("image/")) return mime;
  const name = lower(fileName);
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".heic") || name.endsWith(".heif")) return "image/heic";
  return mime || "application/octet-stream";
}

function isAllowedProofMime(mime) {
  const value = lower(mime);
  return value === "application/pdf" || value.startsWith("image/");
}

module.exports = {
  hashProxyProof,
  findConflictingProofRow,
  isTerminalProofRow,
  isReleasedProofRow,
  normalizeCnr,
  canViewTaskProof,
  proofViewPath,
  isViewableProofStatus,
  inferProofMime,
  isAllowedProofMime,
  PROOF_REUSE_ERROR,
  PROOF_MISSING_ERROR,
};
