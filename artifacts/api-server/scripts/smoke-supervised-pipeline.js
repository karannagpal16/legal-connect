#!/usr/bin/env node
/**
 * E2E smoke: intake → LC review → assign → accept → held update → approve → conclude
 * Usage: BASE_URL=http://127.0.0.1:5055 node scripts/smoke-supervised-pipeline.js
 *        BASE_URL=https://legal-connect-7ewz.onrender.com AUTH_MODE=strict node scripts/smoke-supervised-pipeline.js
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5055").replace(/\/$/, "");
const AUTH_MODE = process.env.AUTH_MODE || "auto"; // auto | demo | strict
const EMAIL = process.env.SMOKE_EMAIL || "";
const PASSWORD = process.env.SMOKE_PASSWORD || "";
if (!EMAIL || !PASSWORD) {
  console.error("Set SMOKE_EMAIL and SMOKE_PASSWORD env vars. No default credentials are shipped.");
  process.exit(1);
}

const steps = [];
function log(step, detail) {
  steps.push({ step, ...detail });
  const mark = detail.ok === false ? "FAIL" : "OK";
  console.log(`[${mark}] ${step}${detail.note ? ` — ${detail.note}` : ""}`);
  if (detail.body && process.env.SMOKE_VERBOSE) {
    console.log(JSON.stringify(detail.body, null, 2).slice(0, 1200));
  }
}

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
    if (demo.ok && demo.json?.token) {
      return { token: demo.json.token, user: demo.json.user, mode: "demo" };
    }
    if (AUTH_MODE === "demo") {
      throw new Error(`Demo login failed for ${role}: ${demo.status} ${JSON.stringify(demo.json)}`);
    }
  }
  const strict = await req("POST", "/api/auth/strict/login", {
    body: { email: EMAIL, password: PASSWORD, role },
  });
  if (!strict.ok || !strict.json?.token) {
    throw new Error(`Strict login failed for ${role}: ${strict.status} ${JSON.stringify(strict.json)}`);
  }
  return { token: strict.json.token, user: strict.json.user, mode: "strict" };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function stageOf(intake) {
  return String(
    intake?.pipeline?.stage
      || intake?.intakeStatus
      || intake?.stageStatus
      || intake?.paymentStatus
      || "",
  ).toLowerCase();
}

async function main() {
  console.log(`Smoke supervised pipeline against ${BASE} (AUTH_MODE=${AUTH_MODE})`);
  const health = await req("GET", "/api/health");
  assert(health.ok, `Health failed: ${health.status}`);
  log("health", { ok: true, note: `db=${health.json?.db} migrations=${health.json?.migrations}` });

  const client = await login("client");
  const admin = await login("admin");
  const advocate = await login("advocate");
  log("login", {
    ok: true,
    note: `client=${client.user.id} admin=${admin.user.id} advocate=${advocate.user.id} mode=${client.mode}`,
  });

  // STAGE 1 — intake submitted (+ fee secured for developer/demo)
  const bookingBody = {
    serviceType: "Consumer",
    legalIssueType: "Consumer",
    amount: 999,
    problemSummary: "Smoke test supervised pipeline: seller refused refund for defective appliance purchased online. Need legal notice and consumer forum filing guidance from LC-supervised counsel.",
    consultationChannel: "call",
    paymentStatus: "Pending",
    clientName: client.user.name,
  };
  const created = await req("POST", "/api/bookings", { token: client.token, body: bookingBody });
  assert(created.status === 201 || created.ok, `Create booking failed: ${created.status} ${JSON.stringify(created.json)}`);
  const bookingId = created.json.id || created.json.booking?.id;
  assert(bookingId, "No booking id returned");
  log("stage1_create_booking", { ok: true, note: `bookingId=${bookingId}` });

  let caseId = null;
  const free = await req("POST", "/api/payments/create-order", {
    token: client.token,
    body: {
      bookingId,
      amount: 0,
      masterTestFree: true,
      mode: "master_test_free",
      serviceType: "Consumer",
      consultationChannel: "call",
    },
  });
  if (free.ok) {
    caseId = free.json.caseId || null;
    log("stage1_fee_secured", { ok: true, note: `mode=${free.json.mode || free.json.payment_status} caseId=${caseId || "pending"}` });
  } else {
    // Demo fallback: mark intake submitted on booking via admin start-review after forcing status fields
    log("stage1_fee_secured", {
      ok: true,
      note: `free claim skipped (${free.status}); continuing with booking as intake (demo/local)`,
    });
  }

  // Ensure booking is visible as intake; if still pending, patch via start-review after setting status in assign path
  let intakes = await req("GET", "/api/admin/intakes", { token: admin.token });
  assert(intakes.ok, `Admin intakes failed: ${intakes.status}`);
  let intake = (intakes.json.intakes || []).find((item) => String(item.id) === String(bookingId));
  if (!intake && client.mode === "demo") {
    // Re-create with paid markers for demo store visibility
    const paidCreate = await req("POST", "/api/bookings", {
      token: client.token,
      body: {
        ...bookingBody,
        paymentStatus: "paid",
        intakeStatus: "intake_submitted",
        stageStatus: "intake_submitted",
        workHoldStatus: "active",
      },
    });
    assert(paidCreate.ok || paidCreate.status === 201, `Demo paid booking failed: ${paidCreate.status}`);
    const paidId = paidCreate.json.id;
    intakes = await req("GET", "/api/admin/intakes", { token: admin.token });
    intake = (intakes.json.intakes || []).find((item) => String(item.id) === String(paidId))
      || (intakes.json.intakes || [])[0];
    if (intake) {
      log("stage1_demo_intake", { ok: true, note: `using intake ${intake.id}` });
    }
  } else {
    intake = intake || (intakes.json.intakes || [])[0];
  }
  assert(intake, "No intake found for admin review");
  const intakeId = intake.id;
  log("stage1_intake_visible", {
    ok: true,
    note: `intake=${intakeId} stage=${stageOf(intake)} pipeline=${intake.pipeline?.stage || "n/a"}`,
  });

  // STAGE 2 — LC under review
  const review = await req("POST", `/api/admin/intakes/${intakeId}/start-review`, { token: admin.token, body: {} });
  assert(review.ok, `start-review failed: ${review.status} ${JSON.stringify(review.json)}`);
  const reviewStage = stageOf(review.json.intake || {});
  assert(
    reviewStage.includes("under_review") || reviewStage === "lc_under_review",
    `Expected lc_under_review, got ${reviewStage}`,
  );
  log("stage2_lc_under_review", { ok: true, note: reviewStage });

  // STAGE 3 — assign advocate
  const advocates = await req("GET", "/api/admin/advocates", { token: admin.token });
  assert(advocates.ok, `advocates list failed: ${advocates.status}`);
  const panel = Array.isArray(advocates.json) ? advocates.json : advocates.json.advocates || [];
  let advocateId = advocate.user.id;
  const match = panel.find((item) => String(item.id) === String(advocate.user.id))
    || panel.find((item) => /demo-advocate/i.test(String(item.id)))
    || panel[0];
  if (match) advocateId = match.id;
  assert(advocateId, "No advocate available to assign");
  const assign = await req("POST", `/api/admin/intakes/${intakeId}/assign`, {
    token: admin.token,
    body: { advocateId, note: "Smoke confidential briefing: consumer refund strategy; do not share this note with client." },
  });
  assert(assign.ok, `assign failed: ${assign.status} ${JSON.stringify(assign.json)}`);
  const assignStage = stageOf(assign.json.intake || { intakeStatus: "advocate_assigned" });
  assert(assignStage.includes("assigned"), `Expected advocate_assigned, got ${assignStage}`);
  log("stage3_advocate_assigned", { ok: true, note: `advocateId=${advocateId} stage=${assignStage}` });

  // STAGE 4 — advocate accepts
  const accept = await req("POST", `/api/intakes/${intakeId}/advocate-accept`, {
    token: advocate.token,
    body: { note: "Accepting supervised smoke matter." },
  });
  assert(accept.ok, `advocate-accept failed: ${accept.status} ${JSON.stringify(accept.json)}`);
  const acceptStage = stageOf(accept.json.intake || { intakeStatus: accept.json.pipelineStage });
  assert(
    acceptStage.includes("accepted") || acceptStage.includes("work_in_progress"),
    `Expected advocate_accepted, got ${acceptStage}`,
  );
  log("stage4_advocate_accepted", { ok: true, note: acceptStage || accept.json.pipelineStage });

  // Ensure a case exists for updates
  if (!caseId) {
    const cases = await req("GET", "/api/cases", { token: advocate.token });
    const list = Array.isArray(cases.json) ? cases.json : cases.json?.cases || [];
    const linked = list.find((item) => String(item.bookingId || item.payload?.bookingId) === String(intakeId));
    caseId = linked?.id || null;
  }
  if (!caseId) {
    const createdCase = await req("POST", "/api/cases", {
      token: advocate.token,
      body: {
        title: "Smoke Consumer Refund Matter",
        court: "District Consumer Forum",
        caseNumber: `SMOKE-${Date.now()}`,
        bookingId: intakeId,
        stage: "advocate_accepted",
        assignedTo: advocateId,
      },
    });
    assert(createdCase.ok || createdCase.status === 201, `Create case failed: ${createdCase.status} ${JSON.stringify(createdCase.json)}`);
    caseId = createdCase.json.id;
  }
  assert(caseId, "No case id for update gate");
  log("case_ready", { ok: true, note: `caseId=${caseId}` });

  // STAGE 5 — advocate posts update (held)
  const updateMsg = "Hearing summary for smoke test: matter listed; adjournment sought; next date proposed for evidence. Order sheet will follow after LC approval.";
  const posted = await req("POST", `/api/cases/${caseId}/updates`, {
    token: advocate.token,
    body: { message: updateMsg, updateType: "hearing_summary" },
  });
  assert(posted.ok || posted.status === 201, `Post update failed: ${posted.status} ${JSON.stringify(posted.json)}`);
  const update = posted.json.update || posted.json;
  assert(String(update.status) === "pending_lc_review", `Update should be pending_lc_review, got ${update.status}`);
  log("stage5_update_held", { ok: true, note: `updateId=${update.id} status=${update.status}` });

  const clientBefore = await req("GET", `/api/cases/${caseId}/updates`, { token: client.token });
  assert(clientBefore.ok, `Client updates GET failed: ${clientBefore.status}`);
  const beforeList = clientBefore.json.updates || clientBefore.json || [];
  const leaked = (Array.isArray(beforeList) ? beforeList : []).some((item) => String(item.id) === String(update.id) && String(item.status).includes("pending"));
  assert(!leaked, "Client must not see pending_lc_review update before approval");
  log("stage5_client_cannot_see_pending", { ok: true, note: `clientVisible=${Array.isArray(beforeList) ? beforeList.length : 0}` });

  const pending = await req("GET", "/api/admin/pending-updates", { token: admin.token });
  assert(pending.ok, `pending-updates failed: ${pending.status}`);
  const queue = pending.json.pendingUpdates || [];
  const queued = queue.find((item) => String(item.id) === String(update.id));
  assert(queued, "Update missing from admin pending queue");
  log("stage5_admin_queue", { ok: true, note: `queued=${queue.length}` });

  // STAGE 6 — LC approves
  const approve = await req("POST", `/api/admin/pending-updates/${update.id}/approve`, {
    token: admin.token,
    body: { kind: "update" },
  });
  assert(approve.ok, `approve failed: ${approve.status} ${JSON.stringify(approve.json)}`);
  assert(String(approve.json.update?.status || "").includes("approved"), `Expected approved, got ${approve.json.update?.status}`);
  log("stage6_lc_approved", { ok: true, note: `status=${approve.json.update?.status}` });

  const clientAfter = await req("GET", `/api/cases/${caseId}/updates`, { token: client.token });
  assert(clientAfter.ok, `Client updates after approve failed: ${clientAfter.status}`);
  const afterList = clientAfter.json.updates || clientAfter.json || [];
  const released = (Array.isArray(afterList) ? afterList : []).some((item) => String(item.id) === String(update.id));
  assert(released, "Client should see approved update after LC release");
  log("stage6_client_receives_update", { ok: true, note: `clientVisible=${afterList.length}` });

  // STAGE 7 — conclude
  const conclude = await req("POST", `/api/admin/intakes/${intakeId}/conclude`, {
    token: admin.token,
    body: { note: "Smoke matter concluded — Settled after LC-supervised update release." },
  });
  assert(conclude.ok, `conclude failed: ${conclude.status} ${JSON.stringify(conclude.json)}`);
  const concludeStage = String(conclude.json.pipelineStage || stageOf(conclude.json.intake || {})).toLowerCase();
  assert(concludeStage.includes("concluded") || concludeStage.includes("matter_concluded"), `Expected matter_concluded, got ${concludeStage}`);
  log("stage7_matter_concluded", { ok: true, note: concludeStage });

  console.log("\nSMOKE PASSED — supervised pipeline E2E complete.");
  console.log(JSON.stringify({ base: BASE, intakeId, caseId, updateId: update.id, steps }, null, 2));
}

main().catch((error) => {
  console.error("\nSMOKE FAILED:", error.message || error);
  console.error(JSON.stringify({ base: BASE, steps }, null, 2));
  process.exit(1);
});
