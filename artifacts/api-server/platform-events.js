/**
 * Legal Connect — 360° platform event bus.
 * Ring buffer + Postgres persistence + role-scoped live polling feed.
 */

const EVENT_TYPES = Object.freeze({
  INTAKE_SUBMITTED_AND_PAID: "INTAKE_SUBMITTED_AND_PAID",
  LAWYER_ASSIGNED_BY_LC: "LAWYER_ASSIGNED_BY_LC",
  ADVOCATE_ACKNOWLEDGED: "ADVOCATE_ACKNOWLEDGED",
  STAGE_ADVANCED_BY_ADVOCATE: "STAGE_ADVANCED_BY_ADVOCATE",
  PROXY_MISSION_POSTED: "PROXY_MISSION_POSTED",
  PROXY_MISSION_ACCEPTED: "PROXY_MISSION_ACCEPTED",
  PROXY_PROOF_UPLOADED: "PROXY_PROOF_UPLOADED",
  CHAMBER_TASK_DELEGATED: "CHAMBER_TASK_DELEGATED",
  COURT_FEE_PAID: "COURT_FEE_PAID",
  REQUEST_ENTERTAINED: "REQUEST_ENTERTAINED",
  STATUS_UPDATE: "STATUS_UPDATE",
});

const ACTION_TO_EVENT = Object.freeze({
  payment_verified: EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID,
  booking_confirmed: EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID,
  intake_submitted: EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID,
  case_assigned: EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
  booking_assigned: EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
  intake_assign: EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
  intake_advocate_accepted: EVENT_TYPES.ADVOCATE_ACKNOWLEDGED,
  advocate_accept: EVENT_TYPES.ADVOCATE_ACKNOWLEDGED,
  case_stage_updated: EVENT_TYPES.STAGE_ADVANCED_BY_ADVOCATE,
  booking_stage_updated: EVENT_TYPES.STAGE_ADVANCED_BY_ADVOCATE,
  proxy_hub_task_posted: EVENT_TYPES.PROXY_MISSION_POSTED,
  proxy_mission_posted: EVENT_TYPES.PROXY_MISSION_POSTED,
  assign_proxy: EVENT_TYPES.PROXY_MISSION_ACCEPTED,
  proxy_mission_assigned: EVENT_TYPES.PROXY_MISSION_ACCEPTED,
  counsel_accept: EVENT_TYPES.PROXY_MISSION_ACCEPTED,
  proxy_proof_uploaded: EVENT_TYPES.PROXY_PROOF_UPLOADED,
  mark_proof_approved: EVENT_TYPES.PROXY_PROOF_UPLOADED,
  chamber_task_created: EVENT_TYPES.CHAMBER_TASK_DELEGATED,
  chamber_task_assigned: EVENT_TYPES.CHAMBER_TASK_DELEGATED,
  court_fee_paid: EVENT_TYPES.COURT_FEE_PAID,
  fee_paid: EVENT_TYPES.COURT_FEE_PAID,
  request_entertained: EVENT_TYPES.REQUEST_ENTERTAINED,
  escrow_released: EVENT_TYPES.REQUEST_ENTERTAINED,
  mark_payment_locked: EVENT_TYPES.REQUEST_ENTERTAINED,
});

const NOTIFY_TO_EVENT = Object.freeze({
  booking_confirmed: EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID,
  payment_verified: EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID,
  case_assigned: EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
  booking_assigned: EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
  intake_assigned: EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
  advocate_connected: EVENT_TYPES.ADVOCATE_ACKNOWLEDGED,
  case_stage_updated: EVENT_TYPES.STAGE_ADVANCED_BY_ADVOCATE,
  booking_stage_updated: EVENT_TYPES.STAGE_ADVANCED_BY_ADVOCATE,
  proxy_mission_posted: EVENT_TYPES.PROXY_MISSION_POSTED,
  proxy_mission_assigned: EVENT_TYPES.PROXY_MISSION_ACCEPTED,
  proxy_proof_uploaded: EVENT_TYPES.PROXY_PROOF_UPLOADED,
  proxy_proof_approved: EVENT_TYPES.PROXY_PROOF_UPLOADED,
  chamber_task_created: EVENT_TYPES.CHAMBER_TASK_DELEGATED,
  chamber_task_updated: EVENT_TYPES.CHAMBER_TASK_DELEGATED,
  court_fee_paid: EVENT_TYPES.COURT_FEE_PAID,
  request_entertained: EVENT_TYPES.REQUEST_ENTERTAINED,
});

