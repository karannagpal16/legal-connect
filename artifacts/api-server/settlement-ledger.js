/**
 * Legal Connect payment-locking layer.
 *
 * LC holds every ProxyHub booking as LOCKED against a unique booking_id.
 * The locked amount is not ProxyHub revenue. On proof + advocate approval
 * (or 24–48h auto-approval), LC split-settles:
 *   - ProxyHub merchant share  = flat technology fee + GST (never a % of the brief)
 *   - Proxy advocate share     = professional fee in full
 *   - Refund / dispute         = original payment method of the posting advocate
 *
 * Direct split only — never transfer the gross to ProxyHub and pay the proxy later.
 */

const crypto = require("crypto");
const { computePlatformServiceCharge, PLATFORM_SERVICE_FEE } = require("./compliance-policy");

const BOOKING_PREFIX = "LCBK";
const MERCHANT_CODE = "proxyhub";
const SETTLEMENT_AGREEMENT = "lc_locks_proxyhub_merchant_split_v1";
const STATUSES = Object.freeze({
  LOCKED: "LOCKED",
  RELEASED: "RELEASED",
  REFUNDED: "REFUNDED",
  DISPUTED: "DISPUTED",
});
const EVENTS = Object.freeze({
  PAYMENT_LOCKED: "payment_locked",
  RELEASED: "released",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
});
const LEGS = Object.freeze({
  PROXYHUB_COMMISSION: "proxyhub_commission",
  PROXY_FEE: "proxy_fee",
  ADVOCATE_REFUND: "advocate_refund",
});
const MIN_AUTO_APPROVAL_HOURS = 24;
const MAX_AUTO_APPROVAL_HOURS = 48;
const DEFAULT_AUTO_APPROVAL_HOURS = 36;

function clampAutoApprovalHours(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return DEFAULT_AUTO_APPROVAL_HOURS;
  return Math.min(MAX_AUTO_APPROVAL_HOURS, Math.max(MIN_AUTO_APPROVAL_HOURS, Math.round(hours)));
}

