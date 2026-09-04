const assert = require("assert");
const { createStrategyFeatures } = require("./strategy-features");

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers || {};
    },
    end(body) {
      this.body = body;
    },
  };
}

const demoStore = {
  tasks: [{
    id: "task-live",
    title: "Pass-over · PHC",
    postedBy: "priya",
    acceptedBy: "karan",
    checkedInAt: new Date().toISOString(),
    status: "Checked In",
    proofStatus: "window_open",
    escrowStatus: "Locked",
  }],
};

let authUser = { id: "karan", role: "advocate", name: "Karan" };
const responses = [];

const features = createStrategyFeatures({
  db: { dbAvailable: false, query: async () => ({ rows: [] }) },
  config: { nodeEnv: "test" },
  notify: async () => ({}),
  resolveRecipients: async () => [],
  resolveAdminRecipients: async () => [{ id: "admin", role: "admin" }],
  portalUrl: (path) => path,
  sendJson: (res, code, body) => {
    res.statusCode = code;
    res.body = body;
    responses.push({ code, body });
  },
  readBody: async () => ({}),
  readRawBody: async () => Buffer.from("order-sheet-bytes"),
  getAuthUser: () => authUser,
  canSeeAll: (user) => user && ["admin", "rna"].includes(user.role),
  canAccessStoredCase: () => false,
  mapTask: (row) => ({
    ...row,
    id: row.id,
    postedBy: row.postedBy,
    acceptedBy: row.acceptedBy,
    proofStatus: row.proofStatus,
    proofUrl: row.proofUrl,
    proofStored: row.proofStored,
    hasProof: Boolean(row.proofStored || row.proofUrl),
  }),
  mapCase: (row) => row,
  writeAuditLog: async () => undefined,
  createReceipt: async () => ({}),
  escapeHtml: (value) => String(value || ""),
  sendEmail: async () => ({}),
  demoStore,
  isUuid: () => false,
  safeAttachmentName: (name) => String(name || "order-sheet.pdf").replace(/[^\w.\-]+/g, "_"),
  dispatchSms: async () => ({}),
  settlementLedger: {},
});

(async () => {
  const url = new URL("http://localhost/api/tasks/task-live/proof");
  const postRes = mockRes();
  const posted = await features.handleStrategyRoutes({
    method: "POST",
    headers: { "content-type": "image/jpeg", "x-file-name": "sheet.jpg" },
    url: url.pathname,
  }, postRes, url);
  assert.strictEqual(posted, true);
  assert.strictEqual(postRes.statusCode, 200, "proxy upload must succeed");
  assert.strictEqual(postRes.body.ok, true);
  assert.strictEqual(postRes.body.proofViewUrl, "/api/tasks/task-live/proof");
  assert.ok(demoStore.tasks[0]._proofFile?.buffer?.length, "bytes must stay on the mission");
  assert.strictEqual(demoStore.tasks[0].proofStored, true);

  authUser = { id: "admin", role: "admin", name: "LC Admin" };
  const adminRes = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: url.pathname }, adminRes, url);
  assert.strictEqual(adminRes.statusCode, 200, "admin must open the scan");
  assert.ok(Buffer.isBuffer(adminRes.body));
  assert.strictEqual(adminRes.body.toString(), "order-sheet-bytes");
  assert.ok(String(adminRes.headers["Content-Disposition"]).includes("inline"));

  authUser = { id: "priya", role: "advocate", name: "Priya" };
  const posterRes = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: url.pathname }, posterRes, url);
  assert.strictEqual(posterRes.statusCode, 200, "posting counsel must open the scan");

  authUser = { id: "stranger", role: "advocate", name: "Other" };
  const strangerRes = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: url.pathname }, strangerRes, url);
  assert.strictEqual(strangerRes.statusCode, 403);

  console.log("proxy-proof-view.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