const EVENT_TITLES = Object.freeze({
  [EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID]: "Booking Submitted & Fee Paid",
  [EVENT_TYPES.LAWYER_ASSIGNED_BY_LC]: "Lawyer Assigned by Legal Connect",
  [EVENT_TYPES.ADVOCATE_ACKNOWLEDGED]: "Advocate Connected",
  [EVENT_TYPES.STAGE_ADVANCED_BY_ADVOCATE]: "Court Stage Advanced",
  [EVENT_TYPES.PROXY_MISSION_POSTED]: "Proxy Mission Posted",
  [EVENT_TYPES.PROXY_MISSION_ACCEPTED]: "Proxy Mission Accepted",
  [EVENT_TYPES.PROXY_PROOF_UPLOADED]: "Proxy Proof Uploaded",
  [EVENT_TYPES.CHAMBER_TASK_DELEGATED]: "Chamber Task Delegated",
  [EVENT_TYPES.COURT_FEE_PAID]: "Court Fee Paid",
  [EVENT_TYPES.REQUEST_ENTERTAINED]: "Request Entertained",
  [EVENT_TYPES.STATUS_UPDATE]: "Status Update",
});

const MAX_RING = 300;
const ringBuffer = [];
let schemaReady = false;

function createPlatformEvents({ db, config }) {
  async function ensureSchema() {
    if (!db?.dbAvailable || schemaReady) return schemaReady;
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS platform_events (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id text NOT NULL UNIQUE,
          event_type text NOT NULL,
          title text,
          message text,
          actor jsonb NOT NULL DEFAULT '{}'::jsonb,
          targets jsonb NOT NULL DEFAULT '{}'::jsonb,
          audience jsonb NOT NULL DEFAULT '[]'::jsonb,
          payload jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz DEFAULT now()
        )
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS platform_events_created_idx ON platform_events (created_at DESC)`);
      await db.query(`CREATE INDEX IF NOT EXISTS platform_events_type_idx ON platform_events (event_type, created_at DESC)`);
      schemaReady = true;
    } catch (error) {
      console.warn("platform_events schema init failed:", error?.message || error);
      schemaReady = false;
    }
    return schemaReady;
  }

  function pushRing(event) {
    ringBuffer.unshift(event);
    if (ringBuffer.length > MAX_RING) ringBuffer.length = MAX_RING;
  }

  function normalizeActor(actor = {}) {
    return {
      userId: actor.userId || actor.id || null,
      name: actor.name || "System",
      role: actor.role || "system",
      barEnrollmentNo: actor.barEnrollmentNo || actor.enrollmentNo || actor.enrollment_no || null,
    };
  }

  function normalizeTargets(targets = {}) {
    return {
      clientId: targets.clientId || targets.userId || null,
      advocateId: targets.advocateId || targets.assignedAdvocateId || null,
      proxyId: targets.proxyId || targets.acceptedBy || null,
      internId: targets.internId || null,
      assigneeId: targets.assigneeId || targets.assignedTo || null,
      caseId: targets.caseId || null,
      bookingId: targets.bookingId || null,
      taskId: targets.taskId || null,
      questId: targets.questId || null,
    };
  }

  async function emitPlatformEvent({
    eventType,
    actor,
    targets = {},
    payload = {},
    title,
    message,
    extraAudience = [],
    latencyMs = null,
  } = {}) {
    const started = Date.now();
    const type = EVENT_TYPES[eventType] || eventType || EVENT_TYPES.STATUS_UPDATE;
    const normalizedActor = normalizeActor(actor);
    const normalizedTargets = normalizeTargets(targets);
    const audienceSet = new Set(["role:admin", "role:rna"]);
    if (normalizedActor.userId) audienceSet.add(String(normalizedActor.userId));
    if (normalizedActor.role) audienceSet.add(`role:${String(normalizedActor.role).toLowerCase()}`);
    for (const key of ["clientId", "advocateId", "proxyId", "internId", "assigneeId"]) {
      if (normalizedTargets[key]) audienceSet.add(String(normalizedTargets[key]));
    }
    for (const item of extraAudience || []) if (item) audienceSet.add(String(item));
    if (
      [
        EVENT_TYPES.PROXY_MISSION_POSTED,
        EVENT_TYPES.PROXY_MISSION_ACCEPTED,
        EVENT_TYPES.PROXY_PROOF_UPLOADED,
        EVENT_TYPES.CHAMBER_TASK_DELEGATED,
      ].includes(type)
    ) {
      audienceSet.add("role:advocate");
      audienceSet.add("role:intern");
    }
    if (
      [
        EVENT_TYPES.INTAKE_SUBMITTED_AND_PAID,
        EVENT_TYPES.LAWYER_ASSIGNED_BY_LC,
        EVENT_TYPES.ADVOCATE_ACKNOWLEDGED,
        EVENT_TYPES.STAGE_ADVANCED_BY_ADVOCATE,
        EVENT_TYPES.COURT_FEE_PAID,
        EVENT_TYPES.REQUEST_ENTERTAINED,
        EVENT_TYPES.PROXY_PROOF_UPLOADED,
      ].includes(type)
    ) {
      audienceSet.add("role:client");
    }

    // Collapse duplicate audit+notify emissions for the same target within 1.5s.
    const dedupeKey = [
      type,
      normalizedTargets.caseId || "",
      normalizedTargets.bookingId || "",
      normalizedTargets.taskId || "",
      normalizedTargets.questId || "",
    ].join("|");
    const nowMs = Date.now();
    const recent = ringBuffer.find((item) => {
      const key = [
        item.eventType,
        item.targets?.caseId || "",
        item.targets?.bookingId || "",
        item.targets?.taskId || "",
        item.targets?.questId || "",
      ].join("|");
      return key === dedupeKey && nowMs - new Date(item.timestamp).getTime() < 1500;
    });
    if (recent) return recent;

    const event = {
      eventId: `EVT-${Date.now()}-${Math.round(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      eventType: type,
      title: title || EVENT_TITLES[type] || "Status Update",
      message: message || title || EVENT_TITLES[type] || "Platform status updated.",
      actor: normalizedActor,
      targets: normalizedTargets,
      audience: Array.from(audienceSet),
      payload: {
        ...payload,
        latencyMs: latencyMs != null ? latencyMs : Math.max(1, Date.now() - started),
      },
    };

    pushRing(event);

    try {
      if (db?.dbAvailable) {
        await ensureSchema();
        if (schemaReady) {
          await db.query(
            `INSERT INTO platform_events (event_id, event_type, title, message, actor, targets, audience, payload, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (event_id) DO NOTHING`,
            [
              event.eventId,
              event.eventType,
              event.title,
              event.message,
              JSON.stringify(event.actor),
              JSON.stringify(event.targets),
              JSON.stringify(event.audience),
              JSON.stringify(event.payload),
              event.timestamp,
            ],
          );
        }
      }
    } catch (error) {
      // Persistence must never break mutation paths.
      if (config?.nodeEnv !== "production") {
        console.warn("emitPlatformEvent persist failed:", error?.message || error);
      }
    }

    return event;
  }

  async function emitFromAudit(actor, action, targetType, targetId, message, payload = {}) {
    const eventType = ACTION_TO_EVENT[action] || EVENT_TYPES.STATUS_UPDATE;
    const targets = {
      ...(payload || {}),
      caseId: payload.caseId || (targetType === "case" ? targetId : null),
      bookingId: payload.bookingId || (targetType === "booking" ? targetId : null),
      taskId: payload.taskId || (targetType === "task" ? targetId : null),
      questId: payload.questId || (targetType === "quest" ? targetId : null),
      clientId: payload.clientId || payload.userId || null,
      advocateId: payload.advocateId || payload.assignedAdvocateId || null,
    };
    return emitPlatformEvent({
      eventType,
      actor,
      targets,
      payload: { ...(payload || {}), action, targetType, targetId },
      title: EVENT_TITLES[eventType],
      message: message || EVENT_TITLES[eventType],
    });
  }

  async function emitFromNotify({ eventType, title, message, payload = {}, actor = null, recipients = [] } = {}) {
    const mapped = NOTIFY_TO_EVENT[eventType];
    if (!mapped) return null;
    const extraAudience = (recipients || [])
      .map((item) => item?.userId || item?.id)
      .filter(Boolean);
    return emitPlatformEvent({
      eventType: mapped,
      actor: actor || { role: "system", name: "Legal Connect" },
      targets: payload || {},
      payload: { ...(payload || {}), notifyEventType: eventType },
      title: title || EVENT_TITLES[mapped],
      message: message || title || EVENT_TITLES[mapped],
      extraAudience,
    });
  }

  function canSeeEvent(authUser, event) {
    if (!authUser) return false;
    const role = String(authUser.role || "").toLowerCase();
    if (role === "admin" || role === "rna") return true;
    const audience = Array.isArray(event.audience) ? event.audience : [];
    if (audience.includes("*")) return true;
    if (audience.includes(`role:${role}`)) return true;
    if (authUser.id && audience.includes(String(authUser.id))) return true;
    const targets = event.targets || {};
    const ids = [targets.clientId, targets.advocateId, targets.proxyId, targets.internId, targets.assigneeId]
      .filter(Boolean)
      .map(String);
    if (authUser.id && ids.includes(String(authUser.id))) return true;
    return false;
  }

  function mapDbRow(row) {
    return {
      eventId: row.event_id || row.eventId,
      timestamp: row.created_at || row.timestamp,
      eventType: row.event_type || row.eventType,
      title: row.title,
      message: row.message,
      actor: row.actor || {},
      targets: row.targets || {},
      audience: row.audience || [],
      payload: row.payload || {},
    };
  }

  async function listLiveEvents(authUser, { since = null, limit = 40, caseId = null, taskId = null, bookingId = null } = {}) {
    const capped = Math.min(Math.max(Number(limit) || 40, 1), 100);
    let events = [];

    if (db?.dbAvailable) {
      await ensureSchema();
      if (schemaReady) {
        const params = [];
        const clauses = [];
        if (since) {
          params.push(since);
          clauses.push(`created_at > $${params.length}`);
        }
        if (caseId) {
          params.push(caseId);
          clauses.push(`targets->>'caseId' = $${params.length}`);
        }
        if (taskId) {
          params.push(taskId);
          clauses.push(`targets->>'taskId' = $${params.length}`);
        }
        if (bookingId) {
          params.push(bookingId);
          clauses.push(`targets->>'bookingId' = $${params.length}`);
        }
        params.push(capped);
        const sql = `
          SELECT event_id, event_type, title, message, actor, targets, audience, payload, created_at
          FROM platform_events
          ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
          ORDER BY created_at DESC
          LIMIT $${params.length}
        `;
        const result = await db.query(sql, params);
        events = result.rows.map(mapDbRow);
      }
    }

    if (!events.length) {
      events = ringBuffer.slice();
      if (since) {
        const sinceMs = new Date(since).getTime();
        if (!Number.isNaN(sinceMs)) {
          events = events.filter((item) => new Date(item.timestamp).getTime() > sinceMs);
        }
      }
      if (caseId) events = events.filter((item) => String(item.targets?.caseId || "") === String(caseId));
      if (taskId) events = events.filter((item) => String(item.targets?.taskId || "") === String(taskId));
      if (bookingId) events = events.filter((item) => String(item.targets?.bookingId || "") === String(bookingId));
      events = events.slice(0, capped);
    }

    const visible = events.filter((event) => canSeeEvent(authUser, event));
    return {
      ok: true,
      events: visible,
      count: visible.length,
      latestTimestamp: visible[0]?.timestamp || null,
      serverTime: new Date().toISOString(),
      catalog: Object.values(EVENT_TYPES),
    };
  }

  function clearRing() {
    ringBuffer.length = 0;
  }

  return {
    EVENT_TYPES,
    EVENT_TITLES,
    ensureSchema,
    emitPlatformEvent,
    emitFromAudit,
    emitFromNotify,
    listLiveEvents,
    clearRing,
    canSeeEvent,
  };
}

module.exports = {
  EVENT_TYPES,
  EVENT_TITLES,
  ACTION_TO_EVENT,
  NOTIFY_TO_EVENT,
  createPlatformEvents,
};
