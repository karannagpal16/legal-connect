/**
 * Central authorization policies for Legal Connect.
 * Advocate daily work vs Admin trust/allocation/finance boundaries.
 */

const ADMIN_ROLES = new Set(["admin", "super_admin", "verification_admin", "operations_admin", "content_reviewer", "finance_admin", "support_admin"]);
/** RNA is an ops alias for admin — never treated as advocate. */
const OPS_ROLES = new Set(["admin", "rna", "super_admin", "verification_admin", "operations_admin", "content_reviewer", "finance_admin", "support_admin"]);

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (value === "rna") return "admin";
  if (ADMIN_ROLES.has(value) || value === "advocate" || value === "client" || value === "intern") return value;
  return "client";
}

function isOps(user) {
  return Boolean(user && OPS_ROLES.has(String(user.role || "").toLowerCase()));
}

function isAdmin(user) {
  return isOps(user);
}

function hasAdminCapability(user, capability) {
  if (!user) return false;
  const role = String(user.role || "").toLowerCase();
  if (role === "super_admin" || role === "admin" || role === "rna") return true;
  const map = {
    verification: ["verification_admin"],
    operations: ["operations_admin"],
    content: ["content_reviewer"],
    finance: ["finance_admin"],
    support: ["support_admin"],
  };
  return Boolean(map[capability]?.includes(role));
}

function sameId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function verificationStatus(user) {
  return String(user?.verificationStatus || user?.verification_status || "pending").toLowerCase();
}

function isAdvocateVerified(user) {
  if (!user || normalizeRole(user.role) !== "advocate") return false;
  const status = verificationStatus(user);
  return status === "approved" || status === "verified";
}

function isAdvocateBlocked(user) {
  if (!user || normalizeRole(user.role) !== "advocate") return false;
  const status = verificationStatus(user);
  return ["pending", "under_review", "information_required", "rejected", "suspended"].includes(status);
}

function deny(code, message, status = 403) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function assertAuthenticated(user) {
  if (!user?.id) throw deny("unauthenticated", "Login is required.", 401);
  return user;
}

function assertNotBlockedAdvocate(user) {
  assertAuthenticated(user);
  if (isAdvocateBlocked(user)) {
    throw deny("advocate_not_verified", "Advocate verification is required before using this workspace.", 403);
  }
}

function canSeeAll(user) {
  return isOps(user);
}

function canViewCase(user, matter) {
  if (!user || !matter) return false;
  if (canSeeAll(user)) return true;
  const ownerId = matter.userId || matter.user_id || matter.clientId || matter.client_id;
  if (sameId(ownerId, user.id)) return true;
  const assigned = matter.assignedTo
    || matter.assigned_to
    || matter.assignedAdvocateId
    || matter.assigned_advocate_id
    || matter.payload?.assignedTo
    || matter.payload?.assignedAdvocateId;
  if (sameId(assigned, user.id)) return true;
  return false;
}

function canModifyCase(user, matter) {
  if (!canViewCase(user, matter)) return false;
  if (canSeeAll(user)) return true;
  const role = normalizeRole(user.role);
  if (role === "advocate") return isAdvocateVerified(user) || !isAdvocateBlocked(user);
  if (role === "client") return sameId(matter.userId || matter.user_id, user.id);
  return false;
}

function canViewBooking(user, booking) {
  if (!user || !booking) return false;
  if (canSeeAll(user)) return true;
  const ownerId = booking.userId || booking.user_id;
  if (sameId(ownerId, user.id)) return true;
  const assigned = booking.assignedAdvocateId
    || booking.assigned_advocate_id
    || booking.payload?.assignedAdvocateId
    || booking.payload?.assigned_advocate_id
    || booking.payload?.assignedTo;
  return sameId(assigned, user.id);
}

function canAcceptIntake(user, intake) {
  if (!user || !intake) return false;
  if (canSeeAll(user)) return true;
  if (normalizeRole(user.role) !== "advocate") return false;
  if (isAdvocateBlocked(user)) return false;
  const assigned = intake.assignedAdvocateId
    || intake.assigned_advocate_id
    || intake.payload?.assignedAdvocateId
    || intake.payload?.assignedTo;
  return sameId(assigned, user.id);
}

function canViewTask(user, task) {
  if (!user || !task) return false;
  if (canSeeAll(user)) return true;
  if (sameId(task.postedBy || task.posted_by, user.id)) return true;
  if (sameId(task.acceptedBy || task.accepted_by, user.id)) return true;
  if (sameId(task.assignedToId || task.assigned_to || task.assignedTo, user.id)) return true;
  return false;
}

function canPerformProxyStep(user, task, action) {
  if (!canViewTask(user, task)) return false;
  if (canSeeAll(user)) return true;
  const role = normalizeRole(user.role);
  const step = String(action || "").toLowerCase();
  if (["conflict_declare", "check_in", "proof_upload", "accept"].includes(step)) {
    return role === "advocate" && (
      sameId(task.acceptedBy || task.accepted_by, user.id)
      || sameId(task.assignedToId || task.assigned_to || task.assignedTo, user.id)
    );
  }
  if (["post", "pay"].includes(step)) {
    return sameId(task.postedBy || task.posted_by, user.id) || role === "advocate";
  }
  return false;
}

function canManageChamber(user, chamber) {
  if (!user || !chamber) return false;
  if (canSeeAll(user)) return true;
  return sameId(chamber.owner_id || chamber.ownerId, user.id);
}

function canViewConversation(user, conversation) {
  if (!user || !conversation) return false;
  if (canSeeAll(user)) return true;
  const participants = conversation.participantIds
    || conversation.participants
    || [conversation.clientId, conversation.advocateId, conversation.userId].filter(Boolean);
  return participants.some((id) => sameId(id?.id || id, user.id));
}

function canReviewUpdate(user) {
  return hasAdminCapability(user, "content") || canSeeAll(user);
}

function canPerformFinanceAction(user, action) {
  if (!user) return false;
  if (hasAdminCapability(user, "finance") || canSeeAll(user)) return true;
  if (String(action || "").startsWith("view_")) return normalizeRole(user.role) === "advocate" || normalizeRole(user.role) === "client";
  return false;
}

function requirePolicy(ok, code, message) {
  if (!ok) throw deny(code, message || "Forbidden.", 403);
}

module.exports = {
  ADMIN_ROLES,
  OPS_ROLES,
  normalizeRole,
  isOps,
  isAdmin,
  hasAdminCapability,
  sameId,
  verificationStatus,
  isAdvocateVerified,
  isAdvocateBlocked,
  deny,
  assertAuthenticated,
  assertNotBlockedAdvocate,
  canSeeAll,
  canViewCase,
  canModifyCase,
  canViewBooking,
  canAcceptIntake,
  canViewTask,
  canPerformProxyStep,
  canManageChamber,
  canViewConversation,
  canReviewUpdate,
  canPerformFinanceAction,
  requirePolicy,
};
