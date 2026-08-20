/**
 * Notification delivery helpers (idempotent recipient scoping lives in platform-events).
 */
function createNotificationsService() {
  return {
    /** Placeholder for Phase 5 failed-notification queue processing. */
    async listFailed() {
      return [];
    },
  };
}

module.exports = { createNotificationsService };
