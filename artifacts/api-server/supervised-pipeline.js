/**
 * Legal Connect Supervised Case Pipeline
 * Client ──→ [LC Gate] ──→ Advocate ──→ [LC Gate] ──→ Client
 */

const PIPELINE_STAGES = Object.freeze([
  {
    key: "intake_submitted",
    order: 1,
    label: "Intake Submitted & Fee Secured",
    clientCopy: "LC is reviewing your case. Expected assignment: within 24 hours.",
  },
  {
    key: "lc_under_review",
    order: 2,
    label: "Legal Connect Under Review",
    clientCopy: "Legal Connect is reviewing your intake and may request more documents.",
  },
  {
    key: "advocate_assigned",
    order: 3,
    label: "Advocate Assigned by Legal Connect",
    clientCopy: "An independent Bar-verified advocate has been assigned to your matter.",
  },
  {
    key: "advocate_accepted",
    order: 4,
    label: "Advocate Accepted — Work In Progress",
    clientCopy: "Your advocate has accepted the engagement and is actively working.",
  },
  {
    key: "advocate_update_pending",
    order: 5,
    label: "Advocate Update Pending LC Review",
    clientCopy: "Your advocate submitted an update. Legal Connect is reviewing it before release.",
  },
  {
    key: "lc_update_approved",
    order: 6,
    label: "LC Update Approved & Released",
    clientCopy: "Legal Connect approved counsel's update and released it to your workspace.",
  },
  {
    key: "matter_concluded",
    order: 7,
    label: "Matter Concluded",
    clientCopy: "Work complete. Escrow released and rating unlocked.",
  },
]);

const STAGE_ALIASES = Object.freeze({
  draft: "intake_submitted",
  paid: "intake_submitted",
  payment_pending: "intake_submitted",
  intake: "intake_submitted",
  under_review: "lc_under_review",
  assigned: "advocate_assigned",
  acknowledged_and_assigned: "advocate_assigned",
  work_in_progress: "advocate_accepted",
  approved: "lc_update_approved",
  approved_and_released: "lc_update_approved",
  concluded: "matter_concluded",
  closed: "matter_concluded",
  disposed: "matter_concluded",
});

const INTAKE_SLA_MS = 24 * 60 * 60 * 1000;
const UPDATE_SLA_MS = 12 * 60 * 60 * 1000;

function normalizePipelineStage(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;
  if (STAGE_ALIASES[raw]) return STAGE_ALIASES[raw];
  if (PIPELINE_STAGES.some((stage) => stage.key === raw)) return raw;
  return null;
}

function stageMeta(value) {
  const key = normalizePipelineStage(value) || "intake_submitted";
  return PIPELINE_STAGES.find((stage) => stage.key === key) || PIPELINE_STAGES[0];
}

function pipelineProgress(value) {
  const meta = stageMeta(value);
  return {
    stage: meta.key,
    stageOrder: meta.order,
    stageLabel: meta.label,
    clientCopy: meta.clientCopy,
    totalStages: PIPELINE_STAGES.length,
    steps: PIPELINE_STAGES.map((stage) => ({
      key: stage.key,
      order: stage.order,
      label: stage.label,
      complete: stage.order <= meta.order,
      current: stage.key === meta.key,
    })),
  };
}

