const REQUIRED_REAL_MODE_ENV = [
  "DB_URL",
  "REDIS_URL",
  "SENDGRID_KEY",
  "WEB_PUSH_PUBLIC_KEY",
  "WEB_PUSH_PRIVATE_KEY",
];

const demoEvent = {
  id: "event-demo-1",
  type: "caseUpdate",
  userId: "user-demo-1",
  caseId: "case-demo-1",
  title: "Legal Connect Court Sync",
  message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.",
  channels: ["web-push-demo", "email-demo", "sms-placeholder"],
};

function buildDeliveryPlan(event) {
  return {
    mode: "demo",
    event,
    deliveries: event.channels.map((channel) => ({
      channel,
      status: "prepared",
      note:
        channel === "sms-placeholder"
          ? "SMS provider not connected yet."
          : "Demo delivery prepared. Real sending needs provider keys.",
    })),
    requiredEnvForRealMode: REQUIRED_REAL_MODE_ENV,
  };
}

export async function runNotifyCycle(event = demoEvent) {
  return buildDeliveryPlan(event);
}

if (process.argv.includes("--once")) {
  const result = await runNotifyCycle();
  console.log(JSON.stringify({ ok: true, worker: "notify-worker", ...result }, null, 2));
} else {
  console.log("Notify worker demo ready. Connect Redis/Postgres queue before real delivery.");
  const result = await runNotifyCycle();
  console.log(JSON.stringify({ ok: true, firstRun: result }, null, 2));
}
