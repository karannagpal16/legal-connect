/**
 * Verified Court Updates worker — database-backed sync jobs.
 *
 * Baseline windows: 06:00 / 18:00 IST (full due-batch processing).
 * Outside baseline: only process overdue jobs when COURT_SYNC_OUTSIDE_BASELINE=true,
 * or when --once / force is used.
 *
 * Run once:  node index.js --once
 * Loop:      node index.js
 */

import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import { envNumber, readEnv } from "../shared/env.mjs";

readEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, "../../artifacts/api-server");
const requireFromApi = createRequire(path.join(apiRoot, "package.json"));

const POLL_FREQ_MIN = envNumber("POLL_FREQ_MIN", 30);
const BATCH_SIZE = envNumber("COURT_SYNC_BATCH_SIZE", 25);
const OUTSIDE_BASELINE = String(process.env.COURT_SYNC_OUTSIDE_BASELINE || "true").toLowerCase() !== "false";

const db = requireFromApi("./db.js");
const { createCourtSync } = requireFromApi("./court-sync/index.js");

const courtSync = createCourtSync({
  db,
  sendJson() {},
  readBody: async () => ({}),
  getAuthUser: () => null,
  writeAuditLog: async () => undefined,
});

function isBaselineWindow(now = new Date()) {
  const istMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
  const normalized = ((istMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const istHour = Math.floor(normalized / 60);
  const istMin = normalized % 60;
  // Open a POLL_FREQ_MIN-wide gate after 06:00 and 18:00 IST.
  return (istHour === 6 || istHour === 18) && istMin < Math.max(POLL_FREQ_MIN, 1);
}

export async function runCycle({ force = false } = {}) {
  await courtSync.ensureSchema();
  const baselineWindow = isBaselineWindow();
  const shouldRun = force || baselineWindow || OUTSIDE_BASELINE;
  if (!shouldRun) {
    return {
      ok: true,
      feature: "Verified Court Updates",
      engine: "Real eCourts & Order PDF Sync Engine",
      baselineWindow,
      force,
      skipped: true,
      reason: "outside_baseline_window",
      processed: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    };
  }
  const results = await courtSync.processDueSyncJobs(BATCH_SIZE);
  return {
    ok: true,
    feature: "Verified Court Updates",
    engine: "Real eCourts & Order PDF Sync Engine",
    baselineWindow,
    force,
    skipped: false,
    processed: results.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

if (process.argv.includes("--once")) {
  const summary = await runCycle({ force: true });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed ? 1 : 0);
} else {
  console.log(
    `Verified Court Updates worker ready. Poll every ${POLL_FREQ_MIN} minutes; baseline gates 06:00/18:00 IST. Provider=${process.env.COURT_DATA_PROVIDER || "fixture"}`,
  );
  const first = await runCycle({ force: true });
  console.log(JSON.stringify({ firstRun: first }, null, 2));
  setInterval(async () => {
    try {
      const summary = await runCycle({ force: false });
      console.log(JSON.stringify({ cycle: summary }, null, 2));
    } catch (error) {
      console.error("Court sync cycle failed:", error.message);
    }
  }, POLL_FREQ_MIN * 60 * 1000);
}

export { isBaselineWindow };
