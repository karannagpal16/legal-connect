/**
 * Unit tests for Verified Court Updates + eCourts mirror engine.
 * Run: node artifacts/api-server/court-sync/court-sync.test.js
 */

process.env.COURT_DATA_PROVIDER = "fixture";
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const assert = require("assert");
const {
  normalizeCnr,
  isValidCnr,
  computeFreshness,
  freshnessLabel,
  officialDistrictSourceUrl,
  buildMilestones,
  buildVirtualCourtroom,
  summarizeOrderPlainLanguage,
} = require("./schemas");
const { detectCourtChanges } = require("./diff-engine");
const { createFixtureCourtProvider, createCommercialCourtProvider } = require("./providers");
const { createCourtSyncRepository } = require("./repository");
const { createCourtSyncService } = require("./service");
const { assertSafePdf, isPdfBuffer, buildFixtureOrderPdf } = require("./document-service");
const { canViewTrackedCase, assertCanTrack } = require("./authorization");

assert.strictEqual(normalizeCnr("dlct01-001234-2023"), "DLCT010012342023");
assert.ok(isValidCnr("DLCT010012342023"));
assert.ok(isValidCnr("1234567890123456"));
assert.ok(!isValidCnr("DLSA01001234202"));
assert.ok(!isValidCnr("DLSA010012342024X"));
assert.ok(officialDistrictSourceUrl("DLCT010012342023").includes("cnr=DLCT010012342023"));

assert.strictEqual(computeFreshness({ lastSuccessAt: new Date().toISOString(), lastSyncStatus: "success", trackingStatus: "active" }), "live");
assert.strictEqual(freshnessLabel("stale"), "Stale");
assert.strictEqual(computeFreshness({ trackingStatus: "unsupported" }), "sync_unavailable");

const milestones = buildMilestones({ stage: "Evidence" });
assert.strictEqual(milestones.activeIndex, 4);
assert.ok(milestones.steps.some((step) => step.state === "active" && step.label === "Evidence"));

const courtroom = buildVirtualCourtroom({
  nextHearingDate: new Date().toISOString().slice(0, 10),
  hearingConfirmed: true,
  courtRoom: "Court Room 5",
  causeListItemNumber: "18",
});
assert.ok(courtroom.liveOnCauseList);
assert.ok(courtroom.headline.includes("Item #18"));

const summary = summarizeOrderPlainLanguage({
  title: "Bail granted subject to surety",
  orderText: "Bail granted subject to ₹25,000 surety bond. Passport surrender within 48 hours.",
  nextHearingDate: "2026-09-14",
  stage: "Arguments",
});
assert.strictEqual(summary.bullets.length, 3);
assert.ok(/Bail/i.test(summary.bullets[0].text));

const changes = detectCourtChanges(
  { nextHearingDate: "2026-08-18", stage: "Evidence", orders: [] },
  { nextHearingDate: "2026-09-02", stage: "Evidence", orders: [{ id: "o1", title: "Order" }] },
);
assert.ok(changes.some((item) => item.eventType === "next_hearing_changed"));
assert.ok(changes.some((item) => item.eventType === "new_order_available"));

assert.ok(isPdfBuffer(Buffer.from("%PDF-1.4")));
assert.throws(() => assertSafePdf(Buffer.from("not-pdf")), /valid PDF/);
const pdf = buildFixtureOrderPdf({ title: "Daily order", cnr: "DLCT010012342023", orderDate: "2026-07-08" });
assert.ok(isPdfBuffer(pdf.buffer));

(async () => {
  const fixture = createFixtureCourtProvider();
  const caps = await fixture.capabilities();
  assert.ok(caps.districtCnr);
  const hit = await fixture.searchByCnr("DLCT010012342023");
  assert.ok(hit.found);
  assert.strictEqual(hit.snapshot.cnr, "DLCT010012342023");
  assert.ok(hit.snapshot.orders?.length);

  const commercial = createCommercialCourtProvider();
  await assert.rejects(() => commercial.searchByCnr("DLCT010012342023"), /does not support/);

  const repo = createCourtSyncRepository({ db: { dbAvailable: false, query: async () => ({ rows: [] }) } });
  const service = createCourtSyncService({ repo, provider: fixture, writeAuditLog: async () => undefined });
  const user = { id: "user-1", role: "advocate" };

  assertCanTrack(user);
  assert.ok(!canViewTrackedCase(user, { createdBy: "other", viewerIds: [] }));

  const search = await service.search(user, { cnr: "DLCT010012342023" });
  assert.strictEqual(search.persisted, false);
  assert.strictEqual(search.results.length, 1);
  assert.ok(search.results[0].virtualCourtroom);
  assert.ok(search.results[0].milestones);

  const tracked = await service.track(user, { cnr: "DLCT010012342023" });
  assert.ok(tracked.case.id);
  assert.strictEqual(tracked.idempotent, false);

  const again = await service.track(user, { cnr: "DLCT010012342023" });
  assert.strictEqual(again.idempotent, true);
  assert.strictEqual(again.case.id, tracked.case.id);

  const list = await service.list(user);
  assert.strictEqual(list.cases.length, 1);
  assert.ok(Array.isArray(list.causeListToday));
  assert.ok(list.causeListToday.length >= 1);

  const detail = await service.getDetail(user, tracked.case.id);
  assert.ok(detail.virtualCourtroom);
  assert.ok(detail.milestones);
  assert.ok(detail.orders.length);

  const ai = await service.generateOrderAiSummary(user, detail.orders[0].id);
  assert.strictEqual(ai.aiSummary.bullets.length, 3);

  const pdfStream = await service.streamOrderPdf(user, detail.orders[0].id);
  assert.strictEqual(pdfStream.mode, "stream");
  assert.ok(isPdfBuffer(pdfStream.buffer));

  const queued = await service.queueSync(user, tracked.case.id);
  assert.ok(queued.accepted);
  await assert.rejects(() => service.queueSync(user, tracked.case.id), (error) => error.status === 429);

  const status = await service.getStatus();
  assert.ok(status.engine.includes("eCourts"));
  assert.ok(status.demoCnrs.includes("DLCT010012342023"));

  console.log("court-sync.test.js: all assertions passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
