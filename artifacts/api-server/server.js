// artifacts/api-server/server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const db = require("./db");
const { getPortalLoginRoute, getPostLoginRoute, normalizePortal, isRoleAllowedForPortal } = require("./portal-auth");

const PORT = config.port;
const publicDir = path.join(__dirname, "public");
const SERVER_STARTED_AT = new Date().toISOString();
const sessionSecretMaterial = process.env.SESSION_SECRET
  || process.env.JWT_SECRET
  || config.razorpayWebhookSecret
  || config.dbUrl;
const SESSION_SECRET = sessionSecretMaterial || "legal-connect-local-session-secret";

if (config.nodeEnv === "production" && !process.env.SESSION_SECRET && !process.env.JWT_SECRET) {
  console.warn("SESSION_SECRET/JWT_SECRET is not configured; using a stable deployment secret fallback.");
}

function appVersionPayload() {
  const candidates = ["app.js", "styles.css", "index.html"]
    .map((fileName) => path.join(publicDir, fileName))
    .filter((filePath) => fs.existsSync(filePath));
  const latestMtime = candidates.reduce((latest, filePath) => {
    const stat = fs.statSync(filePath);
    return Math.max(latest, stat.mtimeMs);
  }, 0);
  const buildTime = latestMtime ? new Date(latestMtime).toISOString() : SERVER_STARTED_AT;
  const webVersion = process.env.WEB_VERSION || crypto
    .createHash("sha1")
    .update(`${buildTime}:${config.publicAppUrl}`)
    .digest("hex")
    .slice(0, 12);
  return {
    web_version: webVersion,
    build_time: buildTime,
    minimum_android_version: "1.0.0",
    android_wrapper_version: "1.0.0",
    public_url: config.publicAppUrl,
    message: "Legal Connect is up to date",
  };
}

function createLocalDemoStore() {
  const now = new Date().toISOString();
  return {
    users: [
      { id: "demo-admin", name: "Demo Admin", email: "admin@demo.legal-connect.in", phone: "+919999900000", role: "admin", createdAt: now },
      { id: "demo-client", name: "Demo Client", email: "client@demo.legal-connect.in", phone: "+919999900001", role: "client", createdAt: now },
      { id: "demo-advocate", name: "Demo Lawyer", email: "lawyer@demo.legal-connect.in", phone: "+919999900002", role: "advocate", createdAt: now },
      { id: "demo-intern", name: "Demo Intern", email: "intern@demo.legal-connect.in", phone: "+919999900003", role: "intern", createdAt: now },
    ],
    bookings: [
      {
        id: "BK-9012",
        userId: "demo-client",
        clientName: "Priya Sharma",
        clientEmail: "client@demo.legal-connect.in",
        clientPhone: "+91 98765 43210",
        serviceType: "Attorney Shield Consultation",
        amount: 1999,
        paymentStatus: "paid",
        receiptNo: "LC-REC-9012",
        caseTitle: "Property Title Dispute & Notice Reply",
        caseNumber: "DL-HC/2026/8941",
        courtName: "Delhi High Court",
        caseType: "Property",
        problemSummary: "Seller issued conflicting title notice. Require urgent advocate strategy review and legal reply notice.",
        attachedFiles: [
          { name: "Legal_Notice_2026.pdf", label: "Legal Notice", url: "#" },
          { name: "Sale_Agreement_Draft.pdf", label: "Agreement Copy", url: "#" }
        ],
        stageStatus: "advocate_connected",
        assignedAdvocateId: "demo-advocate",
        assignedAdvocateName: "Adv. Rishika Nagpal",
        workHoldStatus: "pending",
        createdAt: now,
      }
    ],
    cases: [
      {
        id: "case-demo-1",
        userId: "demo-client",
        assignedTo: "demo-advocate",
        title: "Tenancy Dispute - Rohini Property",
        status: "Active",
        nextDate: "2026-08-04",
        court: "District Court, Rohini",
        courtType: "district",
        stateCode: "DL",
        caseNo: "2023/CRL-1234",
        reminder: "24h before",
        stage: "Reply awaited",
      },
      {
        id: "case-demo-2",
        userId: "demo-client",
        assignedTo: "demo-advocate",
        title: "Consumer Complaint - Electronics Refund",
        status: "Active",
        nextDate: "2026-08-12",
        court: "Consumer Commission, Delhi",
        courtType: "consumer",
        stateCode: "DL",
        caseNo: "2024/CC-2201",
        reminder: "Same morning",
        stage: "Evidence",
      },
    ],
    tasks: [
      {
        id: "task-demo-1",
        title: "Saket Court inspection",
        status: "Open",
        fee: 650,
        court: "Saket District Court",
      },
    ],
    internQuests: [
      { id: "quest-demo-1", title: "Summarise a recent judgment", description: "Prepare a one-page issue, reasoning, and holding brief.", xpPoints: 120, deadline: "2026-08-02", status: "In Progress", createdAt: now },
      { id: "quest-demo-2", title: "Build a case chronology", description: "Convert the supplied filings into a dated case timeline.", xpPoints: 80, deadline: "2026-08-05", status: "Open", createdAt: now },
      { id: "quest-demo-3", title: "Research limitation periods", description: "Identify the applicable provisions and leading authorities.", xpPoints: 150, deadline: "2026-07-25", status: "Completed", createdAt: now },
    ],
    notifications: [],
    legalSources: [],
    legalChunks: [],
    lawbotQueries: [],
    lawbotFeedback: [],
    auditLogs: [],
    receipts: [],
    verifications: [],
    deletionRequests: [],
  };
}

const demoStore = new Proxy(createLocalDemoStore(), {
  get(target, property) {
    if (config.nodeEnv === "production") {
      throw new Error("Local demo storage is disabled in production.");
    }
    return target[property];
  },
  set(target, property, value) {
    if (config.nodeEnv === "production") {
      throw new Error("Local demo storage is disabled in production.");
    }
    target[property] = value;
    return true;
  },
});

const REVIEW_ROLES = ["client", "advocate", "intern"];
const reviewAttempts = new Map();
const reviewVerifiedContacts = new Map();
const REVIEW_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const REVIEW_LOGIN_MAX_ATTEMPTS = 8;
const REVIEW_VERIFICATION_TTL_MS = 20 * 60 * 1000;

const roles = new Set(["client", "advocate", "rna", "intern", "admin"]);
const publicSignupRoles = new Set(["client", "advocate", "intern"]);

const DEMO_ACCOUNTS = [
  { email: "admin@demo.legal-connect.in", name: "Demo Admin", role: "admin", phone: "+919999900000" },
  { email: "client@demo.legal-connect.in", name: "Demo Client", role: "client", phone: "+919999900001" },
  { email: "lawyer@demo.legal-connect.in", name: "Demo Lawyer", role: "advocate", phone: "+919999900002" },
  { email: "intern@demo.legal-connect.in", name: "Demo Intern", role: "intern", phone: "+919999900003" },
];
const DEMO_OTP = "123456";

function getDemoAccount(email) {
  const normalized = normalizeEmail(email);
  return DEMO_ACCOUNTS.find((item) => item.email === normalized) || null;
}

function getDemoAccountByRole(role) {
  return DEMO_ACCOUNTS.find((item) => item.role === role) || DEMO_ACCOUNTS[0];
}

function isDemoEmail(email) {
  return Boolean(getDemoAccount(email));
}

async function upsertDemoUser(account) {
  const privacyConsent = true;
  const verifiedFlags = { emailVerified: true, phoneVerified: false };
  let user;
  if (db.dbAvailable) {
    const existing = await db.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [account.email]);
    if (existing.rows.length) {
      const updated = await db.query(
        `UPDATE users SET name = $2, phone = $3, role = $4, consent_at = COALESCE(consent_at, now()), email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $1 RETURNING *`,
        [existing.rows[0].id, account.name, account.phone, account.role],
      );
      user = mapUser(updated.rows[0]);
    } else {
      const created = await db.query(
        `INSERT INTO users (name, email, phone, role, consent_at, email_verified_at) VALUES ($1, $2, $3, $4, now(), now()) RETURNING *`,
        [account.name, account.email, account.phone, account.role],
      );
      user = mapUser(created.rows[0]);
    }
  } else {
    user = demoStore.users.find((item) => item.email === account.email);
    if (!user) {
      user = {
        id: `demo-${account.role}-${Date.now()}`,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        emailVerifiedAt: new Date().toISOString(),
        phoneVerifiedAt: null,
        consentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      demoStore.users.push(user);
    } else {
      Object.assign(user, { name: account.name, role: account.role, phone: account.phone });
    }
  }
  return { user, privacyConsent, verifiedFlags };
}

function resolveLoginRole(requestedRole, existingRole, isReviewLogin) {
  if (isReviewLogin) {
    return REVIEW_ROLES.includes(requestedRole) ? requestedRole : "client";
  }
  if (existingRole && roles.has(existingRole)) {
    return existingRole;
  }
  if (config.nodeEnv !== "production" && !db.dbAvailable && roles.has(requestedRole)) {
    return requestedRole;
  }
  return publicSignupRoles.has(requestedRole) ? requestedRole : "client";
}

function encodeSession(user) {
  const issuedAt = Date.now();
  const payload = {
    id: user.id,
    name: user.name,
    role: user.role,
    isReviewAccount: Boolean(user.isReviewAccount),
    reviewRoles: Array.isArray(user.reviewRoles) ? user.reviewRoles.filter((role) => REVIEW_ROLES.includes(role)) : undefined,
    iat: issuedAt,
    exp: issuedAt + 1000 * 60 * 60 * 24 * 30,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function sessionTokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

async function saveSessionToken(user, token) {
  if (!db.dbAvailable || !user?.id || !token) return;
  await db.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, payload)
     VALUES ($1, $2, now() + interval '30 days', $3)`,
    [
      user.id,
      sessionTokenHash(token),
      JSON.stringify({
        role: user.role,
        isReviewAccount: Boolean(user.isReviewAccount),
      }),
    ],
  );
}

function decodeSession(token) {
  if (!token) return null;
  try {
    const clean = token.replace(/^Bearer\s+/i, "");
    const [encoded, signature] = clean.split(".");
    if (!encoded || !signature) {
      if (config.nodeEnv === "production") return null;
      const legacyParsed = JSON.parse(Buffer.from(clean, "base64url").toString("utf8"));
      if (!legacyParsed.id || !roles.has(legacyParsed.role)) return null;
      return legacyParsed;
    }
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
    const actual = Buffer.from(String(signature));
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed.id || !roles.has(parsed.role)) return null;
    const expiresAt = Number(parsed.exp) < 1_000_000_000_000 ? Number(parsed.exp) * 1000 : Number(parsed.exp);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function getAuthUser(req) {
  const token = req.headers.authorization || req.headers["x-legal-connect-token"];
  return decodeSession(token);
}

function canSeeAll(user) {
  return user && ["rna", "admin"].includes(user.role);
}

function userIdForWrite(body, user) {
  return user?.id || null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

async function resolveDatabaseUserId(user) {
  if (!user?.id) return null;
  if (!db.dbAvailable || isUuid(user.id)) return user.id;

  const isLegacyDemoUser = String(user.id).startsWith("demo-");
  if (!isLegacyDemoUser) return null;

  const demoRole = user.role === "rna" ? "admin" : user.role;
  const account = getDemoAccountByRole(demoRole);
  const existing = await db.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [account.email]);
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const resolved = await upsertDemoUser(account);
  return isUuid(resolved.user?.id) ? resolved.user.id : null;
}

function userRole(user) {
  return user?.role || "demo";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function maskEmail(email) {
  const value = String(email || "").trim();
  if (!value.includes("@")) return "";
  const [name, domain] = value.split("@");
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

function maskPhone(phone) {
  const value = String(phone || "").replace(/\s+/g, "");
  if (!value) return "";
  return `${value.slice(0, 3)}****${value.slice(-3)}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function playReviewConfigured() {
  return Boolean(config.playReviewEnabled && config.playReviewEmail && config.playReviewCode);
}

function isPlayReviewEmail(email) {
  return playReviewConfigured() && String(email || "").trim() === String(config.playReviewEmail || "").trim();
}

function reviewAttemptKey(email, req) {
  const ip = req.socket?.remoteAddress || req.headers["x-forwarded-for"] || "unknown";
  return `${normalizeEmail(email)}:${String(ip).split(",")[0].trim()}`;
}

function reviewRateLimit(email, req) {
  const key = reviewAttemptKey(email, req);
  const now = Date.now();
  const current = reviewAttempts.get(key) || { count: 0, resetAt: now + REVIEW_LOGIN_WINDOW_MS };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + REVIEW_LOGIN_WINDOW_MS;
  }
  current.count += 1;
  reviewAttempts.set(key, current);
  return {
    allowed: current.count <= REVIEW_LOGIN_MAX_ATTEMPTS,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

function markReviewVerified(email) {
  reviewVerifiedContacts.set(normalizeEmail(email), Date.now() + REVIEW_VERIFICATION_TTL_MS);
}

function reviewContactVerified(email) {
  const key = normalizeEmail(email);
  const expiresAt = reviewVerifiedContacts.get(key);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    reviewVerifiedContacts.delete(key);
    return false;
  }
  return true;
}

function reviewAccessPayload(activeRole = "client") {
  return {
    enabled: true,
    activeRole: REVIEW_ROLES.includes(activeRole) ? activeRole : "client",
    roles: REVIEW_ROLES,
    dataMode: "synthetic",
    message: "Google Play review account uses isolated synthetic data only.",
  };
}

function decorateReviewUser(user, activeRole = "client") {
  const safeRole = REVIEW_ROLES.includes(activeRole) ? activeRole : "client";
  return {
    ...user,
    id: user?.id || "google-play-review-user",
    name: user?.name || "Google Play Reviewer",
    role: safeRole,
    isReviewAccount: true,
    reviewRoles: REVIEW_ROLES,
    emailVerifiedAt: user?.emailVerifiedAt || user?.email_verified_at || new Date().toISOString(),
    consentAt: user?.consentAt || user?.consent_at || new Date().toISOString(),
    createdAt: user?.createdAt || user?.created_at || new Date().toISOString(),
  };
}

function isReviewUser(user) {
  return Boolean(user?.isReviewAccount);
}

function reviewSeedData(user = {}) {
  const reviewUserId = user.id || "google-play-review-user";
  const now = new Date().toISOString();
  const booking = {
    id: "review-booking-1",
    userId: reviewUserId,
    serviceType: "Attorney Shield",
    service_type: "Attorney Shield",
    amount: 1999,
    paymentStatus: "review-inspection",
    payment_status: "review-inspection",
    workHoldStatus: "not-applicable-review",
    work_hold_status: "not-applicable-review",
    receiptNo: "LC-REVIEW-0001",
    receipt_no: "LC-REVIEW-0001",
    nextDestination: "Service Room: synthetic receipt and matter intake preview.",
    next_destination: "Service Room: synthetic receipt and matter intake preview.",
    createdAt: now,
    created_at: now,
    payload: {
      reviewOnly: true,
      problemSummary: "Review sample: tenant deposit dispute and document review request.",
      route: "Reviewer can inspect receipt and service room without Razorpay charge.",
    },
  };
  const task = {
    id: "review-mission-1",
    title: "Saket District Court inspection",
    court: "Saket District Court",
    taskType: "Inspection",
    task_type: "Inspection",
    amount: 750,
    fee: 750,
    escrowStatus: "Work completion hold - review sample",
    escrow_status: "Work completion hold - review sample",
    status: "Assigned",
    postedBy: reviewUserId,
    posted_by: reviewUserId,
    acceptedBy: "review-counsel-synthetic",
    accepted_by: "review-counsel-synthetic",
    createdAt: now,
    created_at: now,
    payload: {
      reviewOnly: true,
      urgency: "normal",
      note: "Synthetic court mission for Play review. No payment release authority is available.",
      timeLimit: "4 hours",
    },
  };
  const trackedCase = {
    id: "review-case-1",
    userId: reviewUserId,
    title: "Review Case - Consumer Refund",
    status: "Active",
    nextDate: "2026-08-05",
    next_date: "2026-08-05",
    court: "Consumer Commission, Delhi",
    courtType: "consumer",
    stateCode: "DL",
    caseNo: "REVIEW/CC/2026/01",
    case_number: "REVIEW/CC/2026/01",
    reminder: "24h before",
    stage: "Notice issued",
    createdAt: now,
    created_at: now,
    payload: {
      reviewOnly: true,
      summary: "Synthetic case card to prove private case board and calendar display.",
    },
  };
  const receipt = {
    id: "review-receipt-1",
    receiptNo: "LC-REVIEW-0001",
    receipt_no: "LC-REVIEW-0001",
    userId: reviewUserId,
    actorId: reviewUserId,
    receiptType: "booking",
    receipt_type: "booking",
    title: "Google Play review booking receipt",
    message: "Attorney Shield booking is pre-seeded for review inspection. No Razorpay charge is required.",
    status: "review-only",
    amount: 1999,
    targetType: "booking",
    target_type: "booking",
    targetId: booking.id,
    target_id: booking.id,
    visibility: "private",
    createdAt: now,
    created_at: now,
    payload: { reviewOnly: true, bookingId: booking.id },
  };
  const sosRequest = {
    id: "review-sos-1",
    userId: reviewUserId,
    serviceType: "Legal SOS Video",
    service_type: "Legal SOS Video",
    urgency: "high",
    status: "review-queued",
    createdAt: now,
    created_at: now,
    payload: {
      reviewOnly: true,
      counsel: "Review Counsel Desk",
      fee: 1500,
      channel: "Video request preview",
      note: "Synthetic SOS request. No real call is placed.",
    },
  };
  const notification = {
    id: "review-notification-1",
    userId: reviewUserId,
    type: "review_update",
    title: "Review workspace ready",
    message: "Synthetic Client, Advocate and Intern workspaces are available. Admin/RNA access is intentionally blocked.",
    readAt: null,
    createdAt: now,
    created_at: now,
    payload: { reviewOnly: true },
  };
  return {
    mode: "google-play-review",
    reviewOnly: true,
    workspaces: REVIEW_ROLES,
    cases: [trackedCase],
    bookings: [booking],
    tasks: [task],
    receipts: [receipt],
    sosRequests: [sosRequest],
    notifications: [notification],
    paymentNote: "Review account can inspect receipts and Service Room without charging Razorpay.",
  };
}

function verificationHash(destination, code) {
  const salt = process.env.SESSION_SECRET || config.razorpayWebhookSecret || "legal-connect-phase1-verification";
  return crypto.createHash("sha256").update(`${destination}:${code}:${salt}`).digest("hex");
}

function verificationCode() {
  return String(crypto.randomInt(100000, 999999));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    accountStatus: user.accountStatus || user.account_status || 'active',
    verificationStatus: user.verificationStatus || user.verification_status || 'verified',
    onboardingCompleted: Boolean(user.onboardingCompleted ?? user.onboarding_completed ?? true),
    emailMasked: maskEmail(user.email),
    phoneMasked: maskPhone(user.phone),
    emailVerified: Boolean(user.emailVerifiedAt || user.email_verified_at),
    phoneVerified: Boolean(user.phoneVerifiedAt || user.phone_verified_at),
    consentRecorded: Boolean(user.consentAt || user.consent_at),
    createdAt: user.createdAt || user.created_at,
    isReviewAccount: Boolean(user.isReviewAccount),
    reviewRoles: user.isReviewAccount ? REVIEW_ROLES : undefined,
  };
}

async function verifiedContactFlags(email, phone) {
  const flags = { emailVerified: false, phoneVerified: false };
  if (!email && !phone) return flags;
  if (email && isPlayReviewEmail(email)) {
    flags.emailVerified = reviewContactVerified(email);
    return flags;
  }
  if (db.dbAvailable) {
    const result = await db.query(
      `SELECT
         EXISTS (SELECT 1 FROM login_verifications WHERE email = $1 AND consumed_at IS NOT NULL) AS email_verified,
         EXISTS (SELECT 1 FROM login_verifications WHERE phone = $2 AND consumed_at IS NOT NULL) AS phone_verified`,
      [email || null, phone || null],
    );
    return {
      emailVerified: Boolean(result.rows[0]?.email_verified),
      phoneVerified: Boolean(result.rows[0]?.phone_verified),
    };
  }
  flags.emailVerified = Boolean(email && demoStore.verifications.some((item) => item.email === email && item.consumedAt));
  flags.phoneVerified = Boolean(phone && demoStore.verifications.some((item) => item.phone === phone && item.consumedAt));
  return flags;
}

function corsOriginFor(req) {
  const origins = config.allowedOrigins?.length ? config.allowedOrigins : [config.allowedOrigin || "*"];
  if (origins.includes("*")) return "*";
  const requestOrigin = req?.headers?.origin;
  if (requestOrigin && origins.includes(requestOrigin.replace(/\/$/, ""))) {
    return requestOrigin;
  }
  return origins[0] || config.publicAppUrl;
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": res.localsCorsOrigin || config.allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Legal-Connect-Token",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function productionDbUnavailable() {
  return config.nodeEnv === "production" && !db.dbAvailable;
}

function sendProductionDbUnavailable(res) {
  sendJson(res, 503, {
    ok: false,
    error: "PostgreSQL is required for production and is not connected.",
    db: "disconnected",
  });
}

function sendSse(res, data) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": res.localsCorsOrigin || config.allowedOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Legal-Connect-Token",
  });
  res.write(`data: ${JSON.stringify({ content: data.answer })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true, citations: data.citations })}\n\n`);
  res.end();
}

