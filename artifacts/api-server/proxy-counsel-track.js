/**
 * Proxy counsel live-tracking helpers.
 * Builds the Main counsel → LC → Proxy narrative for admin & parties.
 */

function firstPracticeLabel(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  return text.split(/[,;/|]+/).map((part) => part.trim()).filter(Boolean)[0] || text;
}

function courtsMatch(missionCourt, practiceCourts) {
  const court = String(missionCourt || "").toLowerCase().trim();
  const practice = String(practiceCourts || "").toLowerCase().trim();
  if (!court || !practice) return false;
  const tokens = court.split(/\s+/).filter((t) => t.length > 3);
  if (practice.includes(court)) return true;
  return tokens.some((token) => practice.includes(token));
}

function loadAdvocateProfilesByIds(db, ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!unique.length || !db?.dbAvailable) return Promise.resolve(new Map());
  return db.query(
    `SELECT u.id, u.name,
            COALESCE(pa.practice_courts, '') AS practice_courts,
            COALESCE(pa.practice_areas, '') AS practice_areas,
            COALESCE(pa.office_address, '') AS office_address,
            COALESCE(pa.enrollment_no, '') AS enrollment_no
     FROM users u
     LEFT JOIN profile_advocates pa ON pa.user_id = u.id
     WHERE u.id = ANY($1::uuid[])`,
    [unique],
  ).then((result) => {
    const map = new Map();
    for (const row of result.rows || []) {
      map.set(String(row.id), {
        id: String(row.id),
        name: row.name || "Advocate",
        practiceCourts: row.practice_courts || "",
        practiceAreas: row.practice_areas || "",
        officeAddress: row.office_address || "",
        enrollmentNo: row.enrollment_no || "",
      });
    }
    return map;
  }).catch(() => new Map());
}

function counselSnapshotFromProfile(profile, fallbackName = "") {
  if (!profile && !fallbackName) return null;
  return {
    name: profile?.name || fallbackName || "Advocate",
    practiceCourts: profile?.practiceCourts || "",
    practiceAreas: profile?.practiceAreas || "",
    practiceLabel: firstPracticeLabel(profile?.practiceCourts || profile?.practiceAreas || profile?.officeAddress || ""),
    enrollmentNo: profile?.enrollmentNo || "",
  };
}

