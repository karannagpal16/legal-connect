/**
 * Verified Court Updates — domain service.
 */

const {
  DISCLAIMER,
  normalizeCnr,
  isValidCnr,
  computeFreshness,
  freshnessLabel,
  officialDistrictSourceUrl,
} = require("./schemas");
const { detectCourtChanges } = require("./diff-engine");
const { resolveCourtProvider, createFixtureCourtProvider, createOfficialLinkProvider, createCommercialCourtProvider, createSupremeCourtProvider } = require("./providers");
const { assertAuthed, assertCanTrack, assertCanViewTrackedCase, canSeeAll } = require("./authorization");

function createCourtSyncService({ repo, provider, writeAuditLog }) {
  const activeProvider = provider || resolveCourtProvider();

  function withFreshness(tracked) {
    if (!tracked) return null;
    const freshness = computeFreshness({
      lastSuccessAt: tracked.lastSuccessAt,
      lastSyncStatus: tracked.lastSyncStatus,
      trackingStatus: tracked.trackingStatus,
    });
    return {
      ...tracked,
      freshness,
      freshnessLabel: freshnessLabel(freshness),
      hearingConfirmed: Boolean(tracked.latestSnapshot?.hearingConfirmed),
      disclaimer: DISCLAIMER,
    };
  }

  async function getStatus() {
    const capabilities = await activeProvider.capabilities();
    return {
      feature: "Verified Court Updates",
      activeProvider: activeProvider.name,
      capabilities,
      capabilityMatrix: {
        fixture: await createFixtureCourtProvider().capabilities(),
        official_link: await createOfficialLinkProvider().capabilities(),
        commercial: await createCommercialCourtProvider().capabilities(),
        supreme_court: await createSupremeCourtProvider().capabilities(),
      },
      schedule: {
        baseline: ["06:00 IST", "18:00 IST"],
        hearingWithinSevenDays: "every 4 hours",
        hearingTodayOrTomorrow: "every 30–60 minutes (subject to provider limits)",
        disposed: "weekly",
        note: "Not real-time unless a contracted provider supplies webhooks.",
      },
      disclaimer: DISCLAIMER,
    };
  }

  async function search(user, body = {}) {
    assertCanTrack(user);
    const caps = await activeProvider.capabilities();

    if (body.cnr) {
      if (!caps.districtCnr) {
        return { results: [], unsupported: true, reason: "CNR search is not supported by the active provider.", disclaimer: DISCLAIMER };
      }
      const result = await activeProvider.searchByCnr(body.cnr);
      if (!result.found) {
        return {
          results: [],
          cnr: normalizeCnr(body.cnr),
          message: result.message || "Case not found.",
          sourceUrl: result.sourceUrl || officialDistrictSourceUrl(body.cnr),
          persisted: false,
          disclaimer: DISCLAIMER,
        };
      }
      const snap = result.snapshot;
      await writeAuditLog?.({
        actorId: user.id,
        action: "court_case_search",
        detail: { cnr: snap.cnr, provider: snap.provider },
      });
      return {
        results: [{
          providerCaseId: snap.providerCaseId,
          cnr: snap.cnr,
          courtLevel: snap.courtLevel,
          caseNumber: snap.caseNumber,
          caseType: snap.caseType,
          caseYear: snap.caseYear,
          courtName: snap.courtName,
          status: snap.status,
          stage: snap.stage,
          nextHearingDate: snap.nextHearingDate,
          hearingConfirmed: Boolean(snap.hearingConfirmed),
          courtRoom: snap.courtRoom || null,
          causeListItemNumber: snap.causeListItemNumber || null,
          judgeOrBench: snap.judgeOrBench || null,
          parties: snap.parties,
          advocates: snap.advocates,
          sourceUrl: snap.sourceUrl,
          provider: snap.provider,
          requiresManualVerification: Boolean(result.requiresManualVerification),
        }],
        persisted: false,
        note: "Search does not automatically track a case. Call track to start Verified Court Updates.",
        disclaimer: DISCLAIMER,
      };
    }

    if (body.diaryNumber && body.diaryYear) {
      if (!caps.supremeCourtSearch) {
        return { results: [], unsupported: true, reason: "Supreme Court search is not enabled yet.", disclaimer: DISCLAIMER };
      }
      const results = await activeProvider.searchSupremeCourt({
        diaryNumber: body.diaryNumber,
        diaryYear: body.diaryYear,
      });
      return { results, persisted: false, disclaimer: DISCLAIMER };
    }

    if (body.caseNumber && body.caseType && body.caseYear) {
      if (!caps.highCourtSearch) {
        return { results: [], unsupported: true, reason: "Case-number search is not supported by the active provider.", disclaimer: DISCLAIMER };
      }
      const results = await activeProvider.searchByCase(body);
      return { results, persisted: false, disclaimer: DISCLAIMER };
    }

    const error = new Error("Provide cnr, or diaryNumber+diaryYear, or caseNumber+caseType+caseYear.");
    error.status = 400;
    throw error;
  }

  async function applyProviderSnapshot(tracked, snapshot, { runType = "manual" } = {}) {
    const previous = tracked.latestSnapshot || null;
    const changes = detectCourtChanges(previous, snapshot);
    const saved = await repo.saveSnapshot(tracked.id, snapshot);
    if (saved.created) {
      await repo.insertChangeEvents(tracked.id, changes, {
        sourceUrl: snapshot.sourceUrl || null,
        oldSnapshotHash: previous?.payloadHash || null,
        newSnapshotHash: snapshot.payloadHash || null,
        runType,
      });
      await repo.upsertDocuments(tracked.id, snapshot.orders || []);
      const hearingEvents = [];
      if (snapshot.nextHearingDate) {
        hearingEvents.push({
          eventType: "hearing",
          eventDate: snapshot.nextHearingDate,
          purpose: snapshot.stage || null,
          stage: snapshot.stage || null,
          courtNumber: snapshot.courtRoom || null,
          judgeOrBench: snapshot.judgeOrBench || null,
          causeListItemNumber: snapshot.causeListItemNumber || null,
          sourceReference: snapshot.sourceUrl || null,
        });
      }
      if (hearingEvents.length) await repo.upsertHearingEvents(tracked.id, hearingEvents);
    }
    return { changed: Boolean(saved.created && changes.length), changes, snapshotId: saved.snapshotId, created: saved.created };
  }

  async function track(user, body = {}) {
    assertCanTrack(user);
    let snapshot;
    if (body.cnr) {
      if (!isValidCnr(body.cnr)) {
        const error = new Error("CNR must be exactly 16 alphanumeric characters.");
        error.status = 400;
        throw error;
      }
      const result = await activeProvider.searchByCnr(body.cnr);
      if (!result.found) {
        const error = new Error(result.message || "Case not found for tracking.");
        error.status = 404;
        throw error;
      }
      snapshot = result.snapshot;
    } else if (body.providerCaseId) {
      snapshot = await activeProvider.fetchCase(body.providerCaseId);
    } else {
      const error = new Error("cnr or providerCaseId is required.");
      error.status = 400;
      throw error;
    }

    if (body.linkedMatterId && !body.confirmLinkMatter) {
      const error = new Error("Linking to a matter requires confirmLinkMatter: true.");
      error.status = 400;
      throw error;
    }

    const { tracked, created } = await repo.upsertTracked({
      user,
      snapshot,
      linkedMatterId: body.linkedMatterId || null,
      confirmLink: Boolean(body.confirmLinkMatter),
    });

    if (!created) {
      await repo.updateTracked(tracked.id, {
        trackingStatus: "active",
        nextSyncAt: new Date().toISOString(),
        linkedMatterId: body.confirmLinkMatter ? (body.linkedMatterId || tracked.linkedMatterId) : tracked.linkedMatterId,
        sourceUrl: snapshot.sourceUrl || tracked.sourceUrl,
      });
    }

    await applyProviderSnapshot(tracked, snapshot, { runType: "track" });
    const refreshed = await repo.findTrackedById(tracked.id);
    await writeAuditLog?.({
      actorId: user.id,
      action: "court_case_track",
      detail: { caseId: tracked.id, cnr: snapshot.cnr, idempotent: !created },
    });
    return { case: withFreshness(refreshed), idempotent: !created, disclaimer: DISCLAIMER };
  }

  async function list(user) {
    assertAuthed(user);
    const rows = await repo.listTrackedForUser(user, { canSeeAllUsers: canSeeAll(user) });
    return { cases: rows.map(withFreshness), disclaimer: DISCLAIMER };
  }

  async function getDetail(user, caseId) {
    const tracked = await repo.findTrackedById(caseId);
    if (!tracked) {
      const error = new Error("Tracked court case not found.");
      error.status = 404;
      throw error;
    }
    assertCanViewTrackedCase(user, tracked);
    const [changeEvents, hearingEvents, orders] = await Promise.all([
      repo.listEvents(caseId),
      repo.listHearingEvents(caseId),
      repo.listOrders(caseId),
    ]);
    return {
      case: withFreshness(tracked),
      snapshot: tracked.latestSnapshot || null,
      hearingHistory: hearingEvents.map((row) => ({
        id: row.id,
        eventType: row.event_type || row.eventType,
        eventDate: row.event_date || row.eventDate,
        purpose: row.purpose,
        stage: row.stage,
        courtNumber: row.court_number || row.courtNumber || null,
        judgeOrBench: row.judge_or_bench || row.judgeOrBench || null,
        causeListItemNumber: row.cause_list_item_number || row.causeListItemNumber || null,
        sourceReference: row.source_reference || row.sourceReference || null,
        firstSeenAt: row.first_seen_at || row.firstSeenAt,
        lastSeenAt: row.last_seen_at || row.lastSeenAt,
      })),
      changeEvents: changeEvents.map((row) => ({
        id: row.id,
        eventType: row.event_type || row.eventType,
        severity: row.severity,
        summary: row.summary,
        oldValue: row.old_value || row.oldValue,
        newValue: row.new_value || row.newValue,
        evidence: row.evidence || row.evidence_json || {},
        createdAt: row.created_at || row.createdAt,
        notified: row.notified,
      })),
      orders: orders.map((row) => ({
        id: row.id,
        title: row.title,
        documentType: row.document_type || row.documentType,
        documentDate: row.document_date || row.documentDate,
        officialSourceUrl: row.source_url || row.sourceUrl || row.officialSourceUrl,
        isOfficial: row.official !== false && row.isOfficial !== false,
        retrievalStatus: row.retrieval_status || row.retrievalStatus,
        firstVerifiedAt: row.first_verified_at || row.firstVerifiedAt,
        lastVerifiedAt: row.last_verified_at || row.lastVerifiedAt,
      })),
      disclaimer: DISCLAIMER,
    };
  }

  async function queueSync(user, caseId) {
    const tracked = await repo.findTrackedById(caseId);
    if (!tracked) {
      const error = new Error("Tracked court case not found.");
      error.status = 404;
      throw error;
    }
    assertCanTrack(user);
    assertCanViewTrackedCase(user, tracked);

    // Rate-limit only repeated manual queues (successful syncs do not block refresh).
    if (tracked.lastSyncStatus === "queued" && tracked.lastAttemptAt) {
      const elapsed = Date.now() - new Date(tracked.lastAttemptAt).getTime();
      if (Number.isFinite(elapsed) && elapsed < 2 * 60 * 1000) {
        const error = new Error("Manual refresh is rate-limited. Try again shortly.");
        error.status = 429;
        throw error;
      }
    }

    await repo.updateTracked(caseId, {
      nextSyncAt: new Date().toISOString(),
      lastSyncStatus: "queued",
      lastAttemptAt: new Date().toISOString(),
    });
    await writeAuditLog?.({
      actorId: user.id,
      action: "court_case_sync_queued",
      detail: { caseId },
    });
    return {
      accepted: true,
      caseId,
      message: "Sync queued. Freshness updates after the worker completes.",
    };
  }

  async function untrack(user, caseId) {
    const tracked = await repo.findTrackedById(caseId);
    if (!tracked) {
      const error = new Error("Tracked court case not found.");
      error.status = 404;
      throw error;
    }
    assertCanTrack(user);
    assertCanViewTrackedCase(user, tracked);
    const updated = await repo.stopTracking(caseId);
    return { case: withFreshness(updated || { ...tracked, trackingStatus: "paused" }), disclaimer: DISCLAIMER };
  }

  async function getOrderDownload(user, orderId) {
    // Never fetch client-supplied URLs (SSRF). Only return stored official source links.
    const doc = await repo.findOrderById(orderId);
    if (!doc) {
      const error = new Error("Order not found.");
      error.status = 404;
      throw error;
    }
    assertCanViewTrackedCase(user, {
      createdBy: doc.created_by,
      viewerIds: doc.viewer_ids || [],
    });
    await writeAuditLog?.({
      actorId: user.id,
      action: "court_order_download_link",
      detail: { orderId },
    });
    return {
      orderId: doc.id,
      title: doc.title,
      documentDate: doc.document_date || doc.documentDate,
      officialSourceUrl: doc.source_url || doc.sourceUrl,
      isOfficial: doc.official !== false,
      retrievalStatus: doc.retrieval_status || doc.retrievalStatus || "link_only",
      lastVerifiedAt: doc.last_verified_at || doc.lastVerifiedAt,
      note: "Open the official court PDF directly. Legal Connect does not proxy arbitrary URLs.",
      disclaimer: DISCLAIMER,
    };
  }

  async function syncTrackedCaseById(caseId, { runType = "scheduled" } = {}) {
    const tracked = await repo.findTrackedById(caseId);
    if (!tracked || tracked.trackingStatus === "paused" || tracked.trackingStatus === "stopped") {
      return { skipped: true };
    }
    const started = Date.now();
    const run = await repo.createSyncRun(runType);
    try {
      let snapshot;
      if (tracked.providerCaseId) {
        snapshot = await activeProvider.fetchCase(tracked.providerCaseId);
      } else if (tracked.cnr) {
        const result = await activeProvider.searchByCnr(tracked.cnr);
        if (!result.found) {
          const error = new Error("Case not found at provider.");
          error.category = "unsupported";
          throw error;
        }
        snapshot = result.snapshot;
      } else {
        const error = new Error("unsupported_case");
        error.category = "unsupported";
        throw error;
      }

      const result = await applyProviderSnapshot(tracked, snapshot, { runType });
      await repo.recordSyncAttempt(run.id, caseId, {
        provider: tracked.provider || activeProvider.name,
        success: true,
        latencyMs: Date.now() - started,
        providerResponseCode: "ok",
      });
      await repo.finishSyncRun(run.id, { claimed: 1, succeeded: 1, failed: 0 });
      return result;
    } catch (error) {
      const category = error.category || (error.code === "UNSUPPORTED" || error.code === "VALIDATION" ? "unsupported" : "transient");
      await repo.markSyncFailure(caseId, category);
      if (category === "unsupported") {
        await repo.updateTracked(caseId, { trackingStatus: "unsupported", nextSyncAt: null });
      }
      await repo.recordSyncAttempt(run.id, caseId, {
        provider: tracked.provider || activeProvider.name,
        success: false,
        latencyMs: Date.now() - started,
        errorCategory: category,
        sanitizedError: String(error.message || "sync_failed").slice(0, 200),
        providerResponseCode: error.code || "error",
      });
      await repo.finishSyncRun(run.id, { claimed: 1, succeeded: 0, failed: 1 });
      if (category !== "transient") return { failed: true, category };
      throw error;
    }
  }

  async function processDueSyncJobs(limit = 10) {
    const due = await repo.claimDueCases(limit);
    const results = [];
    for (const row of due) {
      try {
        const outcome = await syncTrackedCaseById(row.id, { runType: "scheduled" });
        results.push({ caseId: row.id, ok: true, ...outcome });
      } catch (error) {
        results.push({ caseId: row.id, ok: false, error: String(error.message || "failed") });
      }
    }
    return results;
  }

  return {
    getStatus,
    search,
    track,
    list,
    getDetail,
    queueSync,
    untrack,
    getOrderDownload,
    syncTrackedCaseById,
    processDueSyncJobs,
    applyProviderSnapshot,
    provider: activeProvider,
    DISCLAIMER,
  };
}

module.exports = { createCourtSyncService };
