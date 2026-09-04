const assert = require("assert");
const {
  hashProxyProof,
  findConflictingProofRow,
  canViewTaskProof,
  proofViewPath,
  inferProofMime,
  isAllowedProofMime,
  isViewableProofStatus,
  PROOF_REUSE_ERROR,
  PROOF_MISSING_ERROR,
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
assert.strictEqual(proofViewPath("abc-123"), "/api/tasks/abc-123/proof");
assert.ok(isViewableProofStatus("submitted"));
assert.ok(isViewableProofStatus("lc_verified"));
assert.ok(!isViewableProofStatus("window_open"));
assert.strictEqual(inferProofMime("image/jpeg", "scan.jpg"), "image/jpeg");
assert.strictEqual(inferProofMime("application/octet-stream", "order-sheet.pdf"), "application/pdf");
assert.ok(isAllowedProofMime("application/pdf"));
assert.ok(isAllowedProofMime("image/png"));
assert.ok(!isAllowedProofMime("application/zip"));
assert.ok(PROOF_MISSING_ERROR.includes("re-upload"));

console.log("proxy-proof.test.js OK");
