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
let rawBody = Buffer.from("order-sheet-bytes");
const responses = [];
const config = {
  nodeEnv: "test",
  cloudinaryCloudName: "demo",
  cloudinaryApiKey: "key",
  cloudinaryApiSecret: "secret",
};

let jsonBody = {};
const originalFetch = global.fetch;
global.fetch = () => Promise.reject(new Error("cloudinary hang"));

const features = createStrategyFeatures({
  db: { dbAvailable: false, query: async () => ({ rows: [] }) },
  config,
  notify: async () => ({}),
  resolveRecipients: async () => [],
  resolveAdminRecipients: async () => [{ id: "admin", role: "admin" }],
  portalUrl: (path) => path,
  sendJson: (res, code, body) => {
    res.statusCode = code;
    res.body = body;
    responses.push({ code, body });
  },
  readBody: async () => jsonBody,
  readRawBody: async () => rawBody,
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

  demoStore.tasks.push({
    id: "task-admin-upload",
    title: "Pass-over · Saket",
    postedBy: "priya",
    acceptedBy: "karan",
    checkedInAt: new Date().toISOString(),
    status: "Checked In",
    proofStatus: "window_open",
    escrowStatus: "Locked",
  });
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  rawBody = jpegBytes;
  authUser = { id: "ops", role: "admin", name: "LC Admin" };
  const adminPostUrl = new URL("http://localhost/api/tasks/task-admin-upload/proof");
  const adminPost = mockRes();
  const started = Date.now();
  const adminPosted = await features.handleStrategyRoutes({
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-file-name": "blob" },
    url: adminPostUrl.pathname,
  }, adminPost, adminPostUrl);
  assert.strictEqual(adminPosted, true);
  assert.strictEqual(adminPost.statusCode, 200, "admin upload must succeed even when not the assigned proxy");
  assert.ok(Date.now() - started < 1500, "upload must not wait on Cloudinary");
  assert.strictEqual(demoStore.tasks[1]._proofFile.mimeType, "image/jpeg", "magic bytes must identify a camera JPEG");

  authUser = { id: "karan", role: "advocate", name: "Karan" };
  const proxyView = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: adminPostUrl.pathname }, proxyView, adminPostUrl);
  assert.strictEqual(proxyView.statusCode, 200, "assigned proxy must see the admin-uploaded scan");

  authUser = { id: "priya", role: "advocate", name: "Priya" };
  const posterView = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: adminPostUrl.pathname }, posterView, adminPostUrl);
  assert.strictEqual(posterView.statusCode, 200, "main counsel must see the scan");

  demoStore.tasks.push({
    id: "task-family",
    title: "Pass-over · Saket",
    postedBy: "karan",
    acceptedBy: "karan",
    checkedInAt: new Date().toISOString(),
    status: "Checked In",
    proofStatus: "window_open",
    escrowStatus: "Locked",
  });
  const familyJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
  jsonBody = { base64: familyJpeg.toString("base64"), fileName: "order-sheet.jpg" };
  authUser = { id: "karan", role: "admin", name: "Karan Nagpal" };
  const familyUrl = new URL("http://localhost/api/tasks/task-family/proof");
  const familyPost = mockRes();
  await features.handleStrategyRoutes({
    method: "POST",
    headers: { "content-type": "application/json" },
    url: familyUrl.pathname,
  }, familyPost, familyUrl);
  assert.strictEqual(familyPost.statusCode, 200, "same-person admin/proxy/poster upload must succeed");

  authUser = { id: "karan", role: "advocate", name: "Karan Nagpal" };
  const familyAdvocateView = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: familyUrl.pathname }, familyAdvocateView, familyUrl);
  assert.strictEqual(familyAdvocateView.statusCode, 200, "Karan as counsel must see his own scan");
  assert.deepStrictEqual(familyAdvocateView.body, familyJpeg);

  authUser = { id: "karan", role: "admin", name: "Karan Nagpal" };
  const familyAdminView = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: familyUrl.pathname }, familyAdminView, familyUrl);
  assert.strictEqual(familyAdminView.statusCode, 200, "Karan as admin must see the scan");

  console.log("proxy-proof-view.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => {
  if (originalFetch) global.fetch = originalFetch;
});
