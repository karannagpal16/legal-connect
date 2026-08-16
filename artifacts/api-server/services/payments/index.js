/**
 * Payment integrity helpers — server-owned quotes + provider-pending settlement states.
 */

const { quoteProduct, PROXY_MIN_FEE_INR } = require("../../products");
const { assertTransition, recordTransition } = require("../../workflow-states");

const SETTLEMENT_STATES = Object.freeze({
  none: "none",
  payout_pending: "payout_pending",
  provider_pending: "provider_pending",
  paid_out: "paid_out",
  refunded: "refunded",
  failed: "failed",
  manual_required: "manual_required",
});

function createPaymentService({ db, config, createRazorpayOrder, verifyRazorpayPaymentSignature }) {
  async function ensurePaymentOrdersSchema() {
    if (!db?.dbAvailable) return false;
    await db.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        product_id text NOT NULL,
        amount_inr integer NOT NULL,
        currency text NOT NULL DEFAULT 'INR',
        resource_type text,
        resource_id text,
        provider text NOT NULL DEFAULT 'razorpay',
        provider_order_id text,
        provider_payment_id text,
        status text NOT NULL DEFAULT 'order_created',
        settlement_status text NOT NULL DEFAULT 'none',
        idempotency_key text,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_order_uidx
      ON payment_orders (provider_order_id) WHERE provider_order_id IS NOT NULL`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_provider_payment_uidx
      ON payment_orders (provider_payment_id) WHERE provider_payment_id IS NOT NULL`);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_idem_uidx
      ON payment_orders (idempotency_key) WHERE idempotency_key IS NOT NULL`);
    return true;
  }

  async function createServerOrder({ user, productInput, resourceType, resourceId, idempotencyKey, notes = {} }) {
    const quote = quoteProduct(productInput);
    await ensurePaymentOrdersSchema();

    if (idempotencyKey && db?.dbAvailable) {
      const existing = await db.query("SELECT * FROM payment_orders WHERE idempotency_key = $1 LIMIT 1", [idempotencyKey]);
      if (existing.rows[0]) {
        return { ok: true, mode: "idempotent", order: existing.rows[0], quote };
      }
    }

    let providerOrder = null;
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
    if (hasRazorpay) {
      const result = await createRazorpayOrder({
        amount: quote.amountInr,
        currency: quote.currency,
        receipt: `lc_${quote.productId}_${Date.now()}`.slice(0, 40),
        notes: {
          product_id: quote.productId,
          user_id: user?.id ? String(user.id) : "",
          resource_type: resourceType || "",
          resource_id: resourceId || "",
          ...notes,
        },
      });
      if (!result.ok) {
        const error = new Error(result.error_message || "Could not create payment order.");
        error.status = 502;
        throw error;
      }
      providerOrder = result.order;
    }

    let row = null;
    if (db?.dbAvailable) {
      const inserted = await db.query(
        `INSERT INTO payment_orders
          (user_id, product_id, amount_inr, currency, resource_type, resource_id, provider_order_id, status, idempotency_key, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'payment_pending',$8,$9::jsonb)
         RETURNING *`,
        [
          user?.id && String(user.id).match(/^[0-9a-f-]{36}$/i) ? user.id : null,
          quote.productId,
          quote.amountInr,
          quote.currency,
          resourceType || null,
          resourceId || null,
          providerOrder?.id || null,
          idempotencyKey || null,
          JSON.stringify({ notes, quote }),
        ],
      );
      row = inserted.rows[0];
      await recordTransition(db, {
        machine: resourceType === "chamber" ? "chamber_subscription" : resourceType === "proxy" ? "proxy_hub" : "paid_intake",
        resourceType: resourceType || "payment_order",
        resourceId: row.id,
        fromState: "order_created",
        toState: "payment_pending",
        actor: user,
        idempotencyKey: idempotencyKey ? `${idempotencyKey}:pending` : null,
        beforeSnapshot: { status: "order_created" },
        afterSnapshot: { status: "payment_pending", amountInr: quote.amountInr },
      }).catch(() => undefined);
    }

    return {
      ok: true,
      mode: hasRazorpay ? "razorpay" : "unconfigured",
      quote,
      order: row,
      providerOrder,
      keyId: config.razorpayKeyId || null,
      amount: quote.amountPaise,
      currency: quote.currency,
      order_id: providerOrder?.id || row?.id || null,
      product_id: quote.productId,
    };
  }

  async function markProviderPendingSettlement({ orderId, kind, actor, reason }) {
    await ensurePaymentOrdersSchema();
    const next = kind === "refund" ? SETTLEMENT_STATES.provider_pending : SETTLEMENT_STATES.payout_pending;
    if (!db?.dbAvailable) {
      return { ok: true, settlementStatus: next, razorpayConfirmed: false };
    }
    const updated = await db.query(
      `UPDATE payment_orders
       SET settlement_status = $2, status = CASE WHEN $3 = 'refund' THEN 'refund_pending' ELSE status END, updated_at = now()
       WHERE id::text = $1 OR provider_order_id = $1
       RETURNING *`,
      [String(orderId), next, kind],
    );
    return {
      ok: true,
      settlementStatus: next,
      razorpayConfirmed: false,
      order: updated.rows[0] || null,
      message: kind === "refund"
        ? "Refund marked provider_pending until Razorpay confirms."
        : "Payout marked payout_pending until Razorpay confirms.",
      actorId: actor?.id || null,
      reason: reason || null,
    };
  }

  return {
    ensurePaymentOrdersSchema,
    createServerOrder,
    markProviderPendingSettlement,
    quoteProduct,
    PROXY_MIN_FEE_INR,
    SETTLEMENT_STATES,
    assertTransition,
  };
}

module.exports = { createPaymentService, SETTLEMENT_STATES, PROXY_MIN_FEE_INR };
