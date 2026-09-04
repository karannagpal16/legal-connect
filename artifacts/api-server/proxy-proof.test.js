const assert = require("assert");
const {
  hashProxyProof,
  findConflictingProofRow,
  PROOF_REUSE_ERROR,
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

console.log("proxy-proof.test.js OK");
