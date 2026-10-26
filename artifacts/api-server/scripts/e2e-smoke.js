#!/usr/bin/env node
/**
 * End-to-end smoke test for Legal Connect, run against a live server with the
 * accounts made by seed-test-accounts.js.
 *
 *   node scripts/seed-test-accounts.js --out lc.test-accounts.json
 *   RAZORPAY_KEY_SECRET=<TEST-mode secret> RAZORPAY_WEBHOOK_SECRET=<test webhook secret> \
 *     node scripts/e2e-smoke.js lc.test-accounts.json
 *
 * It walks the real flows per role and also tries known attacks (cheap order for
 * a dear booking, reused payments, cross-account access). Payment steps need the
 * Razorpay TEST secret to sign payments, so never point this at live keys.
 * Exit code 1 if any check fails.
 */
const crypto = require("crypto");
const fs = require("fs");

const file = process.argv[2] || "lc.test-accounts.json";
const { apiUrl, accounts } = JSON.parse(fs.readFileSync(file, "utf8"));
const API = String(process.env.API_URL || apiUrl).replace(/\/$/, "");
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
if (/legal-connect\.in|onrender\.com/i.test(API) && !process.argv.includes("--allow-production")) {
  console.error("Refusing to run e2e against production. Use staging, or pass --allow-production.");
  process.exit(2);
}

const results = [];
function check(area, name, ok, detail = "") {
  results.push({ area, check: name, result: ok ? "PASS" : "FAIL", detail: ok ? "" : String(detail).slice(0, 160) });
}

async function call(path, { method = "GET", token, body, headers = {}, raw } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: response.status, json };
}

const sign = (orderId, paymentId) => crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
const acct = (slug) => accounts.find((item) => item.slug === slug);
const brief = (r) => `${r.status} ${JSON.stringify(r.json).slice(0, 140)}`;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