function buildCounselLiveTrack(task) {
  const status = String(task.status || "").toLowerCase();
  const proof = String(task.proofStatus || "").toLowerCase();
  const escrow = String(task.escrowStatus || "").toLowerCase();
  const decision = String(task.posterProofDecision || "").toLowerCase();
  const main = task.mainCounsel || {};
  const proxy = task.proxyCounsel || {};
  const court = task.court || task.location || "Court TBD";
  const mainName = main.name || task.posterName || "Main counsel";
  const mainPractice = main.practiceLabel || firstPracticeLabel(main.practiceCourts) || "Practice TBD";
  const proxyName = proxy.name || task.assignedProxyName || "Proxy counsel";
  const proxyPractice = proxy.practiceLabel || firstPracticeLabel(proxy.practiceCourts) || "Practice TBD";

  const refunded = escrow.includes("refund") || status.includes("refund");
  const released = escrow.includes("release") || Boolean(task.settlementReleasedAt);
  const assigned = Boolean(task.acceptedBy || task.assignedProxyName);
  const proxyAccepted = Boolean(task.proxyAcceptedAt || task.conflictDeclaredAt);
  const proofUp = ["submitted", "lc_verified", "poster_approved", "approved", "rejected"].includes(proof)
    || status.includes("proof");
  const lcVerified = ["lc_verified", "poster_approved", "approved"].includes(proof);
  const counselOk = decision === "ok" || proof === "poster_approved" || proof === "approved";
  const counselNotOk = decision === "not_ok" || proof === "rejected" || Boolean(task.refundRequested);

  const nodes = [
    {
      id: "main_counsel",
      label: `${mainName} · ${mainPractice}`,
      detail: "Main counsel",
      state: "done",
    },
    {
      id: "task_posted",
      label: `Task posted at ${court}`,
      detail: "Escrow locked",
      state: "done",
    },
    {
      id: "lc_assigned",
      label: assigned ? "LC acknowledged & assigned" : "Awaiting LC assignment",
      detail: assigned ? `Proxy: ${proxyName}` : "Admin picks proxy by court + interest",
      state: assigned ? "done" : "active",
    },
    {
      id: "proxy_accepted",
      label: assigned
        ? (proxyAccepted ? `${proxyName} · ${proxyPractice} · accepted` : `${proxyName} · ${proxyPractice} · awaiting accept`)
        : "Proxy accept",
      detail: "Proxy confirms the mission",
      state: !assigned ? "pending" : (proxyAccepted ? "done" : "active"),
    },
    {
      id: "proof",
      label: proofUp ? (lcVerified ? "Proof uploaded · LC verified" : "Proof uploaded · awaiting LC") : "Proof pending",
      detail: "Order sheet",
      state: !proxyAccepted ? "pending" : (lcVerified ? "done" : (proofUp ? "active" : "pending")),
    },
    {
      id: "counsel_review",
      label: counselOk
        ? `${mainName} satisfied`
        : (counselNotOk ? `${mainName} not satisfied` : "Counsel review"),
      detail: counselNotOk && task.posterProofReason
        ? String(task.posterProofReason).slice(0, 120)
        : "Satisfied or not + reason",
      state: !lcVerified ? "pending" : (counselOk || counselNotOk ? "done" : "active"),
    },
    {
      id: "settlement",
      label: refunded
        ? "Refunded to main counsel"
        : (released
          ? `Funds released${task.settlement?.netToProxy != null ? ` · net ₹${Number(task.settlement.netToProxy).toLocaleString("en-IN")}` : ""}`
          : (counselOk ? "LC: release or refund" : (counselNotOk ? "LC: acknowledge & refund" : "Settlement"))),
      detail: released
        ? "Platform fee + tax deducted"
        : (refunded ? "Manual refund to original payment" : "Admin settlement desk"),
      state: refunded || released ? "done" : ((counselOk || counselNotOk) ? "active" : "pending"),
    },
  ];

  // If an earlier node is still active/pending, later "active" should not leapfrog — normalize.
  let sawOpen = false;
  for (const node of nodes) {
    if (sawOpen && node.state === "done") {
      // keep historical done
    } else if (sawOpen && node.state === "active") {
      node.state = "pending";
    }
    if (node.state === "active" || node.state === "pending") sawOpen = true;
  }

  const active = nodes.find((node) => node.state === "active") || nodes.find((node) => node.state === "pending") || nodes[nodes.length - 1];
  return {
    version: 1,
    mainCounsel: { name: mainName, practiceLabel: mainPractice, practiceCourts: main.practiceCourts || "" },
    proxyCounsel: assigned
      ? { name: proxyName, practiceLabel: proxyPractice, practiceCourts: proxy.practiceCourts || "" }
      : null,
    taskCourt: court,
    headline: nodes
      .filter((node) => node.state === "done" || node.id === active?.id)
      .map((node) => node.label)
      .join(" ——— "),
    activeNodeId: active?.id || null,
    nodes,
  };
}

function enrichTaskWithCounselTrack(task, profilesById = new Map()) {
  if (!task || task.teaserOnly) return task;
  const posterId = String(task.postedBy || "");
  const proxyId = String(task.acceptedBy || "");
  const posterProfile = profilesById.get(posterId) || null;
  const proxyProfile = profilesById.get(proxyId) || null;

  const mainCounsel = task.mainCounsel && task.mainCounsel.name
    ? {
        ...task.mainCounsel,
        practiceLabel: task.mainCounsel.practiceLabel || firstPracticeLabel(task.mainCounsel.practiceCourts || task.mainCounsel.practiceAreas),
      }
    : counselSnapshotFromProfile(posterProfile, task.posterName || "");

  const proxyCounsel = task.proxyCounsel && task.proxyCounsel.name
    ? {
        ...task.proxyCounsel,
        practiceLabel: task.proxyCounsel.practiceLabel || firstPracticeLabel(task.proxyCounsel.practiceCourts || task.proxyCounsel.practiceAreas),
      }
    : counselSnapshotFromProfile(proxyProfile, task.assignedProxyName || "");

  const enriched = {
    ...task,
    posterName: mainCounsel?.name || task.posterName || null,
    mainCounsel,
    proxyCounsel: task.acceptedBy ? proxyCounsel : null,
    courtMatchHint: courtsMatch(task.court || task.location, proxyCounsel?.practiceCourts || ""),
  };
  enriched.liveTrack = buildCounselLiveTrack(enriched);
  return enriched;
}

async function enrichTasksWithCounselTrack(db, tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const ids = list.flatMap((task) => [task.postedBy, task.acceptedBy]).filter(Boolean);
  const profiles = await loadAdvocateProfilesByIds(db, ids);
  return list.map((task) => enrichTaskWithCounselTrack(task, profiles));
}

module.exports = {
  firstPracticeLabel,
  courtsMatch,
  loadAdvocateProfilesByIds,
  counselSnapshotFromProfile,
  buildCounselLiveTrack,
  enrichTaskWithCounselTrack,
  enrichTasksWithCounselTrack,
};
