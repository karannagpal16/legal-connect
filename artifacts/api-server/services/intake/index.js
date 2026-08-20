/**
 * Paid intake workflow service — canonical states for client→LC→advocate journey.
 */

const { assertTransition, recordTransition, normalizeState } = require("../../workflow-states");
const { canViewBooking, canAcceptIntake, canSeeAll, requirePolicy, assertAuthenticated } = require("../../authorization");

function createIntakeService({ db }) {
  async function transitionIntake({ booking, toState, actor, reason, requestId, idempotencyKey }) {
    assertAuthenticated(actor);
    const fromState = normalizeState(
      booking.pipelineStage
      || booking.stage_status
      || booking.stageStatus
      || booking.payment_status
      || booking.paymentStatus
      || "draft",
    );
    assertTransition("paid_intake", fromState, toState);

    if (["advocate_accepted", "advocate_declined", "in_progress"].includes(normalizeState(toState))) {
      requirePolicy(canAcceptIntake(actor, booking) || canSeeAll(actor), "intake_forbidden", "Not assigned to this intake.");
    } else if (!canSeeAll(actor) && !canViewBooking(actor, booking)) {
      requirePolicy(false, "intake_forbidden", "Forbidden.");
    }

    const result = await recordTransition(db, {
      machine: "paid_intake",
      resourceType: "booking",
      resourceId: booking.id,
      fromState,
      toState,
      actor,
      reason,
      requestId,
      idempotencyKey,
      beforeSnapshot: { paymentStatus: booking.payment_status || booking.paymentStatus, stage: fromState },
      afterSnapshot: { stage: normalizeState(toState) },
    });

    if (db?.dbAvailable) {
      await db.query(
        `UPDATE bookings
         SET stage_status = $2,
             payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [
          booking.id,
          normalizeState(toState),
          JSON.stringify({
            pipelineStage: normalizeState(toState),
            stageUpdatedAt: new Date().toISOString(),
            stageUpdatedBy: actor.id,
          }),
        ],
      ).catch(() => undefined);
    }

    return result;
  }

  return { transitionIntake };
}

module.exports = { createIntakeService };