function emailProviderStatus() {
  const provider = String(config.emailProvider || "").trim().toLowerCase() || "demo";
  const resendConfigured = provider === "resend" && Boolean(config.resendApiKey);
  if (resendConfigured) {
    return { provider: "resend", status: "ready" };
  }
  if (config.sendgridApiKey) {
    return { provider: "sendgrid", status: "configured-not-wired" };
  }
  return { provider: "demo", status: "fallback" };
}

function emailAdminStatus() {
  const status = emailProviderStatus();
  const testingSender = /onboarding@resend\.dev/i.test(config.fromEmail || "");
  return {
    provider: status.provider,
    resend_configured: status.provider === "resend" && status.status === "ready",
    from_email_configured: Boolean(config.fromEmail),
    support_email_configured: Boolean(config.supportEmail),
    status: status.status,
    warning: testingSender ? "Resend testing sender may only send to the account email. Verify legal-connect.in in Resend to send from no-reply@legal-connect.in." : "",
  };
}

function publicSupportRouting() {
  const supportEmail = config.supportEmail || "legalconnect0s@gmail.com";
  const supportPhone = config.supportPhone || "";
  const sosPhone = config.sosPhone || supportPhone || "";
  const whatsappNumber = config.whatsappNumber || "";
  const phoneFallback = "Number shared after verified booking and RNA assignment";
  const whatsappFallback = "WhatsApp routing available after support number is configured";
  const routes = [
    {
      service: "Chat 3 min",
      desk: "RNA Chat Desk",
      channel: "In-app chat request queue",
      destination: "RNA Chat Coordinator",
      phone: "",
      phone_label: "No advocate private number is shown for chat.",
      next_step: "After payment verification, the query and receipt go to RNA Chat Desk for counsel allocation.",
    },
    {
      service: "Chat 8 min",
      desk: "RNA Chat Desk",
      channel: "In-app chat request queue",
      destination: "RNA Chat Coordinator",
      phone: "",
      phone_label: "No advocate private number is shown for chat.",
      next_step: "After payment verification, the longer chat request is queued with the problem summary.",
    },
    {
      service: "Chat 12 min",
      desk: "RNA Chat Desk",
      channel: "In-app chat request queue",
      destination: "RNA Chat Coordinator",
      phone: "",
      phone_label: "No advocate private number is shown for chat.",
      next_step: "After payment verification, RNA allocates the verified counsel window.",
    },
    {
      service: "SOS Video",
      desk: "RNA Legal SOS Desk",
      channel: sosPhone ? "Phone/video coordination desk" : "SOS coordination queue",
      destination: "RNA SOS Coordinator",
      phone: sosPhone,
      phone_label: sosPhone || phoneFallback,
      next_step: "After payment verification, SOS details go to RNA SOS Desk. Call/video link is shared only when provider or counsel assignment is confirmed.",
    },
    {
      service: "Legal SOS Video",
      desk: "RNA Legal SOS Desk",
      channel: sosPhone ? "Phone/video coordination desk" : "SOS coordination queue",
      destination: "RNA SOS Coordinator",
      phone: sosPhone,
      phone_label: sosPhone || phoneFallback,
      next_step: "SOS receipt is created first. RNA/Admin sees the request and coordinates the next available support channel.",
    },
    {
      service: "Attorney Shield",
      desk: "RNA Attorney Shield Desk",
      channel: "Matter-vault review and counsel allocation",
      destination: "RNA Shield Coordinator",
      phone: supportPhone,
      phone_label: supportPhone || phoneFallback,
      next_step: "After payment verification, the matter summary moves to the Shield Desk for document review and action planning.",
    },
    {
      service: "Office Consult",
      desk: "RNA Office Scheduling Desk",
      channel: "Office slot coordination",
      destination: "RNA Office Coordinator",
      phone: supportPhone,
      phone_label: supportPhone || phoneFallback,
      next_step: "After payment verification, the office slot request is sent to RNA scheduling. Location and counsel details are shared after confirmation.",
    },
    {
      service: "Doorstep",
      desk: "RNA Doorstep Coordination Desk",
      channel: "Field visit scheduling",
      destination: "RNA Field Coordinator",
      phone: supportPhone,
      phone_label: supportPhone || phoneFallback,
      next_step: "After payment verification, RNA checks location, counsel availability and visit timing before sharing any direct contact.",
    },
  ];
  return {
    ok: true,
    support_email: supportEmail,
    support_phone: supportPhone,
    sos_phone: sosPhone,
    whatsapp_number: whatsappNumber,
    support_phone_label: supportPhone || phoneFallback,
    sos_phone_label: sosPhone || phoneFallback,
    whatsapp_label: whatsappNumber || whatsappFallback,
    privacy_note: "Client phone/email and advocate private numbers stay hidden from the opposite side until verified assignment. Use central RNA coordination first.",
    routes,
  };
}

function otpRuntimeStatus() {
  const emailStatus = emailProviderStatus();
  const production = config.nodeEnv === "production";
  const emailReady = emailStatus.provider === "resend" && emailStatus.status === "ready";
  return {
    otp_mode: emailReady ? "email" : production ? "disabled" : "demo",
    otp_fallback_enabled: !production && !emailReady,
    otp_delivery_ready: emailReady,
  };
}

function safeEmailError(result) {
  if (!result) return "Email provider did not return a response.";
  if (typeof result.safeError === "string" && result.safeError.trim()) return result.safeError.trim();
  const detail = result.error?.message || result.error?.error || result.error?.name || result.reason;
  if (typeof detail === "string" && detail.trim()) return detail.slice(0, 180);
  if (result.status) return `Email provider returned status ${result.status}.`;
  return "Email provider rejected the request.";
}

async function sendEmail({ to, subject, html, text }) {
  const provider = emailProviderStatus();
  if (!to) {
    return { sent: false, provider: provider.provider, mode: "skipped", reason: "missing-recipient", safeError: "Recipient email is missing." };
  }
  if (provider.provider !== "resend") {
    return { sent: false, provider: provider.provider, mode: "demo", reason: "email-provider-not-ready" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.fromEmail || "Legal Connect <onboarding@resend.dev>",
        to,
        subject,
        html,
        text,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { sent: false, provider: "resend", mode: "error", status: response.status, error: payload, safeError: safeEmailError({ status: response.status, error: payload }) };
    }
    return { sent: true, provider: "resend", mode: "live", id: payload.id || null };
  } catch (error) {
    return { sent: false, provider: "resend", mode: "error", error: { message: error?.message }, safeError: "Could not reach Resend email API." };
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function readRawBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function razorpayMode() {
  if (!config.razorpayKeyId) return "unknown";
  if (config.razorpayKeyId.startsWith("rzp_test")) return "test";
  if (config.razorpayKeyId.startsWith("rzp_live")) return "live";
  return "unknown";
}

function razorpayKeyPrefix() {
  if (!config.razorpayKeyId) return "unknown";
  if (config.razorpayKeyId.startsWith("rzp_test")) return "rzp_test";
  if (config.razorpayKeyId.startsWith("rzp_live")) return "rzp_live";
  return "unknown";
}

function paymentConfigStatus() {
  const mode = razorpayMode();
  return {
    payments_configured: Boolean(config.razorpayKeyId && config.razorpayKeySecret),
    key_id_present: Boolean(config.razorpayKeyId),
    key_id_prefix: razorpayKeyPrefix(),
    mode,
    webhook_secret_present: Boolean(config.razorpayWebhookSecret),
    checkout_script_url: "https://checkout.razorpay.com/v1/checkout.js",
    warning: mode === "live" ? "Live key detected. Use small controlled pilot only after verification." : "",
  };
}

async function createRazorpayOrder({ amount, currency = "INR", receipt, notes = {} }) {
  const rupees = Number(amount || 0);
  const amountPaise = Math.round(rupees * 100);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    return { ok: false, status: 400, error_message: "Amount must be a positive integer value in paise." };
  }
  const safeCurrency = "INR";
  const auth = Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: safeCurrency,
      receipt,
      notes,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.description || payload.error?.reason || `Razorpay order failed with status ${response.status}`;
    return { ok: false, status: response.status, error_message: String(message).slice(0, 180) };
  }
  return { ok: true, order: payload };
}

function verifyRazorpayPaymentSignature(orderId, paymentId, signature) {
  if (!config.razorpayKeySecret || !orderId || !paymentId || !signature) return false;
  const expected = crypto.createHmac("sha256", config.razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const actual = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  if (!config.razorpayWebhookSecret || !signature) return false;
  const expected = crypto.createHmac("sha256", config.razorpayWebhookSecret).update(rawBody).digest("hex");
  const actual = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, actual);
}

function mapCase(row) {
  return dashboardCase({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    court: row.court,
    caseNo: row.case_number,
    caseNumber: row.case_number,
    cnr: row.cnr,
    nextDate: row.next_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.payload || {}),
  });
}

function mapBooking(row) {
  return dashboardBooking({
    id: row.id,
    userId: row.user_id,
    serviceType: row.service_type,
    amount: row.amount,
    paymentStatus: row.payment_status,
    receiptNo: row.receipt_no,
    nextDestination: row.next_destination,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    workHoldStatus: row.work_hold_status,
    failureReason: row.failure_reason,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    ...(row.payload || {}),
  });
}

function mapTask(row) {
  return dashboardTask({
    id: row.id,
    title: row.title,
    court: row.court,
    taskType: row.task_type,
    amount: row.amount,
    fee: row.amount,
    escrowStatus: row.escrow_status,
    status: row.status,
    postedBy: row.posted_by,
    acceptedBy: row.accepted_by,
    proofUrl: row.proof_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.payload || {}),
  });
}

