/**
 * Verified Court Updates module — routes + factory.
 * Includes /api/court-sync/* aliases for the Real eCourts mirror engine.
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

  function requireUser(req, res) {
    const user = getAuthUser(req);
    if (!user?.id) {
      sendJson(res, 401, { error: "Login is required." });
      return null;
    }
    return user;
  }

  async function handleCourtRoutes(req, res, url) {
    const path = url.pathname;

    if (path === "/api/court-sync/status" && req.method === "GET") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        sendJson(res, 200, await service.getStatus());
      } catch (error) {
        sendError(res, error);
      }
      return true;
    }

    // Alias: POST /api/court-sync/search-cnr
    if (
      ((path === "/api/court-cases/search" || path === "/api/court-sync/search-cnr" || path === "/api/court-sync/search-case")
        && req.method === "POST")
    ) {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        const limited = rateLimit(`court-search:${user.id}`, { windowMs: 60_000, max: 30 });
        if (!limited.allowed) {
          sendJson(res, 429, { error: "Too many court searches. Try again shortly." });
          return true;
        }
        const body = await readBody(req);
        const normalized = {
          ...body,
          cnr: body.cnr || body.cnrNumber || body.cnr_number,
          diaryNumber: body.diaryNumber || body.diaryNo || body.diary_number,
          diaryYear: body.diaryYear || body.diary_year || body.year,
          caseNumber: body.caseNumber || body.case_number,
          caseType: body.caseType || body.case_type,
          caseYear: body.caseYear || body.case_year || body.year,
          courtLevel: body.courtLevel || body.court_type || body.courtType,
          stateCode: body.stateCode || body.state || body.state_code,
        };
        if (path === "/api/court-sync/search-cnr" && !normalized.cnr) {
          sendJson(res, 400, { error: "cnrNumber is required." });
          return true;
        }
        sendJson(res, 200, await service.search(user, normalized));
      } catch (error) {
        sendError(res, error, error.status || 400);
      }
      return true;
    }

    if ((path === "/api/court-cases/track" || path === "/api/court-sync/track") && req.method === "POST") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        const body = await readBody(req);
        sendJson(res, 200, await service.track(user, {
          ...body,
          cnr: body.cnr || body.cnrNumber || body.cnr_number,
        }));
      } catch (error) {
        sendError(res, error, error.status || 400);
      }
      return true;
    }

    if ((path === "/api/court-cases" || path === "/api/court-sync/cases") && req.method === "GET") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        sendJson(res, 200, await service.list(user));
      } catch (error) {
        sendError(res, error);
      }
      return true;
    }

    const syncCaseDelete = path.match(/^\/api\/court-sync\/cases\/([^/]+)$/);
    if (syncCaseDelete && req.method === "DELETE") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        sendJson(res, 200, await service.untrack(user, decodeURIComponent(syncCaseDelete[1])));
      } catch (error) {
        sendError(res, error, error.status || 400);
      }
      return true;
    }

    const caseMatch = path.match(/^\/api\/court-cases\/([^/]+)(?:\/(sync|tracking|events|orders))?$/);
    if (caseMatch) {
      const caseId = decodeURIComponent(caseMatch[1]);
      const action = caseMatch[2] || null;

      if (!action && req.method === "GET") {
        try {
          const user = requireUser(req, res);
          if (!user) return true;
          sendJson(res, 200, await service.getDetail(user, caseId));
        } catch (error) {
          sendError(res, error, error.status || 404);
        }
        return true;
      }

      if (action === "sync" && req.method === "POST") {
        try {
          const user = requireUser(req, res);
          if (!user) return true;
          const result = await service.queueSync(user, caseId);
          sendJson(res, 202, result);
        } catch (error) {
          sendError(res, error, error.status || 400);
        }
        return true;
      }

      if (action === "tracking" && req.method === "DELETE") {
        try {
          const user = requireUser(req, res);
          if (!user) return true;
          sendJson(res, 200, await service.untrack(user, caseId));
        } catch (error) {
          sendError(res, error, error.status || 400);
        }
        return true;
      }

      if ((action === "events" || action === "orders") && req.method === "GET") {
        try {
          const user = requireUser(req, res);
          if (!user) return true;
          const detail = await service.getDetail(user, caseId);
          if (action === "events") {
            sendJson(res, 200, {
              hearingHistory: detail.hearingHistory,
              changeEvents: detail.changeEvents,
              milestones: detail.milestones,
              virtualCourtroom: detail.virtualCourtroom,
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

    const orderDownload = path.match(/^\/api\/court-orders\/([^/]+)\/download$/);
    if (orderDownload && req.method === "GET") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        sendJson(res, 200, await service.getOrderDownload(user, decodeURIComponent(orderDownload[1])));
      } catch (error) {
        sendError(res, error, error.status || 404);
      }
      return true;
    }

    const orderPdf = path.match(/^\/api\/court-sync\/orders\/([^/]+)\/pdf$/);
    if (orderPdf && req.method === "GET") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        const result = await service.streamOrderPdf(user, decodeURIComponent(orderPdf[1]));
        if (result.mode === "redirect") {
          sendJson(res, 200, result);
          return true;
        }
        res.writeHead(200, {
          "Content-Type": result.mimeType || "application/pdf",
          "Content-Disposition": `${result.contentDisposition || "attachment"}; filename="${result.filename || "order.pdf"}"`,
          "Content-Length": result.buffer.length,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        });
        res.end(result.buffer);
      } catch (error) {
        sendError(res, error, error.status || 404);
      }
      return true;
    }

    const orderAi = path.match(/^\/api\/court-sync\/orders\/([^/]+)\/ai$/);
    if (orderAi && req.method === "POST") {
      try {
        const user = requireUser(req, res);
        if (!user) return true;
        sendJson(res, 200, await service.generateOrderAiSummary(user, decodeURIComponent(orderAi[1])));
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
