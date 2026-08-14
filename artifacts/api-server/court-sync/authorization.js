/**
 * Authorization for Verified Court Updates.
 */

function canSeeAll(user) {
  const role = String(user?.role || "").toLowerCase();
  return role === "admin" || role === "rna";
}

function assertAuthed(user) {
  if (!user?.id) {
    const error = new Error("Login is required.");
    error.status = 401;
    throw error;
  }
}

function canViewTrackedCase(user, tracked) {
  assertAuthed(user);
  if (canSeeAll(user)) return true;
  if (String(tracked.created_by || tracked.createdBy) === String(user.id)) return true;
  const members = Array.isArray(tracked.viewer_ids || tracked.viewerIds) ? (tracked.viewer_ids || tracked.viewerIds) : [];
  return members.map(String).includes(String(user.id));
}

function assertCanViewTrackedCase(user, tracked) {
  if (!canViewTrackedCase(user, tracked)) {
    const error = new Error("You do not have access to this tracked court case.");
    error.status = 403;
    throw error;
  }
}

function assertCanTrack(user) {
  assertAuthed(user);
  const role = String(user.role || "").toLowerCase();
  if (!["client", "advocate", "admin", "rna", "intern"].includes(role)) {
    const error = new Error("Your role cannot track court cases.");
    error.status = 403;
    throw error;
  }
}

module.exports = {
  canSeeAll,
  assertAuthed,
  canViewTrackedCase,
  assertCanViewTrackedCase,
  assertCanTrack,
};