function dashboardCase(item) {
  return {
    ...item,
    caseTitle: item.caseTitle || item.title || "Untitled matter",
    caseNumber: item.caseNumber || item.caseNo || "Number pending",
    courtName: item.courtName || item.court || "Court not listed",
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function dashboardBooking(item) {
  const serviceType = item.legalIssueType || item.serviceType || item.service_type || item.plan || "Other";
  return {
    ...item,
    clientName: item.clientName || item.name || "Legal Connect client",
    clientEmail: item.clientEmail || item.email || "client@legal-connect.in",
    clientPhone: item.clientPhone || item.phone || "Not provided",
    legalIssueType: serviceType,
    preferredDate: item.preferredDate || String(item.createdAt || new Date().toISOString()).slice(0, 10),
    preferredTime: item.preferredTime || "10:00 AM",
    status: item.status || item.paymentStatus || "Pending",
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function dashboardTask(item) {
  return {
    ...item,
    taskDescription: item.taskDescription || item.title || "Court mission",
    location: item.location || item.court || null,
    fee: item.fee == null ? (item.amount == null ? null : String(item.amount)) : String(item.fee),
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function numericAmount(value, fallback = 0) {
  if (value == null || value === "") return fallback;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function dashboardUser(item) {
  const roleMap = { admin: "Admin", rna: "Admin", advocate: "Associate", intern: "Intern", client: "Proxy" };
  return {
    ...item,
    role: roleMap[String(item.role || "").toLowerCase()] || item.role || "Proxy",
    email: item.email || "",
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
  };
}

function internalUserRole(role) {
  const roleMap = { Admin: "admin", Associate: "advocate", Intern: "intern", Proxy: "client" };
  return roleMap[role] || String(role || "client").toLowerCase();
}

function revenueAnalytics(cases, tasks, users) {
  const activeCases = cases.filter((item) => item.status === "Active");
  const completedTasks = tasks.filter((item) => item.status === "Completed");
  const openTasks = tasks.filter((item) => item.status === "Open");
  const marketplaceProfit = completedTasks.reduce((sum, item) => sum + Number(item.amount || item.fee || 0) * 0.1, 0);
  const totalManagedRevenue = activeCases.length * 50000;
  const singaporeGoal = 38000000;
  return {
    totalActiveCases: activeCases.length,
    totalManagedRevenue,
    completedProxyTasks: completedTasks.length,
    marketplaceProfit,
    singaporeGoal,
    singaporeProgress: Math.min(100, ((totalManagedRevenue + marketplaceProfit) / singaporeGoal) * 100),
    totalUsers: users.length,
    openProxyTasks: openTasks.length,
  };
}

function mapInternQuest(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    xpPoints: Number(item.xpPoints ?? item.xp_points ?? 0),
    deadline: item.deadline || null,
    status: item.status || "Open",
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
  };
}

async function ensureInternQuestsTable() {
  if (!db.dbAvailable) return;
  await db.query(`CREATE TABLE IF NOT EXISTS intern_quests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    xp_points integer NOT NULL DEFAULT 10,
    deadline text,
    status text NOT NULL DEFAULT 'Open',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`);
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    emailVerifiedAt: row.email_verified_at,
    phoneVerifiedAt: row.phone_verified_at,
    consentAt: row.consent_at,
    createdAt: row.created_at,
  };
}

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type,
    title: row.title,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
    ...(row.payload || {}),
  };
}

function mapReceipt(row) {
  return {
    id: row.id,
    receiptNo: row.receipt_no,
    userId: row.user_id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    receiptType: row.receipt_type,
    title: row.title,
    message: row.message,
    status: row.status,
    amount: row.amount,
    targetType: row.target_type,
    targetId: row.target_id,
    visibility: row.visibility,
    payload: row.payload || {},
    createdAt: row.created_at,
  };
}

function mapLegalSource(row) {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceName: row.source_name,
    title: row.title,
    court: row.court,
    actName: row.act_name,
    sectionNo: row.section_no,
    citation: row.citation,
    sourceUrl: row.source_url,
    publishedDate: row.published_date,
    status: row.status,
    textContent: row.text_content,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDeletionRequest(row) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    requestedAt: row.requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: row.payload || {},
    userName: row.user_name,
    userRole: row.user_role,
    emailMasked: maskEmail(row.user_email),
    phoneMasked: maskPhone(row.user_phone),
  };
}

function mapAuditLog(row) {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    message: row.message,
    payload: row.payload || {},
    createdAt: row.created_at,
  };
}

async function writeAuditLog(actor, action, targetType, targetId, message, payload = {}) {
  const audit = {
    id: `audit-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    actorId: actor?.id || null,
    actorRole: actor?.role || "system",
    action,
    targetType,
    targetId: targetId || null,
    message,
    payload,
    createdAt: new Date().toISOString(),
  };
  if (db.dbAvailable) {
    await db.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, message, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [audit.actorId, audit.actorRole, action, targetType, audit.targetId, message, JSON.stringify(payload)],
    );
  } else {
    demoStore.auditLogs.unshift(audit);
  }
  return audit;
}

async function createNotification(eventType, title, message, payload = {}, userId = null) {
  const notification = {
    id: `notification-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    userId,
    eventType,
    title,
    message,
    payload,
    createdAt: new Date().toISOString(),
  };
  if (db.dbAvailable) {
    await db.query(
      `INSERT INTO notifications (user_id, event_type, title, message, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventType, title, message, JSON.stringify(payload)],
    );
  } else {
    demoStore.notifications.unshift(notification);
  }
  return notification;
}

async function createReceipt({
  userId = null,
  actor = null,
  receiptType = "activity",
  title = "Legal Connect receipt",
  message = "Activity recorded.",
  status = "recorded",
  amount = null,
  targetType = "system",
  targetId = null,
  visibility = "private",
  payload = {},
} = {}) {
  const receipt = {
    id: `receipt-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    receiptNo: `LC-RCPT-${Date.now().toString().slice(-8)}-${Math.round(Math.random() * 900 + 100)}`,
    userId,
    actorId: actor?.id || null,
    actorRole: actor?.role || "system",
    receiptType,
    title,
    message,
    status,
    amount: amount === null || amount === undefined ? null : Number(amount),
    targetType,
    targetId: targetId || null,
    visibility,
    payload,
    createdAt: new Date().toISOString(),
  };
  if (db.dbAvailable) {
    const result = await db.query(
      `INSERT INTO receipts (receipt_no, user_id, actor_id, actor_role, receipt_type, title, message, status, amount, target_type, target_id, visibility, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        receipt.receiptNo,
        receipt.userId,
        receipt.actorId,
        receipt.actorRole,
        receipt.receiptType,
        receipt.title,
        receipt.message,
        receipt.status,
        receipt.amount,
        receipt.targetType,
        receipt.targetId,
        receipt.visibility,
        JSON.stringify(receipt.payload),
      ],
    );
    return mapReceipt(result.rows[0]);
  }
  demoStore.receipts.unshift(receipt);
  return receipt;
}

async function recordPaymentEvent({
  userId = null,
  bookingId = null,
  taskId = null,
  amount = null,
  currency = "INR",
  provider = "razorpay",
  providerOrderId = null,
  providerPaymentId = null,
  status = "recorded",
  workHoldStatus = null,
  failureReason = null,
  payload = {},
} = {}) {
  if (!db.dbAvailable) return null;
  const result = await db.query(
    `INSERT INTO payments (user_id, booking_id, task_id, amount, currency, provider, provider_order_id, provider_payment_id, status, work_hold_status, failure_reason, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      userId,
      bookingId,
      taskId,
      amount === null || amount === undefined ? null : Number(amount),
      currency,
      provider,
      providerOrderId,
      providerPaymentId,
      status,
      workHoldStatus,
      failureReason,
      JSON.stringify(payload),
    ],
  );
  return result.rows[0]?.id || null;
}

function sourceAdminUser(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser || !canSeeAll(authUser)) {
    sendJson(res, 403, { error: "RNA/Admin access required" });
    return null;
  }
  return authUser;
}

function legalSourcePayload(body, authUser) {
  return {
    id: body.id,
    source_type: body.sourceType || body.source_type || "Bare Acts",
    source_name: body.sourceName || body.source_name || "Legal Connect Source Library",
    title: body.title || "Untitled legal source",
    court: body.court || null,
    act_name: body.actName || body.act_name || null,
    section_no: body.sectionNo || body.section_no || null,
    citation: body.citation || null,
    source_url: body.sourceUrl || body.source_url || body.url || null,
    published_date: body.publishedDate || body.published_date || null,
    status: body.status || "pending",
    text_content: body.textContent || body.text_content || body.text || "",
    uploaded_by: authUser?.id || null,
  };
}

async function createLegalSourceRecord(source) {
  if (db.dbAvailable) {
    const result = await db.query(
      `INSERT INTO legal_sources (source_type, source_name, title, court, act_name, section_no, citation, source_url, published_date, status, text_content, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [source.source_type, source.source_name, source.title, source.court, source.act_name, source.section_no, source.citation, source.source_url, source.published_date, source.status, source.text_content, source.uploaded_by],
    );
    return mapLegalSource(result.rows[0]);
  }
  const fallbackSource = { ...source, id: `legal-source-${Date.now()}-${Math.round(Math.random() * 1000)}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  demoStore.legalSources.unshift(fallbackSource);
  return mapLegalSource(fallbackSource);
}

function decodePdfString(value) {
  return String(value || "")
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPdfTextFromBase64(pdfBase64) {
  const clean = String(pdfBase64 || "").replace(/^data:application\/pdf;base64,/, "");
  const raw = Buffer.from(clean, "base64").toString("latin1");
  const fragments = [];
  const tjRegex = /\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g;
  const arrayRegex = /\[((?:.|\n|\r)*?)\]\s*TJ/g;
  let match;
  while ((match = tjRegex.exec(raw))) {
    const text = decodePdfString(match[1]);
    if (text) fragments.push(text);
  }
  while ((match = arrayRegex.exec(raw))) {
    const part = [...match[1].matchAll(/\(([^()]*(?:\\.[^()]*)*)\)/g)].map((item) => decodePdfString(item[1])).join(" ");
    if (part.trim()) fragments.push(part.trim());
  }
  return fragments.join(" ").replace(/\s+/g, " ").trim();
}

function splitSectionsFromText(text, fallbackTitle) {
  const clean = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\s+(?=(?:Section\s+)?\d+[A-Z]?\.\s+[A-Z])/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!clean) return [];
  const matches = [...clean.matchAll(/(?:^|\n)\s*(?:Section\s+)?(\d+[A-Z]?)\.\s+([^\n]{0,120})/gi)];
  if (matches.length < 2) {
    return [{ sectionNo: null, title: fallbackTitle, text: clean }];
  }
  return matches.map((match, index) => {
    const start = match.index + match[0].indexOf(match[1]);
    const end = matches[index + 1] ? matches[index + 1].index : clean.length;
    const sectionText = clean.slice(start, end).trim();
    return {
      sectionNo: match[1],
      title: `${fallbackTitle} - Section ${match[1]}`,
      text: sectionText,
    };
  }).filter((section) => section.text.split(/\s+/).length > 8);
}

function splitLegalText(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= 1200) return [words.join(" ")];
  const chunks = [];
  for (let index = 0; index < words.length; index += 950) {
    chunks.push(words.slice(index, index + 1100).join(" "));
  }
  return chunks;
}

async function chunkLegalSource(sourceId) {
  let source;
  if (db.dbAvailable) {
    const result = await db.query("SELECT * FROM legal_sources WHERE id = $1", [sourceId]);
    source = result.rows[0];
  } else {
    source = demoStore.legalSources.find((item) => item.id === sourceId);
  }
  if (!source) return { error: "Source not found", status: 404 };

  const chunks = splitLegalText(source.text_content || source.textContent);
  if (db.dbAvailable) {
    await db.query("DELETE FROM legal_chunks WHERE source_id = $1", [sourceId]);
    for (const [index, chunkText] of chunks.entries()) {
      await db.query(
        "INSERT INTO legal_chunks (source_id, chunk_index, chunk_ref, chunk_text, embedding) VALUES ($1, $2, $3, $4, $5)",
        [sourceId, index, `${source.title || "Legal source"} #${index + 1}`, chunkText, JSON.stringify({ todo: "pgvector/OpenAI embeddings later" })],
      );
    }
  } else {
    demoStore.legalChunks = demoStore.legalChunks.filter((chunk) => chunk.sourceId !== sourceId);
    chunks.forEach((chunkText, index) => {
      demoStore.legalChunks.push({
        id: `chunk-${Date.now()}-${index}`,
        sourceId,
        chunkIndex: index,
        chunkRef: `${source.title || "Legal source"} #${index + 1}`,
        chunkText,
        createdAt: new Date().toISOString(),
      });
    });
  }
  return { ok: true, chunks: chunks.length, todo: "Replace text search with pgvector embeddings after API/licence approval." };
}

const lawbotStopWords = new Set([
  "about", "according", "after", "approved", "before", "court", "from", "have", "into", "judgment", "judgements", "judgments", "latest", "legal", "please", "source", "sources", "supreme", "that", "this", "what", "when", "where", "which", "with", "your", "kya", "hai", "the", "and", "for", "are", "can", "will", "should",
]);

function questionTerms(question) {
  return String(question || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !lawbotStopWords.has(word));
}

function scoreLegalChunk(question, row) {
  const terms = questionTerms(question);
  const haystack = [
    row.chunk_text || row.chunkText,
    row.title,
    row.citation,
    row.source_name || row.sourceName,
    row.act_name || row.actName,
    row.section_no || row.sectionNo,
  ].join(" ").toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function citationForChunk(row) {
  return {
    title: row.title || "Approved legal source",
    citation: row.citation || "Citation pending",
    sourceName: row.source_name || row.sourceName || "Legal Connect Source Library",
    actName: row.act_name || row.actName || "",
    sectionNo: row.section_no || row.sectionNo || "",
    sourceUrl: row.source_url || row.sourceUrl || "",
    chunkRef: row.chunk_ref || row.chunkRef || "Source excerpt",
  };
}

async function searchApprovedLegalChunks(question) {
  if (db.dbAvailable) {
    const result = await db.query(
      `SELECT lc.id AS chunk_id, lc.chunk_ref, lc.chunk_text, ls.id AS source_id,
              ls.source_type, ls.source_name, ls.title, ls.court, ls.act_name,
              ls.section_no, ls.citation, ls.source_url, ls.published_date
       FROM legal_chunks lc
       JOIN legal_sources ls ON ls.id = lc.source_id
       WHERE ls.status = 'approved'
       ORDER BY lc.created_at DESC
       LIMIT 500`,
    );
    return result.rows
      .map((row) => ({ ...row, score: scoreLegalChunk(question, row) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  const approvedSources = new Map(demoStore.legalSources.filter((source) => source.status === "approved").map((source) => [source.id, source]));
  return demoStore.legalChunks
    .map((chunk) => ({ ...chunk, ...(approvedSources.get(chunk.sourceId) || {}) }))
    .filter((chunk) => approvedSources.has(chunk.sourceId))
    .map((chunk) => ({ ...chunk, score: scoreLegalChunk(question, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function needsAdvocateReview(question) {
  return /\b(strategy|opinion|draft|drafting|bail chance|win probability|advice|advise|argue|settlement|guarantee)\b/i.test(String(question || ""));
}

function answerFromChunks(question, chunks) {
  if (chunks.length === 0) {
    return {
      answer: "I could not verify this from Legal Connect's approved legal sources. Please consult an advocate or add an authorised source.",
      citations: [],
      confidence: "none",
      mode: "source-locked",
    };
  }

  const excerpts = chunks.slice(0, 3).map((chunk) => String(chunk.chunk_text || chunk.chunkText || "").split(/(?<=[.!?])\s+/).slice(0, 2).join(" "));
  const primary = chunks[0];
  const citation = citationForChunk(primary);
  const reviewLine = needsAdvocateReview(question)
    ? "This is source-based legal information only; a verified advocate must review strategy, drafting, risk, bail, settlement, or court action before you rely on it."
    : "This is legal information, not legal advice. Consult a verified advocate before taking action.";
  return {
    answer: [
      "Short Answer",
      excerpts[0] || "The approved source contains relevant legal text.",
      "",
      "Legal Basis",
      excerpts.join(" "),
      "",
      "Practical Meaning",
      "Legal Connect found this only in approved indexed source material. Use it as a starting point for understanding the issue.",
      "",
      "Source Citation",
      `${citation.actName || citation.title}${citation.sectionNo ? `, Section ${citation.sectionNo}` : ""}; ${citation.citation}; ${citation.sourceName}; ${citation.chunkRef}.`,
      "",
      "Caution",
      reviewLine,
    ].join("\n"),
    citations: chunks.map(citationForChunk),
    confidence: chunks[0].score >= 3 ? "high" : "medium",
    mode: "source-locked",
  };
}

async function saveLawbotQuery(userId, question, result, mode = "lawbot") {
  if (db.dbAvailable) {
    const saved = await db.query(
      `INSERT INTO lawbot_queries (user_id, question, answer, sources, confidence, mode)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId || null, question, result.answer, JSON.stringify(result.citations || []), result.confidence || "none", mode],
    );
    return saved.rows[0]?.id || null;
  }
  const saved = { id: `lawbot-query-${Date.now()}`, userId, question, ...result, mode, createdAt: new Date().toISOString() };
  demoStore.lawbotQueries.unshift(saved);
  return saved.id;
}

async function queryLawbot(question, userId, mode = "lawbot") {
  if (!question || !String(question).trim()) {
    return {
      answer: "Ask a question and I will search only Legal Connect's approved legal sources.",
      citations: [],
      confidence: "none",
      mode: "source-locked",
    };
  }
  const chunks = await searchApprovedLegalChunks(question);
  const result = answerFromChunks(question, chunks);
  const queryId = await saveLawbotQuery(userId, question, result, mode);
  return { ...result, queryId };
}

async function saveLawbotChat(userId, question, result) {
  if (!db.dbAvailable) return;
  await db.query(
    "INSERT INTO lawbot_chats (user_id, question, answer, sources) VALUES ($1, $2, $3, $4)",
    [userId || null, question, result.answer, JSON.stringify(result.citations || [])],
  );
}

async function lawbotHealthCounts() {
  if (db.dbAvailable) {
    const [sources, chunks] = await Promise.all([
      db.query("SELECT count(*)::int AS count FROM legal_sources WHERE status = 'approved'"),
      db.query(`SELECT count(*)::int AS count
                FROM legal_chunks lc
                JOIN legal_sources ls ON ls.id = lc.source_id
                WHERE ls.status = 'approved'`),
    ]);
    return {
      approved_sources_count: sources.rows[0]?.count || 0,
      legal_chunks_count: chunks.rows[0]?.count || 0,
    };
  }
  return {
    approved_sources_count: demoStore.legalSources.filter((source) => source.status === "approved").length,
    legal_chunks_count: demoStore.legalChunks.filter((chunk) => {
      const source = demoStore.legalSources.find((item) => item.id === chunk.sourceId);
      return source?.status === "approved";
    }).length,
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  return types[ext] || "application/octet-stream";
}

function dataDeletionPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Legal Connect Data Deletion</title>
  <style>
    :root { color-scheme: light; --navy:#081B33; --gold:#C99A2E; --paper:#F8FAFC; --ink:#172033; }
    body { margin:0; font-family: Arial, sans-serif; background: linear-gradient(180deg, #F7FAFF, #EEF4FF); color: var(--ink); line-height:1.6; }
    main { max-width: 880px; margin: 0 auto; padding: 32px 18px 56px; }
    .card { background: white; border: 1px solid #DCE5F2; border-radius: 18px; padding: 24px; box-shadow: 0 18px 40px rgba(8, 27, 51, .08); }
    h1 { color: var(--navy); font-size: clamp(2rem, 6vw, 3.4rem); line-height:1.05; margin: 0 0 12px; }
    h2 { color: var(--navy); margin-top: 28px; }
    a { color: #0B5AA9; font-weight: 700; }
    .badge { display:inline-flex; gap:8px; align-items:center; color: var(--navy); border:1px solid rgba(201,154,46,.4); background:#FFF8E8; border-radius:999px; padding:8px 12px; font-weight:700; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <span class="badge">Legal Connect - Data Deletion</span>
      <h1>Request account and personal data deletion</h1>
      <p>This page explains how users of Legal Connect (${escapeHtml(config.publicAppUrl)}) can request deletion of their account and associated personal data. Android package: <strong>in.legalconnect.app</strong>.</p>
      <h2>In-app request path</h2>
      <p>Open Legal Connect, log in, then go to <strong>Profile / Account - Privacy & Data - Request Account Deletion</strong>. Submit the confirmation shown in the app.</p>
      <h2>Email request path</h2>
      <p>You may email <a href="mailto:legalconnect0s@gmail.com">legalconnect0s@gmail.com</a> from your registered email address. Include your registered name, masked phone number or registered email, and a short statement that you want account deletion. Do not email passwords or OTPs.</p>
      <h2>Verification</h2>
      <p>Legal Connect may ask for additional verification before acting on a deletion request to protect users from unauthorised deletion.</p>
      <h2>Data normally considered for deletion</h2>
      <ul>
        <li>Account profile details, where deletion is permitted.</li>
        <li>Service-request details no longer needed to deliver support.</li>
        <li>Local app/session data controlled by the user.</li>
        <li>LawBot questions or feedback where deletion is permitted and identifiable.</li>
      </ul>
      <h2>Records that may be retained</h2>
      <p>Some records may need to be retained where required for legal, payment, fraud prevention, dispute resolution, audit, tax, accounting, or compliance purposes. This may include payment references, receipts, audit logs, dispute records, and legally relevant service records.</p>
      <h2>Support and grievance contact</h2>
      <p>Support email: <a href="mailto:legalconnect0s@gmail.com">legalconnect0s@gmail.com</a>. MSME/Udyam Registration No.: <strong>UDYAM-DL-11-0164811</strong>.</p>
      <p><small>Effective date: 13 July 2026. Last updated: 13 July 2026.</small></p>
    </div>
  </main>
</body>
</html>`;
}

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(publicDir, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json|map)$/i.test(safePath)) {
      sendJson(res, 404, { error: "Asset not found" });
      return;
    }
    filePath = path.join(publicDir, "index.html");
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 500, { error: "Unable to read file" });
      return;
    }
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  res.localsCorsOrigin = corsOriginFor(req);
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname === "/api/app-version") {
    sendJson(res, 200, appVersionPayload());
    return;
  }

  if (url.pathname === "/api/support-routing" && req.method === "GET") {
    sendJson(res, 200, publicSupportRouting());
    return;
  }

  if (url.pathname === "/data-deletion" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(dataDeletionPageHtml());
    return;
  }

  if (url.pathname === "/health" || url.pathname === "/api/health" || url.pathname === "/api/healthz") {
    const dbHealth = await db.healthCheck();
    const lawbotCounts = dbHealth.connected || config.nodeEnv !== "production"
      ? await lawbotHealthCounts()
      : { approved_sources_count: 0, legal_chunks_count: 0 };
    const version = appVersionPayload();
    const otpStatus = otpRuntimeStatus();
    sendJson(res, dbHealth.connected || config.nodeEnv !== "production" ? 200 : 503, {
      ok: dbHealth.connected || config.nodeEnv !== "production",
      status: dbHealth.connected || config.nodeEnv !== "production" ? "ok" : "degraded",
      app: "Legal Connect",
      mode: "Phase 2 production foundation",
      web_version: version.web_version,
      build_time: version.build_time,
      minimum_android_version: version.minimum_android_version,
      android_wrapper_version: version.android_wrapper_version,
      db: dbHealth.db,
      latency_ms: dbHealth.latency_ms,
      pool: dbHealth.pool,
      migrations: dbHealth.migrations,
      auth: "enabled",
      lawbot: "source-locked",
      approved_sources_count: lawbotCounts.approved_sources_count,
      legal_chunks_count: lawbotCounts.legal_chunks_count,
      pdf_ingestion: "enabled",
      audit_logs: "enabled",
      payments: config.razorpayKeyId && config.razorpayKeySecret ? "razorpay-ready" : "not-configured",
      email: emailProviderStatus(),
      otp_mode: otpStatus.otp_mode,
      otp_fallback_enabled: otpStatus.otp_fallback_enabled,
      google_play_review_access: playReviewConfigured() ? "enabled" : "disabled",
      public_url: config.publicAppUrl,
      allowed_origins_count: (config.allowedOrigins || []).filter((origin) => origin !== "*").length,
    });
    return;
  }

  if (url.pathname.startsWith("/api/") && productionDbUnavailable()) {
    sendProductionDbUnavailable(res);
    return;
  }

  if (url.pathname === "/api/review/workspace" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!isReviewUser(authUser)) {
      sendJson(res, 403, { ok: false, error: "Google Play review workspace is not available for this account." });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      reviewAccess: reviewAccessPayload(authUser.role),
      workspace: reviewSeedData(authUser),
    });
    return;
  }

  if (url.pathname === "/api/review/switch-role" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!isReviewUser(authUser)) {
      sendJson(res, 403, { ok: false, error: "Google Play review role switching is not available for this account." });
      return;
    }
    const body = await readBody(req);
    const nextRole = REVIEW_ROLES.includes(body.role) ? body.role : null;
    if (!nextRole) {
      sendJson(res, 400, { ok: false, error: "Review role is not allowed." });
      return;
    }
    const switchedUser = decorateReviewUser(authUser, nextRole);
    const token = encodeSession(switchedUser);
    await writeAuditLog(switchedUser, "google_play_review_role_switched", "user", switchedUser.id, `Google Play review workspace switched to ${nextRole}.`, {
      activeRole: nextRole,
      allowedRoles: REVIEW_ROLES,
    });
    sendJson(res, 200, {
      ok: true,
      token,
      user: publicUser(switchedUser),
      reviewAccess: reviewAccessPayload(nextRole),
      seededWorkspace: reviewSeedData(switchedUser),
    });
    return;
  }

  if (url.pathname === "/api/admin/email/status" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    sendJson(res, 200, emailAdminStatus());
    return;
  }

  if (url.pathname === "/api/admin/payments/status" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const paymentStatus = paymentConfigStatus();
    let latestPayment = null;
    if (db.dbAvailable) {
      const result = await db.query(
        `SELECT id, service_type, amount, payment_status, work_hold_status, razorpay_order_id, razorpay_payment_id, failure_reason, verified_at, created_at
         FROM bookings
         ORDER BY created_at DESC
         LIMIT 1`,
      );
      latestPayment = result.rows[0] || null;
    } else {
      latestPayment = demoStore.bookings[demoStore.bookings.length - 1] || null;
    }
    const latestPaymentView = latestPayment
      ? db.dbAvailable
        ? mapBooking(latestPayment)
        : latestPayment
      : null;
    sendJson(res, 200, {
      ...paymentStatus,
      latest_payment: latestPaymentView,
      latest_payment_status: latestPayment?.payment_status || latestPayment?.paymentStatus || null,
      latest_order_id: latestPayment?.razorpay_order_id || latestPayment?.razorpayOrderId || null,
      latest_payment_id: latestPayment?.razorpay_payment_id || latestPayment?.razorpayPaymentId || null,
      latest_work_hold_status: latestPayment?.work_hold_status || latestPayment?.workHoldStatus || null,
      last_payment_error: latestPayment?.failure_reason || latestPayment?.failureReason || "",
    });
    return;
  }

  if (url.pathname === "/api/auth/request-code" && req.method === "POST") {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const destination = email || phone;
    const destinationType = email ? "email" : "phone";
    const otpStatus = otpRuntimeStatus();
    if (!destination) {
      sendJson(res, 400, { ok: false, error: "Email or phone is required for verification." });
      return;
    }
    if (email && isPlayReviewEmail(email)) {
      sendJson(res, 200, {
        ok: true,
        mode: "google-play-review",
        status: "review-code-required",
        destinationType,
        destinationMasked: maskEmail(email),
        message: "Enter the Google Play review access code supplied in Play Console.",
      });
      return;
    }
    if (email && isDemoEmail(email)) {
      const code = DEMO_OTP;
      const record = {
        id: `verify-demo-${Date.now()}`,
        email,
        phone: null,
        codeHash: verificationHash(email, code),
        purpose: "login",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        consumedAt: null,
        createdAt: new Date().toISOString(),
      };
      if (db.dbAvailable) {
        await db.query(
          `INSERT INTO login_verifications (email, phone, code_hash, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)`,
          [record.email, null, record.codeHash, record.purpose, record.expiresAt],
        );
      } else {
        demoStore.verifications.unshift(record);
      }
      sendJson(res, 200, {
        ok: true,
        status: "sent",
        mode: "demo",
        destinationType: "email",
        destinationMasked: maskEmail(email),
        devCode: code,
        message: "Demo account — verification code filled automatically.",
      });
      return;
    }
    if (config.nodeEnv === "production" && destinationType === "phone") {
      sendJson(res, 503, {
        ok: false,
        mode: "disabled",
        status: "failed",
        destinationType,
        destinationMasked: maskPhone(phone),
        error_message: "Phone OTP is not enabled yet. Use email verification.",
      });
      return;
    }
    if (config.nodeEnv === "production" && destinationType === "email" && !otpStatus.otp_delivery_ready) {
      sendJson(res, 503, {
        ok: false,
        mode: "disabled",
        status: "failed",
        destinationType,
        destinationMasked: maskEmail(email),
        error_message: "Email OTP is not configured. Add EMAIL_PROVIDER=resend and RESEND_API_KEY before production login.",
      });
      return;
    }

    const code = verificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const record = {
      id: `verify-${Date.now()}`,
      email: email || null,
      phone: phone || null,
      codeHash: verificationHash(destination, code),
      purpose: "login",
      expiresAt,
      consumedAt: null,
      createdAt: new Date().toISOString(),
    };

    if (db.dbAvailable) {
      await db.query(
        `INSERT INTO login_verifications (email, phone, code_hash, purpose, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.email, record.phone, record.codeHash, record.purpose, record.expiresAt],
      );
      await db.query(
        `INSERT INTO otp_codes (email, phone, code_hash, purpose, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.email, record.phone, record.codeHash, record.purpose, record.expiresAt],
      );
    } else {
      demoStore.verifications.unshift(record);
    }

    if (email) {
      const emailResult = await sendEmail({
        to: email,
        subject: "Legal Connect verification code",
        text: `Your Legal Connect verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Your Legal Connect verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. Do not share this code with anyone.</p>`,
      });
      if (emailResult.sent) {
        sendJson(res, 200, {
          ok: true,
          mode: "resend",
          status: "sent",
          destinationType,
          destinationMasked: maskEmail(email),
          expiresAt,
          provider_message_id: emailResult.id || null,
        });
        return;
      }
      if (emailProviderStatus().provider === "resend" && emailProviderStatus().status === "ready") {
        sendJson(res, 502, {
          ok: false,
          mode: "resend",
          status: "failed",
          destinationType,
          destinationMasked: maskEmail(email),
          error_message: safeEmailError(emailResult),
        });
        return;
      }
    }

    sendJson(res, 200, {
      ok: true,
      mode: destinationType === "phone" ? "sms-fallback" : "local-fallback",
      status: "queued",
      otp_mode: otpStatus.otp_mode,
      otp_fallback_enabled: otpStatus.otp_fallback_enabled,
      destinationType,
      destinationMasked: destinationType === "email" ? maskEmail(email) : maskPhone(phone),
      expiresAt,
      message: destinationType === "phone"
        ? "Phone OTP provider is not configured yet. SMS delivery is ready to connect."
        : "Local verification queued because email provider is not configured.",
      ...(otpStatus.otp_fallback_enabled ? { devCode: code } : {}),
    });
    return;
  }

  if (url.pathname === "/api/auth/verify-code" && req.method === "POST") {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const destination = email || phone;
    const rawCode = body.code === undefined || body.code === null ? "" : String(body.code);
    const code = rawCode.trim();
    if (!destination || !code) {
      sendJson(res, 400, { ok: false, error: "Destination and code are required." });
      return;
    }

    if (email && isPlayReviewEmail(email)) {
      const limit = reviewRateLimit(email, req);
      if (!limit.allowed) {
        sendJson(res, 429, {
          ok: false,
          mode: "google-play-review",
          status: "rate_limited",
          error: "Too many review login attempts. Try again later.",
          retryAfterSeconds: limit.retryAfterSeconds,
        });
        return;
      }
      if (rawCode !== config.playReviewCode) {
        sendJson(res, 400, {
          ok: false,
          mode: "google-play-review",
          status: "failed",
          message: "Review access code is invalid.",
        });
        return;
      }
      markReviewVerified(email);
      await writeAuditLog(null, "google_play_review_code_verified", "verification", "google-play-review", "Google Play review code verified.", {
        emailMasked: maskEmail(email),
      });
      sendJson(res, 200, {
        ok: true,
        mode: "google-play-review",
        status: "verified",
        destinationMasked: maskEmail(email),
        destinationType: "email",
        reviewAccess: reviewAccessPayload("client"),
      });
      return;
    }

    const expectedHash = verificationHash(destination, code);
    let verified = false;
    let verificationId = null;

    if (db.dbAvailable) {
      const result = await db.query(
        `SELECT * FROM login_verifications
         WHERE (($1::text IS NOT NULL AND email = $1) OR ($2::text IS NOT NULL AND phone = $2))
           AND purpose = 'login'
           AND consumed_at IS NULL
           AND expires_at > now()
         ORDER BY created_at DESC
         LIMIT 1`,
        [email || null, phone || null],
      );
      const item = result.rows[0];
      verified = Boolean(item && item.code_hash === expectedHash);
      if (verified) {
        verificationId = item.id;
        await db.query("UPDATE login_verifications SET consumed_at = now() WHERE id = $1", [item.id]);
        await db.query(
          `UPDATE otp_codes
           SET consumed_at = now()
           WHERE (($1::text IS NOT NULL AND email = $1) OR ($2::text IS NOT NULL AND phone = $2))
             AND code_hash = $3
             AND purpose = 'login'
             AND consumed_at IS NULL`,
          [email || null, phone || null, expectedHash],
        );
        if (email) {
          await db.query("UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()) WHERE email = $1", [email]);
        }
        if (phone) {
          await db.query("UPDATE users SET phone_verified_at = COALESCE(phone_verified_at, now()) WHERE phone = $1", [phone]);
        }
      }
    } else {
      const item = demoStore.verifications.find((candidate) => {
        const sameDestination = (email && candidate.email === email) || (phone && candidate.phone === phone);
        return sameDestination && !candidate.consumedAt && new Date(candidate.expiresAt).getTime() > Date.now();
      });
      verified = Boolean(item && item.codeHash === expectedHash);
      if (verified) {
        verificationId = item.id;
        item.consumedAt = new Date().toISOString();
        demoStore.users.forEach((user) => {
          if (email && user.email === email) user.emailVerifiedAt = new Date().toISOString();
          if (phone && user.phone === phone) user.phoneVerifiedAt = new Date().toISOString();
        });
      }
    }

    if (!verified) {
      sendJson(res, 400, { ok: false, status: "failed", message: "Verification code is invalid or expired." });
      return;
    }

    await writeAuditLog(getAuthUser(req), "login_contact_verified", "verification", verificationId, "Login contact verification completed.", {
      emailMasked: maskEmail(email),
      phoneMasked: maskPhone(phone),
    });
    sendJson(res, 200, {
      ok: true,
      status: "verified",
      destinationMasked: email ? maskEmail(email) : maskPhone(phone),
      destinationType: email ? "email" : "phone",
    });
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const selectedPortal = normalizePortal(body.portal || body.selectedPortal || body.portalType || body.role);
    const requestedRole = roles.has(body.role) ? body.role : selectedPortal || "client";
    const name = body.name || body.email || body.phone || "Legal Connect User";
    const email = normalizeEmail(body.email) || null;
    const phone = normalizePhone(body.phone) || null;
    const privacyConsent = body.privacyConsent === true || body.privacyConsent === "true";
    const isReviewLogin = Boolean(email && isPlayReviewEmail(email));
    const isDemoLogin = Boolean(email && isDemoEmail(email));
    if (isReviewLogin && !reviewContactVerified(email)) {
      sendJson(res, 401, {
        ok: false,
        mode: "google-play-review",
        error: "Verify the Google Play review code before opening the review workspace.",
      });
      return;
    }
    const verifiedFlags = await verifiedContactFlags(email, phone);
    if (isDemoLogin) {
      verifiedFlags.emailVerified = true;
    }
    if (config.nodeEnv === "production" && !isReviewLogin && !isDemoLogin && !verifiedFlags.emailVerified && !verifiedFlags.phoneVerified) {
      sendJson(res, 401, {
        ok: false,
        error: "Verify your email OTP before opening your workspace.",
      });
      return;
    }
    let role = resolveLoginRole(requestedRole, null, isReviewLogin);
    let user;

    if (db.dbAvailable) {
      const existing = email
        ? await db.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email])
        : phone
          ? await db.query("SELECT * FROM users WHERE phone = $1 LIMIT 1", [phone])
          : { rows: [] };

      if (existing.rows.length) {
        const previousRole = existing.rows[0].role;
        role = resolveLoginRole(requestedRole, previousRole, isReviewLogin);
        const updated = await db.query(
          `UPDATE users
           SET name = $2,
               phone = COALESCE($3, phone),
               role = $4,
               consent_at = CASE WHEN $5 THEN COALESCE(consent_at, now()) ELSE consent_at END,
               email_verified_at = CASE WHEN $6 THEN COALESCE(email_verified_at, now()) ELSE email_verified_at END,
               phone_verified_at = CASE WHEN $7 THEN COALESCE(phone_verified_at, now()) ELSE phone_verified_at END
           WHERE id = $1
           RETURNING *`,
          [existing.rows[0].id, name, phone, role, privacyConsent, verifiedFlags.emailVerified, verifiedFlags.phoneVerified],
        );
        user = mapUser(updated.rows[0]);
        if (previousRole !== role) {
          await writeAuditLog(user, "role_changed", "user", user.id, `User role changed from ${previousRole || "unknown"} to ${role}`, { previousRole, nextRole: role, emailMasked: maskEmail(email), phoneMasked: maskPhone(phone) });
        }
      } else {
        const created = await db.query(
          `INSERT INTO users (name, email, phone, role, consent_at, email_verified_at, phone_verified_at)
           VALUES ($1, $2, $3, $4, CASE WHEN $5 THEN now() ELSE NULL END, CASE WHEN $6 THEN now() ELSE NULL END, CASE WHEN $7 THEN now() ELSE NULL END)
           RETURNING *`,
          [name, email, phone, role, privacyConsent, verifiedFlags.emailVerified, verifiedFlags.phoneVerified],
        );
        user = mapUser(created.rows[0]);
      }
    } else {
      user = demoStore.users.find((item) => (email && item.email === email) || (phone && item.phone === phone));
      if (!user) {
        role = resolveLoginRole(requestedRole, null, isReviewLogin);
        user = {
          id: `user-${Date.now()}`,
          name,
          email,
          phone,
          role,
          emailVerifiedAt: verifiedFlags.emailVerified ? new Date().toISOString() : null,
          phoneVerifiedAt: verifiedFlags.phoneVerified ? new Date().toISOString() : null,
          consentAt: privacyConsent ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        demoStore.users.push(user);
      } else {
        const previousRole = user.role;
        role = resolveLoginRole(requestedRole, previousRole, isReviewLogin);
        Object.assign(user, {
          name,
          phone,
          role,
          emailVerifiedAt: verifiedFlags.emailVerified ? user.emailVerifiedAt || new Date().toISOString() : user.emailVerifiedAt,
          phoneVerifiedAt: verifiedFlags.phoneVerified ? user.phoneVerifiedAt || new Date().toISOString() : user.phoneVerifiedAt,
          consentAt: privacyConsent ? user.consentAt || new Date().toISOString() : user.consentAt,
        });
        if (previousRole !== role) {
          await writeAuditLog(user, "role_changed", "user", user.id, `User role changed from ${previousRole || "unknown"} to ${role}`, { previousRole, nextRole: role, emailMasked: maskEmail(email), phoneMasked: maskPhone(phone) });
        }
      }
    }

    if (isReviewLogin) {
      user = decorateReviewUser(user, role);
      await writeAuditLog(user, "google_play_review_login", "user", user.id, "Google Play review account opened.", {
        activeRole: role,
        allowedRoles: REVIEW_ROLES,
        dataMode: "synthetic",
      });
    }

    const token = encodeSession(user);
    await saveSessionToken(user, token);
    const postLoginRoute = getPostLoginRoute({
      role: user.role,
      accountStatus: user.accountStatus || user.account_status || 'active',
      verificationStatus: user.verificationStatus || user.verification_status || 'verified',
      onboardingCompleted: Boolean(user.onboardingCompleted ?? user.onboarding_completed ?? true),
    });
    const portalRoute = getPortalLoginRoute(selectedPortal || requestedRole || user.role);
    await createReceipt({
      userId: user.id,
      actor: user,
      receiptType: "login",
      title: "Login receipt",
      message: `${user.role || "user"} workspace opened.`,
      status: "signed-in",
      targetType: "user",
      targetId: user.id,
      visibility: "private",
      payload: { role: user.role, emailMasked: maskEmail(user.email), phoneMasked: maskPhone(user.phone), consentRecorded: privacyConsent },
    });
    sendJson(res, 200, {
      ok: true,
      token,
      user: publicUser(user),
      portal: selectedPortal || requestedRole || user.role,
      portalRoute,
      postLoginRoute,
      verification: { emailVerified: Boolean(user.emailVerifiedAt), phoneVerified: Boolean(user.phoneVerifiedAt), consentRecorded: Boolean(user.consentAt) },
      ...(isReviewLogin ? { reviewAccess: reviewAccessPayload(user.role), seededWorkspace: reviewSeedData(user) } : {}),
    });
    return;
  }

  if (url.pathname === "/api/auth/demo-login" && req.method === "POST") {
    const body = await readBody(req);
    const role = roles.has(body.role) ? body.role : "client";
    const account = getDemoAccountByRole(role === "rna" ? "admin" : role);
    try {
      const { user, privacyConsent } = await upsertDemoUser(account);
      const token = encodeSession(user);
      await saveSessionToken(user, token);
      await createReceipt({
        userId: user.id,
        actor: user,
        receiptType: "login",
        title: "Demo login receipt",
        message: `${user.role} demo workspace opened.`,
        status: "signed-in",
        targetType: "user",
        targetId: user.id,
        visibility: "private",
        payload: { role: user.role, demo: true },
      });
      sendJson(res, 200, {
        ok: true,
        token,
        user: publicUser(user),
        demo: true,
        verification: { emailVerified: true, phoneVerified: false, consentRecorded: privacyConsent },
      });
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error.message || "Demo login failed." });
    }
    return;
  }

  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = getAuthUser(req);
    if (!user) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    sendJson(res, 200, { ok: true, user });
    return;
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/account/deletion-request" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required to request account deletion." });
      return;
    }
    const body = await readBody(req);
    const confirmed = body.confirm === true || body.confirm === "true";
    if (!confirmed) {
      sendJson(res, 400, { ok: false, error: "Explicit confirmation is required before creating a deletion request." });
      return;
    }
    const message = "Your account deletion request has been received. Certain records may be retained where required for legal, payment, fraud prevention, dispute resolution, audit, or compliance purposes.";
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO account_deletion_requests (user_id, status, payload)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [authUser.id, "received", JSON.stringify({ requestedByRole: authUser.role, channel: "in-app" })],
      );
      const deletionRequest = mapDeletionRequest(result.rows[0]);
      await writeAuditLog(authUser, "account_deletion_requested", "account_deletion_request", deletionRequest.id, "Account deletion request received.", { requestId: deletionRequest.id });
      sendJson(res, 201, { ok: true, request: deletionRequest, message });
      return;
    }
    const deletionRequest = {
      id: `deletion-${Date.now()}`,
      userId: authUser.id,
      status: "received",
      requestedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      payload: { requestedByRole: authUser.role, channel: "in-app" },
    };
    demoStore.deletionRequests.unshift(deletionRequest);
    await writeAuditLog(authUser, "account_deletion_requested", "account_deletion_request", deletionRequest.id, "Account deletion request received.", { requestId: deletionRequest.id });
    sendJson(res, 201, { ok: true, request: deletionRequest, message });
    return;
  }

  if (url.pathname === "/api/account/deletion-request" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    if (db.dbAvailable) {
      const result = await db.query(
        `SELECT * FROM account_deletion_requests
         WHERE user_id = $1
         ORDER BY requested_at DESC
         LIMIT 5`,
        [authUser.id],
      );
      sendJson(res, 200, result.rows.map(mapDeletionRequest));
      return;
    }
    sendJson(res, 200, demoStore.deletionRequests.filter((request) => request.userId === authUser.id).slice(0, 5));
    return;
  }

  if (url.pathname === "/api/users" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "Admin access required" });
      return;
    }
    if (db.dbAvailable) {
      const result = await db.query("SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC");
      sendJson(res, 200, result.rows.map(dashboardUser));
      return;
    }
    sendJson(res, 200, demoStore.users.map(dashboardUser));
    return;
  }

  if (url.pathname === "/api/users" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "Admin access required" });
      return;
    }
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    if (!name || !email || !email.includes("@")) {
      sendJson(res, 400, { error: "Name and a valid email are required." });
      return;
    }
    const role = internalUserRole(body.role);
    if (db.dbAvailable) {
      const result = await db.query(
        "INSERT INTO users (name, email, phone, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, role, created_at",
        [name, email, body.phone || null, role],
      );
      sendJson(res, 201, dashboardUser(result.rows[0]));
      return;
    }
    const user = dashboardUser({ id: `user-${Date.now()}`, name, email, phone: body.phone || null, role, barId: body.barId || null, locationBase: body.locationBase || null, createdAt: new Date().toISOString() });
    demoStore.users.unshift({ ...user, role });
    sendJson(res, 201, user);
    return;
  }

  if (url.pathname.startsWith("/api/users/") && ["GET", "PUT", "DELETE"].includes(req.method)) {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "Admin access required" });
      return;
    }
    const id = decodeURIComponent(url.pathname.split("/").pop());
    if (req.method === "DELETE") {
      if (String(authUser.id) === String(id)) {
        sendJson(res, 400, { error: "You cannot delete the account currently in use." });
        return;
      }
      if (db.dbAvailable) await db.query("DELETE FROM users WHERE id = $1", [id]);
      else demoStore.users = demoStore.users.filter((item) => String(item.id) !== String(id));
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "GET") {
      const user = db.dbAvailable
        ? (await db.query("SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1", [id])).rows[0]
        : demoStore.users.find((item) => String(item.id) === String(id));
      if (!user) {
        sendJson(res, 404, { error: "User not found" });
        return;
      }
      sendJson(res, 200, dashboardUser(user));
      return;
    }
    const body = await readBody(req);
    if (db.dbAvailable) {
      const result = await db.query(
        `UPDATE users SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), role = COALESCE($5, role)
         WHERE id = $1 RETURNING id, name, email, phone, role, created_at`,
        [id, body.name || null, body.email ? normalizeEmail(body.email) : null, body.phone || null, body.role ? internalUserRole(body.role) : null],
      );
      if (!result.rows[0]) {
        sendJson(res, 404, { error: "User not found" });
        return;
      }
      sendJson(res, 200, dashboardUser(result.rows[0]));
      return;
    }
    const user = demoStore.users.find((item) => String(item.id) === String(id));
    if (!user) {
      sendJson(res, 404, { error: "User not found" });
      return;
    }
    Object.assign(user, body, body.role ? { role: internalUserRole(body.role) } : {});
    sendJson(res, 200, dashboardUser(user));
    return;
  }

  if (url.pathname === "/api/intern-quests" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    if (db.dbAvailable) {
      await ensureInternQuestsTable();
      const result = await db.query("SELECT * FROM intern_quests ORDER BY created_at DESC");
      sendJson(res, 200, result.rows.map(mapInternQuest));
      return;
    }
    sendJson(res, 200, demoStore.internQuests.map(mapInternQuest));
    return;
  }

  if (url.pathname === "/api/intern-quests" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser || !["admin", "rna", "advocate", "intern"].includes(authUser.role)) {
      sendJson(res, 403, { error: "Quest access required." });
      return;
    }
    const body = await readBody(req);
    if (!body.title || !body.description) {
      sendJson(res, 400, { error: "Title and description are required." });
      return;
    }
    if (db.dbAvailable) {
      await ensureInternQuestsTable();
      const result = await db.query(
        "INSERT INTO intern_quests (title, description, xp_points, deadline, status) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [body.title, body.description, Number(body.xpPoints || 10), body.deadline || null, body.status || "Open"],
      );
      sendJson(res, 201, mapInternQuest(result.rows[0]));
      return;
    }
    const quest = mapInternQuest({ ...body, id: `quest-${Date.now()}`, createdAt: new Date().toISOString() });
    demoStore.internQuests.unshift(quest);
    sendJson(res, 201, quest);
    return;
  }

  if (url.pathname.startsWith("/api/intern-quests/") && ["PUT", "DELETE"].includes(req.method)) {
    const authUser = getAuthUser(req);
    if (!authUser || !["admin", "rna", "advocate", "intern"].includes(authUser.role)) {
      sendJson(res, 403, { error: "Quest access required." });
      return;
    }
    const id = decodeURIComponent(url.pathname.split("/").pop());
    if (req.method === "DELETE") {
      if (db.dbAvailable) {
        await ensureInternQuestsTable();
        await db.query("DELETE FROM intern_quests WHERE id = $1", [id]);
      } else {
        demoStore.internQuests = demoStore.internQuests.filter((item) => String(item.id) !== String(id));
      }
      sendJson(res, 200, { ok: true });
      return;
    }
    const body = await readBody(req);
    if (db.dbAvailable) {
      await ensureInternQuestsTable();
      const result = await db.query(
        `UPDATE intern_quests SET title = COALESCE($2, title), description = COALESCE($3, description),
         xp_points = COALESCE($4, xp_points), deadline = COALESCE($5, deadline), status = COALESCE($6, status), updated_at = now()
         WHERE id = $1 RETURNING *`,
        [id, body.title || null, body.description || null, body.xpPoints == null ? null : Number(body.xpPoints), body.deadline || null, body.status || null],
      );
      if (!result.rows[0]) {
        sendJson(res, 404, { error: "Quest not found" });
        return;
      }
      sendJson(res, 200, mapInternQuest(result.rows[0]));
      return;
    }
    const quest = demoStore.internQuests.find((item) => String(item.id) === String(id));
    if (!quest) {
      sendJson(res, 404, { error: "Quest not found" });
      return;
    }
    Object.assign(quest, body, { xpPoints: body.xpPoints == null ? quest.xpPoints : Number(body.xpPoints) });
    sendJson(res, 200, mapInternQuest(quest));
    return;
  }

  if (url.pathname === "/api/analytics/revenue" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "Admin access required" });
      return;
    }
    if (db.dbAvailable) {
      const [cases, tasks, users] = await Promise.all([
        db.query("SELECT * FROM cases"),
        db.query("SELECT * FROM tasks"),
        db.query("SELECT id FROM users"),
      ]);
      sendJson(res, 200, revenueAnalytics(cases.rows.map(mapCase), tasks.rows.map(mapTask), users.rows));
      return;
    }
    sendJson(res, 200, revenueAnalytics(demoStore.cases.map(dashboardCase), demoStore.tasks.map(dashboardTask), demoStore.users));
    return;
  }

  if (url.pathname === "/api/cases" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (isReviewUser(authUser)) {
      sendJson(res, 200, reviewSeedData(authUser).cases);
      return;
    }
    if (db.dbAvailable) {
      if (!authUser) {
        sendJson(res, 200, []);
        return;
      }
      const databaseUserId = await resolveDatabaseUserId(authUser);
      if (!canSeeAll(authUser) && !databaseUserId) {
        sendJson(res, 401, { error: "Your session has expired. Please log in again." });
        return;
      }
      const result = canSeeAll(authUser)
        ? await db.query("SELECT * FROM cases ORDER BY created_at DESC")
        : await db.query("SELECT * FROM cases WHERE user_id = $1 OR payload->>'assignedTo' = $1 ORDER BY created_at DESC", [databaseUserId]);
      sendJson(res, 200, result.rows.map(mapCase));
      return;
    }
    if (!authUser) {
      sendJson(res, 200, []);
      return;
    }
    const visibleCases = canSeeAll(authUser) || authUser.role === "intern"
      ? demoStore.cases
      : authUser.role === "advocate"
        ? demoStore.cases.filter((item) => item.assignedTo === authUser.id)
        : demoStore.cases.filter((item) => item.userId === authUser.id);
    sendJson(res, 200, visibleCases.map(dashboardCase));
    return;
  }

  if (url.pathname === "/api/cases" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    if (isReviewUser(authUser)) {
      const seed = reviewSeedData(authUser).cases[0];
      sendJson(res, 201, {
        ...seed,
        status: "Review saved",
        message: "Synthetic review case preview saved without touching production data.",
      });
      return;
    }
    const caseNumber = body.caseNo || body.case_number || body.caseNumber;
    const court = body.court || body.courtName;
    const missing = [];
    if (!court) missing.push("courtName");
    if (!caseNumber) missing.push("caseNumber");
    if (missing.length > 0) {
      sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const trackedCase = {
      id: `case-${Date.now()}`,
      userId: userIdForWrite(body, authUser),
      title: body.title || body.caseTitle || `${court} | ${caseNumber}`,
      status: body.status || "Active",
      nextDate: body.nextDate || "Sync pending",
      court,
      courtType: body.courtType || "district",
      stateCode: body.stateCode,
      caseNo: caseNumber,
      courtRoomNo: body.courtRoomNo || null,
      judgeName: body.judgeName || null,
      reminder: body.reminder || "24h before",
      stage: body.stage || "Court Sync pending",
      createdAt: new Date().toISOString(),
    };
    if (db.dbAvailable) {
      const databaseUserId = await resolveDatabaseUserId(authUser);
      if (!databaseUserId) {
        sendJson(res, 401, { error: "Your session has expired. Please log in again." });
        return;
      }
      const result = await db.query(
        `INSERT INTO cases (user_id, title, court, case_number, cnr, next_date, status, notes, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          databaseUserId,
          trackedCase.title,
          trackedCase.court,
          caseNumber,
          body.cnr || null,
          trackedCase.nextDate,
          trackedCase.status,
          body.notes || null,
          JSON.stringify({ ...body, user_id: databaseUserId, role: userRole(authUser), stateCode: body.stateCode, courtType: trackedCase.courtType, reminder: trackedCase.reminder, stage: trackedCase.stage }),
        ],
      );
      sendJson(res, 201, mapCase(result.rows[0]));
      return;
    }
    demoStore.cases.push(trackedCase);
    sendJson(res, 201, dashboardCase(trackedCase));
    return;
  }

  if (url.pathname.startsWith("/api/cases/") && req.method === "GET") {
    const authUser = getAuthUser(req);
    const id = url.pathname.split("/").pop();
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM cases WHERE id = $1", [id]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "Case not found" });
        return;
      }
      const mapped = mapCase(result.rows[0]);
      if (!authUser) {
        sendJson(res, 401, { error: "Login is required." });
        return;
      }
      const databaseUserId = await resolveDatabaseUserId(authUser);
      if (!canSeeAll(authUser) && mapped.userId !== databaseUserId && mapped.assignedTo !== databaseUserId) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      sendJson(res, 200, mapped);
      return;
    }
    const trackedCase = demoStore.cases.find((item) => item.id === id);
    if (!trackedCase) {
      sendJson(res, 404, { error: "Case not found" });
      return;
    }
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    if (!canSeeAll(authUser) && trackedCase.userId !== authUser.id && trackedCase.assignedTo !== authUser.id) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }
    sendJson(res, 200, dashboardCase(trackedCase));
    return;
  }

  if (url.pathname.startsWith("/api/cases/") && ["PUT", "DELETE"].includes(req.method)) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const id = url.pathname.split("/").pop();

    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM cases WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        sendJson(res, 404, { error: "Case not found" });
        return;
      }
      const current = mapCase(existing.rows[0]);
      const databaseUserId = await resolveDatabaseUserId(authUser);
      if (!canSeeAll(authUser) && current.userId !== databaseUserId && current.assignedTo !== databaseUserId) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      if (req.method === "DELETE") {
        await db.query("DELETE FROM cases WHERE id = $1", [id]);
        sendJson(res, 204, {});
        return;
      }

      const body = await readBody(req);
      const next = {
        ...current,
        ...body,
        title: body.title ?? body.caseTitle ?? current.caseTitle,
        court: body.court ?? body.courtName ?? current.courtName,
        caseNumber: body.caseNumber ?? body.caseNo ?? body.case_number ?? current.caseNumber,
        nextDate: body.nextDate ?? current.nextDate,
        status: body.status ?? current.status,
      };
      const result = await db.query(
        `UPDATE cases
         SET title = $2, court = $3, case_number = $4, next_date = $5, status = $6, notes = $7, payload = $8, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, next.title, next.court, next.caseNumber, next.nextDate, next.status, body.notes ?? current.notes ?? null, JSON.stringify({ ...next, user_id: current.userId })],
      );
      sendJson(res, 200, mapCase(result.rows[0]));
      return;
    }

    const index = demoStore.cases.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Case not found" });
      return;
    }
    const trackedCase = demoStore.cases[index];
    if (!canSeeAll(authUser) && trackedCase.userId !== authUser.id && trackedCase.assignedTo !== authUser.id) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }
    if (req.method === "DELETE") {
      demoStore.cases.splice(index, 1);
      sendJson(res, 204, {});
      return;
    }
    const body = await readBody(req);
    Object.assign(trackedCase, body, {
      title: body.title ?? body.caseTitle ?? trackedCase.title,
      court: body.court ?? body.courtName ?? trackedCase.court,
      caseNo: body.caseNo ?? body.caseNumber ?? body.case_number ?? trackedCase.caseNo,
      nextDate: body.nextDate ?? trackedCase.nextDate,
      status: body.status ?? trackedCase.status,
      updatedAt: new Date().toISOString(),
    });
    sendJson(res, 200, dashboardCase(trackedCase));
    return;
  }

  if (url.pathname === "/api/case-updates" && req.method === "GET") {
    const update = {
      type: "caseUpdate",
      message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.",
      caseId: "case-demo-1",
      nextDate: "2026-07-04",
      source: "Court update sample stream - connect permitted official court sync before production use",
    };
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": res.localsCorsOrigin || config.allowedOrigin,
      "Vary": "Origin",
    });
    res.write(`event: caseUpdate\n`);
    res.write(`data: ${JSON.stringify(update)}\n\n`);
    res.end();
    return;
  }

  if (url.pathname === "/api/notify/test" && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const body = await readBody(req);
    const title = body.title || "Legal Connect reminder";
    const message = body.message || "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.";
    const recipient = body.to || body.email || authUser?.email || null;
    const provider = emailProviderStatus();
    if (provider.provider !== "resend" || provider.status !== "ready") {
      const demoMessage = "In-app fallback notification queued because Resend is not configured.";
      await createNotification("notify_test", title, message, { mode: "demo", channels: ["in-app"] }, authUser.id || null);
      await writeAuditLog(authUser, "notification_test_demo_queued", "notification", "notify-test", demoMessage, { recipient, provider: emailAdminStatus() });
      sendJson(res, 202, {
        ok: true,
        mode: "demo",
        status: "queued",
        message: demoMessage,
      });
      return;
    }
    const emailResult = await sendEmail({
      to: recipient,
      subject: title,
      text: message,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2 style="color:#0f2a25">Legal Connect</h2><p>${escapeHtml(message)}</p><p><a href="${escapeHtml(config.publicAppUrl)}" style="color:#b8872b">Open Legal Connect dashboard</a></p><p style="color:#64748b;font-size:12px">This is a Legal Connect notification test.</p></div>`,
    });
    if (emailResult.sent) {
      await createNotification("notify_test", title, message, { mode: "resend", status: "sent", providerMessageId: emailResult.id }, authUser.id || null);
      await writeAuditLog(authUser, "notification_test_resend_sent", "notification", emailResult.id || "resend-email", "Notification test sent through Resend.", { recipient, providerMessageId: emailResult.id || null });
      sendJson(res, 202, {
        ok: true,
        mode: "resend",
        status: "sent",
        provider_message_id: emailResult.id || null,
      });
      return;
    }
    const errorMessage = safeEmailError(emailResult);
    await createNotification("notify_test_failed", title, `Resend email failed: ${errorMessage}`, { mode: "resend", status: "failed" }, authUser.id || null);
    await writeAuditLog(authUser, "notification_test_resend_failed", "notification", "resend-email", `Resend email failed: ${errorMessage}`, { recipient, status: emailResult.status || null });
    sendJson(res, 200, {
      ok: false,
      mode: "resend",
      status: "failed",
      error_message: errorMessage,
    });
    return;
  }

  if (url.pathname === "/api/notifications" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (isReviewUser(authUser)) {
      sendJson(res, 200, reviewSeedData(authUser).notifications);
      return;
    }
    if (db.dbAvailable) {
      const result = canSeeAll(authUser)
        ? await db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
        : authUser
          ? await db.query("SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50", [authUser.id])
          : await db.query("SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC LIMIT 50");
      sendJson(res, 200, result.rows.map(mapNotification));
      return;
    }
    sendJson(res, 200, authUser ? demoStore.notifications.filter((item) => !item.userId || item.userId === authUser.id) : demoStore.notifications.filter((item) => !item.userId));
    return;
  }

  if (url.pathname === "/api/notifications/mark-read" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    const body = await readBody(req);
    if (db.dbAvailable) {
      if (canSeeAll(authUser)) {
        await db.query("UPDATE notifications SET read_at = now() WHERE id = $1", [body.id]);
      } else {
        await db.query("UPDATE notifications SET read_at = now() WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)", [body.id, authUser.id]);
      }
    } else {
      const item = demoStore.notifications.find((notification) => notification.id === body.id && (canSeeAll(authUser) || !notification.userId || notification.userId === authUser.id));
      if (item) item.readAt = new Date().toISOString();
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/receipts" && req.method === "GET") {
    const authUser = getAuthUser(req);
    const limit = Math.min(Number(url.searchParams.get("limit") || 60), 100);
    if (!authUser) {
      sendJson(res, 200, []);
      return;
    }
    if (isReviewUser(authUser)) {
      sendJson(res, 200, reviewSeedData(authUser).receipts.slice(0, limit));
      return;
    }
    if (db.dbAvailable) {
      const result = canSeeAll(authUser)
        ? await db.query("SELECT * FROM receipts ORDER BY created_at DESC LIMIT $1", [limit])
        : await db.query(
          `SELECT * FROM receipts
           WHERE user_id = $1 OR actor_id = $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [authUser.id, limit],
        );
      sendJson(res, 200, result.rows.map(mapReceipt));
      return;
    }
    const receipts = canSeeAll(authUser)
      ? demoStore.receipts
      : demoStore.receipts.filter((receipt) => receipt.userId === authUser.id || receipt.actorId === authUser.id);
    sendJson(res, 200, receipts.slice(0, limit));
    return;
  }

  if (url.pathname === "/api/case-updates" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const message = body.message || body.decision || "Case diary decision saved.";
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO case_updates (case_id, update_type, message, payload)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [body.caseId || body.case_id || null, body.updateType || body.update_type || "calendar_decision", message, JSON.stringify({ ...body, user_id: authUser?.id || null })],
      );
      await createNotification("clash_warning", "Calendar decision saved", message, { caseUpdateId: result.rows[0].id }, authUser?.id || null);
      await createReceipt({
        userId: authUser?.id || null,
        actor: authUser || { role: "system" },
        receiptType: "case_update",
        title: "Case calendar receipt",
        message,
        status: "saved",
        targetType: "case_update",
        targetId: result.rows[0].id,
        visibility: "team",
        payload: { caseId: body.caseId || body.case_id || null, updateType: body.updateType || body.update_type || "calendar_decision" },
      });
      sendJson(res, 201, result.rows[0]);
      return;
    }
    const update = { id: `case-update-${Date.now()}`, message, createdAt: new Date().toISOString(), ...body };
    demoStore.caseUpdates = demoStore.caseUpdates || [];
    demoStore.caseUpdates.unshift(update);
    await createNotification("clash_warning", "Calendar decision saved", message, update, authUser?.id || null);
    await createReceipt({
      userId: authUser?.id || null,
      actor: authUser || { role: "system" },
      receiptType: "case_update",
      title: "Case calendar receipt",
      message,
      status: "saved",
      targetType: "case_update",
      targetId: update.id,
      visibility: "team",
      payload: { caseId: body.caseId || body.case_id || null, updateType: body.updateType || body.update_type || "calendar_decision" },
    });
    sendJson(res, 201, update);
    return;
  }

  if (url.pathname === "/api/admin/summary" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "RNA/Admin access required" });
      return;
    }
    if (db.dbAvailable) {
      const [users, bookings, tasks, cases, lawbot, sos, recentBookings] = await Promise.all([
        db.query("SELECT role, count(*)::int AS count FROM users GROUP BY role"),
        db.query("SELECT payment_status, count(*)::int AS count FROM bookings GROUP BY payment_status"),
        db.query("SELECT status, escrow_status, count(*)::int AS count FROM tasks GROUP BY status, escrow_status"),
        db.query("SELECT id, title, court, next_date, status FROM cases ORDER BY created_at DESC LIMIT 8"),
        db.query("SELECT question, created_at FROM lawbot_chats ORDER BY created_at DESC LIMIT 8"),
        db.query("SELECT service_type, urgency, status, created_at FROM sos_requests ORDER BY created_at DESC LIMIT 8"),
        db.query("SELECT id, service_type, amount, payment_status, work_hold_status, razorpay_order_id, razorpay_payment_id, failure_reason, verified_at, created_at FROM bookings ORDER BY created_at DESC LIMIT 8"),
      ]);
      sendJson(res, 200, {
        users: users.rows,
        bookings: bookings.rows,
        tasks: tasks.rows,
        recentCases: cases.rows,
        recentBookings: recentBookings.rows,
        recentLawbotQuestions: lawbot.rows,
        sosRequests: sos.rows,
      });
      return;
    }
    sendJson(res, 200, {
      users: Object.values(demoStore.users.reduce((acc, user) => {
        acc[user.role] = acc[user.role] || { role: user.role, count: 0 };
        acc[user.role].count += 1;
        return acc;
      }, {})),
      bookings: [{ payment_status: "Pending", count: demoStore.bookings.length }],
      tasks: [{ status: "Open", escrow_status: "Not locked", count: demoStore.tasks.length }],
      recentCases: demoStore.cases.slice(0, 8),
      recentBookings: demoStore.bookings.slice(0, 8),
      recentLawbotQuestions: [],
      sosRequests: demoStore.sosRequests || [],
    });
    return;
  }

  if (url.pathname === "/api/admin/task-action" && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const body = await readBody(req);
    const statusMap = {
      approve_task: "Approved",
      assign_lawyer: "Assigned",
      assign_intern: "Assigned",
      mark_payment_locked: "Payment locked",
      mark_proof_approved: "Proof approved",
      release_payment: "Payment released",
      refund: "Refunded",
      close_task: "Closed",
    };
    const nextStatus = body.status || statusMap[body.action] || "Updated";
    if (db.dbAvailable && body.taskId) {
      const result = await db.query(
        "UPDATE tasks SET status = $2, escrow_status = COALESCE($3, escrow_status), updated_at = now() WHERE id = $1 RETURNING *",
        [body.taskId, nextStatus, body.paymentLockStatus || body.payment_lock_status || null],
      );
      await writeAuditLog(authUser, body.action || "task_action", "task", body.taskId, `Task action saved: ${nextStatus}`, { action: body.action, status: nextStatus });
      await createReceipt({
        userId: authUser?.id || null,
        actor: authUser,
        receiptType: "admin_task_action",
        title: "RNA/Admin action receipt",
        message: `Task action saved: ${nextStatus}`,
        status: nextStatus,
        targetType: "task",
        targetId: body.taskId,
        visibility: "team",
        payload: { action: body.action, paymentLockStatus: body.paymentLockStatus || body.payment_lock_status || null },
      });
      sendJson(res, 200, { ok: true, task: result.rows[0] ? mapTask(result.rows[0]) : null });
      return;
    }
    await writeAuditLog(authUser, body.action || "task_action", "task", body.taskId || "demo-task", `Task action saved: ${nextStatus}`, { action: body.action, status: nextStatus });
    await createReceipt({
      userId: authUser?.id || null,
      actor: authUser,
      receiptType: "admin_task_action",
      title: "RNA/Admin action receipt",
      message: `Task action saved: ${nextStatus}`,
      status: nextStatus,
      targetType: "task",
      targetId: body.taskId || "demo-task",
      visibility: "team",
      payload: { action: body.action, paymentLockStatus: body.paymentLockStatus || body.payment_lock_status || null },
    });
    sendJson(res, 200, { ok: true, action: body.action, status: nextStatus });
    return;
  }

  if (url.pathname === "/api/admin/audit-logs" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 80");
      sendJson(res, 200, result.rows.map(mapAuditLog));
      return;
    }
    sendJson(res, 200, demoStore.auditLogs.slice(0, 80));
    return;
  }

  if (url.pathname === "/api/admin/deletion-requests" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    if (db.dbAvailable) {
      const result = await db.query(
        `SELECT adr.*, users.name AS user_name, users.role AS user_role, users.email AS user_email, users.phone AS user_phone
         FROM account_deletion_requests adr
         LEFT JOIN users ON users.id = adr.user_id
         ORDER BY adr.requested_at DESC
         LIMIT 80`,
      );
      sendJson(res, 200, result.rows.map(mapDeletionRequest));
      return;
    }
    const usersById = new Map(demoStore.users.map((user) => [user.id, user]));
    sendJson(res, 200, demoStore.deletionRequests.slice(0, 80).map((request) => {
      const user = usersById.get(request.userId) || {};
      return {
        ...request,
        userName: user.name,
        userRole: user.role,
        emailMasked: maskEmail(user.email),
        phoneMasked: maskPhone(user.phone),
      };
    }));
    return;
  }

  if (url.pathname === "/api/admin/legal-sources" && req.method === "GET") {
    if (!sourceAdminUser(req, res)) return;
    if (db.dbAvailable) {
      const result = await db.query("SELECT * FROM legal_sources ORDER BY created_at DESC");
      sendJson(res, 200, result.rows.map(mapLegalSource));
      return;
    }
    sendJson(res, 200, demoStore.legalSources.map((source) => ({
      id: source.id,
      sourceType: source.source_type,
      sourceName: source.source_name,
      title: source.title,
      court: source.court,
      actName: source.act_name,
      sectionNo: source.section_no,
      citation: source.citation,
      sourceUrl: source.source_url,
      publishedDate: source.published_date,
      status: source.status,
      textContent: source.text_content,
      uploadedBy: source.uploaded_by,
      createdAt: source.created_at,
      updatedAt: source.updated_at,
    })));
    return;
  }

  if (url.pathname === "/api/admin/legal-sources" && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const body = await readBody(req);
    const source = legalSourcePayload(body, authUser);
    if (!source.text_content && !source.source_url) {
      sendJson(res, 400, { error: "Add source text or URL metadata before saving." });
      return;
    }
    const created = await createLegalSourceRecord(source);
    await writeAuditLog(authUser, "source_created", "legal_source", created.id, `Pending legal source created: ${created.title}`, { title: created.title, sourceType: created.sourceType });
    sendJson(res, 201, created);
    return;
  }

  if (url.pathname === "/api/admin/legal-sources/pdf" && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const body = await readBody(req);
    const baseTitle = body.title || body.fileName || "Uploaded legal PDF";
    const extractedText = body.textContent || body.text || extractPdfTextFromBase64(body.pdfBase64 || body.fileBase64 || "");
    if (!extractedText || extractedText.split(/\s+/).length < 12) {
      sendJson(res, 422, {
        error: "Could not extract readable text from this PDF. Upload a text-based PDF, run OCR first, or paste the extracted text.",
        mode: "best-effort-pdf-text-extraction",
      });
      return;
    }
    const sections = splitSectionsFromText(extractedText, baseTitle);
    const createdSources = [];
    for (const section of sections) {
      const source = legalSourcePayload({
        ...body,
        title: section.title || baseTitle,
        sectionNo: section.sectionNo,
        textContent: section.text,
        status: "pending",
      }, authUser);
      createdSources.push(await createLegalSourceRecord(source));
    }
    await writeAuditLog(authUser, "pdf_ingested", "legal_source", createdSources.map((source) => source.id).join(","), `${createdSources.length} pending source(s) created from PDF upload`, {
      fileName: body.fileName || null,
      sourceName: body.sourceName || body.source_name || null,
      sections: createdSources.length,
      sourceUrl: body.sourceUrl || body.source_url || null,
    });
    sendJson(res, 201, {
      ok: true,
      extractedWords: extractedText.split(/\s+/).length,
      sourcesCreated: createdSources.length,
      sources: createdSources,
      next: "Approve the pending sources, then run chunk/index before LawBot can use them.",
    });
    return;
  }

  const legalSourceRoute = url.pathname.match(/^\/api\/admin\/legal-sources\/([^/]+)(?:\/(approve|reject|chunk))?$/);
  if (legalSourceRoute) {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const [, sourceId, action] = legalSourceRoute;

    if (!action && req.method === "GET") {
      if (db.dbAvailable) {
        const result = await db.query("SELECT * FROM legal_sources WHERE id = $1", [sourceId]);
        if (!result.rows[0]) {
          sendJson(res, 404, { error: "Source not found" });
          return;
        }
        sendJson(res, 200, mapLegalSource(result.rows[0]));
        return;
      }
      const source = demoStore.legalSources.find((item) => item.id === sourceId);
      if (!source) {
        sendJson(res, 404, { error: "Source not found" });
        return;
      }
      sendJson(res, 200, source);
      return;
    }

    if (!action && req.method === "DELETE") {
      if (db.dbAvailable) {
        await db.query("DELETE FROM legal_chunks WHERE source_id = $1", [sourceId]);
        await db.query("DELETE FROM legal_sources WHERE id = $1", [sourceId]);
      } else {
        demoStore.legalChunks = demoStore.legalChunks.filter((chunk) => chunk.sourceId !== sourceId);
        demoStore.legalSources = demoStore.legalSources.filter((source) => source.id !== sourceId);
      }
      await writeAuditLog(authUser, "source_deleted", "legal_source", sourceId, "Legal source deleted with its chunks", {});
      sendJson(res, 200, { ok: true });
      return;
    }

    if (action === "approve" && req.method === "POST") {
      if (db.dbAvailable) {
        const result = await db.query("UPDATE legal_sources SET status = 'approved', updated_at = now() WHERE id = $1 RETURNING *", [sourceId]);
        if (!result.rows[0]) {
          sendJson(res, 404, { error: "Source not found" });
          return;
        }
        const mapped = mapLegalSource(result.rows[0]);
        await writeAuditLog(authUser, "source_approved", "legal_source", sourceId, `Legal source approved: ${mapped.title}`, { title: mapped.title });
        sendJson(res, 200, mapped);
        return;
      }
      const source = demoStore.legalSources.find((item) => item.id === sourceId);
      if (!source) {
        sendJson(res, 404, { error: "Source not found" });
        return;
      }
      source.status = "approved";
      source.updated_at = new Date().toISOString();
      await writeAuditLog(authUser, "source_approved", "legal_source", sourceId, `Legal source approved: ${source.title}`, { title: source.title });
      sendJson(res, 200, source);
      return;
    }

    if (action === "reject" && req.method === "POST") {
      if (db.dbAvailable) {
        const result = await db.query("UPDATE legal_sources SET status = 'rejected', updated_at = now() WHERE id = $1 RETURNING *", [sourceId]);
        if (!result.rows[0]) {
          sendJson(res, 404, { error: "Source not found" });
          return;
        }
        const mapped = mapLegalSource(result.rows[0]);
        await writeAuditLog(authUser, "source_rejected", "legal_source", sourceId, `Legal source rejected: ${mapped.title}`, { title: mapped.title });
        sendJson(res, 200, mapped);
        return;
      }
      const source = demoStore.legalSources.find((item) => item.id === sourceId);
      if (!source) {
        sendJson(res, 404, { error: "Source not found" });
        return;
      }
      source.status = "rejected";
      source.updated_at = new Date().toISOString();
      await writeAuditLog(authUser, "source_rejected", "legal_source", sourceId, `Legal source rejected: ${source.title}`, { title: source.title });
      sendJson(res, 200, source);
      return;
    }

    if (action === "chunk" && req.method === "POST") {
      const result = await chunkLegalSource(sourceId);
      if (result.error) {
        sendJson(res, result.status || 400, { error: result.error });
        return;
      }
      await writeAuditLog(authUser, "source_chunked", "legal_source", sourceId, `Legal source indexed into ${result.chunks} chunk(s)`, { chunks: result.chunks });
      sendJson(res, 200, result);
      return;
    }
  }

  if (url.pathname === "/api/payments/create-order" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const amount = Number(body.amount || 0);
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
    const paymentStatus = paymentConfigStatus();
    if (!amount || amount <= 0) {
      sendJson(res, 400, { ok: false, error: "Valid amount is required." });
      return;
    }
    if (isReviewUser(authUser)) {
      await writeAuditLog(authUser, "google_play_review_payment_inspected", "payment", body.bookingId || "review-payment", "Google Play reviewer inspected payment flow without charge.", {
        amount,
        dataMode: "synthetic",
      });
      sendJson(res, 200, {
        ok: true,
        success: true,
        mode: "google-play-review",
        provider: "review",
        status: "review_only",
        payment_status: "review-inspection",
        work_hold_status: "not-applicable-review",
        amount: amount * 100,
        currency: "INR",
        receipt: body.receiptNo || body.receipt_no || "LC-REVIEW-0001",
        message: "Google Play review account can inspect this receipt without a Razorpay charge.",
      });
      return;
    }
    if (!hasRazorpay) {
      sendJson(res, 503, {
        ok: false,
        success: false,
        mode: "demo",
        status: "not_configured",
        error_message: "Razorpay is not configured.",
      });
      return;
    }
    if (hasRazorpay) {
      const orderResult = await createRazorpayOrder({
        amount,
        currency: "INR",
        receipt: body.receiptNo || body.receipt_no || body.bookingId || `LC-${Date.now()}`,
        notes: {
          booking_id: body.bookingId || body.booking_id || "",
          service_type: body.serviceType || body.service_type || "Legal Connect booking",
        },
      });
      if (!orderResult.ok) {
        await writeAuditLog(authUser || { role: "system" }, "payment_order_failed", "payment", body.bookingId || "razorpay-order", orderResult.error_message, { amount });
        sendJson(res, 502, { ok: false, success: false, mode: paymentStatus.mode, status: "failed", error_message: orderResult.error_message });
        return;
      }
      if (db.dbAvailable && (body.bookingId || body.booking_id)) {
        await db.query(
          `UPDATE bookings
           SET razorpay_order_id = $2, payment_status = 'order_created', work_hold_status = COALESCE(work_hold_status, 'pending'), payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
           WHERE id = $1`,
          [body.bookingId || body.booking_id, orderResult.order.id, JSON.stringify({ razorpay_order_id: orderResult.order.id })],
        );
      }
      await recordPaymentEvent({
        userId: authUser?.id || null,
        bookingId: body.bookingId || body.booking_id || null,
        amount,
        currency: orderResult.order.currency || "INR",
        providerOrderId: orderResult.order.id,
        status: "order_created",
        workHoldStatus: "pending",
        payload: { receipt: orderResult.order.receipt || null, serviceType: body.serviceType || body.service_type || null },
      });
      await writeAuditLog(authUser || { role: "system" }, "payment_order_created", "payment", orderResult.order.id, "Razorpay order created.", { amount, bookingId: body.bookingId || body.booking_id || null });
      await createReceipt({
        userId: authUser?.id || null,
        actor: authUser || { role: "system" },
        receiptType: "payment_order",
        title: "Payment order receipt",
        message: `Razorpay order created for Rs. ${amount}. Work Completion Hold is still pending.`,
        status: "order_created",
        amount,
        targetType: "booking",
        targetId: body.bookingId || body.booking_id || orderResult.order.id,
        visibility: "private",
        payload: { razorpayOrderId: orderResult.order.id, workHoldStatus: "pending" },
      });
      sendJson(res, 200, {
        ok: true,
        success: true,
        mode: paymentStatus.mode,
        provider: "razorpay",
        order: orderResult.order,
        keyId: config.razorpayKeyId,
        key_id: config.razorpayKeyId,
        order_id: orderResult.order.id,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency || "INR",
        receipt: orderResult.order.receipt || body.receiptNo || body.receipt_no || body.bookingId || null,
        warning: paymentStatus.warning,
        public_url: config.publicAppUrl,
      });
      return;
    }
  }

  if (url.pathname === "/api/payments/verify" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const orderId = body.order_id || body.razorpay_order_id;
    const paymentId = body.payment_id || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;
    const bookingId = body.bookingId || body.booking_id;
    if (isReviewUser(authUser)) {
      sendJson(res, 200, { ok: true, mode: "google-play-review", status: "review_only", payment_status: "review-inspection", work_hold_status: "not-applicable-review" });
      return;
    }
    if (!config.razorpayKeySecret) {
      sendJson(res, 200, { ok: true, mode: "demo", status: "queued", payment_status: "verification_pending", work_hold_status: "pending" });
      return;
    }
    const valid = verifyRazorpayPaymentSignature(orderId, paymentId, signature);
    if (valid) {
      if (db.dbAvailable && bookingId) {
        await db.query(
          `UPDATE bookings
           SET payment_status = 'paid', work_hold_status = 'active', razorpay_order_id = $2, razorpay_payment_id = $3, failure_reason = NULL,
               verified_at = now(),
               payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb
           WHERE id = $1`,
          [bookingId, orderId, paymentId, JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, work_hold_status: "active", verified_at: new Date().toISOString() })],
        );
      } else if (bookingId) {
        const booking = demoStore.bookings.find((item) => item.id === bookingId);
        if (booking) Object.assign(booking, { paymentStatus: "paid", workHoldStatus: "active", razorpayOrderId: orderId, razorpayPaymentId: paymentId, verifiedAt: new Date().toISOString() });
      }
      await writeAuditLog(authUser || { role: "system" }, "payment_verified", "booking", bookingId || orderId, "Payment verified. Work Completion Hold activated.", { orderId, paymentId });
      await recordPaymentEvent({
        userId: authUser?.id || null,
        bookingId: bookingId || null,
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        status: "paid",
        workHoldStatus: "active",
        payload: { verifiedAt: new Date().toISOString() },
      });
      await createNotification("payment_verified", "Payment verified", "Payment verified. Work Completion Hold is active.", { bookingId, orderId, paymentId }, authUser?.id || null);
      await createReceipt({
        userId: authUser?.id || null,
        actor: authUser || { role: "system" },
        receiptType: "payment_verified",
        title: "Verified payment receipt",
        message: "Payment verified by backend. Work Completion Hold is active.",
        status: "paid",
        targetType: "booking",
        targetId: bookingId || orderId,
        visibility: "private",
        payload: { orderId, paymentId, workHoldStatus: "active" },
      });
      sendJson(res, 200, { ok: true, mode: "razorpay", status: "verified", payment_status: "paid", work_hold_status: "active" });
      return;
    }
    if (db.dbAvailable && bookingId) {
      await db.query(
        `UPDATE bookings
         SET payment_status = 'verification_failed', work_hold_status = 'pending', failure_reason = $2,
             payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
         WHERE id = $1`,
        [bookingId, "Invalid Razorpay signature", JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, payment_verification_failed: true })],
      );
    }
    await writeAuditLog(authUser || { role: "system" }, "payment_verification_failed", "booking", bookingId || orderId, "Payment verification failed.", { orderId, paymentId });
    await recordPaymentEvent({
      userId: authUser?.id || null,
      bookingId: bookingId || null,
      providerOrderId: orderId,
      providerPaymentId: paymentId,
      status: "verification_failed",
      workHoldStatus: "pending",
      failureReason: "Invalid Razorpay signature",
      payload: { verificationFailedAt: new Date().toISOString() },
    });
    await createReceipt({
      userId: authUser?.id || null,
      actor: authUser || { role: "system" },
      receiptType: "payment_failed",
      title: "Payment verification failed receipt",
      message: "Payment verification failed. Work Completion Hold remains pending.",
      status: "verification_failed",
      targetType: "booking",
      targetId: bookingId || orderId,
      visibility: "private",
      payload: { orderId, paymentId, workHoldStatus: "pending" },
    });
    sendJson(res, 400, { ok: false, mode: "razorpay", status: "failed", payment_status: "verification_failed", work_hold_status: "pending", error_message: "Payment verification failed. Please contact support." });
    return;
  }

  if (url.pathname === "/api/payments/webhook" && req.method === "POST") {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-razorpay-signature"];
    if (config.razorpayWebhookSecret && !verifyRazorpayWebhookSignature(rawBody, signature)) {
      await writeAuditLog({ role: "system" }, "payment_webhook_invalid_signature", "payment", "razorpay-webhook", "Invalid Razorpay webhook signature.", {});
      sendJson(res, 400, { ok: false, error: "Invalid webhook signature." });
      return;
    }
    let body = {};
    try {
      body = JSON.parse(rawBody.toString("utf8") || "{}");
    } catch {
      sendJson(res, 400, { ok: false, error: "Invalid webhook body." });
      return;
    }
    const event = body.event || "demo.event";
    const payment = body.payload?.payment?.entity || {};
    const order = body.payload?.order?.entity || {};
    const orderId = payment.order_id || order.id || null;
    const paymentId = payment.id || null;
    if (db.dbAvailable && orderId && ["payment.captured", "order.paid"].includes(event)) {
      await db.query(
        `UPDATE bookings
         SET payment_status = 'paid', work_hold_status = 'active', razorpay_payment_id = COALESCE($2, razorpay_payment_id),
             verified_at = COALESCE(verified_at, now()),
             payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
         WHERE razorpay_order_id = $1 AND COALESCE(payment_status, '') <> 'paid'`,
        [orderId, paymentId, JSON.stringify({ webhook_event: event, razorpay_payment_id: paymentId })],
      );
      await recordPaymentEvent({
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount: payment.amount ? Number(payment.amount) / 100 : null,
        currency: payment.currency || "INR",
        status: "paid",
        workHoldStatus: "active",
        payload: { webhookEvent: event },
      });
    }
    if (db.dbAvailable && orderId && event === "payment.failed") {
      await db.query(
        `UPDATE bookings
         SET payment_status = 'failed', work_hold_status = 'pending', failure_reason = $2,
             payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
         WHERE razorpay_order_id = $1 AND COALESCE(payment_status, '') <> 'paid'`,
        [orderId, payment.error_description || "Payment failed", JSON.stringify({ webhook_event: event })],
      );
      await recordPaymentEvent({
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        amount: payment.amount ? Number(payment.amount) / 100 : null,
        currency: payment.currency || "INR",
        status: "failed",
        workHoldStatus: "pending",
        failureReason: payment.error_description || "Payment failed",
        payload: { webhookEvent: event },
      });
    }
    await writeAuditLog({ role: "system" }, "payment_webhook_received", "payment", orderId || "razorpay-webhook", `Razorpay webhook received: ${event}`, { event, paymentId });
    sendJson(res, 200, { ok: true, received: true, mode: config.razorpayWebhookSecret ? "razorpay" : "demo", event });
    return;
  }

  if (url.pathname.startsWith("/api/cases/") && url.pathname.endsWith("/complete") && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const id = url.pathname.split("/")[3];
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM cases WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        sendJson(res, 404, { error: "Case not found" });
        return;
      }
      const currentCase = mapCase(existing.rows[0]);
      if (!canSeeAll(authUser) && currentCase.userId !== authUser.id) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      const result = await db.query("UPDATE cases SET status = $2, updated_at = now() WHERE id = $1 RETURNING *", [id, "Completed"]);
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "Case not found" });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        case: mapCase(result.rows[0]),
        message: "Diary entry completed after proof approval and Work Completion Hold release.",
      });
      return;
    }
    if (!canSeeAll(authUser)) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }
    const trackedCase = demoStore.cases.find((item) => item.id === id);
    if (!trackedCase) {
      sendJson(res, 404, { error: "Case not found" });
      return;
    }
    trackedCase.status = "Completed";
    trackedCase.completedAt = new Date().toISOString();
    sendJson(res, 200, {
      ok: true,
      case: trackedCase,
      message: "Diary entry completed after proof approval and Work Completion Hold release.",
    });
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (isReviewUser(authUser)) {
      sendJson(res, 200, reviewSeedData(authUser).tasks);
      return;
    }
    if (db.dbAvailable) {
      if (!authUser) {
        sendJson(res, 200, []);
        return;
      }
      const result = canSeeAll(authUser)
        ? await db.query("SELECT * FROM tasks ORDER BY created_at DESC")
        : authUser.role === "intern"
          ? await db.query("SELECT * FROM tasks WHERE status = 'Open' OR accepted_by = $1 OR payload->>'assignedIntern' = $1 ORDER BY created_at DESC", [authUser.id])
          : await db.query("SELECT * FROM tasks WHERE posted_by = $1 OR accepted_by = $1 OR payload->>'user_id' = $1 ORDER BY created_at DESC", [authUser.id]);
      sendJson(res, 200, result.rows.map(mapTask));
      return;
    }
    if (!authUser) {
      sendJson(res, 200, []);
      return;
    }
    const visibleTasks = canSeeAll(authUser)
      ? demoStore.tasks
      : authUser.role === "intern"
        ? demoStore.tasks.filter((item) => item.status === "Open" || item.acceptedBy === authUser.id || item.assignedIntern === authUser.id)
        : demoStore.tasks.filter((item) => item.postedBy === authUser.id || item.acceptedBy === authUser.id || item.status === "Open");
    sendJson(res, 200, visibleTasks.map(dashboardTask));
    return;
  }

  if (url.pathname.endsWith("/accept") && url.pathname.startsWith("/api/tasks/") && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const id = url.pathname.split("/").at(-2);
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        sendJson(res, 404, { error: "Task not found" });
        return;
      }
      const current = mapTask(existing.rows[0]);
      if (current.status !== "Open" && current.acceptedBy !== authUser.id) {
        sendJson(res, 409, { error: "This task is no longer available." });
        return;
      }
      const result = await db.query(
        "UPDATE tasks SET status = $2, accepted_by = $3, updated_at = now() WHERE id = $1 RETURNING *",
        [id, "Accepted", authUser.id],
      );
      sendJson(res, 200, mapTask(result.rows[0]));
      return;
    }
    const task = demoStore.tasks.find((item) => item.id === id);
    if (!task) {
      sendJson(res, 404, { error: "Task not found" });
      return;
    }
    if (task.status !== "Open" && task.acceptedBy !== authUser.id) {
      sendJson(res, 409, { error: "This task is no longer available." });
      return;
    }
    Object.assign(task, { status: "Accepted", acceptedBy: authUser.id, assignedToId: authUser.id, updatedAt: new Date().toISOString() });
    sendJson(res, 200, dashboardTask(task));
    return;
  }

  if (url.pathname.startsWith("/api/tasks/") && ["GET", "PUT", "DELETE"].includes(req.method)) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const id = url.pathname.split("/").pop();
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        sendJson(res, 404, { error: "Task not found" });
        return;
      }
      const current = mapTask(existing.rows[0]);
      if (req.method === "GET") {
        sendJson(res, 200, current);
        return;
      }
      if (!canSeeAll(authUser) && current.postedBy !== authUser.id) {
        sendJson(res, 403, { error: "Only the task owner or an admin can change this task." });
        return;
      }
      if (req.method === "DELETE") {
        await db.query("DELETE FROM tasks WHERE id = $1", [id]);
        sendJson(res, 204, {});
        return;
      }
      const body = await readBody(req);
      const next = {
        ...current,
        ...body,
        title: body.title ?? body.taskDescription ?? current.taskDescription,
        court: body.court ?? body.location ?? current.location,
        taskType: body.taskType ?? body.task_type ?? current.taskType,
        amount: numericAmount(body.amount ?? body.fee, numericAmount(current.amount ?? current.fee)),
        status: body.status ?? current.status,
        acceptedBy: body.acceptedBy ?? body.accepted_by ?? body.assignedToId ?? current.acceptedBy,
      };
      const result = await db.query(
        `UPDATE tasks
         SET title = $2, court = $3, task_type = $4, amount = $5, escrow_status = $6, status = $7, accepted_by = $8, proof_url = $9, payload = $10, updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, next.title, next.court, next.taskType, next.amount, next.escrowStatus || "Not locked", next.status, next.acceptedBy || null, next.proofUrl || null, JSON.stringify({ ...next, user_id: current.postedBy })],
      );
      sendJson(res, 200, mapTask(result.rows[0]));
      return;
    }

    const index = demoStore.tasks.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Task not found" });
      return;
    }
    const task = demoStore.tasks[index];
    if (req.method === "GET") {
      sendJson(res, 200, dashboardTask(task));
      return;
    }
    if (!canSeeAll(authUser) && task.postedBy !== authUser.id) {
      sendJson(res, 403, { error: "Only the task owner or an admin can change this task." });
      return;
    }
    if (req.method === "DELETE") {
      demoStore.tasks.splice(index, 1);
      sendJson(res, 204, {});
      return;
    }
    const body = await readBody(req);
    Object.assign(task, body, {
      title: body.title ?? body.taskDescription ?? task.title,
      court: body.court ?? body.location ?? task.court,
      taskType: body.taskType ?? body.task_type ?? task.taskType,
      amount: numericAmount(body.amount ?? body.fee, numericAmount(task.amount ?? task.fee)),
      status: body.status ?? task.status,
      acceptedBy: body.acceptedBy ?? body.accepted_by ?? body.assignedToId ?? task.acceptedBy,
      updatedAt: new Date().toISOString(),
    });
    sendJson(res, 200, dashboardTask(task));
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (isReviewUser(authUser)) {
      sendJson(res, 200, reviewSeedData(authUser).bookings);
      return;
    }
    if (db.dbAvailable) {
      if (!authUser) {
        sendJson(res, 200, []);
        return;
      }
      const result = canSeeAll(authUser) || authUser.role === "advocate"
        ? await db.query("SELECT * FROM bookings ORDER BY created_at DESC")
        : await db.query("SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC", [authUser.id]);
      sendJson(res, 200, result.rows.map(mapBooking));
      return;
    }
    if (!authUser) {
      sendJson(res, 200, []);
      return;
    }
    const visibleBookings = canSeeAll(authUser) || authUser.role === "advocate"
      ? demoStore.bookings
      : authUser.role === "client"
        ? demoStore.bookings.filter((item) => item.userId === authUser.id)
        : [];
    sendJson(res, 200, visibleBookings.map(dashboardBooking));
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    if (isReviewUser(authUser)) {
      const seed = reviewSeedData(authUser);
      sendJson(res, 201, {
        ...seed.bookings[0],
        serviceType: body.serviceType || body.service_type || body.legalIssueType || body.plan || seed.bookings[0].serviceType,
        amount: Number(body.amount || body.price || seed.bookings[0].amount),
        transparencyReceipt: seed.receipts[0],
        message: "Google Play review booking is synthetic and does not charge Razorpay.",
      });
      return;
    }
    const bookingUserId = userIdForWrite(body, authUser);
    const booking = { id: `booking-${Date.now()}`, userId: bookingUserId, status: "Pending", createdAt: new Date().toISOString(), ...body };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO bookings (user_id, service_type, amount, payment_status, receipt_no, next_destination, razorpay_order_id, razorpay_payment_id, work_hold_status, failure_reason, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          bookingUserId,
          body.serviceType || body.service_type || body.legalIssueType || body.plan || "Legal Connect booking",
          numericAmount(body.amount || body.price),
          body.paymentStatus || body.payment_status || body.status || "Pending",
          body.receiptNo || body.receipt_no || null,
          body.nextDestination || body.next_destination || body.route || null,
          body.razorpayOrderId || body.razorpay_order_id || null,
          body.razorpayPaymentId || body.razorpay_payment_id || null,
          body.workHoldStatus || body.work_hold_status || "pending",
          body.failureReason || body.failure_reason || null,
          JSON.stringify({ ...body, user_id: bookingUserId, role: userRole(authUser) }),
        ],
      );
      const savedBooking = mapBooking(result.rows[0]);
      await createNotification("booking_confirmed", "Booking received", "Your Legal Connect booking has been recorded.", { bookingId: savedBooking.id }, bookingUserId);
      const receipt = await createReceipt({
        userId: bookingUserId,
        actor: authUser || { role: userRole(authUser) },
        receiptType: "booking",
        title: "Booking receipt",
        message: `${savedBooking.serviceType || "Legal Connect booking"} recorded. Payment status: ${savedBooking.paymentStatus || "pending"}.`,
        status: savedBooking.paymentStatus || "pending",
        amount: savedBooking.amount,
        targetType: "booking",
        targetId: savedBooking.id,
        visibility: "private",
        payload: { nextDestination: savedBooking.nextDestination, workHoldStatus: savedBooking.workHoldStatus },
      });
      sendJson(res, 201, { ...savedBooking, transparencyReceipt: receipt });
      return;
    }
    await createNotification("booking_confirmed", "Booking received", "Your Legal Connect booking has been recorded.", { bookingId: booking.id }, booking.userId || null);
    booking.transparencyReceipt = await createReceipt({
      userId: booking.userId || null,
      actor: authUser || { role: userRole(authUser) },
      receiptType: "booking",
      title: "Booking receipt",
      message: `${booking.serviceType || booking.plan || "Legal Connect booking"} recorded. Payment status: ${booking.paymentStatus || booking.status || "pending"}.`,
      status: booking.paymentStatus || booking.status || "pending",
      amount: booking.amount || booking.price || null,
      targetType: "booking",
      targetId: booking.id,
      visibility: "private",
      payload: { nextDestination: booking.nextDestination || booking.route || null, workHoldStatus: booking.workHoldStatus || "pending" },
    });
    demoStore.bookings.push(booking);
    sendJson(res, 201, dashboardBooking(booking));
    return;
  }

  if (url.pathname.startsWith("/api/bookings/") && ["PUT", "DELETE"].includes(req.method)) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const id = url.pathname.split("/").pop();
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM bookings WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        sendJson(res, 404, { error: "Booking not found" });
        return;
      }
      const current = mapBooking(existing.rows[0]);
      if (!canSeeAll(authUser) && authUser.role !== "advocate" && current.userId !== authUser.id) {
        sendJson(res, 403, { error: "Forbidden" });
        return;
      }
      if (req.method === "DELETE") {
        await db.query("DELETE FROM bookings WHERE id = $1", [id]);
        sendJson(res, 204, {});
        return;
      }
      const body = await readBody(req);
      const next = {
        ...current,
        ...body,
        legalIssueType: body.legalIssueType ?? body.serviceType ?? current.legalIssueType,
        status: body.status ?? body.paymentStatus ?? current.status,
      };
      const result = await db.query(
        `UPDATE bookings
         SET service_type = $2, amount = $3, payment_status = $4, payload = $5
         WHERE id = $1
         RETURNING *`,
        [id, next.legalIssueType, numericAmount(body.amount, numericAmount(current.amount)), next.status, JSON.stringify({ ...next, user_id: current.userId })],
      );
      sendJson(res, 200, mapBooking(result.rows[0]));
      return;
    }
    const index = demoStore.bookings.findIndex((item) => item.id === id);
    if (index === -1) {
      sendJson(res, 404, { error: "Booking not found" });
      return;
    }
    const booking = demoStore.bookings[index];
    if (!canSeeAll(authUser) && authUser.role !== "advocate" && booking.userId !== authUser.id) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }
    if (req.method === "DELETE") {
      demoStore.bookings.splice(index, 1);
      sendJson(res, 204, {});
      return;
    }
    const body = await readBody(req);
    Object.assign(booking, body, {
      legalIssueType: body.legalIssueType ?? body.serviceType ?? booking.legalIssueType,
      status: body.status ?? body.paymentStatus ?? booking.status,
      updatedAt: new Date().toISOString(),
    });
    sendJson(res, 200, dashboardBooking(booking));
    return;
  }

  if (url.pathname.startsWith("/api/bookings/") && url.pathname.endsWith("/stage") && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const parts = url.pathname.split("/");
    const bookingId = parts[3];
    const newStage = body.stageStatus || body.stage || body.status || "booking_submitted";
    const advocateName = body.assignedAdvocateName || body.advocateName || (authUser && authUser.role === 'advocate' ? authUser.name : "Adv. Rishika Nagpal");
    const advocateId = body.assignedAdvocateId || (authUser ? authUser.id : "demo-advocate-id");
    const meetingLink = body.meetingLink || body.link || null;

    let targetBooking = null;
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [bookingId]);
      if (existing.rows.length) {
        const payload = existing.rows[0].payload ? (typeof existing.rows[0].payload === 'string' ? JSON.parse(existing.rows[0].payload) : existing.rows[0].payload) : {};
        payload.stageStatus = newStage;
        payload.assignedAdvocateName = advocateName;
        payload.assignedAdvocateId = advocateId;
        if (meetingLink) payload.meetingLink = meetingLink;
        const updated = await db.query(
          `UPDATE bookings SET payload = $2, work_hold_status = $3 WHERE id = $1 RETURNING *`,
          [bookingId, JSON.stringify(payload), newStage === 'request_entertained' ? 'released' : 'pending']
        );
        targetBooking = mapBooking(updated.rows[0]);
      }
    } else {
      targetBooking = demoStore.bookings.find((item) => item.id === bookingId);
      if (!targetBooking && demoStore.bookings.length > 0) {
        targetBooking = demoStore.bookings[0];
      }
      if (targetBooking) {
        targetBooking.stageStatus = newStage;
        targetBooking.assignedAdvocateName = advocateName;
        targetBooking.assignedAdvocateId = advocateId;
        if (meetingLink) targetBooking.meetingLink = meetingLink;
        if (newStage === 'request_entertained') {
          targetBooking.workHoldStatus = 'released';
          targetBooking.paymentStatus = 'paid';
        }
      }
    }

    if (targetBooking) {
      const stageTitles = {
        booking_submitted: "Booking Submitted & Fee Held in Escrow",
        acknowledged_and_assigned: "Acknowledged & Assigned by Legal Connect",
        advocate_connected: `Advocate Connected (${advocateName})`,
        session_confirmed: "Session Confirmed & Scheduled",
        request_entertained: "Request Entertained & Work Completed"
      };
      await createNotification(
        "booking_stage_updated",
        "Booking Status Update",
        `Your booking status is now: ${stageTitles[newStage] || newStage}`,
        { bookingId, stageStatus: newStage, advocateName },
        targetBooking.userId || targetBooking.user_id || null
      );
      sendJson(res, 200, { ok: true, booking: targetBooking });
    } else {
      sendJson(res, 404, { ok: false, error: "Booking not found" });
    }
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    if (isReviewUser(authUser)) {
      const seed = reviewSeedData(authUser);
      sendJson(res, 201, {
        ...seed.tasks[0],
        title: body.title || body.taskDescription || seed.tasks[0].title,
        amount: numericAmount(body.amount || body.fee, numericAmount(seed.tasks[0].amount)),
        transparencyReceipt: seed.receipts[0],
        message: "Google Play review court mission is synthetic and cannot release funds.",
      });
      return;
    }
    const actorId = userIdForWrite(body, authUser);
    const task = { id: `task-${Date.now()}`, postedBy: actorId, status: "Open", createdAt: new Date().toISOString(), ...body };
    task.title = body.title || body.taskDescription || "Legal Connect mission";
    task.court = body.court || body.location || null;
    task.amount = numericAmount(body.amount || body.fee);
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO tasks (title, court, task_type, amount, escrow_status, status, posted_by, accepted_by, proof_url, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          body.title || body.taskDescription || "Legal Connect mission",
          body.court || body.location || null,
          body.taskType || body.task_type || body.type || "Mission",
          numericAmount(body.amount || body.fee),
          body.escrowStatus || body.escrow_status || "Not locked",
          body.status || "Open",
          body.postedBy || body.posted_by || actorId,
          body.acceptedBy || body.accepted_by || null,
          body.proofUrl || body.proof_url || null,
          JSON.stringify({ ...body, user_id: actorId, role: userRole(authUser), payment_lock_status: body.paymentLockStatus || body.payment_lock_status || body.escrowStatus || "none" }),
        ],
      );
      const savedTask = mapTask(result.rows[0]);
      await createNotification("task_posted", "Mission posted", savedTask.title || "A court mission was posted.", { taskId: savedTask.id }, actorId);
      const receipt = await createReceipt({
        userId: actorId,
        actor: authUser || { role: userRole(authUser) },
        receiptType: "mission",
        title: "Court mission receipt",
        message: `${savedTask.title || "Court mission"} posted for ${savedTask.court || "court support"}.`,
        status: savedTask.status || "open",
        amount: savedTask.amount,
        targetType: "task",
        targetId: savedTask.id,
        visibility: "team",
        payload: { court: savedTask.court, taskType: savedTask.taskType, workHoldStatus: savedTask.escrowStatus },
      });
      sendJson(res, 201, { ...savedTask, transparencyReceipt: receipt });
      return;
    }
    await createNotification("task_posted", "Mission posted", task.title || "A court mission was posted.", { taskId: task.id }, task.postedBy || null);
    task.transparencyReceipt = await createReceipt({
      userId: task.postedBy || null,
      actor: authUser || { role: userRole(authUser) },
      receiptType: "mission",
      title: "Court mission receipt",
      message: `${task.title || "Court mission"} posted for ${task.court || "court support"}.`,
      status: task.status || "Open",
      amount: task.amount || task.fee || null,
      targetType: "task",
      targetId: task.id,
      visibility: "team",
      payload: { court: task.court || null, taskType: task.taskType || task.type || null, workHoldStatus: task.escrowStatus || "Not locked" },
    });
    demoStore.tasks.push(task);
    sendJson(res, 201, dashboardTask(task));
    return;
  }

  if (url.pathname === "/api/lawbot/query" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const question = body.query || body.question || body.message || "";
    const result = await queryLawbot(question, userIdForWrite(body, authUser), body.mode || "lawbot");
    await saveLawbotChat(userIdForWrite(body, authUser), question, result);
    await createReceipt({
      userId: userIdForWrite(body, authUser),
      actor: authUser || { role: userRole(authUser) },
      receiptType: "lawbot",
      title: "LawBot query receipt",
      message: result.citations?.length ? "LawBot answered with approved-source citations." : "LawBot refused because no approved source matched.",
      status: result.citations?.length ? "answered-with-source" : "source-not-found",
      targetType: "lawbot_query",
      targetId: result.queryId || null,
      visibility: "private",
      payload: { mode: body.mode || "lawbot", question: question.slice(0, 240), citations: result.citations || [] },
    });
    sendJson(res, 200, result);
    return;
  }

  if (url.pathname === "/api/lawbot/feedback" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const feedback = {
      id: `lawbot-feedback-${Date.now()}`,
      queryId: body.queryId || body.query_id || null,
      userId: userIdForWrite(body, authUser),
      rating: body.rating || "needs advocate review",
      comment: body.comment || "",
      createdAt: new Date().toISOString(),
    };
    if (db.dbAvailable) {
      await db.query(
        "INSERT INTO lawbot_feedback (query_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)",
        [feedback.queryId, feedback.userId, feedback.rating, feedback.comment],
      );
    } else {
      demoStore.lawbotFeedback.unshift(feedback);
    }
    sendJson(res, 201, { ok: true, feedback });
    return;
  }

  if (url.pathname === "/api/ai/chat" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const result = await queryLawbot(lastUserMessage, userIdForWrite(body, authUser), "ai-chat");
    await saveLawbotChat(userIdForWrite(body, authUser), lastUserMessage, result);
    sendSse(res, result);
    return;
  }

  if (url.pathname === "/api/sos" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    if (isReviewUser(authUser)) {
      const seed = reviewSeedData(authUser);
      sendJson(res, 201, {
        ...seed.sosRequests[0],
        serviceType: body.serviceType || body.service_type || seed.sosRequests[0].serviceType,
        urgency: body.urgency || seed.sosRequests[0].urgency,
        transparencyReceipt: seed.receipts[0],
        message: "Google Play review SOS request is synthetic. No real call or video link is placed.",
      });
      return;
    }
    const sosUserId = userIdForWrite(body, authUser);
    const sosRequest = {
      id: `sos-${Date.now()}`,
      userId: sosUserId,
      serviceType: body.serviceType || body.service_type || "Legal SOS",
      urgency: body.urgency || "Normal",
      status: body.status || "Open",
      createdAt: new Date().toISOString(),
      ...body,
    };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO sos_requests (user_id, service_type, urgency, status, payload)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [sosRequest.userId, sosRequest.serviceType, sosRequest.urgency, sosRequest.status, JSON.stringify({ ...body, role: userRole(authUser) })],
      );
      await createNotification("sos_created", "Legal SOS created", `${sosRequest.urgency} SOS request saved.`, { sosId: result.rows[0].id }, sosUserId);
      const sosResponse = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        serviceType: result.rows[0].service_type,
        urgency: result.rows[0].urgency,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at,
        ...(result.rows[0].payload || {}),
      };
      sosResponse.transparencyReceipt = await createReceipt({
        userId: sosUserId,
        actor: authUser || { role: userRole(authUser) },
        receiptType: "sos",
        title: "Legal SOS receipt",
        message: `${sosResponse.urgency || "Normal"} SOS request saved. RNA desk can track follow-up.`,
        status: sosResponse.status || "Open",
        targetType: "sos_request",
        targetId: sosResponse.id,
        visibility: "team",
        payload: { serviceType: sosResponse.serviceType, urgency: sosResponse.urgency },
      });
      sendJson(res, 201, sosResponse);
      return;
    }
    demoStore.sosRequests = demoStore.sosRequests || [];
    demoStore.sosRequests.push(sosRequest);
    await createNotification("sos_created", "Legal SOS created", `${sosRequest.urgency} SOS request saved.`, { sosId: sosRequest.id }, sosUserId);
    sosRequest.transparencyReceipt = await createReceipt({
      userId: sosUserId,
      actor: authUser || { role: userRole(authUser) },
      receiptType: "sos",
      title: "Legal SOS receipt",
      message: `${sosRequest.urgency || "Normal"} SOS request saved. RNA desk can track follow-up.`,
      status: sosRequest.status || "Open",
      targetType: "sos_request",
      targetId: sosRequest.id,
      visibility: "team",
      payload: { serviceType: sosRequest.serviceType, urgency: sosRequest.urgency },
    });
    sendJson(res, 201, sosRequest);
    return;
  }

  serveStatic(req, res);
});

async function startServer() {
  const initialized = await db.initDb();
  if (config.nodeEnv === "production" && !initialized) {
    throw new Error("Production startup blocked: PostgreSQL migrations did not complete.");
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on ${PORT}`);
    console.log(`Database mode: ${db.dbAvailable ? "connected" : config.nodeEnv === "production" ? "disconnected" : "local fallback"}`);
    console.log(`Migration status: ${db.migrationStatus}`);
    console.log(`Email provider: ${emailProviderStatus().provider === "resend" && emailProviderStatus().status === "ready" ? "resend configured" : "in-app fallback"}`);
    console.log(`Google Play review access: ${playReviewConfigured() ? "configured" : "disabled"}`);
  });
}

