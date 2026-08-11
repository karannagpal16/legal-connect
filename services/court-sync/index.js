/**
 * Verified Court Updates worker — database-backed sync jobs.
 * Replaces the previous in-memory demo array.
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

const db = requireFromApi("./db.js");
const { createCourtSync } = requireFromApi("./court-sync/index.js");

const courtSync = createCourtSync({
  db,
  sendJson() {},
  readBody: async () => ({}),
  getAuthUser: () => null,
  writeAuditLog: async () => undefined,
});

export async function runCycle() {
  await courtSync.ensureSchema();
  const results = await courtSync.processDueSyncJobs(BATCH_SIZE);
  return {
    ok: true,
    feature: "Verified Court Updates",
    processed: results.length,
    succeeded: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

if (process.argv.includes("--once")) {
  const summary = await runCycle();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.failed ? 1 : 0);
} else {
  console.log(`Verified Court Updates worker ready. Poll every ${POLL_FREQ_MIN} minutes. Provider=${process.env.COURT_DATA_PROVIDER || "fixture"}`);
  const first = await runCycle();
  console.log(JSON.stringify({ firstRun: first }, null, 2));
  setInterval(async () => {
    try {
      const summary = await runCycle();
      console.log(JSON.stringify({ cycle: summary }, null, 2));
    } catch (error) {
      console.error("Court sync cycle failed:", error.message);
    }
  }, POLL_FREQ_MIN * 60 * 1000);
}