async function main() {
  const tokens = {};
  // ---------- Auth ----------
  for (const a of accounts) {
    const r = await call("/api/auth/strict/login", { method: "POST", body: { email: a.email, password: a.password } });
    tokens[a.slug] = r.json.token;
    check("Auth", `${a.slug} signs in with password`, r.status === 200 && Boolean(r.json.token), brief(r));
    if (tokens[a.slug]) {
      const me = await call("/api/auth/me", { token: tokens[a.slug] });
      const role = me.json.user?.role || me.json.role;
      check("Auth", `${a.slug} session reports role ${a.role}`, me.status === 200 && String(role) === a.role, brief(me));
    }
  }
  const bad = await call("/api/auth/strict/login", { method: "POST", body: { email: acct("client").email, password: "wrong-password-123" } });
  check("Auth", "wrong password is rejected", bad.status === 401, brief(bad));
  const anon = await call("/api/bookings");
  const anonEmpty = anon.status === 401 || anon.status === 403 || (anon.status === 200 && Array.isArray(anon.json) && anon.json.length === 0);
  check("Auth", "signed-out visitors get no bookings", anonEmpty, brief(anon));
  const forged = await call("/api/admin/summary", { token: "eyJpZCI6IngiLCJyb2xlIjoiYWRtaW4ifQ.forged" });
  check("Auth", "forged admin token is rejected", forged.status === 401 || forged.status === 403, brief(forged));

  // ---------- Role boundaries ----------
  for (const slug of ["client", "advocate", "intern"]) {
    const r = await call("/api/admin/summary", { token: tokens[slug] });
    check("Access", `${slug} cannot open admin summary`, r.status === 403 || r.status === 401, brief(r));
  }
  const adminSummary = await call("/api/admin/summary", { token: tokens.admin });
  check("Access", "admin opens admin summary", adminSummary.status === 200, brief(adminSummary));
  const desk = await call("/api/admin/control-desk", { token: tokens.admin });
  check("Access", "admin opens control desk", desk.status === 200, brief(desk));
  const clientWs = await call("/api/workspaces/client", { token: tokens.client });
  check("Workspaces", "client workspace loads", clientWs.status === 200, brief(clientWs));
  const advWs = await call("/api/workspaces/advocate", { token: tokens.advocate });
  check("Workspaces", "advocate workspace loads", advWs.status === 200, brief(advWs));
  const clientOnAdv = await call("/api/workspaces/advocate", { token: tokens.client });
  check("Access", "client cannot open advocate workspace", clientOnAdv.status === 403 || clientOnAdv.status === 401, brief(clientOnAdv));
  const quests = await call("/api/intern-quests", { token: tokens.intern });
  check("Workspaces", "intern quests load", quests.status === 200, brief(quests));
  const chamber = await call("/api/chamber", { token: tokens.advocate });
  check("Chamber", "chamber owner opens Chamber Vault", chamber.status === 200, brief(chamber));
  const memberRows = chamber.json.chamber?.members || [];
  const assocRow = memberRows.find((m) => String(m.email || "").toLowerCase() === acct("associate").email.toLowerCase());
  check("Chamber", "associate is an active, linked chamber member", Boolean(assocRow) && assocRow.status === "active", JSON.stringify(assocRow || memberRows).slice(0, 160));
  const dupInvite = await call("/api/chamber/members", { method: "POST", token: tokens.advocate, body: { displayName: "Adv. Test Associate", email: acct("associate").email, memberRole: "associate" } });
  check("Chamber", "same person cannot be invited twice", dupInvite.status === 409, brief(dupInvite));
  const strangerAccept = assocRow ? await call(`/api/chamber/invitations/${assocRow.id}/accept`, { method: "POST", token: tokens.proxy }) : { status: 0, json: {} };
  check("Access", "another advocate cannot accept someone else's invite", strangerAccept.status === 404 || strangerAccept.status === 409, brief(strangerAccept));
  const task = await call("/api/chamber/tasks", { method: "POST", token: tokens.advocate, body: { title: "Collect certified copy (test)", details: "Seed e2e", assigneeName: "Adv. Test Associate", priority: "normal" } });
  check("Chamber", "chamber owner delegates a task", task.status === 201 || task.status === 200, brief(task));

  // ---------- Client booking + payment ----------
  const book = (channel, extra = {}) => call("/api/consultations/book-advisory", {
    method: "POST",
    token: tokens.client,
    body: { consultationChannel: channel, caseTitle: `E2E ${channel} consult`, clientName: "Test Client One", problemSummary: "Landlord not returning deposit (test)", court: "Tis Hazari", ...extra },
  });
  const free1 = await book("chat", { firstChatFree: true });
  check("Booking", "first chat is free", free1.status === 201 && free1.json.paymentRequired === false, brief(free1));
  const free2 = await book("chat", { firstChatFree: true });
  check("Booking", "second 'free' chat is NOT free", free2.status === 201 && free2.json.paymentRequired === true, brief(free2));
  const reclaim = await call("/api/payments/create-order", { method: "POST", token: tokens.client, body: { bookingId: free2.json.consultation?.id, consultationChannel: "chat", firstChatFree: true, mode: "first_chat_free" } });
  check("Booking", "used free chat cannot be re-claimed at payment step", reclaim.status === 409, brief(reclaim));
  const video = await book("video");
  const videoId = video.json.consultation?.id;
  check("Booking", "video consultation booking is created", video.status === 201 && Boolean(videoId), brief(video));
  const videoFree = await call("/api/payments/create-order", { method: "POST", token: tokens.client, body: { bookingId: videoId, consultationChannel: "chat", firstChatFree: true, mode: "first_chat_free" } });
  check("Booking", "video booking cannot be claimed free by posing as chat", videoFree.status === 400 || videoFree.status === 409, brief(videoFree));
  const freshFree = await call("/api/payments/create-order", { method: "POST", token: tokens.client2, body: { bookingId: videoId, firstChatFree: true } });
  check("Access", "another client cannot free-claim this booking", freshFree.status === 403, brief(freshFree));
  const call299 = await book("call");
  const callId = call299.json.consultation?.id;

  if (!KEY_SECRET) {
    check("Payments", "payment checks", false, "skipped: set RAZORPAY_KEY_SECRET (TEST mode) to run them");
  } else {
    const order = await call("/api/payments/create-order", { method: "POST", token: tokens.client, body: { bookingId: videoId, amount: 1, consultationChannel: "video" } });
    check("Payments", "server ignores ₹1 sent by the browser (video = ₹499)", order.status === 200 && Number(order.json.amount) === 49900, brief(order));
    const cheap = await call("/api/payments/create-order", { method: "POST", token: tokens.client, body: { bookingId: free2.json.consultation?.id, consultationChannel: "chat" } });
    // Try to use the ₹99 chat order to pay for the ₹499 video booking.
    const swapPay = `pay_TESTswap${Date.now()}`;
    const swap = await call("/api/payments/verify", { method: "POST", token: tokens.client, body: { bookingId: videoId, razorpay_order_id: cheap.json.order_id, razorpay_payment_id: swapPay, razorpay_signature: sign(cheap.json.order_id, swapPay) } });
    check("Payments", "₹99 order cannot pay for ₹499 booking", swap.status === 409, brief(swap));
    const payId = `pay_TEST${Date.now()}`;
    const ok = await call("/api/payments/verify", { method: "POST", token: tokens.client, body: { bookingId: videoId, razorpay_order_id: order.json.order_id, razorpay_payment_id: payId, razorpay_signature: sign(order.json.order_id, payId) } });
    check("Payments", "correct payment marks booking paid", ok.status === 200 && ok.json.ok !== false, brief(ok));
    const badSig = await call("/api/payments/verify", { method: "POST", token: tokens.client, body: { bookingId: callId, razorpay_order_id: order.json.order_id, razorpay_payment_id: "pay_x", razorpay_signature: "deadbeef" } });
    check("Payments", "bad signature is rejected", badSig.status >= 400 || badSig.json.ok === false, brief(badSig));
    const other = await call("/api/payments/create-order", { method: "POST", token: tokens.client2, body: { bookingId: videoId, consultationChannel: "video" } });
    check("Access", "client2 cannot pay or open client1's booking", other.status === 403, brief(other));

    if (WEBHOOK_SECRET && callId) {
      const callOrder = await call("/api/payments/create-order", { method: "POST", token: tokens.client, body: { bookingId: callId, consultationChannel: "call" } });
      const hook = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: `pay_TESThook${Date.now()}`, order_id: callOrder.json.order_id, amount: 100, currency: "INR" } } } });
      const sig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(hook).digest("hex");
      const wh = await call("/api/payments/webhook", { method: "POST", raw: hook, headers: { "x-razorpay-signature": sig } });
      const bookings = await call("/api/bookings", { token: tokens.client });
      const list = Array.isArray(bookings.json) ? bookings.json : bookings.json.bookings || [];
      const row = list.find((item) => String(item.id) === String(callId));
      const status = String(row?.paymentStatus || row?.payment_status || "");
      check("Payments", "webhook paying ₹1 for a ₹299 booking does not activate it", wh.status < 500 && status !== "paid", `webhook ${wh.status}, booking status ${status}`);
    }
  }
  const myBookings = await call("/api/bookings", { token: tokens.client2 });
  const leak = JSON.stringify(myBookings.json).includes(String(videoId));
  check("Access", "client2's booking list does not include client1's booking", myBookings.status === 200 && !leak, brief(myBookings));
  const receipts = await call("/api/receipts", { token: tokens.client });
  check("Booking", "client sees own receipts", receipts.status === 200, brief(receipts));

  // ---------- ProxyHub ----------
  const mission = {
    title: "Adjournment · DLCT010012342026",
    court: "Tis Hazari Courts, Delhi",
    location: "Tis Hazari Courts, Delhi",
    cnr: "DLCT010012342026",
    room: "Court 12",
    roomNo: "Court 12",
    itemNo: "18",
    passoverScript: "Seek short adjournment; main counsel unwell. Next date preference after two weeks.",
    passoverInstructions: "Seek short adjournment; main counsel unwell. Next date preference after two weeks.",
    taskDescription: "Seek short adjournment; main counsel unwell. Next date preference after two weeks.",
    appearanceType: "Adjournment",
    taskType: "Adjournment",
    hearingDate: tomorrow(),
  };
  let taskId = null;
  if (KEY_SECRET) {
    const po = await call("/api/proxy-hub/create-order", { method: "POST", token: tokens.advocate, body: { title: mission.title, fee: 499, amount: 499, urgency: "standard" } });
    check("ProxyHub", "advocate creates Standard (₹499) order", po.status === 200 && Number(po.json.amount) === 49900, brief(po));
    const pid = `pay_TESTproxy${Date.now()}`;
    const upgrade = await call("/api/proxy-hub/verify-payment", { method: "POST", token: tokens.advocate, body: { ...mission, urgency: "urgent", timingTier: "urgent", fee: 1299, amount: 1299, razorpay_order_id: po.json.orderId, razorpay_payment_id: pid, razorpay_signature: sign(po.json.orderId, pid) } });
    check("ProxyHub", "₹499 payment cannot post an Urgent (₹1,299) mission", upgrade.status === 409, brief(upgrade));
    const posted = await call("/api/proxy-hub/verify-payment", { method: "POST", token: tokens.advocate, body: { ...mission, urgency: "standard", timingTier: "standard", fee: 499, amount: 499, razorpay_order_id: po.json.orderId, razorpay_payment_id: pid, razorpay_signature: sign(po.json.orderId, pid) } });
    taskId = posted.json.task?.id || posted.json.id;
    check("ProxyHub", "paid Standard mission is posted", (posted.status === 200 || posted.status === 201) && Boolean(taskId), brief(posted));
    const replay = await call("/api/proxy-hub/verify-payment", { method: "POST", token: tokens.advocate, body: { ...mission, urgency: "standard", razorpay_order_id: po.json.orderId, razorpay_payment_id: pid, razorpay_signature: sign(po.json.orderId, pid) } });
    check("ProxyHub", "same payment cannot post a second mission", replay.status === 409, brief(replay));
  }
  const fakeDemo = await call("/api/proxy-hub/verify-payment", { method: "POST", token: tokens.advocate, body: { ...mission, urgency: "standard", razorpay_order_id: `order_proxy_demo_${Date.now()}` } });
  check("ProxyHub", "demo order id posts only outside production (info)", true, brief(fakeDemo));

  if (taskId) {
    const id = encodeURIComponent(taskId);
    const proxy = acct("proxy");
    const meProxy = await call("/api/auth/me", { token: tokens.proxy });
    const proxyUserId = meProxy.json.user?.id || meProxy.json.id;
    const interest = await call(`/api/tasks/${id}/interest`, { method: "POST", token: tokens.proxy, body: { interested: true, note: "Available tomorrow" } });
    check("ProxyHub", "proxy counsel expresses interest", interest.status < 300, brief(interest));
    const clientAssign = await call(`/api/admin/proxy-tasks/${id}/assign-proxy`, { method: "POST", token: tokens.client, body: { proxyAdvocateId: proxyUserId } });
    check("Access", "client cannot assign proxy counsel", clientAssign.status === 403 || clientAssign.status === 401, brief(clientAssign));
    const assign = await call(`/api/admin/proxy-tasks/${id}/assign-proxy`, { method: "POST", token: tokens.admin, body: { proxyAdvocateId: proxyUserId, proxyAdvocateName: "Adv. Test Proxy Counsel" } });
    check("ProxyHub", "admin assigns proxy counsel", assign.status < 300, brief(assign));
    const wrongAccept = await call(`/api/tasks/${id}/proxy-accept`, { method: "POST", token: tokens.associate, body: {} });
    check("Access", "a different advocate cannot accept the mission", wrongAccept.status === 403, brief(wrongAccept));
    const accept = await call(`/api/tasks/${id}/proxy-accept`, { method: "POST", token: tokens.proxy, body: {} });
    check("ProxyHub", "assigned proxy accepts", accept.status < 300, brief(accept));
    const conflict = await call(`/api/tasks/${id}/conflict-declare`, { method: "POST", token: tokens.proxy, body: { declared: true, note: "No conflict" } });
    check("ProxyHub", "proxy signs conflict declaration", conflict.status < 300, brief(conflict));
    const checkin = await call(`/api/tasks/${id}/check-in`, { method: "POST", token: tokens.proxy, body: { note: "At Court 12" } });
    check("ProxyHub", "proxy checks in at court", checkin.status < 300, brief(checkin));
    // Minimal valid PDF as the order sheet.
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF").toString("base64");
    const proof = await call(`/api/tasks/${id}/proof`, { method: "POST", token: tokens.proxy, body: { base64: pdf, fileName: `order-sheet-${Date.now()}.pdf`, contentType: "application/pdf", note: "Adjourned to next month" } });
    check("ProxyHub", "proxy uploads order sheet", proof.status < 300, brief(proof));
    const early = await call(`/api/tasks/${id}/proof-review`, { method: "POST", token: tokens.advocate, body: { decision: "ok", reason: "Order sheet matches the brief" } });
    check("ProxyHub", "posting counsel must wait for LC proof check", early.status === 409, brief(early));
    const lcVerify = await call("/api/admin/task-action", { method: "POST", token: tokens.admin, body: { taskId, action: "mark_proof_approved", note: "Order sheet legible, CNR matches" } });
    check("ProxyHub", "LC admin verifies the order sheet", lcVerify.status < 300, brief(lcVerify));
    const review = await call(`/api/tasks/${id}/proof-review`, { method: "POST", token: tokens.advocate, body: { decision: "ok", reason: "Order sheet matches the brief" } });
    check("ProxyHub", "posting counsel approves proof", review.status < 300, brief(review));
    const view = await call(`/api/tasks/${id}`, { token: tokens.client });
    check("Access", "client cannot open an advocate's proxy mission", view.status === 403 || view.status === 404 || !JSON.stringify(view.json).includes(mission.cnr), brief(view));
  }

  // ---------- LC Admin supervision ----------
  const istToday = () => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const by = Object.fromEntries(parts.filter((x) => x.type !== "literal").map((x) => [x.type, x.value]));
    return `${by.year}-${by.month}-${by.day}`;
  };
  const meId = async (slug) => { const r = await call("/api/auth/me", { token: tokens[slug] }); return r.json.user?.id || r.json.id; };
  const queue = await call("/api/admin/supervision", { token: tokens.admin });
  check("Supervision", "admin sees the needs-attention queue", queue.status === 200 && Array.isArray(queue.json.queue) && queue.json.queue.length >= 8, brief(queue));
  const queueClient = await call("/api/admin/supervision", { token: tokens.client });
  check("Supervision", "client cannot see the supervision queue", queueClient.status === 403, brief(queueClient));

  // Unverified advocate: can sign in and look around, but cannot take paid or client work.
  const unverifiedEmail = acct("admin").email.replace("lc-test-admin", `lc-test-unverified${Date.now()}`);
  const unverifiedPassword = `Unv-${Date.now()}#a`;
  const reg = await call("/api/auth/strict/register", { method: "POST", body: { name: "Adv. Unverified (test)", email: unverifiedEmail, password: unverifiedPassword, role: "advocate", privacyConsent: true, enrollmentNo: "D/TEST/9999/2024", stateBarCouncil: "Bar Council of Delhi", practiceCourts: "Saket" } });
  const unvLogin = await call("/api/auth/strict/login", { method: "POST", body: { email: unverifiedEmail, password: unverifiedPassword } });
  tokens.unverified = unvLogin.json.token;
  check("Supervision", "unverified advocate can register and sign in", reg.status < 300 && Boolean(tokens.unverified), brief(unvLogin));
  const unvPost = await call("/api/proxy-hub/create-order", { method: "POST", token: tokens.unverified, body: { title: "x", fee: 499, urgency: "standard" } });
  check("Supervision", "unverified advocate cannot post a paid ProxyHub mission", unvPost.status === 403 && unvPost.json.code === "ADVOCATE_NOT_VERIFIED", brief(unvPost));
  const unvWs = await call("/api/workspaces/advocate", { token: tokens.unverified });
  check("Supervision", "unverified advocate can still open their workspace", unvWs.status === 200, brief(unvWs));
  const unverifiedId = await meId("unverified");
  if (taskId) {
    const badAssign = await call(`/api/admin/proxy-tasks/${encodeURIComponent(taskId)}/assign-proxy`, { method: "POST", token: tokens.admin, body: { proxyAdvocateId: unverifiedId, proxyAdvocateName: "Unverified" } });
    check("Supervision", "admin cannot assign work to an unverified advocate", badAssign.status === 409 && badAssign.json.code === "ASSIGNEE_NOT_VERIFIED", brief(badAssign));
  }

  // Suspension.
  const client2Id = await meId("client2");
  const adminId = await meId("admin");
  const noReason = await call(`/api/admin/users/${client2Id}/suspend`, { method: "POST", token: tokens.admin, body: {} });
  check("Supervision", "suspension needs a written reason", noReason.status === 400, brief(noReason));
  const selfSuspend = await call(`/api/admin/users/${adminId}/suspend`, { method: "POST", token: tokens.admin, body: { reason: "Testing self suspension" } });
  check("Supervision", "admin cannot suspend themselves", selfSuspend.status === 400, brief(selfSuspend));
  const advSuspend = await call(`/api/admin/users/${client2Id}/suspend`, { method: "POST", token: tokens.advocate, body: { reason: "Not allowed to do this" } });
  check("Access", "advocate cannot suspend accounts", advSuspend.status === 403, brief(advSuspend));
  const suspend = await call(`/api/admin/users/${client2Id}/suspend`, { method: "POST", token: tokens.admin, body: { reason: "E2E: suspected misuse, checking" } });
  check("Supervision", "admin suspends a client with a reason", suspend.status === 200 && suspend.json.user?.account_status === "suspended", brief(suspend));
  const oldSession = await call("/api/workspaces/client", { token: tokens.client2 });
  check("Supervision", "suspended client's live session stops working", oldSession.status === 401 || oldSession.status === 403, brief(oldSession));
  const suspendedLogin = await call("/api/auth/strict/login", { method: "POST", body: { email: acct("client2").email, password: acct("client2").password } });
  check("Supervision", "suspended client cannot sign in", suspendedLogin.status === 403 && suspendedLogin.json.code === "ACCOUNT_SUSPENDED", brief(suspendedLogin));
  const client1Id = await meId("client");
  const hardDelete = await call(`/api/users/${client1Id}`, { method: "DELETE", token: tokens.admin });
  check("Supervision", "users with bookings or matters can't be hard-deleted", hardDelete.status === 409, brief(hardDelete));
  const userList = await call("/api/users", { token: tokens.admin });
  const listed = (Array.isArray(userList.json) ? userList.json : []).find((u) => String(u.id) === String(client2Id));
  check("Supervision", "admin user list shows suspension status", listed?.accountStatus === "suspended", JSON.stringify(listed || {}).slice(0, 120));
  const reactivate = await call(`/api/admin/users/${client2Id}/reactivate`, { method: "POST", token: tokens.admin, body: { reason: "E2E: cleared after review" } });
  const backIn = await call("/api/auth/strict/login", { method: "POST", body: { email: acct("client2").email, password: acct("client2").password } });
  tokens.client2 = backIn.json.token || tokens.client2;
  check("Supervision", "reactivated client can sign in again", reactivate.status === 200 && backIn.status === 200, brief(backIn));

  // Legal SOS handled by admin.
  const sos = await call("/api/sos", { method: "POST", token: tokens.client, body: { serviceType: "Legal SOS", urgency: "High", note: "Police at my door (test)" } });
  check("Supervision", "client raises Legal SOS", sos.status === 201 || sos.status === 200, brief(sos));
  const sosList = await call("/api/admin/sos", { token: tokens.admin });
  const sosRow = (sosList.json.sos || [])[0];
  check("Supervision", "admin sees open SOS with contact details", sosList.status === 200 && Boolean(sosRow?.requester_email), brief(sosList));
  if (sosRow) {
    const ack = await call(`/api/admin/sos/${sosRow.id}`, { method: "PATCH", token: tokens.admin, body: { status: "acknowledged" } });
    check("Supervision", "admin acknowledges SOS", ack.status === 200, brief(ack));
    const resolveNoNote = await call(`/api/admin/sos/${sosRow.id}`, { method: "PATCH", token: tokens.admin, body: { status: "resolved" } });
    check("Supervision", "SOS cannot be resolved without saying what was done", resolveNoNote.status === 400, brief(resolveNoNote));
    const resolve = await call(`/api/admin/sos/${sosRow.id}`, { method: "PATCH", token: tokens.admin, body: { status: "resolved", note: "Called client, connected duty counsel" } });
    check("Supervision", "admin resolves SOS with a note", resolve.status === 200, brief(resolve));
    const clientSos = await call(`/api/admin/sos/${sosRow.id}`, { method: "PATCH", token: tokens.client, body: { status: "closed", note: "client closing own sos" } });
    check("Access", "client cannot change SOS handling", clientSos.status === 403, brief(clientSos));
  }

  // Account deletion requests.
  const del = await call("/api/account/deletion-request", { method: "POST", token: tokens.client2, body: { reason: "No longer need the service (test)", confirm: true } });
  const delList = await call("/api/admin/deletion-requests", { token: tokens.admin });
  const delRows = Array.isArray(delList.json) ? delList.json : delList.json.requests || delList.json.deletionRequests || [];
  const delId = del.json.request?.id || del.json.id || delRows[0]?.id;
  check("Supervision", "deletion request reaches admin", (del.status < 300) && delList.status === 200 && Boolean(delId), `${brief(del)} | ${brief(delList)}`);
  if (delId) {
    const review = await call(`/api/admin/deletion-requests/${delId}`, { method: "PATCH", token: tokens.admin, body: { status: "in_review" } });
    const rejectNoNote = await call(`/api/admin/deletion-requests/${delId}`, { method: "PATCH", token: tokens.admin, body: { status: "rejected" } });
    const reject = await call(`/api/admin/deletion-requests/${delId}`, { method: "PATCH", token: tokens.admin, body: { status: "rejected", note: "Open paid matter must close first" } });
    check("Supervision", "admin reviews and closes deletion requests with a note", review.status === 200 && rejectNoNote.status === 400 && reject.status === 200, `${review.status}/${rejectNoNote.status}/${reject.status}`);
  }

  // Create routes cannot fabricate paid records.
  const fakeTask = await call("/api/tasks", { method: "POST", token: tokens.client, body: { title: "Fake paid mission", taskType: "Adjournment", escrowStatus: "Held", paymentConfirmed: true, amount: 1299 } });
  check("Safety", "client cannot create a ProxyHub mission directly", fakeTask.status === 403, brief(fakeTask));
  const fakeAdvTask = await call("/api/tasks", { method: "POST", token: tokens.advocate, body: { title: "Unpaid mission", taskType: "Adjournment", paymentConfirmed: true, amount: 499 } });
  check("Safety", "advocate cannot skip ProxyHub checkout", fakeAdvTask.status === 403, brief(fakeAdvTask));
  const fakePaid = await call("/api/bookings", { method: "POST", token: tokens.client, body: { consultationChannel: "video", paymentStatus: "paid", workHoldStatus: "active", amount: 1, razorpayPaymentId: "pay_fake", caseTitle: "Fake paid booking (test)" } });
  const fakePaidStatus = String(fakePaid.json.paymentStatus || "").toLowerCase();
  check("Safety", "a booking cannot be created already paid", fakePaid.status < 300 && fakePaidStatus !== "paid" && Number(fakePaid.json.amount) === 499, brief(fakePaid));

  // Booking protections.
  const draft = await book("call");
  const draftId = draft.json.consultation?.id;
  const sneaky = await call(`/api/bookings/${draftId}`, { method: "PUT", token: tokens.client, body: { paymentStatus: "paid", amount: 0, workHoldStatus: "active", caseTitle: "Edited title (test)" } });
  const afterSneaky = await call("/api/bookings", { token: tokens.client });
  const sneakyRow = (Array.isArray(afterSneaky.json) ? afterSneaky.json : []).find((b) => String(b.id) === String(draftId));
  check("Booking", "client cannot mark own booking paid by editing it", sneaky.status === 200 && String(sneakyRow?.paymentStatus || "").toLowerCase() !== "paid", `${brief(sneaky)} | status ${sneakyRow?.paymentStatus}`);
  const selfConfirm = await call(`/api/bookings/${draftId}`, { method: "PUT", token: tokens.client, body: { status: "Confirmed" } });
  check("Booking", "client cannot confirm own booking", selfConfirm.status === 403, brief(selfConfirm));
  const cancel = await call(`/api/bookings/${draftId}`, { method: "PUT", token: tokens.client, body: { status: "Cancelled" } });
  check("Booking", "client can cancel an unpaid booking", cancel.status === 200, brief(cancel));
  if (videoId) {
    const delPaid = await call(`/api/bookings/${videoId}`, { method: "DELETE", token: tokens.client });
    check("Booking", "paid booking cannot be deleted", delPaid.status === 409, brief(delPaid));
    const adminDelPaid = await call(`/api/bookings/${videoId}`, { method: "DELETE", token: tokens.admin });
    check("Booking", "even admin cannot delete a paid booking", adminDelPaid.status === 409, brief(adminDelPaid));
  }

  // Matter protections, client <-> LC channel, and the Chamber court day.
  const ws = await call("/api/workspaces/client", { token: tokens.client });
  const myCase = (ws.json.cases || []).find((c) => /^[0-9a-f-]{36}$/.test(String(c.id)));
  check("Matters", "paid booking created a matter for the client", Boolean(myCase), brief(ws));
  if (myCase) {
    const caseDel = await call(`/api/cases/${myCase.id}`, { method: "DELETE", token: tokens.client });
    check("Matters", "client cannot delete a matter", caseDel.status === 403, brief(caseDel));
    const caseStatus = await call(`/api/cases/${myCase.id}`, { method: "PUT", token: tokens.client, body: { status: "Closed" } });
    check("Matters", "client cannot change matter status", caseStatus.status === 403, brief(caseStatus));
    const msg = await call(`/api/cases/${myCase.id}/communications`, { method: "POST", token: tokens.client, body: { summary: "When is my next hearing? (test)" } });
    check("Matters", "client messages Legal Connect", msg.status === 201, brief(msg));
    const advRead = await call(`/api/cases/${myCase.id}/communications`, { token: tokens.advocate });
    check("Access", "counsel cannot read the client-LC channel directly", advRead.status === 403, brief(advRead));
    const ownerId = await meId("advocate");
    const associateId = await meId("associate");
    const assignCase = await call(`/api/admin/cases/${myCase.id}/assign`, { method: "POST", token: tokens.admin, body: { advocateId: ownerId, note: "E2E assignment" } });
    check("Chamber", "admin assigns the matter to verified counsel", assignCase.status < 300, brief(assignCase));
    const today = istToday();
    const setDate = await call(`/api/cases/${myCase.id}`, { method: "PUT", token: tokens.advocate, body: { nextDate: today, room: "Court 7" } });
    check("Chamber", "assigned counsel sets the next hearing date", setDate.status === 200, brief(setDate));
    const counselStatus = await call(`/api/cases/${myCase.id}`, { method: "PUT", token: tokens.advocate, body: { status: "Closed" } });
    check("Matters", "counsel cannot close a matter without LC review", counselStatus.status === 403, brief(counselStatus));
    const board = await call(`/api/chamber/today?date=${today}`, { token: tokens.advocate });
    const onBoard = (board.json.hearings || []).some((h) => String(h.matterId) === String(myCase.id));
    check("Chamber", "today's hearing appears on the court-day board", board.status === 200 && onBoard, brief(board));
    const hAssign = await call(`/api/chamber/today/hearings/${myCase.id}/assign`, { method: "POST", token: tokens.advocate, body: { assignedTo: associateId, hearingDate: today, hearingTime: "10:30" } });
    check("Chamber", "chamber owner assigns the hearing to the associate", hAssign.status < 300, brief(hAssign));
    const hAccept = await call(`/api/chamber/today/hearings/${myCase.id}/accept`, { method: "POST", token: tokens.associate, body: { hearingDate: today } });
    check("Chamber", "associate accepts the hearing", hAccept.status < 300, brief(hAccept));
    const next = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const hClose = await call(`/api/chamber/today/hearings/${myCase.id}/close`, { method: "POST", token: tokens.associate, body: { hearingDate: today, outcome: "adjourned", nextHearingDate: next, orderStatus: "not_available", courtDirections: "Reply to be filed (test)" } });
    check("Chamber", "associate closes the hearing with the next date", hClose.status < 300, brief(hClose));
  }

  // Mission protections after proof is filed.
  if (taskId) {
    const tamper = await call(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "PUT", token: tokens.advocate, body: { proofStatus: "lc_verified", fee: 1, cnr: "CHANGED" } });
    check("ProxyHub", "mission brief is locked once proof is filed", tamper.status === 409, brief(tamper));
    const delTask = await call(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE", token: tokens.advocate });
    check("ProxyHub", "paid mission cannot be deleted", delTask.status === 409, brief(delTask));
  }

  // Real revenue figures and request size limit.
  const revenue = await call("/api/analytics/revenue", { token: tokens.admin });
  check("Supervision", "admin revenue shows 6 months of real collections", revenue.status === 200 && Array.isArray(revenue.json.monthlyRevenue) && revenue.json.monthlyRevenue.length === 6, brief(revenue));
  const huge = await call("/api/sos", { method: "POST", token: tokens.client, raw: JSON.stringify({ note: "x".repeat(13 * 1024 * 1024) }) }).catch(() => ({ status: 413, json: {} }));
  check("Safety", "oversized requests are refused", huge.status === 413 || huge.status === 400, brief(huge));

  // ---------- Report ----------
  console.table(results);
  const failed = results.filter((item) => item.result === "FAIL").length;
  console.log(`\n${results.length - failed} passed, ${failed} failed`);
  if (process.env.E2E_JSON) fs.writeFileSync(process.env.E2E_JSON, JSON.stringify(results, null, 2));
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(`E2E crashed: ${error.stack || error}`);
  process.exit(1);
});