function rupees(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function toPaise(amountInr) {
  return rupees(amountInr) * 100;
}

function buildBookingId(now = new Date()) {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const entropy = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${BOOKING_PREFIX}-${stamp}-${entropy}`;
}

function buildSettlementSplit(collectedAmount) {
  const charge = computePlatformServiceCharge(collectedAmount);
  return {
    currency: charge.currency,
    feeModel: PLATFORM_SERVICE_FEE.version,
    feeBasis: PLATFORM_SERVICE_FEE.basis,
    gross: charge.collected,
    platformFee: charge.serviceFee,
    appTaxGst: charge.gstOnServiceFee,
    proxyhubShare: charge.serviceFee + charge.gstOnServiceFee,
    proxyShare: charge.professionalFee,
    professionalFee: charge.professionalFee,
    netToProxy: charge.professionalFee,
    note: "LC locks the booking. On release, ProxyHub's company account receives only the flat technology fee + GST; the appearing advocate receives the professional fee in full. Gross is never parked in ProxyHub first.",
  };
}

function buildSplitLegs({
  collected,
  merchantAccountId,
  proxyUserId,
  payerUserId,
  complimentary = false,
} = {}) {
  const settlement = buildSettlementSplit(collected);
  if (complimentary || settlement.gross === 0) {
    return { settlement, legs: [], complimentary: true };
  }
  const legs = [];
  if (settlement.proxyhubShare > 0) {
    legs.push({
      leg: LEGS.PROXYHUB_COMMISSION,
      amount: settlement.proxyhubShare,
      beneficiaryType: "proxyhub_merchant",
      beneficiaryAccountId: merchantAccountId || MERCHANT_CODE,
      note: "Flat technology fee + GST to the KYC-verified ProxyHub company current account.",
    });
  }
  if (settlement.proxyShare > 0) {
    legs.push({
      leg: LEGS.PROXY_FEE,
      amount: settlement.proxyShare,
      beneficiaryType: "proxy_advocate",
      beneficiaryAccountId: proxyUserId || null,
      note: "Professional fee paid in full to the appearing advocate's verified bank account.",
    });
  }
  if (payerUserId && legs.length === 0) {
    legs.push({
      leg: LEGS.ADVOCATE_REFUND,
      amount: 0,
      beneficiaryType: "payer",
      beneficiaryAccountId: payerUserId,
      note: "Nothing to settle.",
    });
  }
  const splitTotal = legs.reduce((sum, item) => sum + item.amount, 0);
  if (splitTotal !== settlement.gross) {
    throw new Error(`Split legs (${splitTotal}) must equal locked gross (${settlement.gross}).`);
  }
  return { settlement, legs, complimentary: false };
}

function buildRefundLeg({ collected, payerUserId }) {
  return {
    settlement: buildSettlementSplit(collected),
    legs: [{
      leg: LEGS.ADVOCATE_REFUND,
      amount: rupees(collected),
      beneficiaryType: "payer",
      beneficiaryAccountId: payerUserId || null,
      note: "Refund to the posting advocate's original payment method. Not routed via ProxyHub.",
    }],
    complimentary: rupees(collected) === 0,
  };
}

function canReleaseLock(lock = {}, { proofStatus, posterDecision, now = new Date(), disputed = false } = {}) {
  const status = String(lock.status || "").toUpperCase();
  if (status === STATUSES.RELEASED) return { ok: true, reason: "already_released", idempotent: true };
  if (status === STATUSES.REFUNDED) return { ok: false, reason: "already_refunded" };
  if (status === STATUSES.DISPUTED || disputed) return { ok: false, reason: "disputed" };
  if (status !== STATUSES.LOCKED) return { ok: false, reason: "not_locked" };

  const proof = String(proofStatus || lock.proofStatus || "").toLowerCase();
  const decision = String(posterDecision || lock.posterDecision || "").toLowerCase();
  const counselOk = proof === "poster_approved" || proof === "approved" || decision === "ok";
  if (counselOk) return { ok: true, reason: "advocate_approved" };

  const autoAt = lock.autoReleaseAt || lock.auto_release_at;
  if (autoAt) {
    const due = new Date(autoAt).getTime();
    if (Number.isFinite(due) && now.getTime() >= due) {
      return { ok: true, reason: "auto_approval" };
    }
  }
  return { ok: false, reason: "awaiting_approval" };
}

function armAutoApprovalAt(from = new Date(), hours = DEFAULT_AUTO_APPROVAL_HOURS) {
  const ms = clampAutoApprovalHours(hours) * 60 * 60 * 1000;
  return new Date(new Date(from).getTime() + ms).toISOString();
}

function webhookSecret(config = {}) {
  return config.proxyhubWebhookSecret
    || config.razorpayWebhookSecret
    || process.env.PROXYHUB_WEBHOOK_SECRET
    || process.env.RAZORPAY_WEBHOOK_SECRET
    || process.env.SESSION_SECRET
    || "";
}

function signWebhookBody(rawBody, secret) {
  const key = String(secret || "");
  if (!key) return "";
  return crypto.createHmac("sha256", key).update(String(rawBody)).digest("hex");
}

function verifyWebhookSignature(rawBody, signature, secret) {
  const expected = signWebhookBody(rawBody, secret);
  if (!expected || !signature) return false;
  const actual = Buffer.from(String(signature).replace(/^sha256=/, ""));
  const expectedBuffer = Buffer.from(expected);
  if (actual.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actual);
}

function buildWebhookEnvelope({ event, lock, extra = {} }) {
  const payload = {
    event,
    booking_id: lock.bookingId || lock.booking_id,
    task_id: lock.taskId || lock.task_id,
    status: lock.status,
    collected: rupees(lock.collected ?? lock.amount),
    currency: lock.currency || "INR",
    complimentary: Boolean(lock.complimentary),
    split: {
      proxyhub_commission: rupees(lock.proxyhubShare ?? lock.proxyhub_share),
      proxy_fee: rupees(lock.proxyShare ?? lock.proxy_share),
    },
    merchant: MERCHANT_CODE,
    occurred_at: extra.occurredAt || new Date().toISOString(),
    idempotency_key: `${event}:${lock.bookingId || lock.booking_id}`,
    ...extra,
  };
  const rawBody = JSON.stringify(payload);
  return { payload, rawBody };
}

function publicLockView(lock) {
  if (!lock) return null;
  const settlement = buildSettlementSplit(lock.collected ?? lock.amount);
  return {
    bookingId: lock.bookingId || lock.booking_id,
    taskId: lock.taskId || lock.task_id,
    status: lock.status,
    collected: rupees(lock.collected ?? lock.amount),
    currency: lock.currency || "INR",
    complimentary: Boolean(lock.complimentary),
    proxyhubShare: rupees(lock.proxyhubShare ?? lock.proxyhub_share ?? settlement.proxyhubShare),
    proxyShare: rupees(lock.proxyShare ?? lock.proxy_share ?? settlement.proxyShare),
    autoReleaseAt: lock.autoReleaseAt || lock.auto_release_at || null,
    releasedAt: lock.releasedAt || lock.released_at || null,
    refundedAt: lock.refundedAt || lock.refunded_at || null,
    disputedAt: lock.disputedAt || lock.disputed_at || null,
    merchantCode: MERCHANT_CODE,
    layer: "legal_connect",
    beneficiary: "proxyhub_merchant",
    settlementAgreement: SETTLEMENT_AGREEMENT,
    note: settlement.note,
  };
}

function attachLockToTask(task, lock) {
  if (!task) return task;
  const view = publicLockView(lock);
  if (!view) {
    return {
      ...task,
      settlementPreview: task.settlementPreview || buildSettlementSplit(task.amount || task.fee || 0),
    };
  }
  return {
    ...task,
    bookingId: view.bookingId,
    lockedPayment: view,
    paymentLockStatus: view.status,
    escrowStatus: view.status === STATUSES.RELEASED
      ? "Released"
      : view.status === STATUSES.REFUNDED
        ? "Refunded"
        : view.status === STATUSES.DISPUTED
          ? "Disputed"
          : (task.escrowStatus || "Locked"),
    settlementPreview: task.settlementPreview || buildSettlementSplit(view.collected),
    settlement: view.status === STATUSES.RELEASED
      ? (task.settlement || buildSettlementSplit(view.collected))
      : task.settlement,
  };
}

function defaultMerchantFromConfig(config = {}) {
  const linkedAccount = config.proxyhubRazorpayAccountId || process.env.PROXYHUB_RAZORPAY_ACCOUNT_ID || "";
  const ifsc = config.proxyhubBankIfsc || process.env.PROXYHUB_BANK_IFSC || "";
  const last4 = config.proxyhubBankAccountLast4 || process.env.PROXYHUB_BANK_ACCOUNT_LAST4 || "";
  const kycEnv = String(config.proxyhubKycStatus || process.env.PROXYHUB_KYC_STATUS || "").toLowerCase();
  const kycStatus = kycEnv || (linkedAccount ? "verified" : (ifsc && last4 ? "submitted" : "pending"));
  return {
    code: MERCHANT_CODE,
    legalName: config.proxyhubLegalName || process.env.PROXYHUB_LEGAL_NAME || "ProxyHub",
    accountType: "company_current",
    kycStatus,
    bankAccountLast4: last4.slice(-4),
    bankIfsc: ifsc.toUpperCase(),
    razorpayLinkedAccountId: linkedAccount,
    beneficiaryName: config.proxyhubBeneficiaryName || process.env.PROXYHUB_BENEFICIARY_NAME || "ProxyHub",
  };
}

function bookingPatchFromEvent(payload = {}) {
  const event = String(payload.event || "");
  const escrowStatus = event === EVENTS.RELEASED
    ? "Released"
    : event === EVENTS.REFUNDED
      ? "Refunded"
      : event === EVENTS.DISPUTED
        ? "Disputed"
        : event === EVENTS.PAYMENT_LOCKED
          ? "Locked"
          : null;
  const paymentLockStatus = event === EVENTS.PAYMENT_LOCKED
    ? STATUSES.LOCKED
    : event === EVENTS.RELEASED
      ? STATUSES.RELEASED
      : event === EVENTS.REFUNDED
        ? STATUSES.REFUNDED
        : event === EVENTS.DISPUTED
          ? STATUSES.DISPUTED
          : null;
  return {
    taskId: payload.task_id || null,
    bookingId: payload.booking_id || null,
    escrowStatus,
    paymentLockStatus,
    lastSettlementEvent: event || null,
    lastSettlementEventAt: payload.occurred_at || null,
    split: payload.split || null,
    settlementAgreement: SETTLEMENT_AGREEMENT,
  };
}

function createSettlementLedger(deps = {}) {
  const {
    db,
    config = {},
    fetchImpl = globalThis.fetch,
    onVerifiedEvent = null,
  } = deps;
  const memory = {
    merchant: null,
    locks: new Map(),
    splits: [],
    webhooks: [],
    payoutAccounts: new Map(),
    consumedEvents: new Set(),
  };
  let schemaReady = false;
  let tickTimer = null;

  function hasDb() {
    return Boolean(db?.dbAvailable && typeof db.query === "function");
  }

  async function ensureSchema() {
    if (!hasDb()) return false;
    if (schemaReady) return true;
    await db.query(`
      CREATE TABLE IF NOT EXISTS merchant_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code text UNIQUE NOT NULL,
        legal_name text,
        account_type text DEFAULT 'company_current',
        kyc_status text DEFAULT 'pending',
        bank_account_last4 text,
        bank_ifsc text,
        razorpay_linked_account_id text,
        beneficiary_name text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS payout_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL UNIQUE,
        holder_name text,
        bank_account_last4 text,
        bank_ifsc text,
        razorpay_fund_account_id text,
        razorpay_linked_account_id text,
        kyc_status text DEFAULT 'submitted',
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS locked_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id text UNIQUE NOT NULL,
        task_id text,
        payer_user_id text,
        proxy_user_id text,
        merchant_account_id uuid,
        status text NOT NULL DEFAULT 'LOCKED',
        collected integer NOT NULL DEFAULT 0,
        proxyhub_share integer NOT NULL DEFAULT 0,
        proxy_share integer NOT NULL DEFAULT 0,
        currency text DEFAULT 'INR',
        complimentary boolean DEFAULT false,
        razorpay_order_id text,
        razorpay_payment_id text,
        auto_release_at timestamptz,
        released_at timestamptz,
        refunded_at timestamptz,
        disputed_at timestamptz,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS locked_payments_task_idx ON locked_payments (task_id) WHERE task_id IS NOT NULL`);
    await db.query(`CREATE INDEX IF NOT EXISTS locked_payments_status_idx ON locked_payments (status, created_at DESC)`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS settlement_splits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        locked_payment_id uuid,
        booking_id text NOT NULL,
        leg text NOT NULL,
        amount integer NOT NULL,
        beneficiary_type text,
        beneficiary_account_id text,
        status text NOT NULL DEFAULT 'pending',
        razorpay_transfer_id text,
        razorpay_refund_id text,
        last_error text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS settlement_splits_booking_idx ON settlement_splits (booking_id, created_at)`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS settlement_webhooks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id text NOT NULL,
        event_type text NOT NULL,
        signature text,
        payload jsonb NOT NULL,
        delivered_at timestamptz,
        last_error text,
        attempts integer DEFAULT 0,
        created_at timestamptz DEFAULT now()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS settlement_webhooks_booking_idx ON settlement_webhooks (booking_id, created_at DESC)`);
    schemaReady = true;
    await seedMerchantAccount();
    return true;
  }

  function mapLockRow(row) {
    if (!row) return null;
    const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
    return {
      id: row.id,
      bookingId: row.booking_id,
      taskId: row.task_id,
      payerUserId: row.payer_user_id,
      proxyUserId: row.proxy_user_id,
      merchantAccountId: row.merchant_account_id,
      status: row.status,
      collected: row.collected,
      proxyhubShare: row.proxyhub_share,
      proxyShare: row.proxy_share,
      currency: row.currency || "INR",
      complimentary: Boolean(row.complimentary),
      razorpayOrderId: row.razorpay_order_id,
      razorpayPaymentId: row.razorpay_payment_id,
      autoReleaseAt: row.auto_release_at,
      releasedAt: row.released_at,
      refundedAt: row.refunded_at,
      disputedAt: row.disputed_at,
      payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function seedMerchantAccount() {
    const seed = defaultMerchantFromConfig(config);
    if (!hasDb()) {
      memory.merchant = { id: "merchant-proxyhub", ...seed };
      return memory.merchant;
    }
    await db.query(
      `INSERT INTO merchant_accounts (code, legal_name, account_type, kyc_status, bank_account_last4, bank_ifsc, razorpay_linked_account_id, beneficiary_name, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO UPDATE SET
         legal_name = EXCLUDED.legal_name,
         account_type = EXCLUDED.account_type,
         kyc_status = EXCLUDED.kyc_status,
         bank_account_last4 = COALESCE(NULLIF(EXCLUDED.bank_account_last4, ''), merchant_accounts.bank_account_last4),
         bank_ifsc = COALESCE(NULLIF(EXCLUDED.bank_ifsc, ''), merchant_accounts.bank_ifsc),
         razorpay_linked_account_id = COALESCE(NULLIF(EXCLUDED.razorpay_linked_account_id, ''), merchant_accounts.razorpay_linked_account_id),
         beneficiary_name = EXCLUDED.beneficiary_name,
         payload = merchant_accounts.payload || EXCLUDED.payload,
         updated_at = now()`,
      [
        seed.code,
        seed.legalName,
        seed.accountType,
        seed.kycStatus,
        seed.bankAccountLast4 || null,
        seed.bankIfsc || null,
        seed.razorpayLinkedAccountId || null,
        seed.beneficiaryName,
        JSON.stringify({ settlementAgreement: SETTLEMENT_AGREEMENT, layer: "legal_connect" }),
      ],
    );
    const row = await db.query("SELECT * FROM merchant_accounts WHERE code = $1 LIMIT 1", [MERCHANT_CODE]);
    return row.rows[0];
  }

  async function getMerchantAccount() {
    await ensureSchema().catch(() => undefined);
    if (!hasDb()) {
      if (!memory.merchant) memory.merchant = { id: "merchant-proxyhub", ...defaultMerchantFromConfig(config) };
      return memory.merchant;
    }
    const result = await db.query("SELECT * FROM merchant_accounts WHERE code = $1 LIMIT 1", [MERCHANT_CODE]);
    return result.rows[0] || seedMerchantAccount();
  }

  async function getLockByTaskId(taskId) {
    if (!taskId) return null;
    await ensureSchema().catch(() => undefined);
    if (!hasDb()) return memory.locks.get(String(taskId)) || null;
    const result = await db.query("SELECT * FROM locked_payments WHERE task_id = $1 LIMIT 1", [String(taskId)]);
    return mapLockRow(result.rows[0]);
  }

  async function getLockByBookingId(bookingId) {
    if (!bookingId) return null;
    await ensureSchema().catch(() => undefined);
    if (!hasDb()) {
      return [...memory.locks.values()].find((item) => item.bookingId === bookingId) || null;
    }
    const result = await db.query("SELECT * FROM locked_payments WHERE booking_id = $1 LIMIT 1", [String(bookingId)]);
    return mapLockRow(result.rows[0]);
  }

  async function listLocksByTaskIds(taskIds = []) {
    const ids = [...new Set(taskIds.map((id) => String(id || "")).filter(Boolean))];
    if (!ids.length) return new Map();
    await ensureSchema().catch(() => undefined);
    if (!hasDb()) {
      const map = new Map();
      for (const id of ids) {
        const lock = memory.locks.get(id);
        if (lock) map.set(id, lock);
      }
      return map;
    }
    const result = await db.query("SELECT * FROM locked_payments WHERE task_id = ANY($1::text[])", [ids]);
    const map = new Map();
    for (const row of result.rows) {
      const lock = mapLockRow(row);
      if (lock?.taskId) map.set(String(lock.taskId), lock);
    }
    return map;
  }

  async function attachLocksToTasks(tasks = []) {
    const map = await listLocksByTaskIds(tasks.map((task) => task?.id));
    return tasks.map((task) => attachLockToTask(task, map.get(String(task?.id || ""))));
  }

  async function upsertPayoutAccount({ userId, holderName, accountNumber, ifsc, razorpayFundAccountId, razorpayLinkedAccountId }) {
    const last4 = String(accountNumber || "").replace(/\D/g, "").slice(-4);
    const record = {
      userId: String(userId),
      holderName: String(holderName || "").trim(),
      bankAccountLast4: last4,
      bankIfsc: String(ifsc || "").toUpperCase().trim(),
      razorpayFundAccountId: razorpayFundAccountId || null,
      razorpayLinkedAccountId: razorpayLinkedAccountId || null,
      kycStatus: (last4 && ifsc) || razorpayLinkedAccountId ? "submitted" : "pending",
      updatedAt: new Date().toISOString(),
    };
    if (!hasDb()) {
      memory.payoutAccounts.set(record.userId, record);
      return record;
    }
    await ensureSchema();
    const result = await db.query(
      `INSERT INTO payout_accounts (user_id, holder_name, bank_account_last4, bank_ifsc, razorpay_fund_account_id, razorpay_linked_account_id, kyc_status, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id) DO UPDATE SET
         holder_name = EXCLUDED.holder_name,
         bank_account_last4 = EXCLUDED.bank_account_last4,
         bank_ifsc = EXCLUDED.bank_ifsc,
         razorpay_fund_account_id = COALESCE(EXCLUDED.razorpay_fund_account_id, payout_accounts.razorpay_fund_account_id),
         razorpay_linked_account_id = COALESCE(EXCLUDED.razorpay_linked_account_id, payout_accounts.razorpay_linked_account_id),
         kyc_status = EXCLUDED.kyc_status,
         payload = payout_accounts.payload || EXCLUDED.payload,
         updated_at = now()
       RETURNING *`,
      [
        record.userId,
        record.holderName,
        record.bankAccountLast4 || null,
        record.bankIfsc || null,
        record.razorpayFundAccountId,
        record.razorpayLinkedAccountId,
        record.kycStatus,
        JSON.stringify({ source: "advocate_payout_kyc" }),
      ],
    );
    const row = result.rows[0];
    return {
      userId: row.user_id,
      holderName: row.holder_name,
      bankAccountLast4: row.bank_account_last4,
      bankIfsc: row.bank_ifsc,
      razorpayFundAccountId: row.razorpay_fund_account_id,
      razorpayLinkedAccountId: row.razorpay_linked_account_id,
      kycStatus: row.kyc_status,
    };
  }

  async function getPayoutAccount(userId) {
    if (!userId) return null;
    if (!hasDb()) return memory.payoutAccounts.get(String(userId)) || null;
    await ensureSchema();
    const result = await db.query("SELECT * FROM payout_accounts WHERE user_id = $1 LIMIT 1", [String(userId)]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      userId: row.user_id,
      holderName: row.holder_name,
      bankAccountLast4: row.bank_account_last4,
      bankIfsc: row.bank_ifsc,
      razorpayFundAccountId: row.razorpay_fund_account_id,
      razorpayLinkedAccountId: row.razorpay_linked_account_id,
      kycStatus: row.kyc_status,
    };
  }

  async function consumeVerifiedEvent(rawBody, signature) {
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret(config))) {
      return { ok: false, error: "invalid_signature" };
    }
    let payload;
    try {
      payload = JSON.parse(String(rawBody));
    } catch {
      return { ok: false, error: "invalid_json" };
    }
    const key = String(payload.idempotency_key || `${payload.event}:${payload.booking_id}`);
    if (memory.consumedEvents.has(key)) {
      return { ok: true, idempotent: true, payload, patch: bookingPatchFromEvent(payload) };
    }
    memory.consumedEvents.add(key);
    if (typeof onVerifiedEvent === "function") {
      try {
        await onVerifiedEvent(payload, bookingPatchFromEvent(payload));
      } catch (error) {
        memory.consumedEvents.delete(key);
        return { ok: false, error: String(error.message || error).slice(0, 180) };
      }
    }
    return { ok: true, payload, patch: bookingPatchFromEvent(payload) };
  }

  async function emitWebhook(event, lock, extra = {}) {
    const { payload, rawBody } = buildWebhookEnvelope({ event, lock, extra });
    const secret = webhookSecret(config);
    const signature = signWebhookBody(rawBody, secret);
    const url = config.proxyhubWebhookUrl || process.env.PROXYHUB_WEBHOOK_URL || "";
    let deliveredAt = null;
    let lastError = null;
    if (signature) {
      const consumed = await consumeVerifiedEvent(rawBody, signature).catch((error) => ({ ok: false, error: error.message }));
      if (!consumed?.ok && consumed?.error && consumed.error !== "invalid_signature") {
        lastError = consumed.error;
      }
    } else if (typeof onVerifiedEvent === "function") {
      await onVerifiedEvent(payload, bookingPatchFromEvent(payload)).catch(() => undefined);
    }
    if (url && typeof fetchImpl === "function" && signature) {
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-LC-Signature": `sha256=${signature}`,
            "X-LC-Event": event,
            "X-LC-Booking-Id": payload.booking_id,
          },
          body: rawBody,
        });
        if (response.ok) deliveredAt = new Date().toISOString();
        else lastError = `webhook_http_${response.status}`;
      } catch (error) {
        lastError = String(error.message || error).slice(0, 180);
      }
    } else if (!url) {
      lastError = "webhook_url_not_configured";
    }
    const record = {
      bookingId: payload.booking_id,
      eventType: event,
      signature,
      payload,
      deliveredAt,
      lastError,
      attempts: 1,
    };
    if (!hasDb()) {
      memory.webhooks.unshift(record);
      return record;
    }
    await db.query(
      `INSERT INTO settlement_webhooks (booking_id, event_type, signature, payload, delivered_at, last_error, attempts)
       VALUES ($1,$2,$3,$4,$5,$6,1)`,
      [record.bookingId, event, signature, JSON.stringify(payload), deliveredAt, lastError],
    ).catch(() => undefined);
    return record;
  }

  async function razorpayRequest(pathname, body) {
    if (!config.razorpayKeyId || !config.razorpayKeySecret || typeof fetchImpl !== "function") {
      return { ok: false, error: "razorpay_not_configured" };
    }
    const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
    try {
      const response = await fetchImpl(`https://api.razorpay.com/v1${pathname}`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          ok: false,
          error: payload.error?.description || payload.error?.reason || `razorpay_${response.status}`,
          payload,
        };
      }
      return { ok: true, payload };
    } catch (error) {
      return { ok: false, error: String(error.message || error).slice(0, 180) };
    }
  }

  async function persistSplits(lock, legs, status) {
    const rows = [];
    for (const leg of legs) {
      const row = {
        bookingId: lock.bookingId,
        lockedPaymentId: lock.id,
        ...leg,
        status,
      };
      if (!hasDb()) {
        memory.splits.push(row);
        rows.push(row);
        continue;
      }
      const inserted = await db.query(
        `INSERT INTO settlement_splits (locked_payment_id, booking_id, leg, amount, beneficiary_type, beneficiary_account_id, status, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          lock.id || null,
          lock.bookingId,
          leg.leg,
          leg.amount,
          leg.beneficiaryType,
          leg.beneficiaryAccountId,
          status,
          JSON.stringify({ note: leg.note }),
        ],
      );
      rows.push(inserted.rows[0]);
    }
    return rows;
  }

  async function executeSplitTransfers(lock, legs) {
    if (lock.complimentary || !legs.length) {
      return persistSplits(lock, legs, "skipped_complimentary");
    }
    const merchant = await getMerchantAccount();
    const proxyAccount = await getPayoutAccount(lock.proxyUserId);
    const merchantLinked = merchant.razorpay_linked_account_id || merchant.razorpayLinkedAccountId;
    const transfers = [];
    const queued = [];
    for (const leg of legs) {
      if (leg.leg === LEGS.PROXYHUB_COMMISSION && merchantLinked) {
        transfers.push({
          account: merchantLinked,
          amount: toPaise(leg.amount),
          currency: "INR",
          notes: { booking_id: lock.bookingId, leg: leg.leg },
          on_hold: false,
        });
      } else if (leg.leg === LEGS.PROXY_FEE && (proxyAccount?.razorpayLinkedAccountId || proxyAccount?.razorpayFundAccountId)) {
        transfers.push({
          account: proxyAccount.razorpayLinkedAccountId || proxyAccount.razorpayFundAccountId,
          amount: toPaise(leg.amount),
          currency: "INR",
          notes: { booking_id: lock.bookingId, leg: leg.leg },
          on_hold: false,
        });
      } else {
        queued.push(leg);
      }
    }
    let transferResult = null;
    if (transfers.length && lock.razorpayPaymentId) {
      transferResult = await razorpayRequest(`/payments/${lock.razorpayPaymentId}/transfers`, { transfers });
    }
    const statusForLive = transferResult?.ok ? "transferred" : "queued_for_payout";
    const liveLegs = legs.filter((leg) => !queued.includes(leg));
    const liveRows = await persistSplits(lock, liveLegs, liveLegs.length ? statusForLive : "queued_for_payout");
    const queuedRows = queued.length ? await persistSplits(lock, queued, "queued_for_payout") : [];
    if (transferResult?.ok) {
      const items = Array.isArray(transferResult.payload?.items) ? transferResult.payload.items : [];
      for (let i = 0; i < liveRows.length; i += 1) {
        const row = liveRows[i];
        const item = items[i];
        if (!item?.id) continue;
        row.razorpay_transfer_id = item.id;
        row.status = "transferred";
        if (hasDb() && row.id) {
          await db.query(
            `UPDATE settlement_splits SET razorpay_transfer_id = $2, status = 'transferred', updated_at = now() WHERE id = $1`,
            [row.id, item.id],
          ).catch(() => undefined);
        }
      }
    } else if (transferResult && !transferResult.ok && liveRows.length) {
      for (const row of liveRows) {
        row.last_error = transferResult.error;
        row.status = "queued_for_payout";
      }
    }
    return [...liveRows, ...queuedRows];
  }

  async function markSplitRows(rows, status, extra = {}) {
    for (const row of rows) {
      row.status = status;
      if (extra.lastError) row.last_error = extra.lastError;
      if (extra.transferId) row.razorpay_transfer_id = extra.transferId;
      if (hasDb() && (row.id || row.booking_id)) {
        await db.query(
          `UPDATE settlement_splits
           SET status = $2, last_error = COALESCE($3, last_error), razorpay_transfer_id = COALESCE($4, razorpay_transfer_id), updated_at = now()
           WHERE id = $1 OR (id IS NULL AND booking_id = $5 AND leg = $6)`,
          [row.id || null, status, extra.lastError || null, extra.transferId || null, row.booking_id || row.bookingId, row.leg],
        ).catch(() => undefined);
      }
    }
    return rows;
  }

  async function processQueuedPayouts() {
    await ensureSchema().catch(() => undefined);
    let rows = [];
    if (!hasDb()) {
      rows = memory.splits.filter((row) => row.status === "queued_for_payout");
    } else {
      const result = await db.query(
        `SELECT * FROM settlement_splits WHERE status = 'queued_for_payout' ORDER BY created_at ASC LIMIT 80`,
      );
      rows = result.rows;
    }
    const byBooking = new Map();
    for (const row of rows) {
      const bookingId = row.booking_id || row.bookingId;
      if (!bookingId) continue;
      if (!byBooking.has(bookingId)) byBooking.set(bookingId, []);
      byBooking.get(bookingId).push(row);
    }
    const results = [];
    for (const [bookingId, splitRows] of byBooking) {
      const lock = await getLockByBookingId(bookingId);
      if (!lock || lock.complimentary) continue;
      if (lock.status === STATUSES.RELEASED) {
        const merchant = await getMerchantAccount();
        const proxyAccount = await getPayoutAccount(lock.proxyUserId);
        const merchantLinked = merchant.razorpay_linked_account_id || merchant.razorpayLinkedAccountId;
        const transfers = [];
        const liveRows = [];
        for (const row of splitRows) {
          const leg = row.leg;
          const amount = row.amount;
          if (leg === LEGS.PROXYHUB_COMMISSION && merchantLinked) {
            transfers.push({
              account: merchantLinked,
              amount: toPaise(amount),
              currency: "INR",
              notes: { booking_id: lock.bookingId, leg, batch: "settlement" },
              on_hold: false,
            });
            liveRows.push(row);
          } else if (leg === LEGS.PROXY_FEE && (proxyAccount?.razorpayLinkedAccountId || proxyAccount?.razorpayFundAccountId)) {
            transfers.push({
              account: proxyAccount.razorpayLinkedAccountId || proxyAccount.razorpayFundAccountId,
              amount: toPaise(amount),
              currency: "INR",
              notes: { booking_id: lock.bookingId, leg, batch: "settlement" },
              on_hold: false,
            });
            liveRows.push(row);
          }
        }
        if (!transfers.length || !lock.razorpayPaymentId) {
          results.push({ bookingId, action: "still_queued", rows: splitRows.length });
          continue;
        }
        const transferResult = await razorpayRequest(`/payments/${lock.razorpayPaymentId}/transfers`, { transfers });
        if (transferResult.ok) {
          const items = Array.isArray(transferResult.payload?.items) ? transferResult.payload.items : [];
          for (let i = 0; i < liveRows.length; i += 1) {
            await markSplitRows([liveRows[i]], "transferred", { transferId: items[i]?.id || null });
          }
          results.push({ bookingId, action: "transferred", rows: liveRows.length });
        } else {
          await markSplitRows(liveRows, "queued_for_payout", { lastError: transferResult.error });
          results.push({ bookingId, action: "retry_failed", error: transferResult.error });
        }
      } else if (lock.status === STATUSES.REFUNDED && lock.razorpayPaymentId) {
        const refundResult = await razorpayRequest(`/payments/${lock.razorpayPaymentId}/refund`, {
          amount: toPaise(lock.collected),
          notes: { booking_id: lock.bookingId, reason: "lc_locked_payment_refund_batch" },
        });
        if (refundResult.ok) {
          await markSplitRows(splitRows, "refunded");
          results.push({ bookingId, action: "refunded", rows: splitRows.length });
        } else {
          await markSplitRows(splitRows, "queued_for_payout", { lastError: refundResult.error });
          results.push({ bookingId, action: "refund_retry_failed", error: refundResult.error });
        }
      } else {
        results.push({ bookingId, action: "still_queued", rows: splitRows.length });
      }
    }
    return results;
  }

  async function executeRefund(lock) {
    const { legs } = buildRefundLeg({ collected: lock.collected, payerUserId: lock.payerUserId });
    if (lock.complimentary || !lock.collected) {
      return persistSplits(lock, legs, "skipped_complimentary");
    }
    let refundResult = null;
    if (lock.razorpayPaymentId) {
      refundResult = await razorpayRequest(`/payments/${lock.razorpayPaymentId}/refund`, {
        amount: toPaise(lock.collected),
        notes: { booking_id: lock.bookingId, reason: "lc_locked_payment_refund" },
      });
    }
    const status = refundResult?.ok ? "refunded" : "queued_for_payout";
    const rows = await persistSplits(lock, legs, status);
    if (refundResult?.ok && rows[0] && hasDb()) {
      await db.query(
        `UPDATE settlement_splits SET razorpay_refund_id = $2, updated_at = now() WHERE booking_id = $1 AND leg = $3`,
        [lock.bookingId, refundResult.payload?.id || null, LEGS.ADVOCATE_REFUND],
      ).catch(() => undefined);
    }
    return rows;
  }

  async function lockPayment({
    taskId,
    payerUserId,
    proxyUserId = null,
    collected,
    complimentary = false,
    razorpayOrderId = null,
    razorpayPaymentId = null,
  }) {
    await ensureSchema().catch(() => undefined);
    const existing = await getLockByTaskId(taskId);
    if (existing) return { ok: true, lock: existing, idempotent: true };

    const merchant = await getMerchantAccount();
    const settlement = buildSettlementSplit(complimentary ? 0 : collected);
    const lock = {
      id: hasDb() ? undefined : `lock-${Date.now()}`,
      bookingId: buildBookingId(),
      taskId: String(taskId),
      payerUserId: payerUserId ? String(payerUserId) : null,
      proxyUserId: proxyUserId ? String(proxyUserId) : null,
      merchantAccountId: merchant.id || null,
      status: STATUSES.LOCKED,
      collected: complimentary ? 0 : settlement.gross,
      proxyhubShare: complimentary ? 0 : settlement.proxyhubShare,
      proxyShare: complimentary ? 0 : settlement.proxyShare,
      currency: "INR",
      complimentary: Boolean(complimentary),
      razorpayOrderId,
      razorpayPaymentId,
      autoReleaseAt: null,
      payload: { layer: "legal_connect", merchant: MERCHANT_CODE },
      createdAt: new Date().toISOString(),
    };

    if (!hasDb()) {
      memory.locks.set(lock.taskId, lock);
      await emitWebhook(EVENTS.PAYMENT_LOCKED, lock);
      return { ok: true, lock, webhook: EVENTS.PAYMENT_LOCKED };
    }

    try {
      const inserted = await db.query(
        `INSERT INTO locked_payments (
           booking_id, task_id, payer_user_id, proxy_user_id, merchant_account_id,
           status, collected, proxyhub_share, proxy_share, currency, complimentary,
           razorpay_order_id, razorpay_payment_id, payload
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'INR',$10,$11,$12,$13)
         RETURNING *`,
        [
          lock.bookingId,
          lock.taskId,
          lock.payerUserId,
          lock.proxyUserId,
          merchant.id,
          STATUSES.LOCKED,
          lock.collected,
          lock.proxyhubShare,
          lock.proxyShare,
          lock.complimentary,
          razorpayOrderId,
          razorpayPaymentId,
          JSON.stringify(lock.payload),
        ],
      );
      const saved = mapLockRow(inserted.rows[0]);
      await emitWebhook(EVENTS.PAYMENT_LOCKED, saved);
      return { ok: true, lock: saved, webhook: EVENTS.PAYMENT_LOCKED };
    } catch (error) {
      if (String(error.code) === "23505") {
        const raced = await getLockByTaskId(taskId);
        if (raced) return { ok: true, lock: raced, idempotent: true };
      }
      throw error;
    }
  }

  async function setProxyOnLock(taskId, proxyUserId) {
    const lock = await getLockByTaskId(taskId);
    if (!lock || lock.status !== STATUSES.LOCKED) return lock;
    lock.proxyUserId = proxyUserId ? String(proxyUserId) : lock.proxyUserId;
    if (!hasDb()) {
      memory.locks.set(String(taskId), lock);
      return lock;
    }
    const updated = await db.query(
      `UPDATE locked_payments SET proxy_user_id = $2, updated_at = now() WHERE task_id = $1 RETURNING *`,
      [String(taskId), lock.proxyUserId],
    );
    return mapLockRow(updated.rows[0]);
  }

  async function armAutoApproval(taskId, { hours, from } = {}) {
    const lock = await getLockByTaskId(taskId);
    if (!lock || lock.status !== STATUSES.LOCKED) return lock;
    if (lock.autoReleaseAt) return lock;
    const autoReleaseAt = armAutoApprovalAt(from || new Date(), hours || config.settlementAutoApprovalHours);
    lock.autoReleaseAt = autoReleaseAt;
    if (!hasDb()) {
      memory.locks.set(String(taskId), lock);
      return lock;
    }
    const updated = await db.query(
      `UPDATE locked_payments SET auto_release_at = $2, updated_at = now() WHERE task_id = $1 AND status = 'LOCKED' RETURNING *`,
      [String(taskId), autoReleaseAt],
    );
    return mapLockRow(updated.rows[0]) || lock;
  }

  async function writeLockStatus(lock, status, extra = {}) {
    const next = { ...lock, status, ...extra, updatedAt: new Date().toISOString() };
    if (!hasDb()) {
      memory.locks.set(String(lock.taskId), next);
      return next;
    }
    const result = await db.query(
      `UPDATE locked_payments
       SET status = $2,
           proxy_user_id = COALESCE($3, proxy_user_id),
           released_at = COALESCE($4, released_at),
           refunded_at = COALESCE($5, refunded_at),
           disputed_at = COALESCE($6, disputed_at),
           payload = COALESCE(payload, '{}'::jsonb) || $7::jsonb,
           updated_at = now()
       WHERE booking_id = $1
       RETURNING *`,
      [
        lock.bookingId,
        status,
        extra.proxyUserId || null,
        extra.releasedAt || null,
        extra.refundedAt || null,
        extra.disputedAt || null,
        JSON.stringify(extra.payload || {}),
      ],
    );
    return mapLockRow(result.rows[0]) || next;
  }

  async function releaseSplit(task, { actor = "system", reason = "advocate_approved" } = {}) {
    const lock = await getLockByTaskId(task.id || task.taskId);
    if (!lock) return { ok: false, error: "No locked payment for this booking." };
    const gate = canReleaseLock(lock, {
      proofStatus: task.proofStatus,
      posterDecision: task.posterProofDecision,
      now: new Date(),
    });
    if (!gate.ok) return { ok: false, error: gate.reason, lock };
    if (gate.idempotent) return { ok: true, lock, idempotent: true };

    const proxyUserId = task.acceptedBy || lock.proxyUserId;
    const { settlement, legs, complimentary } = buildSplitLegs({
      collected: lock.collected,
      merchantAccountId: lock.merchantAccountId,
      proxyUserId,
      payerUserId: lock.payerUserId,
      complimentary: lock.complimentary,
    });
    const splits = await executeSplitTransfers({ ...lock, proxyUserId, complimentary }, legs);
    const saved = await writeLockStatus(lock, STATUSES.RELEASED, {
      proxyUserId,
      releasedAt: new Date().toISOString(),
      payload: { releaseReason: reason, releasedBy: actor, settlement },
    });
    await emitWebhook(EVENTS.RELEASED, saved, { reason, actor, splits: legs.map((leg) => ({ leg: leg.leg, amount: leg.amount })) });
    return { ok: true, lock: saved, settlement, splits, reason: gate.reason };
  }

  async function refundLock(task, { actor = "system", reason = "" } = {}) {
    const lock = await getLockByTaskId(task.id || task.taskId);
    if (!lock) return { ok: false, error: "No locked payment for this booking." };
    if (lock.status === STATUSES.REFUNDED) return { ok: true, lock, idempotent: true };
    if (lock.status === STATUSES.RELEASED) return { ok: false, error: "already_released", lock };
    const splits = await executeRefund(lock);
    const saved = await writeLockStatus(lock, STATUSES.REFUNDED, {
      refundedAt: new Date().toISOString(),
      payload: { refundReason: reason, refundedBy: actor },
    });
    await emitWebhook(EVENTS.REFUNDED, saved, { reason, actor });
    return { ok: true, lock: saved, splits };
  }

  async function disputeLock(task, { actor, reason }) {
    const lock = await getLockByTaskId(task.id || task.taskId);
    if (!lock) return { ok: false, error: "No locked payment for this booking." };
    if (lock.status === STATUSES.RELEASED) return { ok: false, error: "already_released", lock };
    if (lock.status === STATUSES.REFUNDED) return { ok: false, error: "already_refunded", lock };
    if (lock.status === STATUSES.DISPUTED) return { ok: true, lock, idempotent: true };
    const saved = await writeLockStatus(lock, STATUSES.DISPUTED, {
      disputedAt: new Date().toISOString(),
      payload: { disputeReason: reason, disputedBy: actor },
    });
    await emitWebhook(EVENTS.DISPUTED, saved, { reason, actor });
    return { ok: true, lock: saved };
  }

  async function processDueAutoApprovals(loadTaskFn) {
    await ensureSchema().catch(() => undefined);
    const now = new Date();
    let due = [];
    if (!hasDb()) {
      due = [...memory.locks.values()].filter((lock) => {
        return lock.status === STATUSES.LOCKED
          && lock.autoReleaseAt
          && new Date(lock.autoReleaseAt).getTime() <= now.getTime();
      });
    } else {
      const result = await db.query(
        `SELECT * FROM locked_payments
         WHERE status = 'LOCKED' AND auto_release_at IS NOT NULL AND auto_release_at <= now()`,
      );
      due = result.rows.map(mapLockRow);
    }
    const results = [];
    for (const lock of due) {
      const task = typeof loadTaskFn === "function"
        ? await loadTaskFn(lock.taskId)
        : { id: lock.taskId, proofStatus: "lc_verified", acceptedBy: lock.proxyUserId };
      const released = await releaseSplit({
        ...task,
        id: lock.taskId,
        proofStatus: task?.proofStatus,
        posterProofDecision: task?.posterProofDecision,
        acceptedBy: task?.acceptedBy || lock.proxyUserId,
      }, { actor: "system", reason: "auto_approval" });
      results.push(released);
    }
    return results;
  }

  async function listRecentLocks(limit = 40) {
    await ensureSchema().catch(() => undefined);
    if (!hasDb()) {
      return [...memory.locks.values()]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, limit)
        .map(publicLockView);
    }
    const result = await db.query("SELECT * FROM locked_payments ORDER BY created_at DESC LIMIT $1", [limit]);
    return result.rows.map((row) => publicLockView(mapLockRow(row)));
  }

  async function listSplits(bookingId) {
    if (!hasDb()) return memory.splits.filter((row) => row.bookingId === bookingId);
    const result = await db.query(
      `SELECT * FROM settlement_splits WHERE booking_id = $1 ORDER BY created_at ASC`,
      [bookingId],
    );
    return result.rows;
  }

  function startTicker(loadTaskFn, intervalMs = 15 * 60 * 1000) {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
      processDueAutoApprovals(loadTaskFn).catch((error) => {
        console.warn(`settlement auto-approval tick failed: ${error.message}`);
      });
      processQueuedPayouts().catch((error) => {
        console.warn(`settlement payout batch failed: ${error.message}`);
      });
    }, intervalMs);
    if (typeof tickTimer.unref === "function") tickTimer.unref();
  }

  return {
    ensureSchema,
    getMerchantAccount,
    lockPayment,
    setProxyOnLock,
    armAutoApproval,
    releaseSplit,
    refundLock,
    disputeLock,
    processDueAutoApprovals,
    processQueuedPayouts,
    consumeVerifiedEvent,
    attachLocksToTasks,
    getLockByTaskId,
    getLockByBookingId,
    upsertPayoutAccount,
    getPayoutAccount,
    listRecentLocks,
    listSplits,
    startTicker,
    publicLockView,
  };
}

module.exports = {
  BOOKING_PREFIX,
  MERCHANT_CODE,
  SETTLEMENT_AGREEMENT,
  STATUSES,
  EVENTS,
  LEGS,
  MIN_AUTO_APPROVAL_HOURS,
  MAX_AUTO_APPROVAL_HOURS,
  DEFAULT_AUTO_APPROVAL_HOURS,
  clampAutoApprovalHours,
  buildBookingId,
  buildSettlementSplit,
  buildSplitLegs,
  buildRefundLeg,
  canReleaseLock,
  armAutoApprovalAt,
  signWebhookBody,
  verifyWebhookSignature,
  buildWebhookEnvelope,
  publicLockView,
  attachLockToTask,
  bookingPatchFromEvent,
  defaultMerchantFromConfig,
  createSettlementLedger,
};
