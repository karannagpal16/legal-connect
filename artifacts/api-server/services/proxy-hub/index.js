/**
 * ProxyHub workflow helpers — strict mission state transitions.
 */

const { assertTransition, recordTransition, normalizeState } = require("../../workflow-states");
const { canPerformProxyStep, canSeeAll, requirePolicy, assertAuthenticated } = require("../../authorization");
const { PROXY_MIN_FEE_INR } = require("../../products");

function mapLegacyProxyStatus(status) {
  const value = normalizeState(status);
  const map = {
    open: "approved",
    pending: "payment_pending",
    paid: "paid_pending_admin",
    assigned: "assigned",
    accepted: "proxy_accepted",
    in_progress: "checked_in",
    proof_uploaded: "proof_submitted",
    completed: "proof_approved",
    released: "paid_out",
    refunded: "refunded",
  };
  return map[value] || value;
}

function createProxyHubService({ db }) {
  async function transitionMission({ task, toState, actor, action, reason, requestId, idempotencyKey }) {
    assertAuthenticated(actor);
    requirePolicy(
      canSeeAll(actor) || canPerformProxyStep(actor, task, action || toState),
      "proxy_forbidden",
      "You cannot perform this ProxyHub step.",
    );
    const fromState = mapLegacyProxyStatus(task.status || task.escrowStatus || "draft");
    assertTransition("proxy_hub", fromState, toState);

    return recordTransition(db, {
      machine: "proxy_hub",
      resourceType: "task",
      resourceId: task.id,
      fromState,
      toState,
      actor,
      reason,
      requestId,
      idempotencyKey,
      beforeSnapshot: { status: task.status, escrowStatus: task.escrowStatus || task.escrow_status },
      afterSnapshot: { status: normalizeState(toState) },
    });
  }

  return {
    transitionMission,
    mapLegacyProxyStatus,
    PROXY_MIN_FEE_INR,
  };
}

module.exports = { createProxyHubService, mapLegacyProxyStatus, PROXY_MIN_FEE_INR };