startServer().catch((error) => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});

// STRICT PHASE 2 JWT AUTH AND ROLE ISOLATION SUPPORT
function strictJwtSecret() {
  return SESSION_SECRET;
}

function strictBase64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function strictSignJwt(user) {
  const payload = {
    userId: user.id,
    id: user.id,
    role: user.role,
    name: user.name || user.email || 'Legal Connect User',
    email: user.email || null,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };
  const header = strictBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = strictBase64Url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', strictJwtSecret()).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + signature;
}

function decodeStrictJwt(token) {
  try {
    const clean = String(token || '').replace(/^Bearer\s+/i, '').trim();
    const parts = clean.split('.');
    if (parts.length !== 3) return null;
    const expected = crypto.createHmac('sha256', strictJwtSecret()).update(parts[0] + '.' + parts[1]).digest('base64url');
    const actual = Buffer.from(parts[2]);
    const expectedBuffer = Buffer.from(expected);
    if (actual.length !== expectedBuffer.length || !crypto.timingSafeEqual(actual, expectedBuffer)) return null;
    const parsed = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!parsed.userId || !roles.has(parsed.role)) return null;
    if (parsed.exp && Math.floor(Date.now() / 1000) > parsed.exp) return null;
    return { id: parsed.userId, userId: parsed.userId, role: parsed.role, name: parsed.name, email: parsed.email, jwt: true };
  } catch {
    return null;
  }
}

