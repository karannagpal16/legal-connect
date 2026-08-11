/**
 * Unit tests for Verified Court Updates foundation.
 * Run: node artifacts/api-server/court-sync/court-sync.test.js
 */

process.env.COURT_DATA_PROVIDER = "fixture";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const assert = require("assert");
const { normalizeCnr, isValidCnr, computeFreshness, freshnessLabel, officialDistrictSourceUrl } = require("./schemas");
const { detectCourtChanges } = require("./diff-engine");
const { createFixtureCourtProvider, createCommercialCourtProvider } = require("./providers");
const { createCourtSyncRepository } = require("./repository");
const { createCourtSyncService } = require("./service");
const { assertSafePdf, isPdfBuffer } = require("./document-service");
const { canViewTrackedCase, assertCanTrack } = require("./authorization");

assert.strictEqual(normalizeCnr("dlsa01-001234-2024"), "DLSA010012342024");
assert.ok(isValidCnr("DLSA010012342024"));
assert.ok(isValidCnr("1234567890123456"));
assert.ok(!isValidCnr("DLSA01001234202")); // 15 chars
assert.ok(!isValidCnr("DLSA010012342024X")); // 17 chars
assert.ok(officialDistrictSourceUrl("DLSA010012342024").includes("cnr=DLSA010012342024"));

assert.strictEqual(computeFreshness({ lastSuccessAt: new Date().toISOString(), lastSyncStatus: "success", trackingStatus: "active" }), "live");
assert.strictEqual(freshnessLabel("stale"), "Stale");
assert.strictEqual(computeFreshness({ trackingStatus: "unsupported" }), "sync_unavailable");

const changes = detectCourtChanges(
  { nextHearingDate: "2026-08-18", stage: "Evidence", orders: [] },
  { nextHearingDate: "2026-09-02", stage: "Evidence", orders: [{ id: "o1", title: "Order" }] },
);
assert.ok(changes.some((item) => item.eventType === "next_hearing_changed"));
assert.ok(changes.some((item) => item.eventType === "new_order_available"));
const noop = detectCourtChanges(
  { nextHearingDate: "2026-08-18", stage: "Evidence", orders: [{ id: "o1" }] },
  { nextHearingDate: "2026-08-18", stage: "Evidence", orders: [{ id: "o1" }] },
);
assert.strictEqual(noop.length, 0);

assert.ok(isPdfBuffer(Buffer.from("%PDF-1.4")));
assert.throws(() => assertSafePdf(Buffer.from("not-pdf")), /valid PDF/);

(async () => {
  const fixture = createFixtureCourtProvider();
  const caps = await fixture.capabilities();
  assert.ok(caps.districtCnr);
  const hit = await fixture.searchByCnr("DLSA010012342024");
  assert.ok(hit.found);
  assert.strictEqual(hit.snapshot.cnr, "DLSA010012342024");

  const commercial = createCommercialCourtProvider();
  await assert.rejects(() => commercial.searchByCnr("DLSA010012342024"), /does not support/);

  const repo = createCourtSyncRepository({ db: { dbAvailable: false, query: async () => ({ rows: [] }) } });
  const service = createCourtSyncService({ repo, provider: fixture, writeAuditLog: async () => undefined });
  const user = { id: "user-1", role: "advocate" };

  assertCanTrack(user);
  assert.ok(!canViewTrackedCase(user, { createdBy: "other", viewerIds: [] }));

  const search = await service.search(user, { cnr: "DLSA010012342024" });
  assert.strictEqual(search.persisted, false);
  assert.strictEqual(search.results.length, 1);

  const tracked = await service.track(user, { cnr: "DLSA010012342024" });
  assert.ok(tracked.case.id);
  assert.strictEqual(tracked.idempotent, false);

  const again = await service.track(user, { cnr: "DLSA010012342024" });
  assert.strictEqual(again.idempotent, true);
  assert.strictEqual(again.case.id, tracked.case.id);

  const list = await service.list(user);
  assert.strictEqual(list.cases.length, 1);
  assert.ok(list.cases[0].freshness);

  const detail = await service.getDetail(user, tracked.case.id);
  assert.ok(detail.snapshot || detail.case.latestSnapshot);
  assert.ok(Array.isArray(detail.orders));

  const queued = await service.queueSync(user, tracked.case.id);
  assert.ok(queued.accepted);

  // Second queue within 2 minutes should rate-limit (last_attempt was just set by track sync)
  await assert.rejects(() => service.queueSync(user, tracked.case.id), (error) => error.status === 429);

  const status = await service.getStatus();
  assert.strictEqual(status.feature, "Verified Court Updates");
  assert.ok(status.capabilityMatrix.commercial);

  console.log("court-sync.test.js: all assertions passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
