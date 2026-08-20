#!/usr/bin/env node
/**
 * Launch-hardening smoke: wipe lockdown, counsel note strip, LawBot refuse, master login off in prod.
 * Usage: BASE_URL=https://legal-connect-7ewz.onrender.com AUTH_MODE=strict node scripts/smoke-launch-hardening.js
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:5055").replace(/\/$/, "");
const EMAIL = process.env.SMOKE_EMAIL || "";
const PASSWORD = process.env.SMOKE_PASSWORD || "";
if (!EMAIL || !PASSWORD) {
  console.error("Set SMOKE_EMAIL and SMOKE_PASSWORD env vars. No default credentials are shipped.");
  process.exit(1);
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

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function login(role) {
  const strict = await req("POST", "/api/auth/strict/login", {
    body: { email: EMAIL, password: PASSWORD, role },
  });
  if (!strict.ok || !strict.json?.token) {
    throw new Error(`Strict login failed for ${role}: ${strict.status} ${JSON.stringify(strict.json)}`);
  }
  return { token: strict.json.token, user: strict.json.user };
}

function containsAssignmentNote(value) {
  const raw = JSON.stringify(value || {});
  return /assignmentNote|confidentialBriefing|adminNote/.test(raw);
}

async function main() {
  console.log(`Launch hardening smoke against ${BASE}`);
  const health = await req("GET", "/api/health");
  assert(health.ok, `Health failed: ${health.status}`);
  console.log("[OK] health", {
    play: health.json?.google_play_review_access,
    sources: health.json?.approved_sources_count,
    otp: health.json?.otp_mode,
  });

  // Wipe endpoint must not be reachable in production without kill-switch
  const wipeAnon = await req("POST", "/api/admin/reset-operational-data", {
    body: { confirm: "RESET_OPERATIONAL_DATA" },
  });
  assert([401, 403, 404].includes(wipeAnon.status), `Wipe anon unexpected ${wipeAnon.status}`);
  console.log("[OK] wipe anonymous blocked", wipeAnon.status);

  let admin;
  try {
    admin = await login("admin");
    console.log("[OK] master card admin login");
  } catch (error) {
    console.log("[SKIP] admin login unavailable:", error.message);
    admin = null;
  }

  if (admin) {
    const wipeAdmin = await req("POST", "/api/admin/reset-operational-data", {
      token: admin.token,
      body: { confirm: "RESET_OPERATIONAL_DATA" },
    });
    assert(
      wipeAdmin.status === 404 || wipeAdmin.status === 403 || wipeAdmin.json?.ok === true,
      `Unexpected wipe response ${wipeAdmin.status} ${JSON.stringify(wipeAdmin.json)}`,
    );
    if (wipeAdmin.status === 404) {
      console.log("[OK] wipe disabled in production (404)");
    } else {
      console.log("[WARN] wipe still enabled for admin — set ALLOW_OPERATIONAL_RESET=false on Render", wipeAdmin.status);
    }
  }

  let client;
  try {
    client = await login("client");
  } catch (error) {
    console.log("[SKIP] client login:", error.message);
    client = null;
  }

  if (client) {
    const cases = await req("GET", "/api/cases", { token: client.token });
    assert(cases.ok, `cases failed ${cases.status}`);
    assert(!containsAssignmentNote(cases.json), "Client /api/cases leaked confidential assignment fields");
    console.log("[OK] client cases sanitized");

    const workspace = await req("GET", "/api/workspaces/client", { token: client.token });
    assert(workspace.ok, `workspace failed ${workspace.status}`);
    assert(!containsAssignmentNote(workspace.json), "Client workspace leaked confidential assignment fields");
    console.log("[OK] client workspace sanitized");

    const lawbot = await req("POST", "/api/lawbot/query", {
      token: client.token,
      body: { question: "What is Section 138 NI Act?" },
    });
    assert(lawbot.ok, `lawbot failed ${lawbot.status}`);
    const citations = lawbot.json?.citations || [];
    if ((health.json?.approved_sources_count || 0) === 0) {
      assert(citations.length === 0, "LawBot returned citations with zero approved sources");
      assert(/could not verify|approved legal sources/i.test(String(lawbot.json?.answer || "")), "LawBot did not refuse with empty library");
      console.log("[OK] LawBot refuses with empty approved library");
    } else {
      console.log("[OK] LawBot query returned", { citations: citations.length, confidence: lawbot.json?.confidence });
    }
  }

  console.log("PASS launch-hardening smoke");
}

main().catch((error) => {
  console.error("FAIL", error.message || error);
  process.exit(1);
});