const strictLegacyGetAuthUser = getAuthUser;
getAuthUser = function strictGetAuthUser(req) {
  const token = req.headers.authorization || req.headers['x-legal-connect-token'];
  return decodeStrictJwt(token) || strictLegacyGetAuthUser(req);
};

function strictHashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return 'scrypt:' + salt + ':' + hash;
}

function strictVerifyPassword(password, storedHash) {
  try {
    const parts = String(storedHash || '').split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const derived = crypto.scryptSync(String(password), parts[1], 64);
    const stored = Buffer.from(parts[2], 'hex');
    return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
  } catch {
    return false;
  }
}

async function ensureStrictAuthSchema() {
  if (!db.dbAvailable) return false;
  await db.query('CREATE TABLE IF NOT EXISTS roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text UNIQUE NOT NULL, created_at timestamptz DEFAULT now())');
  for (const roleName of ['admin', 'advocate', 'client', 'intern']) {
    await db.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [roleName]);
  }
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id uuid');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_at timestamptz');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz');
  await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz');
  await db.query('CREATE INDEX IF NOT EXISTS users_role_id_idx ON users (role_id)');
  await db.query('CREATE INDEX IF NOT EXISTS users_email_lookup_idx ON users (lower(email)) WHERE email IS NOT NULL');
  for (const roleName of ['admin', 'advocate', 'client', 'intern']) {
    await db.query('UPDATE users SET role_id = (SELECT id FROM roles WHERE name = $1) WHERE role_id IS NULL AND role = $1', [roleName]);
  }
  await db.query('UPDATE users SET role = $1, role_id = (SELECT id FROM roles WHERE name = $1) WHERE role_id IS NULL AND (role IS NULL OR role = $2)', ['client', '']);
  await db.query('CREATE TABLE IF NOT EXISTS profile_clients (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, display_name text, matter_summary text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())');
  await db.query('CREATE TABLE IF NOT EXISTS profile_advocates (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, display_name text, bar_council_id text, practice_areas text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())');
  await db.query('CREATE TABLE IF NOT EXISTS profile_interns (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, display_name text, level text, xp integer DEFAULT 120, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())');
  await db.query('CREATE TABLE IF NOT EXISTS profile_admins (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, display_name text, access_scope text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())');
  return true;
}

