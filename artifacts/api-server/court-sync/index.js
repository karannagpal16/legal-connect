/**
 * Verified Court Updates module — routes + factory.
 */

const { createCourtSyncRepository } = require("./repository");
const { createCourtSyncService } = require("./service");
const { resolveCourtProvider } = require("./providers");
const { rateLimit } = require("../security");

function createCourtSync({ db, sendJson, readBody, getAuthUser, writeAuditLog }) {
  const repo = createCourtSyncRepository({ db });
  const provider = resolveCourtProvider(process.env.COURT_DATA_PROVIDER || "fixture");
  const service = createCourtSyncService({ repo, provider, writeAuditLog });

  function sendError(res, error, fallbackStatus = 500) {
    const status = error.status || fallbackStatus;
    const message = status >= 500
      ? "Court updates temporarily unavailable."
      : (error.message || "Request failed.");
    sendJson(res, status, { error: message, code: error.code || undefined });
  }

  async function handleCourtRoutes(req, res, url) {
    const path = url.pathname;

    if (path === "/api/court-sync/status" && req.method === "GET") {
      try {
        const user = getAuthUser(req);
        if (!user?.id) {
          sendJson(res, 401, { error: "Login is required." });
          return true;
        }
        sendJson(res, 200, await service.getStatus());
      } catch (error) {
        sendError(res, error);
      }
      return true;
    }

    if (path === "/api/court-cases/search" && req.method === "POST") {
      try {
        const user = getAuthUser(req);
        if (!user?.id) {
          sendJson(res, 401, { error: "Login is required." });
          return true;
        }
        const limited = rateLimit(`court-search:${user.id}`, { windowMs: 60_000, max: 30 });
        if (!limited.allowed) {
          sendJson(res, 429, { error: "Too many court searches. Try again shortly." });
          return true;
        }
        const body = await readBody(req);
        sendJson(res, 200, await service.search(user, body));
      } catch (error) {
        sendError(res, error, error.status || 400);
      }
      return true;
    }

    if (path === "/api/court-cases/track" && req.method === "POST") {
      try {
        const user = getAuthUser(req);
        if (!user?.id) {
          sendJson(res, 401, { error: "Login is required." });
          return true;
        }
        const body = await readBody(req);
        sendJson(res, 200, await service.track(user, body));
      } catch (error) {
        sendError(res, error, error.status || 400);
      }
      return true;
    }

    if (path === "/api/court-cases" && req.method === "GET") {
      try {
        const user = getAuthUser(req);
        if (!user?.id) {
          sendJson(res, 401, { error: "Login is required." });
          return true;
        }
        sendJson(res, 200, await service.list(user));
      } catch (error) {
        sendError(res, error);
      }
      return true;
    }

    const caseMatch = path.match(/^\/api\/court-cases\/([^/]+)(?:\/(sync|tracking|events|orders))?$/);
    if (caseMatch) {
      const caseId = decodeURIComponent(caseMatch[1]);
      const action = caseMatch[2] || null;

      if (!action && req.method === "GET") {
        try {
          const user = getAuthUser(req);
          if (!user?.id) {
            sendJson(res, 401, { error: "Login is required." });
            return true;
          }
          sendJson(res, 200, await service.getDetail(user, caseId));
        } catch (error) {
          sendError(res, error, error.status || 404);
        }
        return true;
      }

      if (action === "sync" && req.method === "POST") {
        try {
          const user = getAuthUser(req);
          if (!user?.id) {
            sendJson(res, 401, { error: "Login is required." });
            return true;
          }
          const result = await service.queueSync(user, caseId);
          sendJson(res, 202, result);
        } catch (error) {
          sendError(res, error, error.status || 400);
        }
        return true;
      }

      if (action === "tracking" && req.method === "DELETE") {
        try {
          const user = getAuthUser(req);
          if (!user?.id) {
            sendJson(res, 401, { error: "Login is required." });
            return true;
          }
          sendJson(res, 200, await service.untrack(user, caseId));
        } catch (error) {
          sendError(res, error, error.status || 400);
        }
        return true;
      }

      if ((action === "events" || action === "orders") && req.method === "GET") {
        try {
          const user = getAuthUser(req);
          if (!user?.id) {
            sendJson(res, 401, { error: "Login is required." });
            return true;
          }
          const detail = await service.getDetail(user, caseId);
          if (action === "events") {
            sendJson(res, 200, {
              hearingHistory: detail.hearingHistory,
              changeEvents: detail.changeEvents,
              disclaimer: detail.disclaimer,
            });
          } else {
            sendJson(res, 200, { orders: detail.orders, disclaimer: detail.disclaimer });
          }
        } catch (error) {
          sendError(res, error, error.status || 404);
        }
        return true;
      }
    }

    const orderMatch = path.match(/^\/api\/court-orders\/([^/]+)\/download$/);
    if (orderMatch && req.method === "GET") {
      try {
        const user = getAuthUser(req);
        if (!user?.id) {
          sendJson(res, 401, { error: "Login is required." });
          return true;
        }
        sendJson(res, 200, await service.getOrderDownload(user, decodeURIComponent(orderMatch[1])));
      } catch (error) {
        sendError(res, error, error.status || 404);
      }
      return true;
    }

    return false;
  }

  return {
    ensureSchema: () => repo.ensureSchema(),
    handleCourtRoutes,
    processDueSyncJobs: (limit) => service.processDueSyncJobs(limit),
    syncTrackedCaseById: (caseId, opts) => service.syncTrackedCaseById(caseId, opts),
    service,
    repo,
  };
}

module.exports = { createCourtSync };
