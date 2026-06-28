const POLL_FREQ_MIN = Number(process.env.POLL_FREQ_MIN || 360);
const OFFICIAL_ECOURTS_BASE_URL = process.env.OFFICIAL_ECOURTS_BASE_URL || "https://services.ecourts.gov.in";

const demoTrackedCases = [
  {
    id: "case-demo-1",
    user_id: "user-demo-1",
    court_type: "district",
    state_code: "DL",
    case_no: "2023/CRL-1234",
    next_date: "2026-07-04",
    stage: "Reply awaited",
  },
];

async function fetchOfficialSnapshot(row) {
  // Phase 2 hook: replace this with permitted official eCourts endpoint access.
  // Keep Legal Connect UI custom; do not copy eCourts app screens or flows.
  return {
    source: OFFICIAL_ECOURTS_BASE_URL,
    next_date: row.next_date,
    stage: row.stage,
    item_no: "42",
    court_room: "Court 5",
  };
}

async function pollCase(row) {
  const snapshot = await fetchOfficialSnapshot(row);
  return {
    case_id: row.id,
    user_id: row.user_id,
    changed: false,
    message: `Court Sync checked ${row.case_no}: next date ${snapshot.next_date}, ${snapshot.court_room}, item ${snapshot.item_no}.`,
    snapshot,
  };
}

export async function runCycle() {
  const updates = [];
  for (const row of demoTrackedCases) {
    updates.push(await pollCase(row));
  }
  return updates;
}

if (process.argv.includes("--once")) {
  const updates = await runCycle();
  console.log(JSON.stringify({ ok: true, mode: "demo", updates }, null, 2));
} else {
  console.log(`Court Sync demo worker ready. Poll frequency: ${POLL_FREQ_MIN} minutes.`);
  const updates = await runCycle();
  console.log(JSON.stringify({ ok: true, firstRun: updates }, null, 2));
}