function strictPublicUser(row) {
  return {
    id: row.id,
    name: row.name || row.email || 'Legal Connect User',
    emailMasked: maskEmail(row.email),
    phoneMasked: maskPhone(row.phone),
    role: row.role || 'client',
    createdAt: row.created_at || row.createdAt,
  };
}

async function strictUserByEmail(email) {
  if (!db.dbAvailable) return null;
  const result = await db.query('SELECT users.id, users.name, users.email, users.phone, users.password_hash, COALESCE(roles.name, users.role) AS role, users.created_at FROM users LEFT JOIN roles ON roles.id = users.role_id WHERE lower(users.email) = lower($1) LIMIT 1', [email]);
  const user = result.rows[0] || null;
  if (user && !user.role) user.role = 'client';
  return user;
}

async function strictCreateProfile(userId, role, body) {
  const displayName = body.name || body.displayName || body.email || 'Legal Connect User';
  if (role === 'advocate') {
    await db.query('INSERT INTO profile_advocates (user_id, display_name, bar_council_id, practice_areas) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, bar_council_id = COALESCE(EXCLUDED.bar_council_id, profile_advocates.bar_council_id), practice_areas = COALESCE(EXCLUDED.practice_areas, profile_advocates.practice_areas), updated_at = now()', [userId, displayName, body.barCouncilId || null, body.practiceAreas || null]);
  } else if (role === 'intern') {
    await db.query('INSERT INTO profile_interns (user_id, display_name, level, xp) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()', [userId, displayName, 'Level 1 - Observer', 120]);
  } else if (role === 'admin') {
    await db.query('INSERT INTO profile_admins (user_id, display_name, access_scope) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()', [userId, displayName, 'platform']);
  } else {
    await db.query('INSERT INTO profile_clients (user_id, display_name, matter_summary) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, matter_summary = COALESCE(EXCLUDED.matter_summary, profile_clients.matter_summary), updated_at = now()', [userId, displayName, body.matterSummary || null]);
  }
}

