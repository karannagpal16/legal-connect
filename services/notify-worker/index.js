import { readEnv } from "../shared/env.mjs";

readEnv();

const REQUIRED_REAL_MODE_ENV = [
  "DB_URL",
  "REDIS_URL",
  "RESEND_API_KEY",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
];

const demoEvent = {
  id: "event-demo-1",
  type: "caseUpdate",
  userId: "user-demo-1",
  caseId: "case-demo-1",
  title: "Legal Connect Court Sync",
  message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.",
  channels: ["web-push-demo", "email-demo", "whatsapp-ndoh"],
};

function buildDeliveryPlan(event) {
  return {
    mode: "demo",
    event,
    deliveries: event.channels.map((channel) => ({
      channel,
      status: "prepared",
      note:
        channel === "whatsapp-ndoh"
          ? "NDOH WhatsApp cadence (D-7/D-3/three D-1 reminders/hearing morning) is processed via POST /api/reminders/ndoh/process when Twilio WhatsApp is configured."
          : "Demo delivery prepared. Real sending needs provider keys.",
    })),
    requiredEnvForRealMode: REQUIRED_REAL_MODE_ENV,
    ndohTemplates: ["ndoh_d7", "ndoh_d3", "ndoh_d1_morning", "ndoh_d1_midday", "ndoh_d1_evening", "ndoh_morning"],
  };
}

export async function runNotifyCycle(event = demoEvent) {
  const apiBase = process.env.API_BASE_URL || process.env.PUBLIC_APP_URL || "http://127.0.0.1:3000";
  const adminToken = process.env.NOTIFY_WORKER_TOKEN || "";
  let processResult = null;
  if (adminToken) {
    try {
      const response = await fetch(`${apiBase}/api/reminders/ndoh/process`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      processResult = await response.json().catch(() => ({ ok: false, status: response.status }));
    } catch (error) {
      processResult = { ok: false, error: error?.message || "ndoh-process-failed" };
    }
  }
  return {
    ...buildDeliveryPlan(event),
    ndohProcess: processResult || {
      skipped: true,
      reason: "Set NOTIFY_WORKER_TOKEN to an admin bearer token to process due NDOH reminders.",
    },
  };
}

if (process.argv.includes("--once")) {
  const result = await runNotifyCycle();
  console.log(JSON.stringify({ ok: true, worker: "notify-worker", ...result }, null, 2));
} else {
  console.log("Notify worker ready. NDOH WhatsApp reminders use /api/reminders/ndoh/process.");
  const result = await runNotifyCycle();
  console.log(JSON.stringify({ ok: true, firstRun: result }, null, 2));
}
