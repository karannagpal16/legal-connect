const assert = require("assert");
const {
  hashProxyProof,
  findConflictingProofRow,
  canViewTaskProof,
  proofViewPath,
  inferProofMime,
  sniffProofMime,
  isAllowedProofMime,
  isViewableProofStatus,
  resolveTaskParties,
  resolveProofStatus,
  decodeProofFileName,
  PROOF_REUSE_ERROR,
  PROOF_MISSING_ERROR,
  PROOF_MAX_BYTES,
} = require("./proxy-proof");

const hash = hashProxyProof({ buffer: Buffer.from("order-sheet-bytes") });
assert.strictEqual(hash.length, 64);
assert.strictEqual(hashProxyProof({ buffer: Buffer.from("order-sheet-bytes") }), hash);
assert.notStrictEqual(hashProxyProof({ buffer: Buffer.from("other") }), hash);

const current = {
  taskId: "task-live",
  proofHash: hash,
  postedBy: "priya",
  bookingId: "LCBK-20260904-45FC6814",
  cnr: "DLCT01-000123-2024",
};

assert.strictEqual(
  findConflictingProofRow(current, [{ id: "task-live", proofHash: hash, postedBy: "priya" }]),
  null,
  "retry on the same mission must succeed",
);

assert.strictEqual(
  findConflictingProofRow(current, [{
    id: "task-old",
    proofHash: hash,
    postedBy: "priya",
    payload: { bookingId: "LCBK-20260904-45FC6814" },
  }]),
  null,
  "same booking_id is the same lock",
);

assert.strictEqual(
  findConflictingProofRow(current, [{
    id: "task-retry",
    proofHash: hash,
    postedBy: "priya",
    cnr: "DLCT01 000123 2024",
  }]),
  null,
  "same CNR may re-attach the same order sheet",
);

assert.strictEqual(
  findConflictingProofRow(current, [{
    id: "task-cancelled",
    proofHash: hash,
    postedBy: "other",
    status: "Cancelled",
  }]),
  null,
  "cancelled missions do not occupy a scan",
);

assert.strictEqual(
  findConflictingProofRow(current, [{
    id: "task-rejected",
    proofHash: hash,
    postedBy: "other",
    proofStatus: "rejected",
  }]),
  null,
  "rejected scans do not occupy the hash",
);

assert.strictEqual(
  findConflictingProofRow(current, [{
    id: "task-priya-open",
    proofHash: hash,
    postedBy: "priya",
    status: "Checked In",
    escrowStatus: "Locked",
    cnr: "OTHERCNR9999",
  }]),
  null,
  "same posting counsel may reuse a scan on in-progress tests",
);

const released = findConflictingProofRow(current, [{
  id: "task-paid-out",
  proofHash: hash,
  postedBy: "priya",
  escrowStatus: "Released",
  cnr: "OTHERCNR9999",
}]);
assert.ok(released, "a scan that already paid out cannot unlock a second lock");

const otherCounsel = findConflictingProofRow(current, [{
  id: "task-stranger",
  proofHash: hash,
  postedBy: "stranger",
  status: "Proof Uploaded",
  escrowStatus: "Locked",
  cnr: "OTHERCNR9999",
}]);
assert.ok(otherCounsel, "a live scan from another counsel must stay unique");
assert.ok(PROOF_REUSE_ERROR.includes("fresh scan"));

const task = { id: "task-1", postedBy: "priya", acceptedBy: "karan" };
assert.strictEqual(canViewTaskProof({ role: "admin", id: "ops" }, task), true);
assert.strictEqual(canViewTaskProof({ role: "rna", id: "ops" }, task), true);
assert.strictEqual(canViewTaskProof({ role: "advocate", id: "priya" }, task), true, "posting counsel can open the scan");
assert.strictEqual(canViewTaskProof({ role: "advocate", id: "karan" }, task), true, "assigned proxy can open the scan");
assert.strictEqual(canViewTaskProof({ role: "advocate", id: "stranger" }, task), false);
assert.strictEqual(canViewTaskProof(null, task), false);
const familySmoke = { id: "task-saket", postedBy: "karan", acceptedBy: "karan" };
assert.strictEqual(canViewTaskProof({ role: "admin", id: "karan" }, familySmoke), true, "admin who is also counsel can open the scan");
assert.strictEqual(canViewTaskProof({ role: "advocate", id: "karan" }, familySmoke), true, "same person as main and proxy counsel can open the scan");
assert.strictEqual(proofViewPath("abc-123"), "/api/tasks/abc-123/proof");
assert.ok(isViewableProofStatus("submitted"));
assert.ok(isViewableProofStatus("lc_verified"));
assert.ok(!isViewableProofStatus("window_open"));
assert.strictEqual(inferProofMime("image/jpeg", "scan.jpg"), "image/jpeg");
assert.strictEqual(inferProofMime("application/octet-stream", "order-sheet.pdf"), "application/pdf");
assert.strictEqual(sniffProofMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "application/octet-stream", "blob"), "image/jpeg");
assert.strictEqual(sniffProofMime(Buffer.from("%PDF-1.4"), "application/octet-stream", "blob"), "application/pdf");
assert.ok(isAllowedProofMime("application/pdf"));
assert.ok(isAllowedProofMime("image/png"));
assert.ok(!isAllowedProofMime("application/zip"));
assert.ok(PROOF_MISSING_ERROR.includes("re-upload"));
assert.ok(PROOF_MAX_BYTES >= 8 * 1024 * 1024);

const pgRow = {
  id: "b543bb9f-eaac-4f62-9616-1f4cb8a5b6b8",
  posted_by: "karan",
  accepted_by: "karan",
  proof_status: "none",
  payload: {
    postedBy: "karan",
    acceptedBy: "karan",
    checkedInAt: "2026-09-08T05:00:00.000Z",
    proofStatus: "window_open",
  },
};
const pgParties = resolveTaskParties(pgRow);
assert.strictEqual(pgParties.postedBy, "karan");
assert.strictEqual(pgParties.acceptedBy, "karan");
assert.strictEqual(pgParties.checkedInAt, "2026-09-08T05:00:00.000Z");
assert.strictEqual(resolveProofStatus(pgRow), "window_open", "column 'none' must not hide payload proofStatus");
assert.strictEqual(canViewTaskProof({ role: "advocate", id: "karan" }, pgRow), true);

const demoRow = {
  id: "task-demo",
  postedBy: "priya",
  acceptedBy: "karan",
  checkedInAt: "2026-09-08T06:00:00.000Z",
  proofStatus: "window_open",
};
const demoParties = resolveTaskParties(demoRow);
assert.strictEqual(demoParties.postedBy, "priya", "camelCase demo rows must keep posting counsel");
assert.strictEqual(demoParties.acceptedBy, "karan", "camelCase demo rows must keep assigned proxy");
assert.strictEqual(demoParties.checkedInAt, "2026-09-08T06:00:00.000Z");
assert.strictEqual(decodeProofFileName("order%20sheet.jpg"), "order sheet.jpg");

console.log("proxy-proof.test.js OK");