async function handleStrictJwtAuthRoute(req, res, url) {
  const strictAuthPath = url.pathname.startsWith('/api/auth/strict');
  if (!strictAuthPath) return false;
  if (!db.dbAvailable) {
    sendJson(res, 503, { ok: false, error: 'Database is required for secure authentication.' });
    return true;
  }
  await ensureStrictAuthSchema();

  if (url.pathname === '/api/auth/strict/register' && req.method === 'POST') {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const role = ['client', 'advocate', 'intern', 'admin'].includes(body.role) ? body.role : 'client';
    const name = String(body.name || body.email || 'Legal Connect User').trim();
    if (!email || !email.includes('@')) {
      sendJson(res, 400, { ok: false, error: 'A valid email is required.' });
      return true;
    }
    if (password.length < 8) {
      sendJson(res, 400, { ok: false, error: 'Password must be at least 8 characters.' });
      return true;
    }
    const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
    const roleId = roleResult.rows[0] && roleResult.rows[0].id;
    let user = await strictUserByEmail(email);
    if (user) {
      const updated = await db.query('UPDATE users SET name = $1, phone = COALESCE($2, phone), role = $3, role_id = $4, password_hash = $5, consent_at = COALESCE(consent_at, now()), email_verified_at = COALESCE(email_verified_at, now()) WHERE id = $6 RETURNING id, name, email, phone, role, created_at', [name, normalizePhone(body.phone) || null, role, roleId, strictHashPassword(password), user.id]);
      user = updated.rows[0];
    } else {
      const created = await db.query('INSERT INTO users (name, email, phone, role, role_id, password_hash, consent_at, email_verified_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id, name, email, phone, role, created_at', [name, email, normalizePhone(body.phone) || null, role, roleId, strictHashPassword(password)]);
      user = created.rows[0];
    }
    await strictCreateProfile(user.id, role, body);
    const token = strictSignJwt(user);
    await saveSessionToken(user, token);
    await writeAuditLog(user, 'jwt_register', 'user', user.id, 'Strict JWT registration completed.', { role, emailMasked: maskEmail(email) });
    sendJson(res, 201, { ok: true, token, user: strictPublicUser(user) });
    return true;
  }

  if (url.pathname === '/api/auth/strict/login' && req.method === 'POST') {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    if (!email || !password) {
      sendJson(res, 400, { ok: false, error: 'Email and password are required.' });
      return true;
    }
    const user = await strictUserByEmail(email);
    if (!user || !strictVerifyPassword(password, user.password_hash)) {
      sendJson(res, 401, { ok: false, error: 'Invalid email or password.' });
      return true;
    }
    const token = strictSignJwt(user);
    await saveSessionToken(user, token);
    await writeAuditLog(user, 'jwt_login', 'user', user.id, 'Strict JWT login completed.', { role: user.role, emailMasked: maskEmail(user.email) });
    sendJson(res, 200, { ok: true, token, user: strictPublicUser(user) });
    return true;
  }

  if (url.pathname === '/api/auth/strict/me' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: 'Authentication required.' });
      return true;
    }
    sendJson(res, 200, { ok: true, user: strictPublicUser(authUser) });
    return true;
  }

  return false;
}

const strictOriginalRequestListeners = server.listeners('request').slice();
server.removeAllListeners('request');
server.on('request', async function strictRoleIsolatedRequest(req, res) {
  try {
    try {
      const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
      if (await handleStrictJwtAuthRoute(req, res, url)) return;
    } catch (error) {
      if (!res.headersSent && req.url && req.url.startsWith('/api/auth')) {
        sendJson(res, 500, { ok: false, error: 'Authentication service failed.' });
        return;
      }
    }
    for (const listener of strictOriginalRequestListeners) {
      if (res.writableEnded) return;
      const result = listener.call(server, req, res);
      if (result && typeof result.then === 'function') await result;
    }
  } catch (error) {
    const requestId = crypto.randomBytes(6).toString('hex');
    console.error(`[request:${requestId}] ${req.method || 'UNKNOWN'} ${req.url || '/'} failed`, error);
    if (!res.headersSent) {
      sendJson(res, 500, {
        ok: false,
        error: 'The service could not complete this request. Please try again.',
        requestId,
      });
    } else if (!res.writableEnded) {
      res.end();
    }
  }
});
