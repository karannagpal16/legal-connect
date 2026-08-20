/**
 * Canonical workflow state machines + audited transitions.
 */

const MACHINES = Object.freeze({
  advocate_verification: {
    pending: ["under_review"],
    under_review: ["approved", "information_required", "rejected"],
    information_required: ["under_review", "rejected"],
    approved: ["suspended"],
    rejected: ["under_review"],
    suspended: ["reactivated", "approved"],
    reactivated: ["approved", "suspended"],
  },
  paid_intake: {
    draft: ["payment_pending"],
    payment_pending: ["paid", "draft"],
    paid: ["lc_review"],
    lc_review: ["advocate_assigned", "payment_pending"],
    advocate_assigned: ["advocate_accepted", "advocate_declined"],
    advocate_declined: ["advocate_assigned", "lc_review"],
    advocate_accepted: ["in_progress", "concluded", "disputed"],
    in_progress: ["concluded", "disputed"],
    disputed: ["in_progress", "settlement_pending", "refunded"],
    concluded: ["settlement_pending"],
    settlement_pending: ["settled", "refunded"],
    settled: [],
    refunded: [],
  },
  case_update: {
    draft: ["pending_review"],
    pending_review: ["approved", "returned"],
    returned: ["draft", "pending_review"],
    approved: ["published"],
    published: ["superseded"],
    superseded: [],
  },
  proxy_hub: {
    draft: ["payment_pending"],
    payment_pending: ["paid_pending_admin", "draft"],
    paid_pending_admin: ["query_raised", "approved"],
    query_raised: ["paid_pending_admin", "approved"],
    approved: ["assigned"],
    assigned: ["proxy_accepted", "conflict_declared"],
    conflict_declared: ["assigned", "refund_pending"],
    proxy_accepted: ["checked_in"],
    checked_in: ["proof_submitted"],
    proof_submitted: ["proof_approved", "proof_returned", "disputed"],
    proof_returned: ["proof_submitted"],
    disputed: ["proof_submitted", "refund_pending", "payout_pending"],
    proof_approved: ["payout_pending"],
    payout_pending: ["paid_out", "failed"],
    refund_pending: ["refunded", "failed"],
    paid_out: [],
    refunded: [],
    failed: ["payout_pending", "refund_pending"],
  },
  chamber_subscription: {
    order_created: ["payment_pending"],
    payment_pending: ["paid", "order_created"],
    paid: ["active"],
    active: ["grace_period", "renewed", "cancelled", "expired"],
    grace_period: ["active", "expired", "cancelled"],
    renewed: ["active"],
    expired: ["order_created"],
    cancelled: [],
  },
});

const STATE_ALIASES = Object.freeze({
  intake_submitted: "paid",
  booking_submitted: "paid",
  fee_secured: "paid",
  lc_under_review: "lc_review",
  info_requested: "lc_review",
  acknowledged_and_assigned: "advocate_assigned",
  assigned: "advocate_assigned",
  work_in_progress: "in_progress",
  matter_concluded: "concluded",
  closed: "concluded",
  rejected_refunded: "refunded",
  provider_pending: "settlement_pending",
  refund_pending: "settlement_pending",
});

function normalizeState(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return STATE_ALIASES[raw] || raw;
}

function canTransition(machine, from, to) {
  const graph = MACHINES[machine];
  if (!graph) return false;
  const current = normalizeState(from);
  const next = normalizeState(to);
  if (current === next) return true;
  return Boolean(graph[current]?.includes(next));
}

function assertTransition(machine, from, to) {
  if (!canTransition(machine, from, to)) {
    const error = new Error(`Invalid ${machine} transition: ${from} → ${to}`);
    error.status = 409;
    error.code = "invalid_state_transition";
    throw error;
  }
  return normalizeState(to);
}

/**
 * Persist an audited workflow transition. Safe no-op when db unavailable.
 */
async function recordTransition(db, {
  machine,
  resourceType,
  resourceId,
  fromState,
  toState,
  actor,
  reason = null,
  requestId = null,
  idempotencyKey = null,
  paymentEventId = null,
  beforeSnapshot = null,
  afterSnapshot = null,
} = {}) {
  assertTransition(machine, fromState, toState);
  if (!db?.dbAvailable) {
    return {
      ok: true,
      mode: "memory",
      machine,
      fromState: normalizeState(fromState),
      toState: normalizeState(toState),
    };
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS workflow_transitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      machine text NOT NULL,
      resource_type text NOT NULL,
      resource_id text NOT NULL,
      from_state text,
      to_state text NOT NULL,
      actor_id text,
      actor_role text,
      reason text,
      request_id text,
      idempotency_key text,
      payment_event_id text,
      before_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
      after_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    )
  `);
  await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS workflow_transitions_idem_uidx
    ON workflow_transitions (idempotency_key) WHERE idempotency_key IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS workflow_transitions_resource_idx
    ON workflow_transitions (resource_type, resource_id, created_at DESC)`);

  if (idempotencyKey) {
    const existing = await db.query(
      "SELECT id, to_state FROM workflow_transitions WHERE idempotency_key = $1 LIMIT 1",
      [idempotencyKey],
    );
    if (existing.rows[0]) {
      return { ok: true, mode: "idempotent", id: existing.rows[0].id, toState: existing.rows[0].to_state };
    }
  }

  const inserted = await db.query(
    `INSERT INTO workflow_transitions
      (machine, resource_type, resource_id, from_state, to_state, actor_id, actor_role, reason,
       request_id, idempotency_key, payment_event_id, before_snapshot, after_snapshot)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)
     RETURNING id, created_at`,
    [
      machine,
      resourceType,
      String(resourceId),
      normalizeState(fromState),
      normalizeState(toState),
      actor?.id ? String(actor.id) : null,
      actor?.role || null,
      reason,
      requestId,
      idempotencyKey,
      paymentEventId,
      JSON.stringify(beforeSnapshot || {}),
      JSON.stringify(afterSnapshot || {}),
    ],
  );

  return {
    ok: true,
    mode: "persisted",
    id: inserted.rows[0].id,
    createdAt: inserted.rows[0].created_at,
    toState: normalizeState(toState),
  };
}

module.exports = {
  MACHINES,
  STATE_ALIASES,
  normalizeState,
  canTransition,
  assertTransition,
  recordTransition,
};