/** Bar Council Rule 36–friendly display: "Adv. Rishika Nagpal" → "Adv. R.N." */
function maskCounselForClient(name, enrollment = null) {
  const value = String(name || "").trim();
  if (!value) {
    return {
      displayName: "Assigned counsel",
      enrollment: enrollment || null,
      contactPolicy: "Contact through Legal Connect only",
    };
  }
  const cleaned = value.replace(/^adv\.?\s*/i, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const initials = parts.map((part) => `${part[0] || ""}.`).join("").toUpperCase();
  return {
    displayName: initials ? `Adv. ${initials}` : "Assigned counsel",
    enrollment: enrollment || null,
    contactPolicy: "Contact through Legal Connect only",
    fullNameHidden: true,
  };
}

function slaClock(startedAt, windowMs = INTAKE_SLA_MS) {
  if (!startedAt) return null;
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return null;
  const elapsedMs = Math.max(0, Date.now() - startMs);
  const remainingMs = windowMs - elapsedMs;
  const format = (ms) => {
    const totalMinutes = Math.max(0, Math.floor(Math.abs(ms) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };
  return {
    startedAt: new Date(startMs).toISOString(),
    elapsedLabel: format(elapsedMs),
    remainingLabel: remainingMs >= 0 ? format(remainingMs) : `Breached by ${format(remainingMs)}`,
    remainingMs,
    breached: remainingMs < 0,
    windowHours: Math.round(windowMs / 3600000),
  };
}

function createSupervisedPipeline({ db } = {}) {
  async function syncBookingPipelineStage(bookingId, stage, extraPayload = {}) {
    const normalized = normalizePipelineStage(stage);
    if (!bookingId || !normalized || !db?.dbAvailable) return null;
    const result = await db.query(
      `UPDATE bookings
       SET stage_status = $2,
           payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
       WHERE id = $1
       RETURNING id, stage_status, payload`,
      [
        bookingId,
        normalized,
        JSON.stringify({
          intakeStatus: normalized,
          stageStatus: normalized,
          pipelineStage: normalized,
          pipelineUpdatedAt: new Date().toISOString(),
          ...extraPayload,
        }),
      ],
    ).catch(() => ({ rows: [] }));
    return result.rows[0] || null;
  }

  async function syncCasePipelineStage(caseId, stage, extraPayload = {}) {
    const normalized = normalizePipelineStage(stage);
    if (!caseId || !normalized || !db?.dbAvailable) return null;
    const result = await db.query(
      `UPDATE cases
       SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
           updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        caseId,
        JSON.stringify({
          pipelineStage: normalized,
          intakeStatus: normalized,
          stage: normalized,
          ...extraPayload,
        }),
      ],
    ).catch(() => ({ rows: [] }));
    return result.rows[0] || null;
  }

  async function bookingIdForCase(caseId) {
    if (!caseId || !db?.dbAvailable) return null;
    const result = await db.query(
      `SELECT payload->>'bookingId' AS booking_id FROM cases WHERE id = $1 LIMIT 1`,
      [caseId],
    ).catch(() => ({ rows: [] }));
    return result.rows[0]?.booking_id || null;
  }

  async function caseClientAndAdvocate(caseId) {
    if (!caseId || !db?.dbAvailable) return { clientId: null, advocateId: null, bookingId: null, caseTitle: null };
    const result = await db.query(
      `SELECT user_id, title, payload FROM cases WHERE id = $1 LIMIT 1`,
      [caseId],
    ).catch(() => ({ rows: [] }));
    const row = result.rows[0];
    if (!row) return { clientId: null, advocateId: null, bookingId: null, caseTitle: null };
    const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
    return {
      clientId: row.user_id || payload.userId || null,
      advocateId: payload.assignedAdvocateId || payload.assignedTo || null,
      bookingId: payload.bookingId || null,
      caseTitle: row.title || payload.caseTitle || null,
    };
  }

  async function mirrorApprovedUpdateToCommunications(caseId, updateRow, reviewerId) {
    if (!caseId || !updateRow || !db?.dbAvailable) return null;
    const title = `${String(updateRow.update_type || "Case update").replace(/_/g, " ")} · Released by Legal Connect`;
    const summary = String(updateRow.message || "").slice(0, 500);
    const result = await db.query(
      `INSERT INTO case_communications (case_id, sender_id, communication_type, title, summary, recording_consent, payload)
       VALUES ($1, $2, $3, $4, $5, false, $6::jsonb)
       RETURNING id`,
      [
        caseId,
        reviewerId || null,
        "lc_released_update",
        title,
        summary,
        JSON.stringify({
          updateId: updateRow.id,
          updateType: updateRow.update_type,
          authorId: updateRow.author_id,
          releasedAt: new Date().toISOString(),
          supervised: true,
        }),
      ],
    ).catch(() => ({ rows: [] }));
    return result.rows[0] || null;
  }

  return {
    PIPELINE_STAGES,
    INTAKE_SLA_MS,
    UPDATE_SLA_MS,
    normalizePipelineStage,
    stageMeta,
    pipelineProgress,
    maskCounselForClient,
    slaClock,
    syncBookingPipelineStage,
    syncCasePipelineStage,
    bookingIdForCase,
    caseClientAndAdvocate,
    mirrorApprovedUpdateToCommunications,
  };
}

module.exports = {
  PIPELINE_STAGES,
  STAGE_ALIASES,
  INTAKE_SLA_MS,
  UPDATE_SLA_MS,
  normalizePipelineStage,
  stageMeta,
  pipelineProgress,
  maskCounselForClient,
  slaClock,
  createSupervisedPipeline,
};
