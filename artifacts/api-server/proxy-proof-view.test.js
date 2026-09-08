const assert = require("assert");
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "legal-connect-proof-view-test-secret-32ch";
const { createStrategyFeatures } = require("./strategy-features");
const { resolveTaskParties, resolveProofStatus } = require("./proxy-proof");
const { encryptBuffer, decryptBuffer } = require("./security");

/** Same identity mapping production loadTask uses — do not stub postedBy/acceptedBy. */
function mapTask(row) {
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
    ? row.payload
    : {};
  const parties = resolveTaskParties(row);
  return {
    ...payload,
    ...row,
    id: row.id,
    postedBy: parties.postedBy,
    acceptedBy: parties.acceptedBy,
    checkedInAt: parties.checkedInAt,
    conflictDeclaredAt: parties.conflictDeclaredAt,
    proxyAcceptedAt: parties.proxyAcceptedAt,
    proofStatus: resolveProofStatus(row),
    proofUrl: row.proofUrl,
    proofStored: row.proofStored,
    hasProof: Boolean(row.proofStored || row.proofUrl || row._proofFile),
  };
}

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
  mapTask,
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
  encryptBuffer,
  decryptBuffer,
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

  demoStore.tasks.push({
    id: "b543bb9f-eaac-4f62-9616-1f4cb8a5b6b8",
    title: "Pass-over · Saket",
    posted_by: "priya",
    accepted_by: "karan",
    proof_status: "none",
    status: "Checked In",
    escrow_status: "Locked",
    payload: {
      checkedInAt: new Date().toISOString(),
      postedBy: "priya",
      acceptedBy: "karan",
      proofStatus: "window_open",
      bookingId: "LCBK-20260908-589C1AFA",
      cnr: "DL12456790",
    },
  });
  const saketJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]);
  jsonBody = {};
  rawBody = saketJpeg;
  authUser = { id: "karan", role: "advocate", name: "Karan Nagpal" };
  const saketUrl = new URL("http://localhost/api/tasks/b543bb9f-eaac-4f62-9616-1f4cb8a5b6b8/proof");
  const saketPost = mockRes();
  await features.handleStrategyRoutes({
    method: "POST",
    headers: { "content-type": "application/octet-stream", "x-file-name": "order%20sheet.jpg" },
    url: saketUrl.pathname,
  }, saketPost, saketUrl);
  assert.strictEqual(saketPost.statusCode, 200, "postgres-shaped checked-in mission must accept proxy upload");
  assert.strictEqual(saketPost.body.ok, true);
  assert.ok(saketPost.body.proofViewUrl.includes("b543bb9f"));

  authUser = { id: "priya", role: "advocate", name: "Priya Nagpal" };
  const saketPoster = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: saketUrl.pathname }, saketPoster, saketUrl);
  assert.strictEqual(saketPoster.statusCode, 200, "main counsel must open the postgres-shaped scan");
  assert.deepStrictEqual(saketPoster.body, saketJpeg);

  authUser = { id: "ops", role: "admin", name: "LC Admin" };
  const saketAdmin = mockRes();
  await features.handleStrategyRoutes({ method: "GET", headers: {}, url: saketUrl.pathname }, saketAdmin, saketUrl);
  assert.strictEqual(saketAdmin.statusCode, 200, "admin must open the postgres-shaped scan");

  const encryptedProofs = new Map();
  const pgTask = {
    id: "task-encrypted",
    title: "Pass-over · Saket",
    posted_by: "priya",
    accepted_by: "karan",
    proof_status: "window_open",
    status: "Checked In",
    escrow_status: "Locked",
    payload: {
      checkedInAt: new Date().toISOString(),
      postedBy: "priya",
      acceptedBy: "karan",
    },
  };
  const pgDb = {
    dbAvailable: true,
    query: async (sql, params = []) => {
      const text = String(sql);
      if (/CREATE |ALTER |CREATE INDEX/i.test(text)) return { rows: [] };
      if (text.includes("INSERT INTO task_proofs")) {
        const stored = params[6];
        assert.ok(Buffer.isBuffer(stored) && stored.includes(Buffer.from("lc1:")), "postgres must persist encrypted bytes");
        encryptedProofs.set(String(params[0]), {
          file_name: params[2],
          mime_type: params[3],
          size_bytes: params[4],
          file_data: stored,
        });
        return { rows: [] };
      }
      if (text.includes("FROM task_proofs")) {
        const row = encryptedProofs.get(String(params[0]));
        return { rows: row ? [row] : [] };
      }
      if (/UPDATE\s+tasks/i.test(text)) {
        pgTask.proof_status = params[5] || pgTask.proof_status;
        pgTask.status = params[1] || pgTask.status;
        Object.assign(pgTask.payload, JSON.parse(params[6] || "{}"));
        return { rows: [pgTask] };
      }
      if (text.includes("proof_hash") && /SELECT/i.test(text)) return { rows: [] };
      if (text.includes("FROM tasks")) {
        return { rows: [pgTask] };
      }
      return { rows: [] };
    },
  };
  const pgFeatures = createStrategyFeatures({
    db: pgDb,
    config,
    notify: async () => ({}),
    resolveRecipients: async () => [],
    resolveAdminRecipients: async () => [{ id: "admin", role: "admin" }],
    portalUrl: (path) => path,
    sendJson: (res, code, body) => {
      res.statusCode = code;
      res.body = body;
    },
    readBody: async () => ({}),
    readRawBody: async () => Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    getAuthUser: () => authUser,
    canSeeAll: (user) => user && ["admin", "rna"].includes(user.role),
    canAccessStoredCase: () => false,
    mapTask,
    mapCase: (row) => row,
    writeAuditLog: async () => undefined,
    createReceipt: async () => ({}),
    escapeHtml: (value) => String(value || ""),
    sendEmail: async () => ({}),
    demoStore: { tasks: [] },
    isUuid: () => false,
    safeAttachmentName: (name) => String(name || "order-sheet.pdf").replace(/[^\w.\-]+/g, "_"),
    dispatchSms: async () => ({}),
    settlementLedger: {},
    encryptBuffer,
    decryptBuffer,
  });
  const encJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  authUser = { id: "karan", role: "advocate", name: "Karan" };
  const encUrl = new URL("http://localhost/api/tasks/task-encrypted/proof");
  const encPost = mockRes();
  await pgFeatures.handleStrategyRoutes({
    method: "POST",
    headers: { "content-type": "image/jpeg", "x-file-name": "sheet.jpg" },
    url: encUrl.pathname,
  }, encPost, encUrl);
  assert.strictEqual(encPost.statusCode, 200, "encrypted postgres upload must succeed");

  authUser = { id: "priya", role: "advocate", name: "Priya" };
  const encPoster = mockRes();
  await pgFeatures.handleStrategyRoutes({ method: "GET", headers: {}, url: encUrl.pathname }, encPoster, encUrl);
  assert.strictEqual(encPoster.statusCode, 200, "main counsel must receive decrypted scan bytes");
  assert.deepStrictEqual(encPoster.body, encJpeg);

  authUser = { id: "ops", role: "admin" };
  const encAdmin = mockRes();
  await pgFeatures.handleStrategyRoutes({ method: "GET", headers: {}, url: encUrl.pathname }, encAdmin, encUrl);
  assert.strictEqual(encAdmin.statusCode, 200, "admin must receive decrypted scan bytes");
  assert.deepStrictEqual(encAdmin.body, encJpeg);

  console.log("proxy-proof-view.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => {
  if (originalFetch) global.fetch = originalFetch;
});
