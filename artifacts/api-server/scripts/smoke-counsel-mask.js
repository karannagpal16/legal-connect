#!/usr/bin/env node
/**
 * Smoke: client-facing assign notifies/payloads must not include full counsel names.
 * Usage: BASE_URL=https://legal-connect-7ewz.onrender.com AUTH_MODE=strict node scripts/smoke-counsel-mask.js
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5055").replace(/\/$/, "");
const AUTH_MODE = process.env.AUTH_MODE || "auto";
const EMAIL = process.env.SMOKE_EMAIL || "karannagpal16@gmail.com";
const PASSWORD = process.env.SMOKE_PASSWORD || "Karan1605!";

async function req(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { status: res.status, json, ok: res.ok };
}

async function login(role) {
  if (AUTH_MODE === "demo" || AUTH_MODE === "auto") {
    const demo = await req("POST", "/api/auth/demo-login", { body: { role } });
    if (demo.ok && demo.json?.token) return { token: demo.json.token, user: demo.json.user, mode: "demo" };
    if (AUTH_MODE === "demo") throw new Error(`demo login failed for ${role}`);
  }
  const strict = await req("POST", "/api/auth/strict/login", { body: { email: EMAIL, password: PASSWORD, role } });
  if (!strict.ok || !strict.json?.token) throw new Error(`strict login failed for ${role}: ${strict.status}`);
  return { token: strict.json.token, user: strict.json.user, mode: "strict" };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function looksMasked(name) {
  const value = String(name || "").trim();
  // Adv. K.N. / Adv. R.N. style — initials with dots, no long word after Adv.
  if (/^Adv\.\s*([A-Z]\.){1,6}$/i.test(value)) return true;
  const safeLabels = new Set([
    "Assigned counsel",
    "Legal Connect assigned counsel",
    "Panel counsel",
    "Assignment confirmed",
  ]);
  return safeLabels.has(value);
}

async function main() {
  console.log(`Counsel mask smoke against ${BASE}`);
  const client = await login("client");
  const admin = await login("admin");
  const advocate = await login("advocate");

  const booking = await req("POST", "/api/bookings", {
    token: client.token,
    body: {
      serviceType: "Family",
      amount: 1,
      problemSummary: "Counsel mask smoke matter: need supervised assignment without full-name disclosure to client notifications or workspace payloads.",
      paymentStatus: "Pending",
    },
  });
  assert(booking.ok || booking.status === 201, `booking create failed ${booking.status}`);
  const bookingId = booking.json.id;
  await req("POST", "/api/payments/create-order", {
    token: client.token,
    body: { bookingId, amount: 0, masterTestFree: true, mode: "master_test_free" },
  });

  await req("POST", `/api/admin/intakes/${bookingId}/start-review`, { token: admin.token, body: {} });
  const advocates = await req("GET", "/api/admin/advocates", { token: admin.token });
  const panel = Array.isArray(advocates.json) ? advocates.json : [];
  const chosen = panel.find((item) => String(item.id) === String(advocate.user.id)) || panel[0] || { id: advocate.user.id, name: advocate.user.name };
  const fullName = chosen.name || advocate.user.name;
  assert(fullName && fullName.length > 4, "need a real counsel name to prove masking");

  const assign = await req("POST", `/api/admin/intakes/${bookingId}/assign`, {
    token: admin.token,
    body: { advocateId: chosen.id, note: "Mask smoke briefing (advocate-only)." },
  });
  assert(assign.ok, `assign failed ${assign.status} ${JSON.stringify(assign.json)}`);

  const workspace = await req("GET", "/api/workspaces/client", { token: client.token });
  assert(workspace.ok, `client workspace failed ${workspace.status}`);
  const bookingRow = (workspace.json.bookings || []).find((item) => String(item.id) === String(bookingId));
  const matter = (workspace.json.cases || []).find((item) => String(item.bookingId) === String(bookingId));

  // Prefer booking-linked matter; otherwise assert every client counsel surface is masked.
  const counselSurfaces = [];
  if (matter?.counsel?.name) counselSurfaces.push(["matter.counsel.name", matter.counsel.name]);
  if (matter?.assignedAdvocateName) counselSurfaces.push(["matter.assignedAdvocateName", matter.assignedAdvocateName]);
  if (bookingRow?.assignedAdvocateName) counselSurfaces.push(["booking.assignedAdvocateName", bookingRow.assignedAdvocateName]);
  for (const item of workspace.json.cases || []) {
    if (item?.counsel?.name) counselSurfaces.push([`case:${item.id}.counsel`, item.counsel.name]);
    if (item?.assignedAdvocateName) counselSurfaces.push([`case:${item.id}.assigned`, item.assignedAdvocateName]);
    if (item?.nextAction) {
      assert(!String(item.nextAction).includes(fullName), `nextAction leaks full name on ${item.id}: ${item.nextAction}`);
    }
  }
  assert(counselSurfaces.length > 0, "no client counsel surfaces found to validate");
  console.log("client counsel surfaces:", counselSurfaces);
  console.log("full counsel name:", fullName);
  for (const [label, value] of counselSurfaces) {
    assert(value !== fullName, `${label} leaks full name: ${value}`);
    assert(
      looksMasked(value) || value === "Assigned counsel" || value === "Legal Connect assigned counsel",
      `${label} is not initials-masked: ${value}`,
    );
    const first = String(fullName).replace(/^adv\.?\s*/i, "").split(/\s+/)[0];
    if (first && first.length > 2) {
      assert(!String(value).toLowerCase().includes(first.toLowerCase()), `${label} still contains given name token "${first}": ${value}`);
    }
  }

  const cases = await req("GET", "/api/cases", { token: client.token });
  assert(cases.ok, "client /api/cases failed");
  const list = Array.isArray(cases.json) ? cases.json : cases.json.cases || [];
  for (const item of list.slice(0, 20)) {
    const name = item.assignedAdvocateName || item.counsel?.name;
    if (!name) continue;
    assert(name !== fullName, `/api/cases leaks full name: ${name}`);
    if (item.nextAction) assert(!item.nextAction.includes(fullName), `case nextAction leaks full name`);
  }

  const bookings = await req("GET", "/api/bookings", { token: client.token });
  assert(bookings.ok, "client /api/bookings failed");
  const bookingList = Array.isArray(bookings.json) ? bookings.json : [];
  for (const item of bookingList.slice(0, 20)) {
    if (item.assignedAdvocateName) {
      assert(item.assignedAdvocateName !== fullName, `/api/bookings leaks full name: ${item.assignedAdvocateName}`);
    }
  }

  // Admin must still see full name on intake desk.
  const intakes = await req("GET", "/api/admin/intakes", { token: admin.token });
  const intake = (intakes.json.intakes || []).find((item) => String(item.id) === String(bookingId));
  if (intake?.assignedAdvocateName) {
    console.log("admin intake counsel:", intake.assignedAdvocateName);
  }

  console.log("\nCOUNSEL MASK SMOKE PASSED");
}

main().catch((error) => {
  console.error("\nCOUNSEL MASK SMOKE FAILED:", error.message || error);
  process.exit(1);
});
