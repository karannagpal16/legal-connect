// artifacts/api-server/server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const config = require("./config");
const db = require("./db");
const { getPortalLoginRoute, getPostLoginRoute, normalizePortal, isRoleAllowedForPortal } = require("./portal-auth");
const { createStrategyFeatures } = require("./strategy-features");
const { createWorkflowProgressions } = require("./workflow-progressions");
const { createPlatformEvents } = require("./platform-events");
const {
  createSupervisedPipeline,
  maskCounselForClient,
  pipelineProgress,
  slaClock,
  INTAKE_SLA_MS,
} = require("./supervised-pipeline");

const platformEvents = createPlatformEvents({ db, config });
const supervisedPipeline = createSupervisedPipeline({ db });

const PORT = config.port;
const publicDir = path.join(__dirname, "public");
const frontendPublicDir = path.join(__dirname, "..", "law-firm", "public");
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
  const candidates = ["index.html"]
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

function ensureWebAssets() {
  const indexPath = path.join(publicDir, "index.html");
  if (fs.existsSync(indexPath)) return;

  const frontendDir = path.join(__dirname, "..", "law-firm");
  const commands = process.platform === "win32"
    ? [
        ["pnpm.cmd", ["--dir", frontendDir, "build"]],
        ["npm.cmd", ["--prefix", frontendDir, "run", "build"]],
      ]
    : [
        ["pnpm", ["--dir", frontendDir, "build"]],
        ["npm", ["--prefix", frontendDir, "run", "build"]],
      ];

  let lastError = "No supported package manager was available.";
  for (const [command, args] of commands) {
    const result = spawnSync(command, args, {
      cwd: path.join(__dirname, "..", ".."),
      env: process.env,
      stdio: "inherit",
    });
    if (result.status === 0 && fs.existsSync(indexPath)) return;
    lastError = result.error?.message || `${command} exited with status ${result.status}`;
  }

  throw new Error(`Frontend assets could not be built: ${lastError}`);
}

function createDemoBookings(createdAt = new Date().toISOString()) {
  return [
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
      createdAt,
    }
  ];
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
    bookings: createDemoBookings(now),
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
    chamber: {
      id: "chamber-demo-1",
      name: "Demo Lawyer's Chamber",
      members: [
        { id: "member-demo-1", display_name: "Aditi Rao", email: "aditi@example.com", member_role: "associate", status: "active" },
        { id: "member-demo-2", display_name: "Kabir Mehta", email: "kabir@example.com", member_role: "intern", status: "active" },
      ],
      tasks: [
        { id: "chamber-task-demo-1", title: "Draft evidence affidavit", details: "Prepare first draft from indexed documents.", assignee_name: "Aditi Rao", status: "in_progress", priority: "high", updated_at: now },
        { id: "chamber-task-demo-2", title: "Tis Hazari order inspection", details: "Collect certified order status.", assignee_name: "Kabir Mehta", status: "accepted", priority: "normal", updated_at: now },
      ],
    },
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
    email: user.email || null,
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

function counselForClientAudience(counsel, fullName, enrollment) {
  const sourceName = (counsel && counsel.name) || fullName || "";
  const sourceEnrollment = (counsel && (counsel.enrollment || counsel.enrollmentNo)) || enrollment || null;
  const masked = maskCounselForClient(sourceName, sourceEnrollment);
  return {
    ...(counsel || {}),
    name: masked.displayName,
    displayName: masked.displayName,
    enrollment: masked.enrollment,
    contactPolicy: masked.contactPolicy,
    fullNameHidden: true,
  };
}

/** Rewrite client-visible copy so a known full counsel name never appears. */
function replaceCounselNameForClient(text, fullName, maskedDisplayName) {
  const value = String(text || "");
  const source = String(fullName || "").trim();
  const masked = String(maskedDisplayName || "Assigned counsel").trim();
  if (!value || !source || source === masked) return value;
  return value.split(source).join(masked);
}

/** Strip full counsel identity from matter payloads returned to clients. */
function sanitizeMatterForClient(matter) {
  if (!matter || typeof matter !== "object") return matter;
  const fullName = matter.assignedAdvocateName || matter.counsel?.name || matter.counsel?.displayName || "";
  const enrollment = matter.counsel?.enrollment
    || matter.counsel?.enrollmentNo
    || matter.assignedAdvocateEnrollment
    || null;
  const masked = maskCounselForClient(fullName, enrollment);
  const counsel = matter.counsel
    ? counselForClientAudience(matter.counsel, fullName, enrollment)
    : (fullName ? counselForClientAudience(null, fullName, enrollment) : null);
  return {
    ...matter,
    assignedAdvocateName: fullName ? masked.displayName : matter.assignedAdvocateName || null,
    counsel,
    nextAction: replaceCounselNameForClient(matter.nextAction, fullName, masked.displayName) || matter.nextAction || null,
    assignedAdvocateEmail: undefined,
    assignedAdvocatePhone: undefined,
    advocateEmail: undefined,
    advocatePhone: undefined,
    fullNameHidden: Boolean(fullName),
  };
}

/** Strip full counsel identity from booking/intake payloads returned to clients. */
function sanitizeBookingForClient(booking) {
  if (!booking || typeof booking !== "object") return booking;
  const fullName = booking.assignedAdvocateName || booking.counsel?.name || "";
  const enrollment = booking.assignedAdvocateEnrollment
    || booking.counsel?.enrollment
    || booking.counsel?.enrollmentNo
    || null;
  const masked = maskCounselForClient(fullName, enrollment);
  return {
    ...booking,
    assignedAdvocateName: fullName ? masked.displayName : booking.assignedAdvocateName || null,
    counsel: booking.counsel
      ? counselForClientAudience(booking.counsel, fullName, enrollment)
      : booking.counsel || null,
    nextAction: replaceCounselNameForClient(booking.nextAction, fullName, masked.displayName) || booking.nextAction || null,
    assignedAdvocateEmail: undefined,
    assignedAdvocatePhone: undefined,
    advocateEmail: undefined,
    advocatePhone: undefined,
    fullNameHidden: Boolean(fullName),
  };
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

function readRawBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        const error = new Error("Request body is too large.");
        error.statusCode = 413;
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
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
  const upiVpa = String(config.upiVpa || "").trim().toLowerCase();
  const upiValid = /^[a-z0-9.\-_]{2,256}@[a-z]{2,64}$/.test(upiVpa);
  return {
    payments_configured: Boolean(config.razorpayKeyId && config.razorpayKeySecret),
    key_id_present: Boolean(config.razorpayKeyId),
    key_id_prefix: razorpayKeyPrefix(),
    mode,
    webhook_secret_present: Boolean(config.razorpayWebhookSecret),
    checkout_script_url: "https://checkout.razorpay.com/v1/checkout.js",
    upi_vpa: upiValid ? upiVpa : "",
    upi_payee_name: config.upiPayeeName || "Legal Connect",
    upi_configured: upiValid,
    test_upi_id: mode === "test" ? "success@razorpay" : "",
    warning: mode === "live"
      ? "Live key detected. Use small controlled pilot only after verification."
      : mode === "test"
        ? "Razorpay is in TEST mode. Real UPI apps show Invalid UPI ID on the test QR — use success@razorpay or a card."
        : "",
  };
}

async function userHasUsedFirstChat(userId) {
  if (!userId) return true;
  if (!db.dbAvailable) {
    return (demoStore.bookings || []).some((booking) => {
      if (String(booking.userId || booking.user_id) !== String(userId)) return false;
      const channel = booking.consultationChannel || booking.payload?.consultationChannel;
      const free = booking.firstChatFree || booking.payload?.firstChatFree;
      const paid = ["paid", "demo-verified", "review-inspection"].includes(String(booking.paymentStatus || booking.payment_status || ""));
      return Boolean(free) || (channel === "chat" && paid);
    });
  }
  const result = await db.query(
    `SELECT 1
     FROM bookings
     WHERE user_id = $1
       AND (
         COALESCE(payload->>'firstChatFree', '') = 'true'
         OR (
           COALESCE(payload->>'consultationChannel', '') = 'chat'
           AND COALESCE(payment_status, '') IN ('paid', 'demo-verified', 'review-inspection')
         )
       )
     LIMIT 1`,
    [userId],
  );
  return Boolean(result.rows[0]);
}

async function activateBookingAsPaid(bookingId, authUser, meta = {}) {
  let linkedCaseId = null;
  if (db.dbAvailable && bookingId) {
    const nextAmount = Object.prototype.hasOwnProperty.call(meta, "amount") ? Number(meta.amount) : null;
    await db.query(
      `UPDATE bookings
       SET payment_status = 'paid',
           work_hold_status = 'active',
           failure_reason = NULL,
           verified_at = now(),
           amount = CASE WHEN $3::numeric IS NULL THEN amount ELSE $3::numeric END,
           payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [
        bookingId,
        JSON.stringify({
          work_hold_status: "active",
          verified_at: new Date().toISOString(),
          intakeStatus: "intake_submitted",
          stageStatus: "intake_submitted",
          ...meta,
        }),
        Number.isFinite(nextAmount) ? nextAmount : null,
      ],
    );
    await db.query(
      `UPDATE bookings
       SET stage_status = COALESCE(NULLIF(stage_status, ''), 'intake_submitted'),
           payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [bookingId, JSON.stringify({ intakeStatus: "intake_submitted", stageStatus: "intake_submitted" })],
    ).catch(() => undefined);
    try {
      linkedCaseId = await ensurePaidBookingCase(bookingId);
    } catch (error) {
      console.warn("ensurePaidBookingCase failed after free/paid activation:", error.message || error);
    }
  } else if (bookingId) {
    const booking = demoStore.bookings.find((item) => item.id === bookingId);
    if (booking) {
      Object.assign(booking, {
        paymentStatus: "paid",
        workHoldStatus: "active",
        verifiedAt: new Date().toISOString(),
        firstChatFree: Boolean(meta.firstChatFree),
        amount: meta.amount ?? booking.amount,
        intakeStatus: "intake_submitted",
        stageStatus: "intake_submitted",
        ...meta,
      });
    }
  }
  await writeAuditLog(
    authUser || { role: "system" },
    meta.masterTestFree ? "master_test_free_claimed" : meta.firstChatFree ? "first_chat_free_claimed" : "payment_verified",
    "booking",
    bookingId,
    meta.masterTestFree
      ? "Master test free booking activated."
      : meta.firstChatFree
        ? "First client chat claimed free."
        : "Payment verified.",
    meta,
  ).catch(() => undefined);
  return linkedCaseId;
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
  // Column fields must win over stale payload mirrors (e.g. paymentStatus after refund).
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return dashboardBooking({
    ...payload,
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
    stageStatus: row.stage_status || payload.stageStatus || payload.intakeStatus || null,
    intakeStatus: payload.intakeStatus || row.stage_status || payload.stageStatus || null,
    assignedAdvocateId: row.assigned_advocate_id || payload.assignedAdvocateId || null,
    assignedAdvocateName: row.assigned_advocate_name || payload.assignedAdvocateName || null,
    assignedAdvocateEnrollment: row.assigned_advocate_enrollment || payload.assignedAdvocateEnrollment || null,
    createdAt: row.created_at,
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
    proofHash: row.proof_hash,
    proofStatus: row.proof_status || "none",
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

function safeAttachmentName(rawName) {
  let decoded = String(rawName || "case-file");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the original header value when it is not URI encoded.
  }
  return path.basename(decoded).replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || "case-file";
}

async function ensurePaidBookingCase(bookingId) {
  if (!db.dbAvailable || !isUuid(bookingId)) return null;
  const bookingResult = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [bookingId]);
  const bookingRow = bookingResult.rows[0];
  if (!bookingRow || bookingRow.payment_status !== "paid") return null;
  const booking = mapBooking(bookingRow);
  const payload = bookingRow.payload || {};

  let caseRow = null;
  if (isUuid(payload.existingCaseId)) {
    const existingMatter = await db.query("SELECT * FROM cases WHERE id = $1 AND user_id = $2 LIMIT 1", [payload.existingCaseId, bookingRow.user_id]);
    caseRow = existingMatter.rows[0] || null;
  }
  if (!caseRow) {
    const linkedMatter = await db.query("SELECT * FROM cases WHERE payload->>'bookingId' = $1 LIMIT 1", [bookingId]);
    caseRow = linkedMatter.rows[0] || null;
  }
  if (!caseRow) {
    const matterPayload = {
      bookingId,
      caseTitle: payload.caseTitle || booking.serviceType || "Legal Connect matter",
      caseType: payload.caseType || payload.legalIssueType || "Other",
      partyName: payload.partyName || payload.clientName || "Client",
      oppositeParty: payload.oppositeParty || "Conflict check pending",
      particulars: payload.particulars || payload.problemSummary || "",
      consultationChannel: payload.consultationChannel || "call",
      urgency: payload.urgency || "standard",
      stage: "Submitted & Paid",
      nextAction: "Legal Connect is completing the conflict check and assigning verified counsel.",
      appearanceRequired: false,
      counsel: null,
      source: payload.source || "booking",
    };
    const created = await db.query(
      `INSERT INTO cases (user_id, title, court, case_number, next_date, status, notes, payload)
       VALUES ($1, $2, $3, $4, NULL, 'Intake', $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        bookingRow.user_id,
        matterPayload.caseTitle,
        payload.court || "Pre-litigation workspace",
        `LC-INTAKE-${String(bookingId).slice(0, 8).toUpperCase()}`,
        matterPayload.particulars || null,
        JSON.stringify(matterPayload),
      ],
    );
    caseRow = created.rows[0] || (await db.query("SELECT * FROM cases WHERE payload->>'bookingId' = $1 LIMIT 1", [bookingId])).rows[0];
  }
  if (!caseRow) return null;

  await db.query(
    `UPDATE bookings SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb WHERE id = $1`,
    [bookingId, JSON.stringify({ caseId: caseRow.id })],
  );
  await db.query(
    `INSERT INTO case_documents (case_id, uploaded_by, file_name, category, storage_key, mime_type, size_bytes, checksum)
     SELECT $1, uploaded_by, file_name, 'Client intake', 'booking-attachment:' || id::text, mime_type, size_bytes, checksum
     FROM booking_attachments attachment
     WHERE booking_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM case_documents document
         WHERE document.case_id = $1 AND document.storage_key = 'booking-attachment:' || attachment.id::text
       )`,
    [caseRow.id, bookingId],
  );
  const communicationExists = await db.query(
    "SELECT 1 FROM case_communications WHERE case_id = $1 AND payload->>'bookingId' = $2 LIMIT 1",
    [caseRow.id, bookingId],
  );
  if (!communicationExists.rows[0]) {
    await db.query(
      `INSERT INTO case_communications (case_id, sender_id, communication_type, title, summary, payload)
       VALUES ($1, $2, 'consultation_request', $3, $4, $5)`,
      [
        caseRow.id,
        bookingRow.user_id,
        `${payload.consultationChannel || "call"} consultation booked`,
        `${booking.serviceType || "Counsel consultation"} payment verified. Assignment is pending.`,
        JSON.stringify({ bookingId, channel: payload.consultationChannel || "call", paymentStatus: "paid" }),
      ],
    );
    await db.query(
      `INSERT INTO case_updates (case_id, update_type, message, payload)
       VALUES ($1, 'intake_paid', 'Counsel intake and payment verified.', $2)`,
      [caseRow.id, JSON.stringify({ bookingId, stage: "Submitted & Paid" })],
    );
  }
  return caseRow.id;
}

async function canAccessStoredCase(authUser, caseRow) {
  if (!authUser || !caseRow) return false;
  if (canSeeAll(authUser)) return true;
  const databaseUserId = await resolveDatabaseUserId(authUser);
  if (!databaseUserId) return false;
  if (String(caseRow.user_id) === String(databaseUserId)) return true;
  if (String(caseRow.payload?.assignedTo || "") === String(databaseUserId)) return true;
  if (authUser.role !== "advocate") return false;
  const assignment = await db.query(
    "SELECT 1 FROM case_assignments WHERE case_id = $1 AND advocate_id = $2 AND status = 'active' LIMIT 1",
    [caseRow.id, databaseUserId],
  );
  return Boolean(assignment.rows[0]);
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
  const payload = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
    ? item.payload
    : {};
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    xpPoints: Number(item.xpPoints ?? item.xp_points ?? 0),
    deadline: item.deadline || null,
    status: item.status || "Open",
    assignedTo: item.assignedTo ?? item.assigned_to ?? null,
    studentId: item.studentId ?? item.student_id ?? null,
    completionEta: item.completionEta ?? item.completion_eta ?? null,
    submissionUrl: item.submissionUrl ?? item.submission_url ?? null,
    submissionNotes: item.submissionNotes ?? item.submission_notes ?? null,
    awardedXp: item.awardedXp ?? item.awarded_xp ?? null,
    reviewedBy: item.reviewedBy ?? item.reviewed_by ?? null,
    reviewedAt: item.reviewedAt ?? item.reviewed_at ?? null,
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    ...payload,
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
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS assigned_to text");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS student_id text");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS completion_eta text");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS submission_url text");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS submission_notes text");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS awarded_xp integer");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS reviewed_by text");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS reviewed_at timestamptz");
  await db.query("ALTER TABLE intern_quests ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb");
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
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
    ? row.payload
    : {};
  return {
    id: row.id,
    userId: row.user_id ?? row.userId ?? null,
    eventType: row.event_type ?? row.eventType ?? null,
    title: row.title,
    message: row.message,
    readAt: row.read_at ?? row.readAt ?? null,
    priority: row.priority || "normal",
    channelLog: row.channel_log || row.channelLog || {},
    payload,
    createdAt: row.created_at ?? row.createdAt ?? null,
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
  try {
    await platformEvents.emitFromAudit(actor, action, targetType, targetId, message, payload || {});
  } catch (_error) {
    // Live bus must never break audit writes.
  }
  return audit;
}

function portalUrl(path = "/") {
  const base = String(config.publicAppUrl || "").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function buildEmailHtml({ title, message, ctaLabel, ctaUrl, recipientName }) {
  const safeTitle = escapeHtml(title || "Legal Connect");
  const safeMessage = escapeHtml(message || "");
  const safeName = escapeHtml(recipientName || "Legal Connect User");
  const safeCta = escapeHtml(ctaLabel || "Open Legal Connect");
  const safeUrl = escapeHtml(ctaUrl || portalUrl("/"));
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td bgcolor="#050b14" align="center" style="padding:28px 16px">
      <span style="color:#cda45e;font-size:22px;font-weight:800;letter-spacing:0.08em">LEGAL CONNECT</span>
      <br><span style="color:#f3ead7;font-size:12px">Serve Dharma. Deliver Justice.</span>
    </td></tr>
    <tr><td bgcolor="#ffffff" style="padding:32px 40px">
      <p style="color:#374151;font-size:14px;margin:0 0 12px">Dear ${safeName},</p>
      <h2 style="color:#050b14;font-size:20px;margin:0 0 8px">${safeTitle}</h2>
      <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px">${safeMessage}</p>
      <div style="margin:28px 0">
        <a href="${safeUrl}" style="background:#cda45e;color:#08111f;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;display:inline-block">${safeCta}</a>
      </div>
    </td></tr>
    <tr><td bgcolor="#050b14" align="center" style="padding:20px;color:#8ca3a3;font-size:11px">
      Legal Connect · UDYAM-DL-11-0164811<br>
      You are receiving this because you have an active account on Legal Connect.
    </td></tr>
  </table>
</body></html>`;
}

async function dispatchEmail({ to, subject, html, text }) {
  try {
    const result = await sendEmail({ to, subject, html, text });
    return {
      ok: Boolean(result?.sent),
      id: result?.id || null,
      reason: result?.reason || result?.safeError || null,
      mode: result?.mode || null,
    };
  } catch (error) {
    return { ok: false, reason: error?.message || "email-failed" };
  }
}

async function dispatchSms({ to, body }) {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
    return { ok: false, reason: "Twilio not configured — SMS skipped" };
  }
  if (!to) return { ok: false, reason: "missing-phone" };
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`;
    const encoded = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString("base64");
    const params = new URLSearchParams({
      To: String(to),
      From: String(config.twilioFromNumber),
      Body: String(body || "").slice(0, 1500),
    });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, reason: data.message || `Twilio status ${response.status}`, status: data.status || null };
    }
    return { ok: true, sid: data.sid || null, status: data.status || null };
  } catch (error) {
    return { ok: false, reason: error?.message || "sms-failed" };
  }
}

function normalizeRecipient(row) {
  if (!row) return null;
  const userId = row.id || row.userId || row.user_id || null;
  if (!userId) return null;
  return {
    userId: String(userId),
    name: row.name || row.full_name || "Legal Connect User",
    email: row.email || null,
    phone: row.phone || null,
    role: row.role || null,
  };
}

async function resolveRecipients(userIds = []) {
  const unique = [...new Set((userIds || []).filter(Boolean).map((id) => String(id)))];
  if (!unique.length) return [];
  if (db.dbAvailable) {
    try {
      const result = await db.query(
        `SELECT id, name, email, phone, role FROM users WHERE id = ANY($1::uuid[])`,
        [unique],
      );
      const found = result.rows.map(normalizeRecipient).filter(Boolean);
      if (found.length) return found;
    } catch {
      // Fall through to text-id / demo lookup when uuid cast fails.
    }
    try {
      const result = await db.query(
        `SELECT id, name, email, phone, role FROM users WHERE id::text = ANY($1::text[])`,
        [unique],
      );
      return result.rows.map(normalizeRecipient).filter(Boolean);
    } catch {
      return [];
    }
  }
  return (demoStore.users || [])
    .filter((user) => unique.includes(String(user.id)))
    .map(normalizeRecipient)
    .filter(Boolean);
}

async function resolveAdminRecipients() {
  if (db.dbAvailable) {
    try {
      const result = await db.query(
        `SELECT id, name, email, phone, role FROM users
         WHERE lower(coalesce(role, '')) IN ('admin', 'rna')
         ORDER BY created_at ASC
         LIMIT 50`,
      );
      return result.rows.map(normalizeRecipient).filter(Boolean);
    } catch {
      return [];
    }
  }
  return (demoStore.users || [])
    .filter((user) => ["admin", "rna"].includes(String(user.role || "").toLowerCase()))
    .map(normalizeRecipient)
    .filter(Boolean);
}

async function resolveInternRecipients() {
  if (db.dbAvailable) {
    try {
      const result = await db.query(
        `SELECT id, name, email, phone, role FROM users
         WHERE lower(coalesce(role, '')) = 'intern'
         ORDER BY created_at DESC
         LIMIT 100`,
      );
      return result.rows.map(normalizeRecipient).filter(Boolean);
    } catch {
      return [];
    }
  }
  return (demoStore.users || [])
    .filter((user) => String(user.role || "").toLowerCase() === "intern")
    .map(normalizeRecipient)
    .filter(Boolean);
}

/**
 * notify() — Central 360° dispatcher (in-app + email + optional SMS).
 * Never throws to callers.
 */
async function notify({
  eventType,
  title,
  message,
  recipients = [],
  payload = {},
  sendEmail: shouldEmail = true,
  sendSms = false,
  ctaLabel = "Open Legal Connect",
  ctaUrl = null,
  priority = "normal",
} = {}) {
  const channelLog = { inApp: [], email: [], sms: [] };
  const list = (recipients || []).map(normalizeRecipient).filter(Boolean);
  if (!list.length) return channelLog;
  const finalCtaUrl = ctaUrl || portalUrl("/");
  const jobs = [];

  for (const recipient of list) {
    jobs.push((async () => {
      const entry = {
        id: `notification-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        userId: recipient.userId,
        eventType,
        title,
        message,
        payload,
        priority,
        channelLog: { inApp: "delivered" },
        createdAt: new Date().toISOString(),
        readAt: null,
      };
      try {
        if (db.dbAvailable) {
          await db.query(
            `INSERT INTO notifications (user_id, event_type, title, message, payload, priority, channel_log)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              recipient.userId,
              eventType,
              title,
              message,
              JSON.stringify(payload || {}),
              priority || "normal",
              JSON.stringify({ inApp: "delivered" }),
            ],
          );
        } else if (config.nodeEnv !== "production") {
          demoStore.notifications.unshift(entry);
        }
        channelLog.inApp.push({ userId: recipient.userId, status: "delivered" });
      } catch (error) {
        channelLog.inApp.push({ userId: recipient.userId, status: "failed", reason: error?.message || "in-app-failed" });
      }
    })());

    if (shouldEmail && recipient.email) {
      jobs.push((async () => {
        const html = buildEmailHtml({
          title,
          message,
          ctaLabel,
          ctaUrl: finalCtaUrl,
          recipientName: recipient.name,
        });
        const result = await dispatchEmail({
          to: recipient.email,
          subject: title,
          html,
          text: `${title}\n\n${message}\n\n${finalCtaUrl}`,
        });
        channelLog.email.push({
          email: maskEmail(recipient.email),
          status: result.ok ? "sent" : "failed",
          reason: result.reason || null,
        });
      })());
    }

    if (sendSms && recipient.phone) {
      jobs.push((async () => {
        const result = await dispatchSms({
          to: recipient.phone,
          body: `[Legal Connect] ${title}: ${message}`.slice(0, 480),
        });
        channelLog.sms.push({
          phone: maskPhone(recipient.phone),
          status: result.ok ? "sent" : "failed",
          reason: result.reason || null,
        });
        if (!result.ok && /Twilio not configured/i.test(String(result.reason || ""))) {
          console.info("SMS skipped: Twilio not configured");
        }
      })());
    }
  }

  await Promise.allSettled(jobs);
  try {
    await platformEvents.emitFromNotify({
      eventType,
      title,
      message,
      payload,
      actor: payload?.actor || null,
      recipients: list,
    });
  } catch (_error) {
    // Live bus must never break notification delivery.
  }
  return channelLog;
}

async function createNotification(eventType, title, message, payload = {}, userId = null) {
  if (!userId) {
    // Broadcast-style null userId rows are retained for admin-visible system notices.
    const notification = {
      id: `notification-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      userId: null,
      eventType,
      title,
      message,
      payload,
      priority: "normal",
      channelLog: { inApp: "delivered" },
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    try {
      if (db.dbAvailable) {
        await db.query(
          `INSERT INTO notifications (user_id, event_type, title, message, payload, priority, channel_log)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [null, eventType, title, message, JSON.stringify(payload || {}), "normal", JSON.stringify({ inApp: "delivered" })],
        );
      } else if (config.nodeEnv !== "production") {
        demoStore.notifications.unshift(notification);
      }
    } catch (error) {
      console.warn("createNotification failed:", error?.message || error);
    }
    return notification;
  }
  const [recipient] = await resolveRecipients([userId]);
  await notify({
    eventType,
    title,
    message,
    payload,
    recipients: [recipient || { userId, name: "Legal Connect User" }],
    sendEmail: false,
    sendSms: false,
  });
  return { userId, eventType, title, message, payload };
}

async function markNotificationRead(authUser, notificationId) {
  if (!authUser?.id || !notificationId) return false;
  if (db.dbAvailable) {
    if (canSeeAll(authUser)) {
      await db.query("UPDATE notifications SET read_at = now() WHERE id = $1", [notificationId]);
    } else {
      await db.query(
        "UPDATE notifications SET read_at = now() WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)",
        [notificationId, authUser.id],
      );
    }
    return true;
  }
  if (config.nodeEnv === "production") return false;
  const item = demoStore.notifications.find((notification) => (
    String(notification.id) === String(notificationId)
    && (canSeeAll(authUser) || !notification.userId || String(notification.userId) === String(authUser.id))
  ));
  if (item) item.readAt = new Date().toISOString();
  return Boolean(item);
}

async function markAllNotificationsRead(authUser) {
  if (!authUser?.id) return 0;
  if (db.dbAvailable) {
    const result = await db.query(
      "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
      [authUser.id],
    );
    return result.rowCount || 0;
  }
  if (config.nodeEnv === "production") return 0;
  let count = 0;
  for (const item of demoStore.notifications) {
    if (String(item.userId) === String(authUser.id) && !item.readAt) {
      item.readAt = new Date().toISOString();
      count += 1;
    }
  }
  return count;
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
    const canonicalAssetPath = path.join(frontendPublicDir, safePath);
    const canonicalAssetExists = canonicalAssetPath.startsWith(frontendPublicDir)
      && fs.existsSync(canonicalAssetPath)
      && !fs.statSync(canonicalAssetPath).isDirectory();
    if (canonicalAssetExists) {
      filePath = canonicalAssetPath;
    } else if (/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json|map)$/i.test(safePath)) {
      sendJson(res, 404, { error: "Asset not found" });
      return;
    } else {
      filePath = path.join(publicDir, "index.html");
    }
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 500, { error: "Unable to read file" });
      return;
    }
    const isHtml = path.extname(filePath).toLowerCase() === ".html";
    const isFingerprintAsset = /[\\/]assets[\\/].+-[a-zA-Z0-9_-]{8,}\.[^.]+$/.test(filePath);
    const cacheControl = isHtml
      ? "no-cache, no-store, must-revalidate"
      : isFingerprintAsset
        ? "public, max-age=31536000, immutable"
        : "public, max-age=86400";
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    res.end(data);
  });
}

const strategyFeatures = createStrategyFeatures({
  db,
  config,
  notify,
  resolveRecipients,
  resolveAdminRecipients,
  portalUrl,
  sendJson,
  readBody,
  readRawBody,
  // Live lookup: getAuthUser is later wrapped with strict JWT decoding.
  getAuthUser: (req) => getAuthUser(req),
  canSeeAll: (user) => canSeeAll(user),
  mapTask,
  mapCase,
  writeAuditLog,
  createReceipt,
  escapeHtml,
  sendEmail,
  demoStore,
  isUuid,
  safeAttachmentName,
  dispatchSms,
});

const workflowProgressions = createWorkflowProgressions({
  db,
  notify,
  resolveRecipients,
  resolveAdminRecipients,
  portalUrl,
  sendJson,
  readBody,
  getAuthUser: (req) => getAuthUser(req),
  canSeeAll: (user) => canSeeAll(user),
  mapTask,
  mapInternQuest,
  mapBooking,
  writeAuditLog,
  demoStore,
  ensureInternQuestsTable,
});

const server = http.createServer(async (req, res) => {
  res.localsCorsOrigin = corsOriginFor(req);
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (await strategyFeatures.handleStrategyRoutes(req, res, url)) {
    return;
  }

  if (await workflowProgressions.handleWorkflowRoutes(req, res, url)) {
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

  if (url.pathname === "/api/healthz") {
    sendJson(res, 200, {
      ok: true,
      status: "ok",
      app: "Legal Connect",
      started_at: SERVER_STARTED_AT,
    });
    return;
  }

  if (url.pathname === "/health" || url.pathname === "/api/health") {
    const dbHealth = await db.healthCheck();
    const lawbotCounts = dbHealth.connected || config.nodeEnv !== "production"
      ? await lawbotHealthCounts()
      : { approved_sources_count: 0, legal_chunks_count: 0 };
    const version = appVersionPayload();
    const otpStatus = otpRuntimeStatus();
    sendJson(res, 200, {
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

  // Admin-only hard reset of operational data (cases, bookings, tasks, quests, receipts, etc.).
  // Keeps the developer/admin account and legal source library. Requires explicit confirmation phrase.
  if (url.pathname === "/api/admin/reset-operational-data" && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const body = await readBody(req);
    const confirm = String(body.confirm || "").trim();
    if (confirm !== "RESET_OPERATIONAL_DATA") {
      sendJson(res, 400, {
        ok: false,
        error: 'Send {"confirm":"RESET_OPERATIONAL_DATA"} to wipe operational data.',
      });
      return;
    }
    const keepEmail = String(body.keepEmail || authUser.email || "karannagpal16@gmail.com").trim().toLowerCase();
    const removeOtherUsers = body.removeOtherUsers !== false;

    const operationalTables = [
      "case_update_replies",
      "case_updates",
      "case_assignments",
      "case_documents",
      "case_communications",
      "case_fees",
      "booking_attachments",
      "chamber_tasks",
      "chamber_members",
      "chambers",
      "bookings",
      "cases",
      "payments",
      "tasks",
      "task_ratings",
      "grievances",
      "engagement_agreements",
      "reminder_jobs",
      "lawbot_chats",
      "lawbot_feedback",
      "lawbot_queries",
      "sos_requests",
      "notifications",
      "receipts",
      "intern_quests",
      "audit_logs",
      "account_deletion_requests",
      "identity_verifications",
      "otp_codes",
      "login_verifications",
      "password_reset_tokens",
      "sessions",
      "platform_events",
    ];

    if (!db.dbAvailable) {
      if (config.nodeEnv === "production") {
        sendJson(res, 503, { ok: false, error: "Database is unavailable; cannot reset operational data." });
        return;
      }
      demoStore.cases = [];
      demoStore.bookings = [];
      demoStore.tasks = [];
      demoStore.internQuests = [];
      demoStore.caseUpdates = [];
      demoStore.sosRequests = [];
      demoStore.notifications = [];
      demoStore.receipts = [];
      demoStore.auditLogs = [];
      demoStore.verifications = [];
      demoStore.deletionRequests = [];
      demoStore.users = (demoStore.users || []).filter((user) => String(user.email || "").toLowerCase() === keepEmail);
      sendJson(res, 200, {
        ok: true,
        mode: "demo",
        message: "Local demo operational data cleared.",
        keptEmail: keepEmail,
        counts: {
          cases: 0,
          bookings: 0,
          tasks: 0,
          quests: 0,
          notifications: 0,
          receipts: 0,
          users: demoStore.users.length,
        },
      });
      return;
    }

    const existing = await db.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [operationalTables],
    );
    const present = existing.rows.map((row) => row.tablename);
    const before = {};
    for (const table of present) {
      const countResult = await db.query(`SELECT count(*)::int AS count FROM ${table}`);
      before[table] = countResult.rows[0].count;
    }

    if (present.length) {
      // Identifiers come from the allow-list above, never from request input.
      await db.query(`TRUNCATE TABLE ${present.join(", ")} RESTART IDENTITY CASCADE`);
    }
    platformEvents.clearRing();

    let removedUsers = [];
    if (removeOtherUsers) {
      const deleted = await db.query(
        `DELETE FROM users WHERE lower(coalesce(email, '')) <> $1 RETURNING id, email, name, role`,
        [keepEmail],
      );
      removedUsers = deleted.rows;
    }

    const afterUsers = await db.query("SELECT count(*)::int AS count FROM users");
    await writeAuditLog(
      authUser,
      "operational_data_reset",
      "system",
      "all",
      "Operational data wiped to a fresh zero state.",
      { keepEmail, removedUsers: removedUsers.map((row) => row.email), before },
    );

    sendJson(res, 200, {
      ok: true,
      mode: "database",
      message: "Operational data wiped. Platform starts from zero.",
      keptEmail: keepEmail,
      removedUsers,
      truncatedTables: present,
      before,
      counts: {
        users: afterUsers.rows[0].count,
        cases: 0,
        bookings: 0,
        tasks: 0,
        quests: 0,
        notifications: 0,
        receipts: 0,
      },
    });
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
    // SECURITY: Demo login is completely disabled in production to prevent unauthenticated access.
    if (config.nodeEnv === "production") {
      await writeAuditLog({ role: "system" }, "demo_login_blocked", "auth", "demo-login", "Demo login attempt blocked in production.", { ip: req.socket?.remoteAddress });
      sendJson(res, 403, { ok: false, error: "Demo authentication is disabled in production. Please register and log in with OTP verification." });
      return;
    }
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
      {
        const selfRecipients = await resolveRecipients([authUser.id]);
        const admins = await resolveAdminRecipients();
        await notify({
          eventType: "account_deletion_requested",
          title: "Account deletion request received",
          message,
          recipients: [...selfRecipients, ...admins],
          payload: { requestId: deletionRequest.id },
          sendEmail: true,
          sendSms: false,
          ctaLabel: "Open Legal Connect",
          ctaUrl: portalUrl("/admin"),
          priority: "high",
        });
      }
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
    {
      const selfRecipients = await resolveRecipients([authUser.id]);
      const admins = await resolveAdminRecipients();
      await notify({
        eventType: "account_deletion_requested",
        title: "Account deletion request received",
        message,
        recipients: [...selfRecipients, ...admins],
        payload: { requestId: deletionRequest.id },
        sendEmail: true,
        sendSms: false,
        ctaLabel: "Open Legal Connect",
        ctaUrl: portalUrl("/admin"),
        priority: "high",
      });
    }
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

  // Admin advocate picker — returns Bar-verified advocates for the Admin Assignment Desk.
  if (url.pathname === "/api/admin/advocates" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "Admin access required" });
      return;
    }
    if (db.dbAvailable) {
      const result = await db.query(`
        SELECT
          u.id,
          u.name,
          u.email,
          u.phone,
          pa.enrollment_no AS "enrollmentNo",
          pa.state_bar_council AS "stateBarCouncil",
          pa.practice_courts AS "practiceCourts",
          pa.years_practice AS "yearsPractice",
          pa.verification_status AS "verificationStatus",
          pa.bar_council_id AS "barCouncilId",
          (SELECT COUNT(*) FROM cases WHERE payload->>'assignedTo' = u.id::text AND status = 'Active') AS "activeCasesCount"
        FROM users u
        JOIN profile_advocates pa ON pa.user_id = u.id
        WHERE pa.verification_status IN ('approved', 'verified')
          AND (u.role = 'advocate' OR lower(coalesce(u.email, '')) = lower($1))
        ORDER BY pa.enrollment_no ASC
      `, [MASTER_TEST_LOGIN.email]);
      sendJson(res, 200, result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        emailMasked: maskEmail(row.email),
        phoneMasked: maskPhone(row.phone),
        enrollmentNo: row.enrollmentNo || "Pending",
        stateBarCouncil: row.stateBarCouncil || "Not recorded",
        practiceCourts: row.practiceCourts || "",
        yearsPractice: Number(row.yearsPractice || 0),
        verificationStatus: row.verificationStatus || "pending",
        activeCasesCount: Number(row.activeCasesCount || 0),
      })));
      return;
    }
    // Demo fallback — synthetic bar-verified advocate list
    sendJson(res, 200, [
      { id: "demo-advocate", name: "Adv. Rishika Nagpal", emailMasked: "r****@demo.legal-connect.in", phoneMasked: "+91 ****00002", enrollmentNo: "D/1482/2018", stateBarCouncil: "Bar Council of Delhi", practiceCourts: "Delhi High Court, Saket, Tis Hazari, Rohini", yearsPractice: 8, verificationStatus: "approved", activeCasesCount: 3 },
      { id: "demo-advocate-2", name: "Adv. Aarav Mehta", emailMasked: "a****@example.in", phoneMasked: "+91 ****00099", enrollmentNo: "D/2104/2019", stateBarCouncil: "Bar Council of Delhi", practiceCourts: "Delhi High Court, Saket", yearsPractice: 5, verificationStatus: "approved", activeCasesCount: 1 },
    ]);
    return;
  }

  // Admin Control Desk — aggregated supervision snapshot.
  if (url.pathname === "/api/admin/control-desk" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    if (!db.dbAvailable) {
      sendJson(res, 200, {
        ok: true,
        mode: "demo",
        cases: (demoStore.cases || []).slice(0, 40).map(dashboardCase),
        bookings: (demoStore.bookings || []).slice(0, 40).map(dashboardBooking),
        tasks: (demoStore.tasks || []).slice(0, 40).map(dashboardTask),
        advocates: [],
        pendingUpdates: (demoStore.caseUpdates || []).filter((item) => item.status === "pending_lc_review"),
      });
      return;
    }
    const [cases, bookings, tasks, advocates, pendingUpdates, pendingReplies] = await Promise.all([
      db.query("SELECT * FROM cases ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 80"),
      db.query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 80"),
      db.query("SELECT * FROM tasks ORDER BY created_at DESC LIMIT 80"),
      db.query(`
        SELECT u.id, u.name, u.email, u.phone,
               pa.enrollment_no AS "enrollmentNo",
               pa.verification_status AS "verificationStatus"
        FROM users u
        JOIN profile_advocates pa ON pa.user_id = u.id
        WHERE pa.verification_status IN ('approved', 'verified')
          AND (u.role = 'advocate' OR lower(coalesce(u.email, '')) = $1)
        ORDER BY u.name ASC
        LIMIT 100
      `, [MASTER_TEST_LOGIN.email]),
      db.query(`SELECT * FROM case_updates WHERE status = 'pending_lc_review' ORDER BY created_at ASC LIMIT 50`).catch(() => ({ rows: [] })),
      db.query(`SELECT * FROM case_update_replies WHERE status = 'pending_lc_review' ORDER BY created_at ASC LIMIT 50`).catch(() => ({ rows: [] })),
    ]);
    sendJson(res, 200, {
      ok: true,
      cases: cases.rows.map(mapCase),
      bookings: bookings.rows.map(mapBooking),
      tasks: tasks.rows.map(mapTask),
      advocates: advocates.rows.map((row) => ({
        id: row.id,
        name: row.name,
        emailMasked: maskEmail(row.email),
        phoneMasked: maskPhone(row.phone),
        enrollmentNo: row.enrollmentNo || null,
        verificationStatus: row.verificationStatus || "pending",
      })),
      pendingUpdates: pendingUpdates.rows || [],
      pendingReplies: pendingReplies.rows || [],
    });
    return;
  }

  // Assign a matter to verified counsel and notify both sides.
  const adminCaseAssignMatch = url.pathname.match(/^\/api\/admin\/cases\/([^/]+)\/assign$/);
  if (adminCaseAssignMatch && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const caseId = adminCaseAssignMatch[1];
    const body = await readBody(req);
    const advocateId = String(body.advocateId || body.assignedAdvocateId || body.assignedTo || "").trim();
    const note = String(body.note || body.message || "").trim();
    if (!advocateId) {
      sendJson(res, 400, { ok: false, error: "Select an advocate to assign." });
      return;
    }
    if (!db.dbAvailable) {
      sendJson(res, 200, { ok: true, mode: "demo", caseId, advocateId, note });
      return;
    }
    if (!isUuid(caseId) || !isUuid(advocateId)) {
      sendJson(res, 400, { ok: false, error: "Valid case and advocate ids are required." });
      return;
    }
    const [matterResult, advocateResult] = await Promise.all([
      db.query("SELECT * FROM cases WHERE id = $1 LIMIT 1", [caseId]),
      db.query("SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1", [advocateId]),
    ]);
    if (!matterResult.rows[0]) {
      sendJson(res, 404, { ok: false, error: "Case not found." });
      return;
    }
    if (!advocateResult.rows[0] || advocateResult.rows[0].role !== "advocate") {
      sendJson(res, 404, { ok: false, error: "Advocate not found." });
      return;
    }
    const advocate = advocateResult.rows[0];
    const matter = mapCase(matterResult.rows[0]);
    const enrollment = await db.query(
      "SELECT enrollment_no FROM profile_advocates WHERE user_id = $1 LIMIT 1",
      [advocateId],
    ).catch(() => ({ rows: [] }));
    await db.query(
      `INSERT INTO case_assignments (case_id, advocate_id, assigned_by, status, assigned_at)
       VALUES ($1, $2, $3, 'active', now())
       ON CONFLICT (case_id, advocate_id)
       DO UPDATE SET status = 'active', assigned_by = EXCLUDED.assigned_by, assigned_at = now(), ended_at = NULL`,
      [caseId, advocateId, isUuid(authUser.id) ? authUser.id : null],
    );
    await db.query(
      `UPDATE case_assignments
       SET status = 'ended', ended_at = now()
       WHERE case_id = $1 AND advocate_id <> $2 AND status = 'active'`,
      [caseId, advocateId],
    ).catch(() => undefined);
    const enrollmentNo = enrollment.rows[0]?.enrollment_no || null;
    const maskedCounsel = maskCounselForClient(advocate.name, enrollmentNo);
    const counsel = {
      name: advocate.name,
      enrollment: enrollmentNo,
      assignedAt: new Date().toISOString(),
      contactPolicy: "Coordinate through Legal Connect Admin.",
      clientDisplayName: maskedCounsel.displayName,
    };
    const updated = await db.query(
      `UPDATE cases
       SET status = CASE WHEN COALESCE(status, '') IN ('', 'Intake', 'Pending') THEN 'Active' ELSE status END,
           payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [caseId, JSON.stringify({
        assignedTo: advocateId,
        assignedAdvocateId: advocateId,
        assignedAdvocateName: advocate.name,
        counsel,
        assignmentNote: note || null,
        assignedByAdmin: authUser.id,
        assignedAt: new Date().toISOString(),
        // Client-facing copy must stay initials-masked (Bar Council / LC gate).
        nextAction: `Counsel assigned: ${maskedCounsel.displayName}. Legal Connect continues to supervise communications.`,
      })],
    );
    const bookingId = matter.bookingId || matterResult.rows[0].payload?.bookingId || null;
    if (bookingId) {
      await db.query(
        `UPDATE bookings
         SET assigned_advocate_id = $2,
             assigned_advocate_name = $3,
             assigned_advocate_enrollment = $4,
             stage_status = COALESCE(stage_status, 'acknowledged_and_assigned'),
             payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb
         WHERE id::text = $1 OR id = CASE WHEN $1 ~* '^[0-9a-f-]{36}$' THEN $1::uuid ELSE NULL END`,
        [
          String(bookingId),
          advocateId,
          advocate.name,
          enrollmentNo,
          JSON.stringify({
            stageStatus: "acknowledged_and_assigned",
            assignedAdvocateId: advocateId,
            assignedAdvocateName: advocate.name,
            clientCounselDisplayName: maskedCounsel.displayName,
          }),
        ],
      ).catch(() => undefined);
    }
    await writeAuditLog(authUser, "case_assigned", "case", caseId, `Assigned ${advocate.name} to matter`, {
      advocateId,
      note: note || null,
    });
    await notify({
      eventType: "case_assigned",
      title: "Counsel assigned by Legal Connect",
      message: `${maskedCounsel.displayName}${maskedCounsel.enrollment ? ` (${maskedCounsel.enrollment})` : ""} has been assigned to ${matter.title || matter.caseTitle || "your matter"}. Legal Connect remains the supervisor.`,
      recipients: await resolveRecipients([matter.userId].filter(Boolean)),
      payload: {
        caseId,
        advocateId,
        advocateName: maskedCounsel.displayName,
        enrollment: maskedCounsel.enrollment,
        fullNameHidden: true,
      },
      sendEmail: true,
      sendSms: true,
      ctaLabel: "Open matter",
      ctaUrl: portalUrl("/client"),
      priority: "high",
    });
    await notify({
      eventType: "case_assigned",
      title: "New matter assigned by Legal Connect",
      message: note
        ? `You were assigned a supervised matter. LC briefing: ${note}`
        : `You were assigned ${matter.title || matter.caseTitle || "a supervised matter"}. Review and proceed under LC supervision.`,
      recipients: await resolveRecipients([advocateId].filter(Boolean)),
      payload: { caseId, advocateId, clientId: matter.userId || null },
      sendEmail: true,
      sendSms: true,
      ctaLabel: "Open matter",
      ctaUrl: portalUrl("/advocate"),
      priority: "high",
    });
    sendJson(res, 200, { ok: true, case: mapCase(updated.rows[0]), advocate: { id: advocate.id, name: advocate.name } });
    return;
  }

  // Assign counsel from a booking (intake desk) and sync the linked case.
  const adminBookingAssignMatch = url.pathname.match(/^\/api\/admin\/bookings\/([^/]+)\/assign$/);
  if (adminBookingAssignMatch && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const bookingId = adminBookingAssignMatch[1];
    const body = await readBody(req);
    const advocateId = String(body.advocateId || body.assignedAdvocateId || "").trim();
    const note = String(body.note || "").trim();
    if (!advocateId) {
      sendJson(res, 400, { ok: false, error: "Select an advocate to assign." });
      return;
    }
    if (!db.dbAvailable) {
      sendJson(res, 200, { ok: true, mode: "demo", bookingId, advocateId });
      return;
    }
    const bookingResult = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [bookingId]);
    if (!bookingResult.rows[0]) {
      sendJson(res, 404, { ok: false, error: "Booking not found." });
      return;
    }
    const advocateResult = await db.query("SELECT id, name, role FROM users WHERE id = $1 LIMIT 1", [advocateId]);
    if (!advocateResult.rows[0] || advocateResult.rows[0].role !== "advocate") {
      sendJson(res, 404, { ok: false, error: "Advocate not found." });
      return;
    }
    const advocate = advocateResult.rows[0];
    const enrollment = await db.query(
      "SELECT enrollment_no FROM profile_advocates WHERE user_id = $1 LIMIT 1",
      [advocateId],
    ).catch(() => ({ rows: [] }));
    const enrollmentNo = enrollment.rows[0]?.enrollment_no || null;
    const maskedCounsel = maskCounselForClient(advocate.name, enrollmentNo);
    const updatedBooking = await db.query(
      `UPDATE bookings
       SET assigned_advocate_id = $2,
           assigned_advocate_name = $3,
           assigned_advocate_enrollment = $4,
           stage_status = 'acknowledged_and_assigned',
           payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb
       WHERE id = $1
       RETURNING *`,
      [
        bookingId,
        advocateId,
        advocate.name,
        enrollmentNo,
        JSON.stringify({
          stageStatus: "acknowledged_and_assigned",
          assignedAdvocateId: advocateId,
          assignedAdvocateName: advocate.name,
          clientCounselDisplayName: maskedCounsel.displayName,
          assignmentNote: note || null,
        }),
      ],
    );
    let linkedCase = null;
    const linked = await db.query(
      `SELECT * FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
      [String(bookingId)],
    ).catch(() => ({ rows: [] }));
    if (linked.rows[0]) {
      const caseId = linked.rows[0].id;
      await db.query(
        `INSERT INTO case_assignments (case_id, advocate_id, assigned_by, status, assigned_at)
         VALUES ($1, $2, $3, 'active', now())
         ON CONFLICT (case_id, advocate_id)
         DO UPDATE SET status = 'active', assigned_by = EXCLUDED.assigned_by, assigned_at = now(), ended_at = NULL`,
        [caseId, advocateId, isUuid(authUser.id) ? authUser.id : null],
      );
      const caseUpdated = await db.query(
        `UPDATE cases
         SET status = CASE WHEN COALESCE(status, '') IN ('', 'Intake', 'Pending') THEN 'Active' ELSE status END,
             payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
             updated_at = now()
         WHERE id = $1 RETURNING *`,
        [caseId, JSON.stringify({
          assignedTo: advocateId,
          assignedAdvocateId: advocateId,
          assignedAdvocateName: advocate.name,
          counsel: {
            name: advocate.name,
            enrollment: enrollmentNo,
            assignedAt: new Date().toISOString(),
            clientDisplayName: maskedCounsel.displayName,
          },
          nextAction: `Counsel assigned: ${maskedCounsel.displayName}.`,
        })],
      );
      linkedCase = mapCase(caseUpdated.rows[0]);
    }
    const booking = mapBooking(updatedBooking.rows[0]);
    await writeAuditLog(authUser, "booking_assigned", "booking", bookingId, `Assigned ${advocate.name} to booking`, { advocateId });
    await notify({
      eventType: "booking_assigned",
      title: "Legal Connect assigned your counsel",
      message: `${maskedCounsel.displayName}${maskedCounsel.enrollment ? ` (${maskedCounsel.enrollment})` : ""} has been assigned to your booking. Legal Connect will supervise the engagement.`,
      recipients: await resolveRecipients([booking.userId].filter(Boolean)),
      payload: {
        bookingId,
        advocateId,
        caseId: linkedCase?.id || null,
        advocateName: maskedCounsel.displayName,
        enrollment: maskedCounsel.enrollment,
        fullNameHidden: true,
      },
      sendEmail: true,
      sendSms: true,
      ctaLabel: "Open workspace",
      ctaUrl: portalUrl("/client"),
      priority: "high",
    });
    await notify({
      eventType: "booking_assigned",
      title: "New booking assigned by Legal Connect",
      message: note
        ? `You were assigned a supervised booking. LC briefing: ${note}`
        : "You were assigned a supervised booking. Review the brief under Legal Connect supervision.",
      recipients: await resolveRecipients([advocateId].filter(Boolean)),
      payload: { bookingId, advocateId, caseId: linkedCase?.id || null, clientId: booking.userId || null },
      sendEmail: true,
      sendSms: true,
      ctaLabel: "Open bookings",
      ctaUrl: portalUrl("/advocate/bookings"),
      priority: "high",
    });
    sendJson(res, 200, { ok: true, booking, case: linkedCase, advocate: { id: advocate.id, name: advocate.name } });
    return;
  }

  // LC-authored client update (published immediately as supervisor message).
  const adminLcMessageMatch = url.pathname.match(/^\/api\/admin\/cases\/([^/]+)\/lc-message$/);
  if (adminLcMessageMatch && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const caseId = adminLcMessageMatch[1];
    const body = await readBody(req);
    const message = String(body.message || body.update || "").trim();
    if (message.length < 8) {
      sendJson(res, 400, { ok: false, error: "LC update must be at least 8 characters." });
      return;
    }
    const rule36 = strategyFeatures.assertRule36Safe(message);
    if (!rule36.ok) {
      sendJson(res, 422, { ok: false, error: rule36.error });
      return;
    }
    if (!db.dbAvailable) {
      sendJson(res, 201, {
        ok: true,
        mode: "demo",
        update: {
          id: `update-${Date.now()}`,
          caseId,
          message,
          status: "approved",
          authorRole: "admin",
        },
      });
      return;
    }
    if (!isUuid(caseId)) {
      sendJson(res, 400, { ok: false, error: "Valid case id is required." });
      return;
    }
    const matterResult = await db.query("SELECT * FROM cases WHERE id = $1 LIMIT 1", [caseId]);
    if (!matterResult.rows[0]) {
      sendJson(res, 404, { ok: false, error: "Case not found." });
      return;
    }
    const matter = mapCase(matterResult.rows[0]);
    const created = await db.query(
      `INSERT INTO case_updates (case_id, update_type, message, payload, status, author_id, author_role, reviewed_by, reviewed_at)
       VALUES ($1, $2, $3, $4::jsonb, 'approved', $5, 'admin', $5, now())
       RETURNING *`,
      [
        caseId,
        body.updateType || "lc_supervisor",
        message,
        JSON.stringify({ source: "admin_control_desk", publishImmediately: true }),
        String(authUser.id),
      ],
    );
    const assignedId = matter.assignedTo || matter.assignedAdvocateId || null;
    await notify({
      eventType: "lc_supervisor_update",
      title: "Update from Legal Connect",
      message,
      recipients: await resolveRecipients([matter.userId, assignedId].filter(Boolean)),
      payload: { caseId, updateId: created.rows[0].id },
      sendEmail: true,
      sendSms: Boolean(body.sendSms),
      ctaLabel: "View update",
      ctaUrl: portalUrl("/client/updates"),
      priority: "high",
    });
    await writeAuditLog(authUser, "lc_client_update", "case", caseId, "LC supervisor update published to client", {
      updateId: created.rows[0].id,
    });
    sendJson(res, 201, { ok: true, update: created.rows[0] });
    return;
  }

  // ── Admin Master Intake Supervision Deck ──────────────────────────────────
  async function loadIntakeBooking(intakeId) {
    if (!db.dbAvailable) {
      const row = (demoStore.bookings || []).find((item) => String(item.id) === String(intakeId));
      return row ? { mode: "demo", booking: dashboardBooking(row), raw: row } : null;
    }
    const result = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [intakeId]);
    if (!result.rows[0]) return null;
    return { mode: "db", booking: mapBooking(result.rows[0]), raw: result.rows[0] };
  }

  if (url.pathname === "/api/admin/intakes" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    if (!db.dbAvailable) {
      sendJson(res, 200, {
        ok: true,
        intakes: (demoStore.bookings || []).map((row) => ({
          ...dashboardBooking(row),
          intakeStatus: row.intakeStatus || row.stageStatus || row.paymentStatus || "pending",
        })),
        advocates: [],
      });
      return;
    }
    const [bookings, advocates] = await Promise.all([
      db.query("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 120"),
      db.query(`
        SELECT u.id, u.name, u.email, u.phone,
               pa.enrollment_no AS "enrollmentNo",
               pa.verification_status AS "verificationStatus"
        FROM users u
        JOIN profile_advocates pa ON pa.user_id = u.id
        WHERE pa.verification_status IN ('approved', 'verified')
          AND (u.role = 'advocate' OR lower(coalesce(u.email, '')) = $1)
        ORDER BY u.name ASC
      `, [MASTER_TEST_LOGIN.email]).catch(() => db.query(`SELECT id, name, email, phone FROM users WHERE role = 'advocate' ORDER BY name ASC`)),
    ]);
    sendJson(res, 200, {
      ok: true,
      intakes: bookings.rows.map((row) => {
        const mapped = mapBooking(row);
        const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
        const intakeStatus = payload.intakeStatus
          || row.stage_status
          || mapped.stageStatus
          || (["payment_pending", "Pending", "pending"].includes(String(mapped.paymentStatus || "")) ? "draft" : null)
          || mapped.paymentStatus
          || "draft";
        return {
          ...mapped,
          intakeStatus,
          pipeline: pipelineProgress(intakeStatus),
          sla: slaClock(row.verified_at || row.created_at || mapped.verifiedAt || mapped.createdAt, INTAKE_SLA_MS),
          missingDocuments: payload.missingDocuments || [],
          lastLcNote: payload.lastLcNote || null,
          rejectionReason: payload.rejectionReason || null,
        };
      }),
      advocates: (advocates.rows || []).map((row) => ({
        id: row.id,
        name: row.name,
        emailMasked: maskEmail(row.email),
        phoneMasked: maskPhone(row.phone),
        enrollmentNo: row.enrollmentNo || null,
        verificationStatus: row.verificationStatus || "approved",
      })),
    });
    return;
  }

  const intakeActionMatch = url.pathname.match(/^\/api\/admin\/intakes\/([^/]+)\/(assign|request-info|guidance|refund)$/);
  if (intakeActionMatch && req.method === "POST") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    const intakeId = intakeActionMatch[1];
    const action = intakeActionMatch[2];
    const body = await readBody(req);
    const loaded = await loadIntakeBooking(intakeId);
    if (!loaded) {
      sendJson(res, 404, { ok: false, error: "Intake booking not found." });
      return;
    }
    const booking = loaded.booking;
    const clientId = booking.userId || booking.user_id || null;

    if (action === "assign") {
      const advocateId = String(body.advocateId || body.assignedAdvocateId || body.lawyerId || "").trim();
      const note = String(body.note || body.message || "").trim();
      if (!advocateId) {
        sendJson(res, 400, { ok: false, error: "Select a Bar-verified panel lawyer." });
        return;
      }
      if (loaded.mode === "demo") {
        const demoMasked = maskCounselForClient(body.advocateName || "Assigned counsel", body.enrollmentNo || null);
        Object.assign(loaded.raw, {
          assignedAdvocateId: advocateId,
          // Client-visible field stays initials-masked even in demo memory mode.
          assignedAdvocateName: demoMasked.displayName,
          assignedAdvocateEnrollment: body.enrollmentNo || null,
          stageStatus: "advocate_assigned",
          intakeStatus: "advocate_assigned",
        });
        sendJson(res, 200, { ok: true, intake: dashboardBooking(loaded.raw), action: "assign" });
        return;
      }
      const advocateResult = await db.query(
        `SELECT u.id, u.name, u.role, u.email,
                pa.enrollment_no,
                pa.verification_status
         FROM users u
         LEFT JOIN profile_advocates pa ON pa.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [advocateId],
      );
      const advocate = advocateResult.rows[0];
      const barVerified = ["approved", "verified"].includes(String(advocate?.verification_status || "").toLowerCase());
      const isPanelLawyer = advocate
        && (advocate.role === "advocate" || (isMasterTestEmail(advocate.email) && barVerified));
      if (!advocate || !isPanelLawyer || !barVerified) {
        sendJson(res, 404, { ok: false, error: "Bar-verified panel lawyer not found." });
        return;
      }
      const enrollment = { rows: advocate.enrollment_no ? [{ enrollment_no: advocate.enrollment_no }] : [] };
      const updated = await db.query(
        `UPDATE bookings
         SET assigned_advocate_id = $2,
             assigned_advocate_name = $3,
             assigned_advocate_enrollment = $4,
             stage_status = 'advocate_assigned',
             payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb
         WHERE id = $1
         RETURNING *`,
        [
          intakeId,
          advocateId,
          advocate.name,
          enrollment.rows[0]?.enrollment_no || null,
          JSON.stringify({
            intakeStatus: "advocate_assigned",
            stageStatus: "advocate_assigned",
            assignedAdvocateId: advocateId,
            assignedAdvocateName: advocate.name,
            assignmentNote: note || null,
            assignedByAdmin: authUser.id,
            assignedAt: new Date().toISOString(),
          }),
        ],
      );
      const maskedCounsel = maskCounselForClient(advocate.name, enrollment.rows[0]?.enrollment_no || null);
      const linked = await db.query(
        `SELECT id FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
        [String(intakeId)],
      ).catch(() => ({ rows: [] }));
      if (linked.rows[0]) {
        await db.query(
          `INSERT INTO case_assignments (case_id, advocate_id, assigned_by, status, assigned_at)
           VALUES ($1, $2, $3, 'active', now())
           ON CONFLICT (case_id, advocate_id)
           DO UPDATE SET status = 'active', assigned_by = EXCLUDED.assigned_by, assigned_at = now(), ended_at = NULL`,
          [linked.rows[0].id, advocateId, isUuid(authUser.id) ? authUser.id : null],
        ).catch(() => undefined);
        await db.query(
          `UPDATE cases
           SET status = CASE WHEN COALESCE(status, '') IN ('', 'Intake', 'Pending') THEN 'Active' ELSE status END,
               payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
               updated_at = now()
           WHERE id = $1`,
          [linked.rows[0].id, JSON.stringify({
            assignedTo: advocateId,
            assignedAdvocateId: advocateId,
            assignedAdvocateName: advocate.name,
            counsel: {
              name: advocate.name,
              enrollment: enrollment.rows[0]?.enrollment_no || null,
              assignedAt: new Date().toISOString(),
              clientDisplayName: maskedCounsel.displayName,
            },
            nextAction: `Panel counsel assigned: ${maskedCounsel.displayName}.`,
          })],
        ).catch(() => undefined);
      }
      await writeAuditLog(authUser, "intake_assign", "booking", intakeId, `Assigned panel lawyer ${advocate.name}`, { advocateId, note });
      await notify({
        eventType: "intake_assigned",
        title: "Advocate assigned by Legal Connect",
        message: `${maskedCounsel.displayName}${maskedCounsel.enrollment ? ` (${maskedCounsel.enrollment})` : ""} has been assigned to your matter. Your advocate will review and update within 48 hours.`,
        recipients: await resolveRecipients([clientId].filter(Boolean)),
        payload: {
          intakeId,
          advocateId,
          advocateName: maskedCounsel.displayName,
          clientId,
          bookingId: intakeId,
        },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Open workspace",
        ctaUrl: portalUrl("/client"),
        priority: "high",
      });
      await notify({
        eventType: "intake_assigned",
        title: "New matter assigned by Legal Connect",
        message: note
          ? `You were assigned a supervised matter. LC briefing: ${note}`
          : "You were assigned a supervised matter. Review the full brief and accept within 12 hours.",
        recipients: await resolveRecipients([advocateId].filter(Boolean)),
        payload: { intakeId, advocateId, bookingId: intakeId, clientId },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Accept matter",
        ctaUrl: portalUrl("/advocate"),
        priority: "high",
      });
      sendJson(res, 200, { ok: true, action: "assign", intake: mapBooking(updated.rows[0]), advocate: { id: advocate.id, name: advocate.name } });
      return;
    }

    if (action === "request-info") {
      const message = String(body.message || body.note || body.update || "").trim();
      const docs = Array.isArray(body.missingDocuments)
        ? body.missingDocuments.map((item) => String(item || "").trim()).filter(Boolean)
        : String(body.missingDocument || body.document || "")
          .split(/[,;\n]/)
          .map((item) => item.trim())
          .filter(Boolean);
      if (!message && !docs.length) {
        sendJson(res, 400, { ok: false, error: "Specify missing documents or a direct LC status note." });
        return;
      }
      const composed = [
        docs.length ? `Legal Connect requires the following document(s): ${docs.join(", ")}.` : null,
        message || null,
      ].filter(Boolean).join(" ");
      if (loaded.mode === "demo") {
        Object.assign(loaded.raw, { intakeStatus: "info_requested", missingDocuments: docs, lastLcNote: composed });
        sendJson(res, 200, { ok: true, action: "request-info", intake: dashboardBooking(loaded.raw) });
        return;
      }
      const updated = await db.query(
        `UPDATE bookings
         SET stage_status = 'info_requested',
             payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
         WHERE id = $1
         RETURNING *`,
        [intakeId, JSON.stringify({
          intakeStatus: "info_requested",
          missingDocuments: docs,
          lastLcNote: composed,
          infoRequestedAt: new Date().toISOString(),
          infoRequestedBy: authUser.id,
        })],
      );
      const linked = await db.query(
        `SELECT id, payload FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
        [String(intakeId)],
      ).catch(() => ({ rows: [] }));
      if (linked.rows[0]) {
        await db.query(
          `INSERT INTO case_updates (case_id, update_type, message, payload, status, author_id, author_role, reviewed_by, reviewed_at)
           VALUES ($1, 'lc_request_info', $2, $3::jsonb, 'approved', $4, 'admin', $4, now())`,
          [
            linked.rows[0].id,
            composed,
            JSON.stringify({ source: "intake_request_info", missingDocuments: docs }),
            String(authUser.id),
          ],
        ).catch(() => undefined);
      }
      await writeAuditLog(authUser, "intake_request_info", "booking", intakeId, composed, { missingDocuments: docs });
      await notify({
        eventType: "intake_info_requested",
        title: "Documents / information requested",
        message: composed,
        recipients: await resolveRecipients([clientId].filter(Boolean)),
        payload: { intakeId, missingDocuments: docs },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Upload / reply",
        ctaUrl: portalUrl("/client"),
        priority: "high",
      });
      sendJson(res, 200, { ok: true, action: "request-info", intake: mapBooking(updated.rows[0]), message: composed, missingDocuments: docs });
      return;
    }

    if (action === "guidance") {
      const guidance = String(body.guidance || body.message || body.note || "").trim();
      if (guidance.length < 12) {
        sendJson(res, 400, { ok: false, error: "Official LC guidance note must be at least 12 characters." });
        return;
      }
      const rule36 = strategyFeatures.assertRule36Safe(guidance);
      if (!rule36.ok) {
        sendJson(res, 422, { ok: false, error: rule36.error });
        return;
      }
      if (loaded.mode === "demo") {
        Object.assign(loaded.raw, { intakeStatus: "guidance_issued", lastLcNote: guidance });
        sendJson(res, 200, { ok: true, action: "guidance", intake: dashboardBooking(loaded.raw) });
        return;
      }
      const updated = await db.query(
        `UPDATE bookings
         SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb
         WHERE id = $1
         RETURNING *`,
        [intakeId, JSON.stringify({
          intakeStatus: "guidance_issued",
          lastLcNote: guidance,
          guidanceIssuedAt: new Date().toISOString(),
          guidanceIssuedBy: authUser.id,
        })],
      );
      const linked = await db.query(
        `SELECT id FROM cases WHERE payload->>'bookingId' = $1 ORDER BY created_at DESC LIMIT 1`,
        [String(intakeId)],
      ).catch(() => ({ rows: [] }));
      if (linked.rows[0]) {
        await db.query(
          `INSERT INTO case_updates (case_id, update_type, message, payload, status, author_id, author_role, reviewed_by, reviewed_at)
           VALUES ($1, 'lc_guidance', $2, $3::jsonb, 'approved', $4, 'admin', $4, now())`,
          [
            linked.rows[0].id,
            guidance,
            JSON.stringify({ source: "intake_guidance", official: true }),
            String(authUser.id),
          ],
        ).catch(() => undefined);
      }
      await writeAuditLog(authUser, "intake_guidance", "booking", intakeId, "Official LC guidance issued", {});
      await notify({
        eventType: "intake_guidance",
        title: "Official Legal Connect guidance",
        message: guidance,
        recipients: await resolveRecipients([clientId, booking.assignedAdvocateId].filter(Boolean)),
        payload: { intakeId },
        sendEmail: true,
        sendSms: Boolean(body.sendSms !== false),
        ctaLabel: "Read guidance",
        ctaUrl: portalUrl("/client"),
        priority: "high",
      });
      sendJson(res, 200, { ok: true, action: "guidance", intake: mapBooking(updated.rows[0]), guidance });
      return;
    }

    if (action === "refund") {
      const reason = String(body.reason || body.rejectionReason || body.message || "").trim();
      if (reason.length < 8) {
        sendJson(res, 400, { ok: false, error: "A rejection reason is required (min 8 characters)." });
        return;
      }
      if (loaded.mode === "demo") {
        Object.assign(loaded.raw, {
          paymentStatus: "refunded",
          workHoldStatus: "released",
          intakeStatus: "rejected_refunded",
          rejectionReason: reason,
        });
        sendJson(res, 200, { ok: true, action: "refund", intake: dashboardBooking(loaded.raw) });
        return;
      }
      const updated = await db.query(
        `UPDATE bookings
         SET payment_status = 'refunded',
             work_hold_status = 'released',
             stage_status = 'rejected_refunded',
             failure_reason = $2,
             payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
         WHERE id = $1
         RETURNING *`,
        [
          intakeId,
          reason,
          JSON.stringify({
            intakeStatus: "rejected_refunded",
            rejectionReason: reason,
            refundedAt: new Date().toISOString(),
            refundedBy: authUser.id,
            work_hold_status: "released",
          }),
        ],
      );
      await recordPaymentEvent({
        userId: clientId,
        bookingId: intakeId,
        amount: numericAmount(booking.amount),
        currency: "INR",
        provider: "legal-connect",
        status: "refunded",
        workHoldStatus: "released",
        payload: { reason, source: "intake_refund" },
      }).catch(() => undefined);
      await writeAuditLog(authUser, "intake_refund", "booking", intakeId, `Intake rejected and refunded: ${reason}`, { reason });
      await notify({
        eventType: "intake_refunded",
        title: "Intake closed — refund initiated",
        message: `Legal Connect rejected this intake and released the work hold. Reason: ${reason}`,
        recipients: await resolveRecipients([clientId].filter(Boolean)),
        payload: { intakeId, reason },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "View booking",
        ctaUrl: portalUrl("/client"),
        priority: "high",
      });
      sendJson(res, 200, {
        ok: true,
        action: "refund",
        intake: mapBooking(updated.rows[0]),
        refund: { status: "refunded", workHoldStatus: "released", reason },
      });
      return;
    }
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
      const quest = mapInternQuest(result.rows[0]);
      await notify({
        eventType: "quest_assigned",
        title: "New intern quest posted",
        message: `${quest.title} is ready. Complete it to earn ${quest.xpPoints || 0} XP.`,
        recipients: await resolveInternRecipients(),
        payload: { questId: quest.id },
        sendEmail: true,
        ctaLabel: "Open quests",
        ctaUrl: portalUrl("/intern/quests"),
      });
      sendJson(res, 201, quest);
      return;
    }
    const quest = mapInternQuest({ ...body, id: `quest-${Date.now()}`, createdAt: new Date().toISOString() });
    demoStore.internQuests.unshift(quest);
    await notify({
      eventType: "quest_assigned",
      title: "New intern quest posted",
      message: `${quest.title} is ready. Complete it to earn ${quest.xpPoints || 0} XP.`,
      recipients: await resolveInternRecipients(),
      payload: { questId: quest.id },
      sendEmail: true,
      ctaLabel: "Open quests",
      ctaUrl: portalUrl("/intern/quests"),
    });
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
      const quest = mapInternQuest(result.rows[0]);
      if (["Completed", "completed", "Approved"].includes(String(quest.status || ""))) {
        const recipients = [
          ...(await resolveRecipients([authUser.id])),
          ...(await resolveAdminRecipients()),
        ];
        await notify({
          eventType: "quest_completed",
          title: "Quest completed",
          message: `${quest.title} is marked ${quest.status}. ${quest.xpPoints || 0} XP credited.`,
          recipients,
          payload: { questId: quest.id, xpPoints: quest.xpPoints || 0 },
          sendEmail: true,
          ctaLabel: "View progress",
          ctaUrl: portalUrl("/intern/xp"),
        });
      }
      sendJson(res, 200, quest);
      return;
    }
    const quest = demoStore.internQuests.find((item) => String(item.id) === String(id));
    if (!quest) {
      sendJson(res, 404, { error: "Quest not found" });
      return;
    }
    Object.assign(quest, body, { xpPoints: body.xpPoints == null ? quest.xpPoints : Number(body.xpPoints) });
    const mappedQuest = mapInternQuest(quest);
    if (["Completed", "completed", "Approved"].includes(String(mappedQuest.status || ""))) {
      const recipients = [
        ...(await resolveRecipients([authUser.id])),
        ...(await resolveAdminRecipients()),
      ];
      await notify({
        eventType: "quest_completed",
        title: "Quest completed",
        message: `${mappedQuest.title} is marked ${mappedQuest.status}. ${mappedQuest.xpPoints || 0} XP credited.`,
        recipients,
        payload: { questId: mappedQuest.id, xpPoints: mappedQuest.xpPoints || 0 },
        sendEmail: true,
        ctaLabel: "View progress",
        ctaUrl: portalUrl("/intern/xp"),
      });
    }
    sendJson(res, 200, mappedQuest);
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
        : await db.query(
            "SELECT * FROM cases WHERE user_id::text = $1 OR COALESCE(payload->>'assignedTo', '') = $1 ORDER BY created_at DESC",
            [String(databaseUserId)],
          );
      const mapped = result.rows.map(mapCase);
      const isClientAudience = String(authUser.role || "").toLowerCase() === "client";
      sendJson(res, 200, isClientAudience ? mapped.map(sanitizeMatterForClient) : mapped);
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
    const mappedDemo = visibleCases.map(dashboardCase);
    const isClientAudience = String(authUser.role || "").toLowerCase() === "client";
    sendJson(res, 200, isClientAudience ? mappedDemo.map(sanitizeMatterForClient) : mappedDemo);
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
      {
        const saved = mapCase(result.rows[0]);
        const selfRecipients = await resolveRecipients([databaseUserId]);
        const admins = await resolveAdminRecipients();
        await notify({
          eventType: "case_added",
          title: "Case added",
          message: `${saved.caseTitle || saved.title || "A matter"} was added to Legal Connect.`,
          recipients: [...selfRecipients, ...admins],
          payload: { caseId: saved.id },
          sendEmail: true,
          ctaLabel: "View cases",
          ctaUrl: portalUrl(authUser.role === "advocate" ? "/advocate/cases" : authUser.role === "admin" ? "/admin/cases" : "/client"),
        });
        sendJson(res, 201, saved);
      }
      return;
    }
    demoStore.cases.push(trackedCase);
    {
      const selfRecipients = await resolveRecipients([trackedCase.userId]);
      const admins = await resolveAdminRecipients();
      await notify({
        eventType: "case_added",
        title: "Case added",
        message: `${trackedCase.title || "A matter"} was added to Legal Connect.`,
        recipients: [...selfRecipients, ...admins],
        payload: { caseId: trackedCase.id },
        sendEmail: true,
        ctaLabel: "View cases",
        ctaUrl: portalUrl("/client"),
      });
    }
    sendJson(res, 201, dashboardCase(trackedCase));
    return;
  }

  const caseDocumentMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/documents\/([^/]+)$/);
  if (caseDocumentMatch && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    if (!db.dbAvailable || !isUuid(caseDocumentMatch[1]) || !isUuid(caseDocumentMatch[2])) {
      sendJson(res, 404, { error: "Document not found." });
      return;
    }
    const matterResult = await db.query("SELECT * FROM cases WHERE id = $1 LIMIT 1", [caseDocumentMatch[1]]);
    if (!matterResult.rows[0] || !(await canAccessStoredCase(authUser, matterResult.rows[0]))) {
      sendJson(res, matterResult.rows[0] ? 403 : 404, { error: matterResult.rows[0] ? "Forbidden" : "Case not found." });
      return;
    }
    const documentResult = await db.query("SELECT * FROM case_documents WHERE id = $1 AND case_id = $2 LIMIT 1", [caseDocumentMatch[2], caseDocumentMatch[1]]);
    const document = documentResult.rows[0];
    if (!document || !String(document.storage_key || "").startsWith("booking-attachment:")) {
      sendJson(res, 404, { error: "Document file is not available." });
      return;
    }
    const attachmentId = String(document.storage_key).slice("booking-attachment:".length);
    const attachmentResult = await db.query("SELECT file_name, mime_type, size_bytes, file_data FROM booking_attachments WHERE id = $1 LIMIT 1", [attachmentId]);
    const attachment = attachmentResult.rows[0];
    if (!attachment) {
      sendJson(res, 404, { error: "Document file is not available." });
      return;
    }
    const fileName = safeAttachmentName(attachment.file_name);
    res.writeHead(200, {
      "Content-Type": attachment.mime_type || "application/octet-stream",
      "Content-Length": String(attachment.size_bytes || attachment.file_data.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    res.end(attachment.file_data);
    return;
  }

  const caseCommunicationsMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/communications$/);
  if (caseCommunicationsMatch && ["GET", "POST"].includes(req.method)) {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const caseId = caseCommunicationsMatch[1];
    if (!isUuid(caseId)) {
      if (/^Demo (Client|Lawyer)$/i.test(String(authUser.name || ""))) {
        const matter = clientWorkspaceDemo(authUser.name)[Number(caseId.split("-").pop() || 1) - 1] || clientWorkspaceDemo(authUser.name)[0];
        if (req.method === "GET") sendJson(res, 200, { ok: true, communications: matter.communications, dataMode: "sample" });
        else {
          const body = await readBody(req);
          sendJson(res, 201, { ok: true, communication: { id: `demo-message-${Date.now()}`, type: "message", title: "Demo message", summary: String(body.summary || body.message || ""), occurredAt: new Date().toISOString() }, dataMode: "sample" });
        }
        return;
      }
      sendJson(res, 404, { error: "Case not found." });
      return;
    }
    const matterResult = await db.query("SELECT * FROM cases WHERE id = $1 LIMIT 1", [caseId]);
    if (!matterResult.rows[0] || !(await canAccessStoredCase(authUser, matterResult.rows[0]))) {
      sendJson(res, matterResult.rows[0] ? 403 : 404, { error: matterResult.rows[0] ? "Forbidden" : "Case not found." });
      return;
    }
    if (req.method === "GET") {
      const result = await db.query("SELECT * FROM case_communications WHERE case_id = $1 ORDER BY occurred_at, created_at", [caseId]);
      sendJson(res, 200, {
        ok: true,
        communications: result.rows.map((row) => ({ id: row.id, type: row.communication_type, title: row.title, summary: row.summary || "", occurredAt: row.occurred_at, senderId: row.sender_id })),
        dataMode: "live",
      });
      return;
    }
    const body = await readBody(req);
    const summary = String(body.summary || body.message || "").trim();
    if (!summary || summary.length > 4000) {
      sendJson(res, 400, { error: "Message must contain between 1 and 4,000 characters." });
      return;
    }
    const senderId = await resolveDatabaseUserId(authUser);
    const created = await db.query(
      `INSERT INTO case_communications (case_id, sender_id, communication_type, title, summary, payload)
       VALUES ($1, $2, 'message', $3, $4, $5) RETURNING *`,
      [caseId, senderId, body.title || "Matter message", summary, JSON.stringify({ senderRole: authUser.role })],
    );
    await db.query("UPDATE cases SET updated_at = now() WHERE id = $1", [caseId]);
    const row = created.rows[0];
    sendJson(res, 201, { ok: true, communication: { id: row.id, type: row.communication_type, title: row.title, summary: row.summary, occurredAt: row.occurred_at, senderId: row.sender_id }, dataMode: "live" });
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
      const isClientAudience = String(authUser.role || "").toLowerCase() === "client";
      sendJson(res, 200, isClientAudience ? sanitizeMatterForClient(mapped) : mapped);
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
    const mappedDemo = dashboardCase(trackedCase);
    const isClientAudience = String(authUser.role || "").toLowerCase() === "client";
    sendJson(res, 200, isClientAudience ? sanitizeMatterForClient(mappedDemo) : mappedDemo);
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
      const mapped = mapCase(result.rows[0]);
      const previousDate = current.nextDate ? String(current.nextDate).slice(0, 10) : "";
      const upcomingDate = mapped.nextDate ? String(mapped.nextDate).slice(0, 10) : "";
      if (upcomingDate && upcomingDate !== previousDate) {
        const recipients = await resolveRecipients([mapped.userId, mapped.assignedTo].filter(Boolean));
        await notify({
          eventType: "hearing_scheduled",
          title: "Next hearing updated",
          message: `${mapped.caseTitle || mapped.title || "Your matter"} is listed for ${upcomingDate}${mapped.courtName || mapped.court ? ` at ${mapped.courtName || mapped.court}` : ""}.`,
          recipients,
          payload: { caseId: mapped.id, nextDate: upcomingDate },
          sendEmail: true,
          ctaLabel: "Open case",
          ctaUrl: portalUrl(authUser.role === "advocate" ? "/advocate/cases" : authUser.role === "admin" || authUser.role === "rna" ? "/admin/cases" : "/client"),
          priority: "high",
        });
        await strategyFeatures.scheduleNdohRemindersForCase(
          { id: mapped.id, nextDate: upcomingDate, title: mapped.caseTitle || mapped.title },
          mapped.userId || authUser.id,
        );
      }
      sendJson(res, 200, mapped);
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
    const previousDate = trackedCase.nextDate ? String(trackedCase.nextDate).slice(0, 10) : "";
    Object.assign(trackedCase, body, {
      title: body.title ?? body.caseTitle ?? trackedCase.title,
      court: body.court ?? body.courtName ?? trackedCase.court,
      caseNo: body.caseNo ?? body.caseNumber ?? body.case_number ?? trackedCase.caseNo,
      nextDate: body.nextDate ?? trackedCase.nextDate,
      status: body.status ?? trackedCase.status,
      updatedAt: new Date().toISOString(),
    });
    const mapped = dashboardCase(trackedCase);
    const upcomingDate = mapped.nextDate ? String(mapped.nextDate).slice(0, 10) : "";
    if (upcomingDate && upcomingDate !== previousDate) {
      const recipients = await resolveRecipients([mapped.userId, mapped.assignedTo].filter(Boolean));
      await notify({
        eventType: "hearing_scheduled",
        title: "Next hearing updated",
        message: `${mapped.caseTitle || mapped.title || "Your matter"} is listed for ${upcomingDate}${mapped.courtName || mapped.court ? ` at ${mapped.courtName || mapped.court}` : ""}.`,
        recipients,
        payload: { caseId: mapped.id, nextDate: upcomingDate },
        sendEmail: true,
        ctaLabel: "Open case",
        ctaUrl: portalUrl(authUser.role === "advocate" ? "/advocate/cases" : authUser.role === "admin" || authUser.role === "rna" ? "/admin/cases" : "/client"),
        priority: "high",
      });
    }
    sendJson(res, 200, mapped);
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
    const recipientEmail = body.to || body.email || authUser?.email || null;
    const wantSms = body.sendSms === true || body.send_sms === true;
    const recipients = [{
      userId: authUser.id,
      name: authUser.name || "Admin",
      email: recipientEmail,
      phone: authUser.phone || body.phone || null,
    }];
    const channelLog = await notify({
      eventType: "notify_test",
      title,
      message,
      recipients,
      payload: { mode: "notify_test", sendSms: wantSms },
      sendEmail: true,
      sendSms: wantSms,
      ctaLabel: "Open dashboard",
      ctaUrl: portalUrl("/admin"),
      priority: wantSms ? "high" : "normal",
    });
    const emailSent = channelLog.email.some((item) => item.status === "sent");
    const provider = emailProviderStatus();
    await writeAuditLog(
      authUser,
      emailSent ? "notification_test_sent" : "notification_test_queued",
      "notification",
      "notify-test",
      emailSent ? "Notification test dispatched through notify()." : "Notification test queued (email may be unavailable).",
      { recipient: recipientEmail, provider: emailAdminStatus(), channelLog },
    );
    sendJson(res, emailSent || provider.provider !== "resend" ? 202 : 200, {
      ok: true,
      mode: emailSent ? "resend" : "demo",
      status: emailSent ? "sent" : "queued",
      channel_log: channelLog,
    });
    return;
  }

  if (url.pathname === "/api/notifications/unread-count" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    if (isReviewUser(authUser)) {
      sendJson(res, 200, { count: 0 });
      return;
    }
    if (db.dbAvailable) {
      const result = await db.query(
        "SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL",
        [authUser.id],
      );
      sendJson(res, 200, { count: result.rows[0]?.count || 0 });
      return;
    }
    const count = (demoStore.notifications || []).filter((item) => (
      String(item.userId) === String(authUser.id) && !item.readAt
    )).length;
    sendJson(res, 200, { count });
    return;
  }

  if (url.pathname === "/api/notifications/read-all" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    const updated = await markAllNotificationsRead(authUser);
    sendJson(res, 200, { ok: true, updated });
    return;
  }

  if (url.pathname.startsWith("/api/notifications/") && url.pathname.endsWith("/read") && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const notificationId = decodeURIComponent(parts[parts.length - 2] || "");
    if (!notificationId || notificationId === "notifications") {
      sendJson(res, 400, { ok: false, error: "Notification id is required." });
      return;
    }
    await markNotificationRead(authUser, notificationId);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/notifications" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    if (isReviewUser(authUser)) {
      sendJson(res, 200, reviewSeedData(authUser).notifications);
      return;
    }
    if (db.dbAvailable) {
      const result = await db.query(
        "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
        [authUser.id],
      );
      sendJson(res, 200, result.rows.map(mapNotification));
      return;
    }
    sendJson(
      res,
      200,
      (demoStore.notifications || [])
        .filter((item) => String(item.userId) === String(authUser.id))
        .slice(0, 50)
        .map(mapNotification),
    );
    return;
  }

  if (url.pathname === "/api/notifications/mark-read" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    const body = await readBody(req);
    if (!body.id) {
      sendJson(res, 400, { ok: false, error: "Notification id is required." });
      return;
    }
    await markNotificationRead(authUser, body.id);
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
      // Supervised pipeline: never publish client-visible updates without LC review.
      const status = canSeeAll(authUser) && body.publishImmediately ? "approved" : "pending_lc_review";
      const result = await db.query(
        `INSERT INTO case_updates (case_id, update_type, message, payload, status, author_id, author_role, reviewed_by, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          body.caseId || body.case_id || null,
          body.updateType || body.update_type || "calendar_decision",
          message,
          JSON.stringify({ ...body, user_id: authUser?.id || null }),
          status,
          authUser?.id ? String(authUser.id) : null,
          authUser?.role || "system",
          status === "approved" && authUser?.id ? String(authUser.id) : null,
          status === "approved" ? new Date().toISOString() : null,
        ],
      );
      const caseId = body.caseId || body.case_id || null;
      if (caseId && status === "pending_lc_review") {
        const bookingId = await supervisedPipeline.bookingIdForCase(caseId);
        if (bookingId) await supervisedPipeline.syncBookingPipelineStage(bookingId, "advocate_update_pending");
        await supervisedPipeline.syncCasePipelineStage(caseId, "advocate_update_pending");
      }
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
      mark_proof_approved: "Proof Uploaded",
      release_payment: "Completed",
      refund: "Refunded",
      close_task: "Closed",
    };
    const nextStatus = body.status || statusMap[body.action] || "Updated";
    if (db.dbAvailable && body.taskId) {
      const existingTask = await db.query("SELECT * FROM tasks WHERE id = $1 LIMIT 1", [body.taskId]);
      const currentTask = existingTask.rows[0] ? mapTask(existingTask.rows[0]) : null;
      if (body.action === "release_payment") {
        const proofStatus = currentTask?.proofStatus || currentTask?.proof_status || "none";
        if (!currentTask?.proofHash && proofStatus !== "approved") {
          sendJson(res, 409, { ok: false, error: "Escrow cannot unlock until order-sheet proof is uploaded and approved." });
          return;
        }
        if (proofStatus !== "approved") {
          sendJson(res, 409, { ok: false, error: "Approve proof before releasing escrow." });
          return;
        }
      }
      let escrowStatus = body.paymentLockStatus || body.payment_lock_status || null;
      let proofStatusUpdate = null;
      if (body.action === "mark_proof_approved") {
        proofStatusUpdate = "approved";
        escrowStatus = escrowStatus || "Locked";
      }
      if (body.action === "release_payment") {
        escrowStatus = "Released";
      }
      const assignAdvocateId = body.advocateId || body.proxyAdvocateId || body.acceptedBy || null;
      const assignAdvocateName = body.advocateName || body.proxyAdvocateName || body.assigneeName || null;
      const acceptedByUpdate = (body.action === "assign_lawyer" || body.action === "assign_intern") && assignAdvocateId
        ? assignAdvocateId
        : null;
      const result = await db.query(
        `UPDATE tasks
         SET status = $2,
             escrow_status = COALESCE($3, escrow_status),
             proof_status = COALESCE($4, proof_status),
             accepted_by = COALESCE($6, accepted_by),
             payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb,
             updated_at = now()
         WHERE id = $1 RETURNING *`,
        [
          body.taskId,
          nextStatus,
          escrowStatus,
          proofStatusUpdate,
          JSON.stringify({
            lastAdminAction: body.action || null,
            transparencyLayer: body.action === "release_payment" ? "escrow_release" : body.action === "mark_proof_approved" ? "proof_review" : "admin",
            proofReviewedAt: body.action === "mark_proof_approved" ? new Date().toISOString() : undefined,
            assignedProxyName: assignAdvocateName || undefined,
            assignmentStatus: acceptedByUpdate ? "Assigned" : undefined,
            assignedByAdmin: acceptedByUpdate ? true : undefined,
          }),
          acceptedByUpdate,
        ],
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
      if (result.rows[0] && (body.action === "mark_proof_approved" || body.action === "release_payment")) {
        const mapped = mapTask(result.rows[0]);
        await strategyFeatures.notifyTaskLayer(mapped, {
          eventType: body.action === "release_payment" ? "proxy_escrow_released" : "proxy_proof_approved",
          title: body.action === "release_payment" ? "Escrow released" : "Proof approved",
          message: body.action === "release_payment"
            ? `${mapped.title || "Proxy mission"} escrow has been released after proof review.`
            : `${mapped.title || "Proxy mission"} proof was approved. Escrow can now be released.`,
          priority: "high",
          sendSms: body.action === "release_payment",
        });
      }
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

  // ProxyHub: Create a real Razorpay order for a proxy mission fee (replaces window.confirm synthetic payment).
  if (url.pathname === "/api/proxy-hub/create-order" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser || !(authUser.role === "advocate" || canSeeAll(authUser))) {
      sendJson(res, 403, { ok: false, error: "Advocate access required to post a proxy mission." });
      return;
    }
    const body = await readBody(req);
    const fee = numericAmount(body.fee || body.amount);
    if (!fee || fee < 100) {
      sendJson(res, 400, { ok: false, error: "Proxy mission fee must be at least ₹100." });
      return;
    }
    if (!body.title || !String(body.title).trim()) {
      sendJson(res, 400, { ok: false, error: "Mission title is required." });
      return;
    }
    if (await isMasterTestUser(authUser)) {
      sendJson(res, 200, {
        ok: true,
        mode: "master_test_free",
        orderId: `order_proxy_master_${Date.now()}`,
        amount: 0,
        currency: "INR",
        keyId: "master_test_free",
        description: String(body.title).trim(),
        message: "Developer account — ProxyHub fee waived.",
        developerAccount: true,
      });
      return;
    }
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
    if (!hasRazorpay) {
      if (config.nodeEnv === "production") {
        sendJson(res, 503, { ok: false, error: "Payment gateway is not configured. Contact Legal Connect support." });
        return;
      }
      // Dev/demo fallback: return a synthetic order so ProxyHub UI can proceed without live keys.
      const syntheticOrderId = `order_proxy_demo_${Date.now()}`;
      sendJson(res, 200, {
        ok: true,
        mode: "demo",
        orderId: syntheticOrderId,
        amount: fee * 100,
        currency: "INR",
        keyId: "rzp_test_demo",
        description: String(body.title).trim(),
        message: "Demo mode: no real charge will occur.",
      });
      return;
    }
    try {
      const Razorpay = require("razorpay");
      const rzp = new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
      const receiptId = `proxy_${Date.now()}_${authUser.id?.toString().slice(0, 8) || "anon"}`;
      const order = await rzp.orders.create({
        amount: fee * 100,
        currency: "INR",
        receipt: receiptId,
        notes: { missionTitle: String(body.title).trim(), postedBy: authUser.id, role: "proxy-hub" },
      });
      await writeAuditLog(authUser, "proxy_hub_order_created", "proxy_hub", order.id, `ProxyHub order created for mission: ${body.title}`, { orderId: order.id, fee });
      sendJson(res, 200, {
        ok: true,
        mode: "razorpay",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: config.razorpayKeyId,
        description: String(body.title).trim(),
      });
    } catch (error) {
      sendJson(res, 502, { ok: false, error: "Payment gateway order creation failed. Please try again.", detail: error.message });
    }
    return;
  }

  // ProxyHub: Verify payment signature and open the proxy task (fail-closed — task is NOT created if verification fails).
  if (url.pathname === "/api/proxy-hub/verify-payment" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser || !(authUser.role === "advocate" || canSeeAll(authUser))) {
      sendJson(res, 403, { ok: false, error: "Advocate access required." });
      return;
    }
    const body = await readBody(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    const isDemoOrder = String(razorpay_order_id || "").startsWith("order_proxy_demo_")
      || String(razorpay_order_id || "").startsWith("order_proxy_master_")
      || body.mode === "master_test_free";
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);

    // Verify HMAC signature for real Razorpay orders (fail-closed in production).
    if (!isDemoOrder && hasRazorpay) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        sendJson(res, 400, { ok: false, error: "Payment details are incomplete. Cannot verify payment." });
        return;
      }
      const expectedSignature = crypto
        .createHmac("sha256", config.razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expectedSignature !== razorpay_signature) {
        await writeAuditLog(authUser, "proxy_hub_payment_signature_mismatch", "proxy_hub", razorpay_order_id, "ProxyHub payment signature verification failed.", { orderId: razorpay_order_id, paymentId: razorpay_payment_id });
        sendJson(res, 400, { ok: false, error: "Payment signature verification failed. The proxy mission cannot be opened." });
        return;
      }
    } else if (!isDemoOrder && config.nodeEnv === "production") {
      sendJson(res, 503, { ok: false, error: "Payment gateway is not configured. Cannot post proxy mission." });
      return;
    }

    // Payment is verified — create the proxy task
    const posting = strategyFeatures.validateProxyPostingFields(body);
    if (!posting.ok) {
      sendJson(res, 400, { ok: false, error: posting.error });
      return;
    }
    const taskTitle = String(body.title || body.missionTitle || `${posting.fields.appearanceType} · ${posting.fields.cnr}`).trim();
    const taskCourt = String(body.court || body.location || "").trim();
    const fee = numericAmount(body.fee || body.amount);
    const rule36Title = strategyFeatures.assertRule36Safe(taskTitle);
    if (!rule36Title.ok) {
      sendJson(res, 422, { ok: false, error: rule36Title.error });
      return;
    }
    const task = {
      id: `task-${Date.now()}`,
      postedBy: authUser.id,
      title: taskTitle,
      court: taskCourt || null,
      taskType: posting.fields.appearanceType,
      amount: fee,
      escrowStatus: "Locked",
      status: "pending_admin_review",
      paymentVerified: !isDemoOrder,
      razorpayOrderId: isDemoOrder ? null : razorpay_order_id,
      razorpayPaymentId: isDemoOrder ? null : razorpay_payment_id,
      cnr: posting.fields.cnr,
      roomNo: posting.fields.roomNo,
      itemNo: posting.fields.itemNo,
      passoverScript: posting.fields.passoverScript,
      passoverInstructions: posting.fields.passoverScript.slice(0, 500),
      appearanceType: posting.fields.appearanceType,
      hearingDate: posting.fields.hearingDate,
      proofStatus: "none",
      transparencyLayer: "posting",
      workflowStatus: "pending_admin_review",
      createdAt: new Date().toISOString(),
    };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO tasks (title, court, task_type, amount, escrow_status, status, posted_by, proof_url, proof_status, payload)
         VALUES ($1, $2, $3, $4, $5, 'pending_admin_review', $6, NULL, 'none', $7) RETURNING *`,
        [task.title, task.court, task.taskType, task.amount, "Locked", authUser.id, JSON.stringify({ ...task, user_id: authUser.id })],
      );
      await writeAuditLog(authUser, "proxy_hub_task_posted", "task", result.rows[0].id, `Proxy mission posted: ${task.title}`, { court: task.court, fee: task.amount, paymentVerified: task.paymentVerified });
      {
        const recipients = [
          ...(await resolveRecipients([authUser.id])),
          ...(await resolveAdminRecipients()),
        ];
        await notify({
          eventType: "proxy_mission_posted",
          title: "Proxy mission awaiting Admin review",
          message: `${task.title} is pending_admin_review before the marketplace opens.`,
          recipients,
          payload: { taskId: result.rows[0].id, fee: task.amount, status: "pending_admin_review" },
          sendEmail: true,
          ctaLabel: "Open ProxyHub",
          ctaUrl: portalUrl("/advocate/proxy"),
        });
      }
      sendJson(res, 201, { ok: true, task: mapTask(result.rows[0]), paymentVerified: task.paymentVerified });
      return;
    }
    demoStore.tasks.unshift(task);
    {
      const recipients = [
        ...(await resolveRecipients([authUser.id])),
        ...(await resolveAdminRecipients()),
      ];
      await notify({
        eventType: "proxy_mission_posted",
        title: "Proxy mission live",
        message: `${task.title} is live and awaiting Admin proxy assignment.`,
        recipients,
        payload: { taskId: task.id, fee: task.amount },
        sendEmail: true,
        ctaLabel: "Open ProxyHub",
        ctaUrl: portalUrl("/advocate/proxy"),
      });
    }
    sendJson(res, 201, { ok: true, task: dashboardTask(task), paymentVerified: task.paymentVerified, mode: "demo" });
    return;
  }

  if (url.pathname === "/api/payments/config" && req.method === "GET") {
    const authUser = getAuthUser(req);
    const status = paymentConfigStatus();
    const masterFree = authUser ? await isMasterTestUser(authUser) : false;
    const firstChatUsed = authUser && !masterFree ? await userHasUsedFirstChat(authUser.id) : false;
    sendJson(res, 200, {
      ok: true,
      ...status,
      first_chat_free_available: Boolean(authUser) && (masterFree || !firstChatUsed),
      first_chat_free_amount: 0,
      chat_amount: 499,
      all_features_free: masterFree,
      master_test_free: masterFree,
      chamber_plans: chamberPlanCatalog(),
    });
    return;
  }

  if (url.pathname === "/api/payments/create-order" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const amount = Number(body.amount || 0);
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
    const paymentStatus = paymentConfigStatus();
    const wantsFirstChatFree = Boolean(body.firstChatFree || body.mode === "first_chat_free");
    const wantsMasterFree = Boolean(body.masterTestFree || body.mode === "master_test_free");
    const channel = String(body.consultationChannel || body.channel || "").toLowerCase();
    const masterFree = authUser ? await isMasterTestUser(authUser) : false;

    // Zero-amount / developer / first-chat free — never call Razorpay.
    // Client-supplied masterTestFree flags are ignored unless the signed-in user is the developer account.
    if (authUser && (masterFree || wantsFirstChatFree || amount === 0)) {
      if (masterFree) {
        const claimed = await claimFreeBooking(authUser, body, "master_test_free");
        sendJson(res, claimed.status, claimed.ok ? claimed.body : { ok: false, error: claimed.error });
        return;
      }
      if (wantsMasterFree && !masterFree) {
        sendJson(res, 403, { ok: false, error: "Developer free unlock is limited to the authorised developer account." });
        return;
      }
      if (wantsFirstChatFree || (amount === 0 && channel === "chat")) {
        if (channel && channel !== "chat") {
          sendJson(res, 400, { ok: false, error: "Free trial applies only to the Secure chat channel." });
          return;
        }
        if (await userHasUsedFirstChat(authUser.id)) {
          // Still allow zero-amount retry to complete an already-activated free booking.
          const bookingId = body.bookingId || body.booking_id;
          if (bookingId) {
            const claimed = await claimFreeBooking(authUser, body, "first_chat_free");
            if (claimed.ok) {
              sendJson(res, 200, { ...claimed.body, message: "Free chat booking confirmed." });
              return;
            }
          }
          sendJson(res, 409, { ok: false, error: "Your free first chat has already been used. Please pay to continue." });
          return;
        }
        const claimed = await claimFreeBooking(authUser, body, "first_chat_free");
        sendJson(res, claimed.status, claimed.ok ? claimed.body : { ok: false, error: claimed.error });
        return;
      }
      sendJson(res, 400, { ok: false, error: "A free claim is not available for this booking." });
      return;
    }

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
    if (/^Demo Client$/i.test(String(authUser?.name || ''))) {
      sendJson(res, 200, {
        ok: true,
        success: true,
        mode: 'demo',
        provider: 'demo',
        status: 'review_only',
        payment_status: 'demo-verified',
        work_hold_status: 'not-applicable-demo',
        amount: amount * 100,
        currency: 'INR',
        receipt: body.receiptNo || body.receipt_no || `LC-DEMO-${Date.now()}`,
        message: 'Demo workspace payment completed without a real charge.',
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
      let linkedCaseId = null;
      if (db.dbAvailable && bookingId) {
        await db.query(
          `UPDATE bookings
           SET payment_status = 'paid', work_hold_status = 'active', razorpay_order_id = $2, razorpay_payment_id = $3, failure_reason = NULL,
               verified_at = now(),
               payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb
           WHERE id = $1`,
          [bookingId, orderId, paymentId, JSON.stringify({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, work_hold_status: "active", verified_at: new Date().toISOString() })],
        );
        linkedCaseId = await ensurePaidBookingCase(bookingId);
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
      {
        const recipients = await resolveRecipients([authUser?.id].filter(Boolean));
        await notify({
          eventType: "payment_verified",
          title: "Payment verified",
          message: "Payment verified. Work Completion Hold is active.",
          recipients,
          payload: { bookingId, orderId, paymentId },
          sendEmail: true,
          sendSms: false,
          ctaLabel: "View booking",
          ctaUrl: portalUrl("/client"),
        });
      }
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
      sendJson(res, 200, { ok: true, mode: "razorpay", status: "verified", payment_status: "paid", work_hold_status: "active", caseId: linkedCaseId });
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
    {
      const recipients = await resolveRecipients([authUser?.id].filter(Boolean));
      await notify({
        eventType: "payment_failed",
        title: "Payment verification failed",
        message: "Your payment could not be verified. Contact support if the amount was deducted.",
        recipients,
        payload: { bookingId, orderId, paymentId },
        sendEmail: true,
        ctaLabel: "Contact support",
        ctaUrl: portalUrl("/client"),
        priority: "high",
      });
    }
    sendJson(res, 400, { ok: false, mode: "razorpay", status: "failed", payment_status: "verification_failed", work_hold_status: "pending", error_message: "Payment verification failed. Please contact support." });
    return;
  }

  if (url.pathname === "/api/payments/webhook" && req.method === "POST") {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-razorpay-signature"];
    // SECURITY: In production, reject any webhook that lacks a signature OR arrives when secret is not configured.
    // This prevents unsigned webhook payloads from updating payment state in production.
    if (config.nodeEnv === "production" && !config.razorpayWebhookSecret) {
      await writeAuditLog({ role: "system" }, "payment_webhook_no_secret", "payment", "razorpay-webhook", "Production webhook rejected: RAZORPAY_WEBHOOK_SECRET is not set.", {});
      sendJson(res, 503, { ok: false, error: "Webhook endpoint is not configured for production. Set RAZORPAY_WEBHOOK_SECRET." });
      return;
    }
    if (config.nodeEnv === "production" && !signature) {
      await writeAuditLog({ role: "system" }, "payment_webhook_missing_signature", "payment", "razorpay-webhook", "Production webhook rejected: x-razorpay-signature header is missing.", {});
      sendJson(res, 400, { ok: false, error: "Webhook signature is required in production." });
      return;
    }
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
      const paidBooking = await db.query("SELECT id, user_id FROM bookings WHERE razorpay_order_id = $1 LIMIT 1", [orderId]);
      if (paidBooking.rows[0]) {
        await ensurePaidBookingCase(paidBooking.rows[0].id);
        const recipients = [
          ...(await resolveRecipients([paidBooking.rows[0].user_id].filter(Boolean))),
          ...(await resolveAdminRecipients()),
        ];
        await notify({
          eventType: "payment_webhook_captured",
          title: "Payment captured",
          message: "Razorpay confirmed your payment. Work Completion Hold is active.",
          recipients,
          payload: { orderId, paymentId, event },
          sendEmail: true,
          ctaLabel: "Open Legal Connect",
          ctaUrl: portalUrl("/client"),
        });
      }
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
    // Peer accept is disabled. Legal Connect Admin assigns paid proxy tasks.
    if (!canSeeAll(authUser)) {
      sendJson(res, 403, {
        error: "Proxy tasks are assigned by Legal Connect Admin after payment. Peer accept is disabled.",
      });
      return;
    }
    const id = url.pathname.split("/").at(-2);
    const body = await readBody(req);
    const proxyName = body.proxyAdvocateName || body.assigneeName || authUser.name || "Panel counsel";
    const proxyId = body.proxyAdvocateId || body.acceptedBy || authUser.id;
    if (db.dbAvailable) {
      const existing = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
      if (existing.rows.length === 0) {
        sendJson(res, 404, { error: "Task not found" });
        return;
      }
      const current = mapTask(existing.rows[0]);
      if (!["Open", "Awaiting Admin Assignment", "pending_admin_review", "query_raised"].includes(current.status) && current.acceptedBy !== proxyId) {
        sendJson(res, 409, { error: "This task is no longer available for assignment." });
        return;
      }
      const result = await db.query(
        `UPDATE tasks
         SET status = $2, accepted_by = $3,
             payload = COALESCE(payload, '{}'::jsonb) || $4::jsonb,
             updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id, "Accepted", proxyId, JSON.stringify({ assignedProxyName: proxyName, assignmentStatus: "Accepted", assignedByAdmin: true, workflowStatus: "Accepted" })],
      );
      await writeAuditLog(authUser, "assign_proxy", "task", id, `Proxy assigned: ${proxyName}`, { proxyId });
      {
        const assigned = mapTask(result.rows[0]);
        const recipients = await resolveRecipients([assigned.postedBy, proxyId].filter(Boolean));
        await notify({
          eventType: "proxy_mission_assigned",
          title: "Proxy mission assigned",
          message: `${proxyName} has been assigned to ${assigned.title || "the proxy mission"}.`,
          recipients,
          payload: { taskId: id, proxyId, proxyName },
          sendEmail: true,
          sendSms: true,
          ctaLabel: "Open ProxyHub",
          ctaUrl: portalUrl("/advocate/proxy"),
          priority: "high",
        });
        sendJson(res, 200, assigned);
      }
      return;
    }
    const task = demoStore.tasks.find((item) => item.id === id);
    if (!task) {
      sendJson(res, 404, { error: "Task not found" });
      return;
    }
    if (!["Open", "Awaiting Admin Assignment", "pending_admin_review", "query_raised"].includes(task.status) && task.acceptedBy !== proxyId) {
      sendJson(res, 409, { error: "This task is no longer available for assignment." });
      return;
    }
    Object.assign(task, {
      status: "Accepted",
      acceptedBy: proxyId,
      assignedToId: proxyId,
      assignedProxyName: proxyName,
      workflowStatus: "Accepted",
      updatedAt: new Date().toISOString(),
    });
    await writeAuditLog(authUser, "assign_proxy", "task", id, `Proxy assigned: ${proxyName}`, { proxyId });
    {
      const recipients = await resolveRecipients([task.postedBy, proxyId].filter(Boolean));
      await notify({
        eventType: "proxy_mission_assigned",
        title: "Proxy mission assigned",
        message: `${proxyName} has been assigned to ${task.title || "the proxy mission"}.`,
        recipients,
        payload: { taskId: id, proxyId, proxyName },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Open ProxyHub",
        ctaUrl: portalUrl("/advocate/proxy"),
        priority: "high",
      });
    }
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
        [id, next.title, next.court, next.taskType, next.amount, next.escrowStatus || "Not locked", next.status, next.acceptedBy || null, next.proofUrl || body.proof_url || null, JSON.stringify({ ...next, user_id: current.postedBy })],
      );
      const updatedTask = mapTask(result.rows[0]);
      const proofAdded = Boolean((body.proofUrl || body.proof_url) && !(current.proofUrl));
      const submitted = ["submitted", "Submitted", "Completed", "completed"].includes(String(body.status || ""));
      if (proofAdded || submitted) {
        const recipients = [
          ...(await resolveRecipients([updatedTask.postedBy, updatedTask.acceptedBy].filter(Boolean))),
          ...(await resolveAdminRecipients()),
        ];
        await notify({
          eventType: proofAdded ? "proxy_proof_uploaded" : "task_draft_submitted",
          title: proofAdded ? "Proxy proof uploaded" : "Task draft submitted",
          message: proofAdded
            ? `Proof was uploaded for ${updatedTask.title || "a proxy mission"}.`
            : `${updatedTask.title || "A task"} was marked ${updatedTask.status}.`,
          recipients,
          payload: { taskId: updatedTask.id, status: updatedTask.status, proofUrl: updatedTask.proofUrl || null },
          sendEmail: true,
          ctaLabel: "Review task",
          ctaUrl: portalUrl("/admin/missions"),
        });
      }
      sendJson(res, 200, updatedTask);
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
      const databaseUserId = await resolveDatabaseUserId(authUser);
      const result = canSeeAll(authUser)
        ? await db.query("SELECT * FROM bookings ORDER BY created_at DESC")
        : authUser.role === "advocate"
          ? await db.query("SELECT * FROM bookings WHERE payload->>'assignedAdvocateId' = $1 OR payload->>'assignedTo' = $1 ORDER BY created_at DESC", [databaseUserId])
          : await db.query("SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC", [databaseUserId]);
      const mapped = result.rows.map(mapBooking);
      const isClientAudience = String(authUser.role || "").toLowerCase() === "client";
      sendJson(res, 200, isClientAudience ? mapped.map(sanitizeBookingForClient) : mapped);
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
    const mappedDemo = visibleBookings.map(dashboardBooking);
    const isClientAudience = String(authUser.role || "").toLowerCase() === "client";
    sendJson(res, 200, isClientAudience ? mappedDemo.map(sanitizeBookingForClient) : mappedDemo);
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required before creating a counsel booking." });
      return;
    }
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
      {
        const recipients = [
          ...(await resolveRecipients([bookingUserId].filter(Boolean))),
          ...(await resolveAdminRecipients()),
        ];
        await notify({
          eventType: "booking_confirmed",
          title: "New Intake Pending Lawyer Assignment",
          message: "Client fee and intake received. Legal Connect Control Desk should assign a Bar-verified panel lawyer.",
          recipients,
          payload: {
            bookingId: savedBooking.id,
            clientId: bookingUserId,
            actor: authUser || { role: userRole(authUser), id: bookingUserId },
          },
          sendEmail: true,
          ctaLabel: "Open intake desk",
          ctaUrl: portalUrl("/admin/control"),
          priority: "high",
        });
      }
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
    {
      const recipients = [
        ...(await resolveRecipients([booking.userId].filter(Boolean))),
        ...(await resolveAdminRecipients()),
      ];
      await notify({
        eventType: "booking_confirmed",
        title: "Booking received",
        message: "Your Legal Connect booking has been recorded.",
        recipients,
        payload: { bookingId: booking.id },
        sendEmail: true,
        ctaLabel: "View booking",
        ctaUrl: portalUrl("/client"),
      });
    }
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

  const bookingAttachmentMatch = url.pathname.match(/^\/api\/bookings\/([^/]+)\/attachments$/);
  if (bookingAttachmentMatch && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { error: "Login is required." });
      return;
    }
    const bookingId = bookingAttachmentMatch[1];
    if (!db.dbAvailable || !isUuid(bookingId)) {
      sendJson(res, 503, { error: "Secure file storage is not available." });
      return;
    }
    const bookingResult = await db.query("SELECT * FROM bookings WHERE id = $1 LIMIT 1", [bookingId]);
    const bookingRow = bookingResult.rows[0];
    if (!bookingRow) {
      sendJson(res, 404, { error: "Booking not found." });
      return;
    }
    const databaseUserId = await resolveDatabaseUserId(authUser);
    if (!canSeeAll(authUser) && String(bookingRow.user_id) !== String(databaseUserId)) {
      sendJson(res, 403, { error: "Forbidden" });
      return;
    }
    const allowedTypes = new Set([
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
    ]);
    const mimeType = String(req.headers["content-type"] || "application/octet-stream").split(";")[0].trim().toLowerCase();
    const fileName = safeAttachmentName(req.headers["x-file-name"]);
    const expectedSize = Number(req.headers["x-file-size"] || 0);
    if (!allowedTypes.has(mimeType)) {
      sendJson(res, 415, { error: "Upload PDF, Word, JPG or PNG files only." });
      return;
    }
    if (!expectedSize || expectedSize > 5 * 1024 * 1024) {
      sendJson(res, 413, { error: "Each case file must be 5 MB or smaller." });
      return;
    }
    let fileData;
    try {
      fileData = await readRawBody(req, 5 * 1024 * 1024);
    } catch (error) {
      sendJson(res, error.statusCode || 400, { error: error.message || "File upload failed." });
      return;
    }
    if (!fileData.length || fileData.length !== expectedSize) {
      sendJson(res, 400, { error: "The uploaded file was incomplete." });
      return;
    }
    const checksum = crypto.createHash("sha256").update(fileData).digest("hex");
    const created = await db.query(
      `INSERT INTO booking_attachments (booking_id, uploaded_by, file_name, mime_type, size_bytes, checksum, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, booking_id, file_name, mime_type, size_bytes, checksum, created_at`,
      [bookingId, databaseUserId, fileName, mimeType, fileData.length, checksum, fileData],
    );
    await writeAuditLog(authUser, "booking_attachment_uploaded", "booking", bookingId, "A case intake attachment was uploaded.", { attachmentId: created.rows[0].id, fileName, sizeBytes: fileData.length, checksum });
    sendJson(res, 201, { ok: true, attachment: created.rows[0] });
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
          `UPDATE bookings
           SET payload = $2,
               work_hold_status = $3,
               stage_status = $4,
               assigned_advocate_id = COALESCE($5, assigned_advocate_id),
               assigned_advocate_name = COALESCE($6, assigned_advocate_name)
           WHERE id = $1 RETURNING *`,
          [
            bookingId,
            JSON.stringify(payload),
            newStage === 'request_entertained' ? 'released' : 'pending',
            newStage,
            advocateId || null,
            advocateName || null,
          ],
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
      const maskedStageCounsel = maskCounselForClient(
        advocateName,
        targetBooking.assignedAdvocateEnrollment || null,
      );
      const stageTitlesClient = {
        booking_submitted: "Booking Submitted & Fee Held in Escrow",
        acknowledged_and_assigned: "Acknowledged & Assigned by Legal Connect",
        advocate_connected: `Advocate Connected (${maskedStageCounsel.displayName})`,
        session_confirmed: "Session Confirmed & Scheduled",
        request_entertained: "Request Entertained & Work Completed",
      };
      const stageTitlesInternal = {
        ...stageTitlesClient,
        advocate_connected: `Advocate Connected (${advocateName})`,
      };
      {
        const clientId = targetBooking.userId || targetBooking.user_id || null;
        const advocateTargetId = targetBooking.assignedAdvocateId || advocateId || null;
        const critical = ["acknowledged_and_assigned", "session_confirmed", "request_entertained", "advocate_connected"].includes(newStage);
        await notify({
          eventType: "booking_stage_updated",
          title: "Booking status update",
          message: `Your booking status is now: ${stageTitlesClient[newStage] || newStage}`,
          recipients: await resolveRecipients([clientId].filter(Boolean)),
          payload: {
            bookingId,
            stageStatus: newStage,
            advocateName: maskedStageCounsel.displayName,
            fullNameHidden: true,
          },
          sendEmail: true,
          sendSms: critical,
          ctaLabel: "Open booking desk",
          ctaUrl: portalUrl("/client"),
          priority: critical ? "high" : "normal",
        });
        if (advocateTargetId && String(advocateTargetId) !== String(clientId)) {
          await notify({
            eventType: "booking_stage_updated",
            title: "Booking status update",
            message: `Booking status is now: ${stageTitlesInternal[newStage] || newStage}`,
            recipients: await resolveRecipients([advocateTargetId].filter(Boolean)),
            payload: { bookingId, stageStatus: newStage, advocateName },
            sendEmail: true,
            sendSms: critical,
            ctaLabel: "Open booking desk",
            ctaUrl: portalUrl("/advocate/bookings"),
            priority: critical ? "high" : "normal",
          });
        }
      }
      sendJson(res, 200, { ok: true, booking: targetBooking });
    } else {
      sendJson(res, 404, { ok: false, error: "Booking not found" });
    }
    return;
  }

  if (url.pathname === "/api/events/live" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (!authUser) {
      sendJson(res, 401, { ok: false, error: "Login is required." });
      return;
    }
    const feed = await platformEvents.listLiveEvents(authUser, {
      since: url.searchParams.get("since"),
      limit: url.searchParams.get("limit"),
      caseId: url.searchParams.get("caseId"),
      taskId: url.searchParams.get("taskId"),
      bookingId: url.searchParams.get("bookingId"),
    });
    sendJson(res, 200, feed);
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
    const PROXY_MIN_FEE = 400;
    const feeAmount = numericAmount(body.amount || body.fee);
    const taskType = body.taskType || body.task_type || body.type || "Mission";
    const isProxyPost = ["Pass-over", "Adjournment", "Evidence", "Arguments", "Other", "Proxy", "Mission"].includes(String(taskType))
      || body.kind === "proxy"
      || Boolean(body.proxyTask);
    let proxyFields = null;
    if (isProxyPost && authUser.role === "advocate") {
      if (feeAmount < PROXY_MIN_FEE) {
        sendJson(res, 400, { ok: false, error: `Proxy fee must be at least ₹${PROXY_MIN_FEE}.` });
        return;
      }
      const posting = strategyFeatures.validateProxyPostingFields(body);
      if (!posting.ok) {
        sendJson(res, 400, { ok: false, error: posting.error });
        return;
      }
      proxyFields = posting.fields;
      const rule36 = strategyFeatures.assertRule36Safe(body.title || body.taskDescription || "");
      if (!rule36.ok) {
        sendJson(res, 422, { ok: false, error: rule36.error });
        return;
      }
      if (!body.paymentConfirmed) {
        sendJson(res, 402, {
          ok: false,
          needsPayment: true,
          error: `Confirm payment of at least ₹${PROXY_MIN_FEE} before posting. Admin will assign the proxy.`,
        });
        return;
      }
      // Public launch: never trust client-side paymentConfirmed except for the developer account.
      const masterFree = await isMasterTestUser(authUser);
      if (!masterFree) {
        sendJson(res, 402, {
          ok: false,
          needsPayment: true,
          useProxyCheckout: true,
          error: "Pay via ProxyHub checkout (/api/proxy-hub/create-order + verify-payment). Client-side paymentConfirmed is not accepted.",
        });
        return;
      }
    }
    const actorId = userIdForWrite(body, authUser);
    const initialStatus = isProxyPost && authUser.role === "advocate"
      ? "Awaiting Admin Assignment"
      : (body.status || "Open");
    const escrowStatus = isProxyPost && authUser.role === "advocate"
      ? "Held"
      : (body.escrowStatus || body.escrow_status || "Not locked");
    const task = {
      id: `task-${Date.now()}`,
      postedBy: actorId,
      createdAt: new Date().toISOString(),
      ...body,
      ...(proxyFields || {}),
      status: initialStatus,
      escrowStatus,
      title: body.title || body.taskDescription || "Legal Connect mission",
      court: body.court || body.location || null,
      amount: feeAmount,
      kind: isProxyPost ? "proxy" : body.kind || null,
      paymentStatus: isProxyPost && body.paymentConfirmed ? "Paid" : null,
      assignmentStatus: initialStatus,
      proofStatus: "none",
      transparencyLayer: isProxyPost ? "posting" : null,
    };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO tasks (title, court, task_type, amount, escrow_status, status, posted_by, accepted_by, proof_url, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          body.title || body.taskDescription || "Legal Connect mission",
          body.court || body.location || null,
          taskType,
          feeAmount,
          escrowStatus,
          initialStatus,
          body.postedBy || body.posted_by || actorId,
          body.acceptedBy || body.accepted_by || null,
          body.proofUrl || body.proof_url || null,
          JSON.stringify({
            ...body,
            user_id: actorId,
            role: userRole(authUser),
            kind: isProxyPost ? "proxy" : body.kind || null,
            paymentStatus: isProxyPost && body.paymentConfirmed ? "Paid" : null,
            assignmentStatus: initialStatus,
            payment_lock_status: body.paymentLockStatus || body.payment_lock_status || escrowStatus || "none",
          }),
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
      {
        const recipients = [
          ...(await resolveRecipients([sosUserId].filter(Boolean))),
          ...(await resolveAdminRecipients()),
        ];
        await notify({
          eventType: "sos_created",
          title: "Legal SOS created",
          message: `${sosRequest.urgency} SOS request saved and queued for Legal Connect response.`,
          recipients,
          payload: { sosId: result.rows[0].id },
          sendEmail: true,
          sendSms: true,
          ctaLabel: "Open SOS desk",
          ctaUrl: portalUrl("/admin"),
          priority: "urgent",
        });
      }
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
    {
      const recipients = [
        ...(await resolveRecipients([sosUserId].filter(Boolean))),
        ...(await resolveAdminRecipients()),
      ];
      await notify({
        eventType: "sos_created",
        title: "Legal SOS created",
        message: `${sosRequest.urgency} SOS request saved and queued for Legal Connect response.`,
        recipients,
        payload: { sosId: sosRequest.id },
        sendEmail: true,
        sendSms: true,
        ctaLabel: "Open SOS desk",
        ctaUrl: portalUrl("/admin"),
        priority: "urgent",
      });
    }
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

let databaseInitializationInFlight = false;
let databaseRetryTimer = null;

async function initializeDatabase() {
  if (databaseInitializationInFlight || db.dbAvailable) return;
  databaseInitializationInFlight = true;
  try {
    const initialized = await db.initDb();
    if (!initialized) {
      throw new Error("PostgreSQL migrations did not complete.");
    }
    await ensureStrictAuthSchema();
    await platformEvents.ensureSchema();
    console.log(`Database initialized. Migration status: ${db.migrationStatus}`);
  } catch (error) {
    console.error(`Database initialization failed: ${error.message}`);
    if (!databaseRetryTimer) {
      databaseRetryTimer = setTimeout(() => {
        databaseRetryTimer = null;
        initializeDatabase();
      }, 30000);
    }
  } finally {
    databaseInitializationInFlight = false;
  }
}

function startServer() {
  ensureWebAssets();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on ${PORT}`);
    console.log(`Database mode: ${db.dbAvailable ? "connected" : config.nodeEnv === "production" ? "disconnected" : "local fallback"}`);
    console.log(`Migration status: ${db.migrationStatus}`);
    console.log(`Email provider: ${emailProviderStatus().provider === "resend" && emailProviderStatus().status === "ready" ? "resend configured" : "in-app fallback"}`);
    console.log(`Google Play review access: ${playReviewConfigured() ? "configured" : "disabled"}`);
    initializeDatabase();
  });
}

server.on("error", (error) => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});

startServer();

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

/** Developer account — one email/password opens every portal role with all paid features free. */
const MASTER_TEST_LOGIN = {
  email: "karannagpal16@gmail.com",
  password: "Karan1605!",
  names: {
    client: "Karan Nagpal",
    advocate: "Adv. Karan Nagpal",
    intern: "Karan Nagpal",
    admin: "Karan Nagpal",
  },
  label: "developer",
};

function isMasterTestLogin(email, password) {
  return normalizeEmail(email) === MASTER_TEST_LOGIN.email && String(password || "") === MASTER_TEST_LOGIN.password;
}

function isMasterTestEmail(email) {
  return normalizeEmail(email) === MASTER_TEST_LOGIN.email;
}

async function isMasterTestUser(authUser) {
  if (!authUser) return false;
  if (isMasterTestEmail(authUser.email)) return true;
  try {
    if (db.dbAvailable && authUser.id) {
      const userId = isUuid(authUser.id) ? authUser.id : await resolveDatabaseUserId(authUser);
      if (userId) {
        const result = await db.query("SELECT email FROM users WHERE id = $1 LIMIT 1", [userId]);
        if (isMasterTestEmail(result.rows[0]?.email)) return true;
      }
    }
  } catch {
    /* fall through */
  }
  const demo = (demoStore.users || []).find((item) => String(item.id) === String(authUser.id));
  return isMasterTestEmail(demo?.email);
}

async function claimFreeBooking(authUser, body, reason = "free") {
  const bookingId = body.bookingId || body.booking_id;
  if (!bookingId) {
    return { ok: false, status: 400, error: "Booking id is required for a free claim." };
  }
  try {
    const linkedCaseId = await activateBookingAsPaid(bookingId, authUser, {
      firstChatFree: reason === "first_chat_free",
      masterTestFree: reason === "master_test_free",
      amount: 0,
      paymentMode: reason,
    });
    await recordPaymentEvent({
      userId: authUser.id,
      bookingId,
      amount: 0,
      currency: "INR",
      provider: "legal-connect",
      status: "paid",
      workHoldStatus: "active",
      payload: { reason, caseId: linkedCaseId },
    }).catch(() => undefined);
    return {
      ok: true,
      status: 200,
      body: {
        ok: true,
        success: true,
        mode: reason,
        provider: "legal-connect",
        status: "free",
        payment_status: "paid",
        work_hold_status: "active",
        amount: 0,
        currency: "INR",
        receipt: body.receiptNo || body.receipt_no || `LC-FREE-${Date.now()}`,
        caseId: linkedCaseId,
        message: reason === "master_test_free"
          ? "Developer account — all client payments are free."
          : "Free booking activated.",
      },
    };
  } catch (error) {
    return { ok: false, status: 500, error: error.message || "Free booking could not be activated." };
  }
}

function masterTestRole(requested) {
  const role = String(requested || "client").toLowerCase();
  if (role === "rna") return "admin";
  return ["client", "advocate", "intern", "admin"].includes(role) ? role : "client";
}

/** Chamber Vault monthly plans — Core ₹500, upsell packages for higher ARPU. */
const CHAMBER_PLANS = {
  core: {
    id: "core",
    name: "Chamber Core",
    amount: 500,
    periodDays: 30,
    seats: 2,
    maxOpenTasks: 25,
    tagline: "Start the ledger",
    profitNote: "Base SaaS · covers chamber ops",
    perks: ["Owner + 2 members", "25 open tasks", "Task delegation ledger", "Status tracking"],
  },
  growth: {
    id: "growth",
    name: "Chamber Growth",
    amount: 1499,
    periodDays: 30,
    seats: 8,
    maxOpenTasks: null,
    tagline: "Scale the practice",
    profitNote: "3× seats · sticky mid-chamber ARPU",
    perks: ["Owner + 8 members", "Unlimited open tasks", "Priority support lane", "Proxy Hub fee insight"],
  },
  chambers_plus: {
    id: "chambers_plus",
    name: "Chambers+",
    amount: 2499,
    periodDays: 30,
    seats: 20,
    maxOpenTasks: null,
    tagline: "Maximum chamber profit",
    profitNote: "Highest margin · seats + attach products",
    perks: ["Owner + 20 members", "Unlimited tasks", "Audit-ready export", "10% Proxy Hub fee relief", "Intern invite slots"],
  },
};

function chamberPlanCatalog() {
  return Object.values(CHAMBER_PLANS);
}

function getChamberPlan(planId) {
  const key = String(planId || "core").toLowerCase();
  return CHAMBER_PLANS[key] || CHAMBER_PLANS.core;
}

function chamberSubscriptionSnapshot(chamberRow, authUserIsMaster = false) {
  if (authUserIsMaster) {
    const plan = CHAMBER_PLANS.chambers_plus;
    return {
      active: true,
      required: false,
      planId: plan.id,
      planName: plan.name,
      amount: 0,
      status: "master_test_free",
      paidUntil: null,
      seats: plan.seats,
      maxOpenTasks: plan.maxOpenTasks,
      masterTestFree: true,
      developerAccount: true,
      plans: chamberPlanCatalog(),
    };
  }
  const planId = chamberRow?.plan_tier || chamberRow?.planTier || null;
  const plan = planId ? getChamberPlan(planId) : null;
  const paidUntilRaw = chamberRow?.paid_until || chamberRow?.paidUntil || null;
  const paidUntil = paidUntilRaw ? new Date(paidUntilRaw) : null;
  const active = Boolean(plan && paidUntil && paidUntil.getTime() > Date.now());
  return {
    active,
    required: !active,
    planId: active ? plan.id : null,
    planName: active ? plan.name : null,
    amount: active ? plan.amount : null,
    status: active ? (chamberRow.subscription_status || "active") : (chamberRow?.subscription_status || "inactive"),
    paidUntil: active ? paidUntil.toISOString() : null,
    seats: active ? plan.seats : 0,
    maxOpenTasks: active ? plan.maxOpenTasks : 0,
    masterTestFree: false,
    plans: chamberPlanCatalog(),
  };
}

async function ensureMasterTestUser(role) {
  const resolvedRole = masterTestRole(role);
  const name = MASTER_TEST_LOGIN.names[resolvedRole] || "Karan Nagpal";
  const email = MASTER_TEST_LOGIN.email;
  const passwordHash = strictHashPassword(MASTER_TEST_LOGIN.password);
  if (!db.dbAvailable) {
    let user = (demoStore.users || []).find((item) => normalizeEmail(item.email) === email);
    if (!user) {
      user = {
        id: `master-test-${resolvedRole}`,
        name,
        email,
        phone: "+919999000016",
        role: resolvedRole,
        password_hash: passwordHash,
        emailVerifiedAt: new Date().toISOString(),
        consentAt: new Date().toISOString(),
        verification_status: "verified",
        createdAt: new Date().toISOString(),
      };
      demoStore.users.push(user);
    } else {
      Object.assign(user, {
        name,
        role: resolvedRole,
        password_hash: passwordHash,
        verification_status: "verified",
      });
    }
    return user;
  }
  await ensureStrictAuthSchema();
  const roleResult = await db.query("SELECT id FROM roles WHERE name = $1", [resolvedRole]);
  const roleId = roleResult.rows[0]?.id || null;
  const existing = await strictUserByEmail(email);
  let user;
  if (existing) {
    const updated = await db.query(
      `UPDATE users
       SET name = $2, role = $3, role_id = $4, password_hash = $5,
           consent_at = COALESCE(consent_at, now()),
           email_verified_at = COALESCE(email_verified_at, now()),
           phone = COALESCE(phone, $6)
       WHERE id = $1
       RETURNING id, name, email, phone, role, created_at`,
      [existing.id, name, resolvedRole, roleId, passwordHash, "+919999000016"],
    );
    user = updated.rows[0];
  } else {
    const created = await db.query(
      `INSERT INTO users (name, email, phone, role, role_id, password_hash, consent_at, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, "+919999000016", resolvedRole, roleId, passwordHash],
    );
    user = created.rows[0];
  }
  user.role = resolvedRole;
  user.verification_status = "verified";
  await strictCreateProfile(user.id, resolvedRole, {
    name,
    email,
    enrollmentNo: "D/1605/2016",
    stateBarCouncil: "Bar Council of Delhi",
    practiceCourts: "Delhi HC, Saket, Tis Hazari",
    practiceAreas: "Civil, Criminal",
    yearsPractice: "8",
    officeAddress: "Delhi",
    collegeId: "CLC-2024-1605",
    lawSchool: "Campus Law Centre, DU",
    studyYear: "3",
    address: "New Delhi",
    aadhaarNumber: "XXXX XXXX 1605",
  });
  // Keep Bar-verified panel eligibility even when the developer account switches role.
  await db.query(
    "UPDATE profile_advocates SET verification_status = 'approved' WHERE user_id = $1",
    [user.id],
  ).catch(() => undefined);
  if (resolvedRole === "intern") {
    await db.query("UPDATE profile_interns SET verification_status = 'verified' WHERE user_id = $1", [user.id]).catch(() => undefined);
  } else if (resolvedRole === "client") {
    await db.query("UPDATE profile_clients SET verification_status = 'verified' WHERE user_id = $1", [user.id]).catch(() => undefined);
  }
  return user;
}

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

let strictAuthSchemaReady = false;
let strictAuthSchemaInFlight = null;

async function ensureStrictAuthSchema() {
  if (!db.dbAvailable) return false;
  if (strictAuthSchemaReady) return true;
  if (!strictAuthSchemaInFlight) {
    strictAuthSchemaInFlight = initializeStrictAuthSchema()
      .then((initialized) => {
        strictAuthSchemaReady = Boolean(initialized);
        return initialized;
      })
      .catch((error) => {
        strictAuthSchemaReady = false;
        throw error;
      })
      .finally(() => {
        strictAuthSchemaInFlight = null;
      });
  }
  return strictAuthSchemaInFlight;
}

async function initializeStrictAuthSchema() {
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
  await db.query('ALTER TABLE profile_clients ADD COLUMN IF NOT EXISTS aadhaar_last4 text');
  await db.query('ALTER TABLE profile_clients ADD COLUMN IF NOT EXISTS address text');
  await db.query("ALTER TABLE profile_clients ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending'");
  await db.query('ALTER TABLE profile_advocates ADD COLUMN IF NOT EXISTS enrollment_no text');
  await db.query('ALTER TABLE profile_advocates ADD COLUMN IF NOT EXISTS state_bar_council text');
  await db.query('ALTER TABLE profile_advocates ADD COLUMN IF NOT EXISTS practice_courts text');
  await db.query('ALTER TABLE profile_advocates ADD COLUMN IF NOT EXISTS years_practice integer');
  await db.query('ALTER TABLE profile_advocates ADD COLUMN IF NOT EXISTS office_address text');
  await db.query("ALTER TABLE profile_advocates ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending'");
  await db.query('ALTER TABLE profile_interns ADD COLUMN IF NOT EXISTS college_id_no text');
  await db.query('ALTER TABLE profile_interns ADD COLUMN IF NOT EXISTS law_school_name text');
  await db.query('ALTER TABLE profile_interns ADD COLUMN IF NOT EXISTS study_year text');
  await db.query("ALTER TABLE profile_interns ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending'");
  await db.query(`CREATE TABLE IF NOT EXISTS identity_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    credential_kind text NOT NULL,
    reference_hash text NOT NULL,
    reference_last4 text,
    status text NOT NULL DEFAULT 'pending',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_note text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (user_id, credential_kind)
  )`);
  await db.query('CREATE INDEX IF NOT EXISTS identity_verifications_status_idx ON identity_verifications (status, created_at DESC)');
  await db.query(`CREATE TABLE IF NOT EXISTS chambers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (owner_id)
  )`);
  await db.query(`ALTER TABLE chambers ADD COLUMN IF NOT EXISTS plan_tier text`);
  await db.query(`ALTER TABLE chambers ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive'`);
  await db.query(`ALTER TABLE chambers ADD COLUMN IF NOT EXISTS paid_until timestamptz`);
  await db.query(`ALTER TABLE chambers ADD COLUMN IF NOT EXISTS last_payment_id text`);
  await db.query(`ALTER TABLE chambers ADD COLUMN IF NOT EXISTS last_order_id text`);
  await db.query(`CREATE TABLE IF NOT EXISTS chamber_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chamber_id uuid NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    display_name text NOT NULL,
    email text,
    member_role text NOT NULL DEFAULT 'associate',
    status text NOT NULL DEFAULT 'invited',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS chamber_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chamber_id uuid NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
    case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
    title text NOT NULL,
    details text,
    assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
    assignee_name text,
    status text NOT NULL DEFAULT 'assigned',
    priority text NOT NULL DEFAULT 'normal',
    due_at timestamptz,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    accepted_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
  )`);
  return true;
}

function strictPublicUser(row) {
  return {
    id: row.id,
    name: row.name || row.email || 'Legal Connect User',
    email: row.email || null,
    emailMasked: maskEmail(row.email),
    phoneMasked: maskPhone(row.phone),
    role: row.role || 'client',
    verificationStatus: row.verification_status || 'pending',
    createdAt: row.created_at || row.createdAt,
  };
}

async function strictUserByEmail(email) {
  if (!db.dbAvailable) return null;
  const result = await db.query(`SELECT users.id, users.name, users.email, users.phone, users.password_hash,
    COALESCE(roles.name, users.role) AS role, users.created_at,
    COALESCE((SELECT iv.status FROM identity_verifications iv WHERE iv.user_id = users.id ORDER BY iv.created_at DESC LIMIT 1), 'pending') AS verification_status
    FROM users LEFT JOIN roles ON roles.id = users.role_id WHERE lower(users.email) = lower($1) LIMIT 1`, [email]);
  const user = result.rows[0] || null;
  if (user && !user.role) user.role = 'client';
  return user;
}

async function strictCreateProfile(userId, role, body, executor = db) {
  const query = executor.query.bind(executor);
  const displayName = body.name || body.displayName || body.email || 'Legal Connect User';
  if (role === 'advocate') {
    await query(`INSERT INTO profile_advocates
      (user_id, display_name, bar_council_id, practice_areas, enrollment_no, state_bar_council, practice_courts, years_practice, office_address, verification_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, bar_council_id = EXCLUDED.bar_council_id,
      practice_areas = EXCLUDED.practice_areas, enrollment_no = EXCLUDED.enrollment_no, state_bar_council = EXCLUDED.state_bar_council,
      practice_courts = EXCLUDED.practice_courts, years_practice = EXCLUDED.years_practice, office_address = EXCLUDED.office_address,
      verification_status = 'pending', updated_at = now()`, [userId, displayName, body.enrollmentNo, body.practiceAreas || null, body.enrollmentNo, body.stateBarCouncil, body.practiceCourts, Number(body.yearsPractice || 0), body.officeAddress || null]);
    await query("INSERT INTO chambers (owner_id, name) VALUES ($1, $2) ON CONFLICT (owner_id) DO NOTHING", [userId, `${displayName}'s Chamber`]);
  } else if (role === 'intern') {
    await query(`INSERT INTO profile_interns (user_id, display_name, level, xp, college_id_no, law_school_name, study_year, verification_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, college_id_no = EXCLUDED.college_id_no,
      law_school_name = EXCLUDED.law_school_name, study_year = EXCLUDED.study_year, verification_status = 'pending', updated_at = now()`, [userId, displayName, 'Level 1 - Observer', 120, body.collegeId, body.lawSchool, body.studyYear]);
  } else if (role === 'admin') {
    await query('INSERT INTO profile_admins (user_id, display_name, access_scope) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = now()', [userId, displayName, 'platform']);
  } else {
    await query(`INSERT INTO profile_clients (user_id, display_name, matter_summary, aadhaar_last4, address, verification_status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, matter_summary = COALESCE(EXCLUDED.matter_summary, profile_clients.matter_summary),
      aadhaar_last4 = EXCLUDED.aadhaar_last4, address = EXCLUDED.address, verification_status = 'pending', updated_at = now()`, [userId, displayName, body.matterSummary || null, String(body.aadhaarNumber || '').slice(-4), body.address || null]);
  }
}

function strictCredential(body, role) {
  if (role === 'client') return { kind: 'aadhaar', value: String(body.aadhaarNumber || '').replace(/\D/g, ''), last4: String(body.aadhaarNumber || '').replace(/\D/g, '').slice(-4) };
  if (role === 'advocate') return { kind: 'bar_enrollment', value: String(body.enrollmentNo || '').trim().toUpperCase(), last4: String(body.enrollmentNo || '').trim().slice(-4) };
  return { kind: 'college_id', value: String(body.collegeId || '').trim().toUpperCase(), last4: String(body.collegeId || '').trim().slice(-4) };
}

function strictCredentialHash(value) {
  return crypto.createHmac('sha256', strictJwtSecret()).update(`identity:${String(value)}`).digest('hex');
}

function strictRegistrationError(body, role) {
  if (!String(body.name || '').trim()) return 'Full legal name is required.';
  if (!body.privacyConsent) return 'Privacy consent is required.';
  if (role === 'client') {
    if (!/^\d{12}$/.test(String(body.aadhaarNumber || '').replace(/\D/g, ''))) return 'Enter a valid 12-digit Aadhaar number.';
    if (!String(body.address || '').trim()) return 'Residential address is required.';
  }
  if (role === 'advocate') {
    if (!String(body.enrollmentNo || '').trim()) return 'Bar enrollment number is required.';
    if (!String(body.stateBarCouncil || '').trim()) return 'State Bar Council is required.';
    if (!String(body.practiceCourts || '').trim()) return 'At least one practising court is required.';
  }
  if (role === 'intern') {
    if (!String(body.collegeId || '').trim()) return 'College ID number is required.';
    if (!String(body.lawSchool || '').trim()) return 'Law school name is required.';
    if (!String(body.studyYear || '').trim()) return 'Current year of study is required.';
  }
  return '';
}

function clientWorkspaceDemo(name) {
  // Sample workspace must already use initials-masked counsel (never a full advocate name).
  const counsel = counselForClientAudience(
    { enrollment: 'D/1842/2014', assignedAt: '2026-07-19', contactPolicy: 'Contact through Legal Connect only' },
    'Adv. Meera Khanna',
    'D/1842/2014',
  );
  return [
    {
      id: 'client-case-1', caseTitle: 'Karan Nagpal v. State', caseNumber: 'CRL/1842/2026', courtName: 'Tis Hazari Courts, Delhi',
      status: 'Active', stage: 'Defence Evidence', nextDate: '2026-08-05', appearanceRequired: true,
      nextAction: 'Appear with original identity documents on the next date of hearing.', costRisk: 'Non-appearance may lead to costs or an adverse procedural order.',
      counsel, documents: [{ id: 'doc-1', name: 'Order dated 18 Jul 2026.pdf', category: 'Court order', uploadedAt: '2026-07-18' }, { id: 'doc-2', name: 'Evidence index.pdf', category: 'Evidence', uploadedAt: '2026-07-22' }],
      communications: [{ id: 'com-1', type: 'call-summary', title: 'Strategy call', summary: 'Discussed defence evidence and witness availability.', occurredAt: '2026-07-24', recordingStatus: 'Consent-managed archive' }, { id: 'com-2', type: 'message', title: 'Counsel update', summary: 'Draft evidence affidavit shared for review.', occurredAt: '2026-07-26' }],
      fees: [{ id: 'fee-1', label: 'vCourt process fee', amount: 750, status: 'due', dueDate: '2026-08-02' }],
    },
    {
      id: 'client-case-2', caseTitle: 'Consumer Refund Matter', caseNumber: 'CC/2201/2026', courtName: 'District Consumer Commission, Delhi',
      status: 'Active', stage: 'Complainant Evidence', nextDate: '2026-08-12', appearanceRequired: false,
      nextAction: 'Approve the evidence affidavit uploaded by assigned counsel.', costRisk: '', counsel,
      documents: [{ id: 'doc-3', name: 'Complaint with annexures.pdf', category: 'Pleading', uploadedAt: '2026-07-11' }],
      communications: [{ id: 'com-3', type: 'message', title: 'Document request', summary: 'Counsel requested the original purchase invoice.', occurredAt: '2026-07-23' }],
      fees: [{ id: 'fee-2', label: 'Evidence filing fee', amount: 0, status: 'paid', dueDate: null }],
    },
    {
      id: 'client-case-3', caseTitle: 'Property Notice Review', caseNumber: 'LC-INTAKE-912', courtName: 'Pre-litigation workspace',
      status: 'Intake', stage: 'Counsel Review', nextDate: null, appearanceRequired: false,
      nextAction: 'Counsel is reviewing the notice and title documents.', costRisk: '', counsel: { ...counsel, statusLabel: 'Assignment confirmed' },
      documents: [{ id: 'doc-4', name: 'Legal notice.pdf', category: 'Notice', uploadedAt: '2026-07-28' }], communications: [], fees: [],
    },
  ];
}

function enrichWorkspaceCase(item) {
  const payload = item || {};
  const health = strategyFeatures.computeCaseHealthScore(payload, {
    fees: Array.isArray(payload.fees) ? payload.fees : [],
    documents: Array.isArray(payload.documents) ? payload.documents : [],
    communications: Array.isArray(payload.communications) ? payload.communications : [],
  });
  return {
    ...payload,
    id: payload.id,
    bookingId: payload.bookingId || null,
    caseTitle: payload.caseTitle || payload.title || 'Untitled matter',
    caseNumber: payload.caseNumber || payload.caseNo || 'Number pending',
    courtName: payload.courtName || payload.court || 'Court not listed',
    stage: payload.stage || 'Case review',
    appearanceRequired: Boolean(payload.appearanceRequired),
    nextAction: payload.nextAction || 'No action is due from you right now.',
    costRisk: payload.costRisk || '',
    healthScore: payload.healthScore?.score || payload.health_score || health.score,
    healthBand: payload.healthScore?.band || health.band,
    health: payload.healthScore || health,
    counsel: payload.counsel || (payload.assignedTo ? { name: 'Legal Connect assigned counsel', contactPolicy: 'Contact through Legal Connect' } : null),
    documents: Array.isArray(payload.documents) ? payload.documents : [],
    communications: Array.isArray(payload.communications) ? payload.communications : [],
    fees: Array.isArray(payload.fees) ? payload.fees : [],
    pipelineStage: payload.pipelineStage || payload.intakeStatus || null,
  };
}

async function attachStoredCaseRecords(cases) {
  const enriched = cases.map(enrichWorkspaceCase);
  if (!db.dbAvailable || !enriched.length) return enriched;
  const caseIds = enriched.map((item) => item.id).filter(isUuid);
  if (!caseIds.length) return enriched;
  const [documents, communications, fees] = await Promise.all([
    db.query('SELECT * FROM case_documents WHERE case_id = ANY($1::uuid[]) ORDER BY created_at DESC', [caseIds]),
    db.query('SELECT * FROM case_communications WHERE case_id = ANY($1::uuid[]) ORDER BY occurred_at DESC', [caseIds]),
    db.query('SELECT * FROM case_fees WHERE case_id = ANY($1::uuid[]) ORDER BY created_at DESC', [caseIds]),
  ]);
  return enriched.map((matter) => ({
    ...matter,
    documents: [
      ...documents.rows.filter((row) => row.case_id === matter.id).map((row) => ({ id: row.id, name: row.file_name, category: row.category || 'Case document', uploadedAt: row.created_at, downloadPath: `/api/cases/${matter.id}/documents/${row.id}` })),
      ...matter.documents,
    ],
    communications: [
      ...communications.rows.filter((row) => row.case_id === matter.id).map((row) => ({ id: row.id, type: row.communication_type, title: row.title, summary: row.summary || '', occurredAt: row.occurred_at, recordingStatus: row.storage_key ? (row.recording_consent ? 'Consent-managed archive' : 'Recording withheld - consent required') : undefined })),
      ...matter.communications,
    ],
    fees: [
      ...fees.rows.filter((row) => row.case_id === matter.id).map((row) => ({ id: row.id, label: row.label, amount: Number(row.amount || 0), status: row.status, dueDate: row.due_date })),
      ...matter.fees,
    ],
  }));
}

async function runWorkspaceStep(stage, operation) {
  try {
    return await operation();
  } catch (error) {
    if (error && typeof error === 'object') error.workspaceStage = stage;
    throw error;
  }
}

function maskCredential(kind, last4) {
  if (kind === 'aadhaar') return `XXXX XXXX ${last4 || 'XXXX'}`;
  return `•••• ${last4 || '----'}`;
}

async function handleLocalWorkspaceRoute(req, res, url) {
  if (config.nodeEnv === 'production') return false;
  const authUser = getAuthUser(req);
  if (!authUser) {
    sendJson(res, 401, { ok: false, error: 'Authentication required.' });
    return true;
  }
  if (url.pathname === '/api/workspaces/client' && req.method === 'GET') {
    if (authUser.role !== 'client') {
      sendJson(res, 403, { ok: false, error: 'Client workspace access required.' });
      return true;
    }
    sendJson(res, 200, { ok: true, profile: { name: authUser.name || 'Demo Client', identity: 'XXXX XXXX 4242', verificationStatus: 'verified' }, cases: clientWorkspaceDemo(authUser.name), bookings: demoStore.bookings.map(dashboardBooking), payments: [], dataMode: 'sample' });
    return true;
  }
  if (url.pathname === '/api/workspaces/advocate' && req.method === 'GET') {
    if (authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate workspace access required.' });
      return true;
    }
    const cases = clientWorkspaceDemo(authUser.name).slice(0, 2).map((item, index) => ({ ...item, id: `adv-case-${index + 1}`, clientName: index ? 'Aarav Sharma' : 'Karan Nagpal' }));
    sendJson(res, 200, { ok: true, profile: { name: authUser.name || 'Demo Lawyer', enrollmentNo: 'D/1842/2014', stateBarCouncil: 'Bar Council of Delhi', practiceCourts: 'Delhi High Court, District Courts', verificationStatus: 'verified' }, cases, paidIntakes: demoStore.bookings.map(dashboardBooking), chamber: demoStore.chamber, dataMode: 'sample' });
    return true;
  }
  const caseStatusMatch = url.pathname.match(/^\/api\/workspaces\/advocate\/cases\/([^/]+)\/status$/);
  if (caseStatusMatch && req.method === 'PATCH' && authUser.role === 'advocate') {
    const body = await readBody(req);
    const demoMatter = clientWorkspaceDemo(authUser.name)[Number(caseStatusMatch[1].split('-').pop() || 1) - 1] || clientWorkspaceDemo(authUser.name)[0];
    const stage = body.stage || demoMatter.stage;
    const matter = { ...demoMatter, id: caseStatusMatch[1], stage };
    await notify({
      eventType: 'case_stage_updated',
      title: 'Case stage updated',
      message: `${matter.caseTitle || matter.title || 'Your matter'} moved to ${stage}.`,
      recipients: await resolveRecipients([authUser.id, matter.userId].filter(Boolean)),
      payload: { caseId: matter.id, stage },
      sendEmail: true,
      ctaLabel: 'Open cases',
      ctaUrl: portalUrl('/advocate/cases'),
    });
    sendJson(res, 200, { ok: true, matter, syncedAt: new Date().toISOString(), dataMode: 'sample' });
    return true;
  }
  if (url.pathname === '/api/chamber' && req.method === 'GET' && authUser.role === 'advocate') {
    const masterFree = await isMasterTestUser(authUser);
    sendJson(res, 200, {
      ok: true,
      chamber: demoStore.chamber,
      subscription: chamberSubscriptionSnapshot(
        masterFree
          ? { plan_tier: 'chambers_plus', subscription_status: 'master_test_free', paid_until: new Date(Date.now() + 86400000 * 3650).toISOString() }
          : { plan_tier: demoStore.chamber.planTier || null, subscription_status: demoStore.chamber.subscriptionStatus || 'inactive', paid_until: demoStore.chamber.paidUntil || null },
        masterFree,
      ),
    });
    return true;
  }
  if (url.pathname === '/api/chamber/members' && req.method === 'POST' && authUser.role === 'advocate') {
    const body = await readBody(req);
    const member = { id: `member-${Date.now()}`, display_name: body.displayName, email: body.email, member_role: body.memberRole || 'associate', status: 'invited' };
    demoStore.chamber.members.push(member);
    const invitee = (demoStore.users || []).find((user) => normalizeEmail(user.email) === normalizeEmail(body.email));
    await notify({
      eventType: 'chamber_member_invited',
      title: 'Chamber Vault invitation',
      message: `${authUser.name || 'An advocate'} invited you to join their Chamber Vault as ${body.memberRole || 'associate'}.`,
      recipients: [invitee ? normalizeRecipient(invitee) : { userId: member.id, name: body.displayName, email: body.email, phone: null }],
      payload: { memberId: member.id },
      sendEmail: true,
      ctaLabel: 'Open Chamber Vault',
      ctaUrl: portalUrl('/advocate/chamber'),
    });
    sendJson(res, 201, { ok: true, member });
    return true;
  }
  if (url.pathname === '/api/chamber/tasks' && req.method === 'POST' && authUser.role === 'advocate') {
    const body = await readBody(req);
    const task = { id: `task-${Date.now()}`, title: body.title, details: body.details || '', assignee_name: body.assigneeName || 'Unassigned', status: 'assigned', priority: body.priority || 'normal', due_at: body.dueAt || null, updated_at: new Date().toISOString() };
    demoStore.chamber.tasks.unshift(task);
    await notify({
      eventType: 'chamber_task_assigned',
      title: 'Chamber task assigned',
      message: `${task.title} was assigned to ${task.assignee_name}.`,
      recipients: await resolveRecipients([authUser.id]),
      payload: { taskId: task.id },
      sendEmail: true,
      ctaLabel: 'Open Chamber Vault',
      ctaUrl: portalUrl('/advocate/chamber'),
    });
    sendJson(res, 201, { ok: true, task, syncedAt: new Date().toISOString() });
    return true;
  }
  const taskStatusMatch = url.pathname.match(/^\/api\/chamber\/tasks\/([^/]+)\/status$/);
  if (taskStatusMatch && req.method === 'PATCH' && authUser.role === 'advocate') {
    const body = await readBody(req);
    const task = demoStore.chamber.tasks.find((item) => item.id === taskStatusMatch[1]);
    if (!task) {
      sendJson(res, 404, { ok: false, error: 'Task not found.' });
      return true;
    }
    task.status = body.status;
    task.updated_at = new Date().toISOString();
    await notify({
      eventType: 'chamber_task_status_updated',
      title: 'Chamber task updated',
      message: `${task.title} is now ${String(task.status || '').replace(/_/g, ' ')}.`,
      recipients: await resolveRecipients([authUser.id]),
      payload: { taskId: task.id, status: task.status },
      sendEmail: true,
      ctaLabel: 'Open Chamber Vault',
      ctaUrl: portalUrl('/advocate/chamber'),
    });
    sendJson(res, 200, { ok: true, task, syncedAt: task.updated_at });
    return true;
  }
  if (url.pathname === '/api/admin/verifications' && req.method === 'GET' && canSeeAll(authUser)) {
    sendJson(res, 200, { ok: true, verifications: [] });
    return true;
  }
  return false;
}

async function completeMasterTestLogin(res, body) {
  const email = normalizeEmail(body.email);
  const role = masterTestRole(body.role);
  const user = await ensureMasterTestUser(role);
  const token = db.dbAvailable ? strictSignJwt(user) : encodeSession(user);
  await saveSessionToken(user, token);
  await writeAuditLog(user, "developer_login", "user", user.id, `Developer account login as ${role}.`, {
    role,
    emailMasked: maskEmail(email),
    developerAccount: true,
  });
  sendJson(res, 200, {
    ok: true,
    token,
    user: {
      ...strictPublicUser(user),
      email,
      verificationStatus: "verified",
      developerAccount: true,
    },
    masterTest: true,
    developerAccount: true,
    message: `Signed in as ${role} with developer credentials. All paid features are free for this account.`,
  });
}

async function handleStrictJwtAuthRoute(req, res, url) {
  const managedPath = url.pathname.startsWith('/api/auth/strict')
    || url.pathname.startsWith('/api/workspaces/')
    || url.pathname.startsWith('/api/chamber')
    || url.pathname.startsWith('/api/admin/verifications');
  if (!managedPath) return false;

  if (!db.dbAvailable) {
    if (url.pathname === "/api/auth/strict/login" && req.method === "POST") {
      const body = await readBody(req);
      if (isMasterTestLogin(body.email, body.password)) {
        try {
          await completeMasterTestLogin(res, body);
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error.message || "Master test login failed." });
        }
        return true;
      }
      sendJson(res, 503, { ok: false, error: "Database is required for secure authentication." });
      return true;
    }
    if (await handleLocalWorkspaceRoute(req, res, url)) return true;
    sendJson(res, 503, { ok: false, error: 'Database is required for secure authentication.' });
    return true;
  }
  await ensureStrictAuthSchema();

  if (url.pathname === '/api/auth/strict/register' && req.method === 'POST') {
    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const password = String(body.password || '');
    const role = ['client', 'advocate', 'intern'].includes(body.role) ? body.role : null;
    const name = String(body.name || body.email || 'Legal Connect User').trim();
    if (!role) {
      sendJson(res, 403, { ok: false, error: 'Admin accounts are issued only by Legal Connect.' });
      return true;
    }
    if (!email || !email.includes('@')) {
      sendJson(res, 400, { ok: false, error: 'A valid email is required.' });
      return true;
    }
    if (password.length < 8) {
      sendJson(res, 400, { ok: false, error: 'Password must be at least 8 characters.' });
      return true;
    }
    const registrationError = strictRegistrationError(body, role);
    if (registrationError) {
      sendJson(res, 400, { ok: false, error: registrationError });
      return true;
    }
    const roleResult = await db.query('SELECT id FROM roles WHERE name = $1', [role]);
    const roleId = roleResult.rows[0] && roleResult.rows[0].id;
    const existingUser = await strictUserByEmail(email);
    if (existingUser) {
      sendJson(res, 409, { ok: false, error: 'An account already exists for this email. Sign in or reset your password.' });
      return true;
    }
    const client = await db.pool.connect();
    let user;
    try {
      await client.query('BEGIN');
      const created = await client.query('INSERT INTO users (name, email, phone, role, role_id, password_hash, consent_at, email_verified_at) VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING id, name, email, phone, role, created_at', [name, email, normalizePhone(body.phone) || null, role, roleId, strictHashPassword(password)]);
      user = created.rows[0];
      await strictCreateProfile(user.id, role, body, client);
      const credential = strictCredential(body, role);
      await client.query(`INSERT INTO identity_verifications
        (user_id, role, credential_kind, reference_hash, reference_last4, status, metadata)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6)
        ON CONFLICT (user_id, credential_kind) DO UPDATE SET reference_hash = EXCLUDED.reference_hash,
        reference_last4 = EXCLUDED.reference_last4, status = 'pending', metadata = EXCLUDED.metadata, updated_at = now()`, [
        user.id,
        role,
        credential.kind,
        strictCredentialHash(credential.value),
        credential.last4,
        JSON.stringify(role === 'client'
          ? { addressProvided: Boolean(body.address) }
          : role === 'advocate'
            ? { stateBarCouncil: body.stateBarCouncil, practiceCourts: body.practiceCourts, yearsPractice: Number(body.yearsPractice || 0) }
            : { lawSchool: body.lawSchool, studyYear: body.studyYear }),
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    user.verification_status = 'pending';
    const token = strictSignJwt(user);
    await saveSessionToken(user, token);
    await writeAuditLog(user, 'jwt_register', 'user', user.id, 'Strict JWT registration completed.', { role, emailMasked: maskEmail(email) });
    await notify({
      eventType: 'user_registered',
      title: 'Welcome to Legal Connect',
      message: `Your ${role} account is ready. Identity review is pending before full access unlocks.`,
      recipients: [{ userId: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }],
      payload: { role },
      sendEmail: true,
      sendSms: false,
      ctaLabel: 'Open your workspace',
      ctaUrl: portalUrl(`/${role}`),
    });
    sendJson(res, 201, { ok: true, token, user: strictPublicUser(user), message: 'Account created. Identity review is pending.' });
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
    if (isMasterTestLogin(email, password)) {
      try {
        await completeMasterTestLogin(res, body);
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message || 'Master test login failed.' });
      }
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

  if (url.pathname === '/api/workspaces/client' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || !['client', 'admin', 'rna'].includes(authUser.role)) {
      sendJson(res, 403, { ok: false, error: 'Client workspace access required.' });
      return true;
    }
    const userId = await resolveDatabaseUserId(authUser);
    const profileResult = await db.query('SELECT display_name, aadhaar_last4, address, verification_status FROM profile_clients WHERE user_id = $1', [userId]);
    const casesResult = await db.query('SELECT * FROM cases WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    const bookingsResult = await db.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [userId]);
    const paymentsResult = await db.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [userId]);
    const useDemo = /^Demo Client$/i.test(String(authUser.name || '')) && casesResult.rows.length === 0;
    const cases = useDemo ? clientWorkspaceDemo(authUser.name) : await attachStoredCaseRecords(casesResult.rows.map(mapCase));
    const bookings = bookingsResult.rows.map(mapBooking);
    const bookingById = new Map(bookings.map((item) => [String(item.id), item]));
    const supervisedCases = cases.map((matter) => {
      const linkedBooking = matter.bookingId ? bookingById.get(String(matter.bookingId)) : null;
      const stageValue = linkedBooking?.intakeStatus
        || linkedBooking?.stageStatus
        || matter.pipelineStage
        || matter.intakeStatus
        || matter.stage;
      const progress = pipelineProgress(stageValue);
      const safeMatter = sanitizeMatterForClient({
        ...matter,
        assignedAdvocateName: matter.assignedAdvocateName
          || linkedBooking?.assignedAdvocateName
          || matter.counsel?.name
          || null,
        assignedAdvocateEnrollment: matter.counsel?.enrollment
          || linkedBooking?.assignedAdvocateEnrollment
          || null,
      });
      return {
        ...safeMatter,
        stage: progress.stageLabel,
        pipelineStage: progress.stage,
        pipeline: progress,
      };
    });
    sendJson(res, 200, {
      ok: true,
      profile: {
        name: profileResult.rows[0]?.display_name || authUser.name || 'Client',
        identity: profileResult.rows[0]?.aadhaar_last4 ? `XXXX XXXX ${profileResult.rows[0].aadhaar_last4}` : 'Verification record pending',
        verificationStatus: profileResult.rows[0]?.verification_status || (useDemo ? 'verified' : 'pending'),
      },
      cases: supervisedCases,
      bookings: bookings.map((booking) => {
        const safeBooking = sanitizeBookingForClient(booking);
        return {
          ...safeBooking,
          pipeline: pipelineProgress(booking.intakeStatus || booking.stageStatus || booking.paymentStatus),
          sla: slaClock(booking.verifiedAt || booking.createdAt, INTAKE_SLA_MS),
        };
      }),
      payments: paymentsResult.rows.map((row) => ({ id: row.id, bookingId: row.booking_id, amount: row.amount, currency: row.currency, status: row.status, createdAt: row.created_at })),
      dataMode: useDemo ? 'sample' : 'live',
      supervisedPipeline: true,
    });
    return true;
  }

  if (url.pathname === '/api/workspaces/advocate' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || !['advocate', 'admin', 'rna'].includes(authUser.role)) {
      sendJson(res, 403, { ok: false, error: 'Advocate workspace access required.' });
      return true;
    }
    const userId = await runWorkspaceStep('identity', () => resolveDatabaseUserId(authUser));
    const profileResult = await runWorkspaceStep('profile', () => db.query(
      'SELECT display_name, enrollment_no, state_bar_council, practice_courts, verification_status FROM profile_advocates WHERE user_id = $1',
      [userId],
    ));
    const casesResult = await runWorkspaceStep('matters', () => db.query(
      "SELECT * FROM cases WHERE payload->>'assignedTo' = $1 OR id IN (SELECT case_id FROM case_assignments WHERE advocate_id::text = $1 AND status = 'active') ORDER BY updated_at DESC",
      [userId],
    ));
    const bookingsResult = await runWorkspaceStep('paid_intakes', () => db.query(
      "SELECT * FROM bookings WHERE payment_status = 'paid' AND (payload->>'assignedAdvocateId' = $1 OR payload->>'assignedTo' = $1) ORDER BY created_at DESC LIMIT 20",
      [userId],
    ));
    const chamberResult = await runWorkspaceStep('chamber', () => db.query(
      'SELECT * FROM chambers WHERE owner_id = $1 LIMIT 1',
      [userId],
    ));
    const chamberId = chamberResult.rows[0]?.id;
    const tasksResult = chamberId
      ? await runWorkspaceStep('chamber_tasks', () => db.query('SELECT * FROM chamber_tasks WHERE chamber_id = $1 ORDER BY updated_at DESC LIMIT 30', [chamberId]))
      : { rows: [] };
    const membersResult = chamberId
      ? await runWorkspaceStep('chamber_members', () => db.query('SELECT id, display_name, email, member_role, status FROM chamber_members WHERE chamber_id = $1 ORDER BY created_at', [chamberId]))
      : { rows: [] };
    const useDemo = /^Demo Lawyer$/i.test(String(authUser.name || '')) && casesResult.rows.length === 0;
    const demoCases = clientWorkspaceDemo(authUser.name).slice(0, 2).map((item, index) => ({ ...item, id: `adv-case-${index + 1}`, clientName: index ? 'Aarav Sharma' : 'Karan Nagpal' }));
    const cases = useDemo
      ? demoCases
      : await runWorkspaceStep('matter_records', () => attachStoredCaseRecords(casesResult.rows.map(mapCase)));
    sendJson(res, 200, {
      ok: true,
      profile: {
        name: profileResult.rows[0]?.display_name || authUser.name || 'Counsel',
        enrollmentNo: profileResult.rows[0]?.enrollment_no || (useDemo ? 'D/1842/2014' : 'Pending'),
        stateBarCouncil: profileResult.rows[0]?.state_bar_council || 'Not recorded',
        practiceCourts: profileResult.rows[0]?.practice_courts || '',
        verificationStatus: profileResult.rows[0]?.verification_status || (useDemo ? 'verified' : 'pending'),
      },
      cases,
      paidIntakes: useDemo ? createDemoBookings().map(dashboardBooking) : bookingsResult.rows.map(mapBooking),
      chamber: chamberResult.rows[0] ? { id: chamberId, name: chamberResult.rows[0].name, members: membersResult.rows, tasks: tasksResult.rows } : null,
      dataMode: useDemo ? 'sample' : 'live',
    });
    return true;
  }

  const advocateCaseStatusMatch = url.pathname.match(/^\/api\/workspaces\/advocate\/cases\/([^/]+)\/status$/);
  if (advocateCaseStatusMatch && req.method === 'PATCH') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate access required.' });
      return true;
    }
    const body = await readBody(req);
    const stage = String(body.stage || '').trim();
    if (!stage || stage.length > 80) {
      sendJson(res, 400, { ok: false, error: 'A valid case stage is required.' });
      return true;
    }
    const caseId = advocateCaseStatusMatch[1];
    if (!isUuid(caseId) && /^Demo Lawyer$/i.test(String(authUser.name || ''))) {
      const demoMatter = clientWorkspaceDemo(authUser.name)[Number(caseId.split('-').pop() || 1) - 1] || clientWorkspaceDemo(authUser.name)[0];
      const matter = { ...demoMatter, id: caseId, stage };
      await notify({
        eventType: 'case_stage_updated',
        title: 'Case stage updated',
        message: `${matter.caseTitle || matter.title || 'Your matter'} moved to ${stage}.`,
        recipients: await resolveRecipients([authUser.id, matter.userId].filter(Boolean)),
        payload: { caseId, stage },
        sendEmail: true,
        ctaLabel: 'Open cases',
        ctaUrl: portalUrl('/advocate/cases'),
      });
      sendJson(res, 200, { ok: true, matter, syncedAt: new Date().toISOString(), dataMode: 'sample' });
      return true;
    }
    const userId = await resolveDatabaseUserId(authUser);
    const existing = await db.query('SELECT * FROM cases WHERE id = $1 LIMIT 1', [caseId]);
    if (!existing.rows[0]) {
      sendJson(res, 404, { ok: false, error: 'Case not found.' });
      return true;
    }
    const current = mapCase(existing.rows[0]);
    const assignment = await db.query("SELECT 1 FROM case_assignments WHERE case_id = $1 AND advocate_id = $2 AND status = 'active' LIMIT 1", [caseId, userId]);
    if (String(current.assignedTo || '') !== String(userId) && !assignment.rows[0]) {
      sendJson(res, 403, { ok: false, error: 'This matter is not assigned to your workspace.' });
      return true;
    }
    const nextStatus = stage === 'Disposed' ? 'Closed' : current.status || 'Active';
    const updated = await db.query(`UPDATE cases SET status = $2,
      payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb, updated_at = now()
      WHERE id = $1 RETURNING *`, [caseId, nextStatus, JSON.stringify({ stage, statusUpdatedBy: userId, statusUpdatedAt: new Date().toISOString() })]);
    // Court-stage changes also enter the LC gate — clients only see approved updates.
    await db.query(
      `INSERT INTO case_updates (case_id, update_type, message, payload, status, author_id, author_role)
       VALUES ($1, 'stage_update', $2, $3, 'pending_lc_review', $4, 'advocate')`,
      [caseId, `Matter stage updated to ${stage}.`, JSON.stringify({ stage, actorId: userId }), String(userId)],
    );
    const bookingId = await supervisedPipeline.bookingIdForCase(caseId);
    if (bookingId) await supervisedPipeline.syncBookingPipelineStage(bookingId, "advocate_update_pending", { courtStageDraft: stage });
    await supervisedPipeline.syncCasePipelineStage(caseId, "advocate_update_pending", { courtStageDraft: stage });
    await writeAuditLog(authUser, 'case_stage_updated', 'case', caseId, `Matter stage updated to ${stage} (held for LC review).`, { stage });
    {
      await notify({
        eventType: 'case_update_pending_review',
        title: 'Court stage update awaiting LC review',
        message: `${authUser.name || 'Counsel'} moved a matter to ${stage}. Approve before client release.`,
        recipients: await resolveAdminRecipients(),
        payload: { caseId, stage, advocateId: userId },
        sendEmail: true,
        priority: 'high',
        ctaLabel: 'Review updates',
        ctaUrl: portalUrl('/admin/pending-updates'),
      });
      await notify({
        eventType: 'case_update_held_for_lc',
        title: 'Stage update held for Legal Connect',
        message: `Your stage change to ${stage} is awaiting LC approval before the client is notified.`,
        recipients: await resolveRecipients([userId]),
        payload: { caseId, stage },
        sendEmail: true,
        ctaLabel: 'Open updates',
        ctaUrl: portalUrl('/advocate/updates'),
      });
    }
    sendJson(res, 200, { ok: true, matter: enrichWorkspaceCase(mapCase(updated.rows[0])), syncedAt: new Date().toISOString() });
    return true;
  }

  if (url.pathname === '/api/chamber' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || !['advocate', 'admin', 'rna'].includes(authUser.role)) {
      sendJson(res, 403, { ok: false, error: 'Chamber access required.' });
      return true;
    }
    const userId = await resolveDatabaseUserId(authUser);
    const masterFree = await isMasterTestUser(authUser);
    let chamberResult = await db.query('SELECT * FROM chambers WHERE owner_id = $1 LIMIT 1', [userId]);
    if (!chamberResult.rows[0] && authUser.role === 'advocate') {
      chamberResult = await db.query("INSERT INTO chambers (owner_id, name) VALUES ($1, $2) RETURNING *", [userId, `${authUser.name || 'Counsel'}'s Chamber`]);
    }
    const chamber = chamberResult.rows[0];
    if (!chamber) {
      sendJson(res, 404, { ok: false, error: 'Chamber not found.' });
      return true;
    }
    if (masterFree && (chamber.subscription_status !== 'master_test_free' || chamber.plan_tier !== 'chambers_plus')) {
      await db.query(
        `UPDATE chambers
         SET plan_tier = 'chambers_plus', subscription_status = 'master_test_free', paid_until = now() + interval '10 years', updated_at = now()
         WHERE id = $1`,
        [chamber.id],
      );
      chamber.plan_tier = 'chambers_plus';
      chamber.subscription_status = 'master_test_free';
      chamber.paid_until = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString();
    }
    const members = await db.query('SELECT id, user_id, display_name, email, member_role, status, created_at FROM chamber_members WHERE chamber_id = $1 ORDER BY created_at', [chamber.id]);
    const tasks = await db.query('SELECT * FROM chamber_tasks WHERE chamber_id = $1 ORDER BY updated_at DESC', [chamber.id]);
    const subscription = chamberSubscriptionSnapshot(chamber, masterFree);
    sendJson(res, 200, {
      ok: true,
      chamber: { id: chamber.id, name: chamber.name, members: members.rows, tasks: tasks.rows },
      subscription,
    });
    return true;
  }

  if (url.pathname === '/api/chamber/subscription/create-order' && req.method === 'POST') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate access required.' });
      return true;
    }
    const body = await readBody(req);
    const plan = getChamberPlan(body.planId || body.plan || 'core');
    if (await isMasterTestUser(authUser)) {
      const userId = await resolveDatabaseUserId(authUser);
      await db.query(
        `UPDATE chambers
         SET plan_tier = $2, subscription_status = 'master_test_free', paid_until = now() + interval '10 years', updated_at = now()
         WHERE owner_id = $1`,
        [userId, 'chambers_plus'],
      );
      sendJson(res, 200, {
        ok: true,
        mode: 'master_test_free',
        planId: 'chambers_plus',
        amount: 0,
        message: 'Master test account — Chamber Vault Chambers+ is unlocked free.',
      });
      return true;
    }
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
    if (!hasRazorpay) {
      if (config.nodeEnv === 'production') {
        sendJson(res, 503, { ok: false, error: 'Payment gateway is not configured.' });
        return true;
      }
      sendJson(res, 200, {
        ok: true,
        mode: 'demo',
        planId: plan.id,
        amount: plan.amount * 100,
        currency: 'INR',
        key_id: 'rzp_test_demo',
        order_id: `order_chamber_demo_${Date.now()}`,
        message: 'Demo mode chamber subscription — no real charge.',
      });
      return true;
    }
    const orderResult = await createRazorpayOrder({
      amount: plan.amount,
      currency: 'INR',
      receipt: `chamber_${plan.id}_${Date.now()}`.slice(0, 40),
      notes: { product: 'chamber_vault', planId: plan.id, userId: authUser.id },
    });
    if (!orderResult.ok) {
      sendJson(res, 502, { ok: false, error: orderResult.error_message || 'Could not create subscription order.' });
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      mode: paymentConfigStatus().mode,
      provider: 'razorpay',
      planId: plan.id,
      planName: plan.name,
      key_id: config.razorpayKeyId,
      order_id: orderResult.order.id,
      amount: orderResult.order.amount,
      currency: orderResult.order.currency || 'INR',
    });
    return true;
  }

  if (url.pathname === '/api/chamber/subscription/verify' && req.method === 'POST') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate access required.' });
      return true;
    }
    const body = await readBody(req);
    const plan = getChamberPlan(body.planId || body.plan || 'core');
    const userId = await resolveDatabaseUserId(authUser);
    const orderId = body.order_id || body.razorpay_order_id;
    const paymentId = body.payment_id || body.razorpay_payment_id;
    const signature = body.signature || body.razorpay_signature;
    const isDemo = String(orderId || '').startsWith('order_chamber_demo_');

    if (!isDemo && config.razorpayKeySecret) {
      if (!verifyRazorpayPaymentSignature(orderId, paymentId, signature)) {
        sendJson(res, 400, { ok: false, error: 'Payment signature verification failed.' });
        return true;
      }
    } else if (!isDemo && config.nodeEnv === 'production') {
      sendJson(res, 503, { ok: false, error: 'Payment gateway is not configured.' });
      return true;
    }

    const paidUntil = new Date(Date.now() + plan.periodDays * 24 * 60 * 60 * 1000);
    const updated = await db.query(
      `UPDATE chambers
       SET plan_tier = $2,
           subscription_status = 'active',
           paid_until = $3,
           last_order_id = $4,
           last_payment_id = $5,
           updated_at = now()
       WHERE owner_id = $1
       RETURNING *`,
      [userId, plan.id, paidUntil.toISOString(), orderId || null, paymentId || null],
    );
    if (!updated.rows[0]) {
      sendJson(res, 404, { ok: false, error: 'Chamber not found.' });
      return true;
    }
    await writeAuditLog(authUser, 'chamber_subscription_activated', 'chamber', updated.rows[0].id, `Chamber Vault ${plan.name} activated for 30 days.`, {
      planId: plan.id,
      amount: plan.amount,
      paidUntil: paidUntil.toISOString(),
    });
    sendJson(res, 200, {
      ok: true,
      subscription: chamberSubscriptionSnapshot(updated.rows[0], false),
      message: `${plan.name} is active until ${paidUntil.toLocaleDateString('en-IN')}.`,
    });
    return true;
  }

  if (url.pathname === '/api/chamber/members' && req.method === 'POST') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate access required.' });
      return true;
    }
    const body = await readBody(req);
    const displayName = String(body.displayName || '').trim();
    const email = normalizeEmail(body.email);
    if (!displayName || !email) {
      sendJson(res, 400, { ok: false, error: 'Member name and email are required.' });
      return true;
    }
    const userId = await resolveDatabaseUserId(authUser);
    const chamberResult = await db.query('SELECT * FROM chambers WHERE owner_id = $1 LIMIT 1', [userId]);
    const chamber = chamberResult.rows[0];
    if (!chamber) {
      sendJson(res, 404, { ok: false, error: 'Chamber not found.' });
      return true;
    }
    const subscription = chamberSubscriptionSnapshot(chamber, await isMasterTestUser(authUser));
    if (subscription.required) {
      sendJson(res, 402, { ok: false, error: 'Activate a Chamber Vault plan to invite members.', code: 'subscription_required', subscription });
      return true;
    }
    const memberCount = await db.query('SELECT count(*)::int AS count FROM chamber_members WHERE chamber_id = $1', [chamber.id]);
    if (subscription.seats && memberCount.rows[0].count >= subscription.seats) {
      sendJson(res, 403, { ok: false, error: `Your ${subscription.planName} plan allows ${subscription.seats} members. Upgrade for more seats.` });
      return true;
    }
    const created = await db.query(`INSERT INTO chamber_members (chamber_id, display_name, email, member_role, status)
      VALUES ($1, $2, $3, $4, 'invited') RETURNING *`, [chamber.id, displayName, email, body.memberRole || 'associate']);
    await writeAuditLog(authUser, 'chamber_member_invited', 'chamber_member', created.rows[0].id, 'A chamber member was invited.', { emailMasked: maskEmail(email) });
    {
      const inviteeUsers = await db.query('SELECT id, name, email, phone, role FROM users WHERE lower(email) = lower($1) LIMIT 1', [email]);
      const invitee = inviteeUsers.rows[0]
        ? normalizeRecipient(inviteeUsers.rows[0])
        : { userId: created.rows[0].id, name: displayName, email, phone: null };
      await notify({
        eventType: 'chamber_member_invited',
        title: 'Chamber Vault invitation',
        message: `${authUser.name || 'An advocate'} invited you to join their Chamber Vault as ${body.memberRole || 'associate'}.`,
        recipients: [invitee],
        payload: { chamberId: chamber.id, memberId: created.rows[0].id },
        sendEmail: true,
        ctaLabel: 'Open Chamber Vault',
        ctaUrl: portalUrl('/advocate/chamber'),
      });
    }
    sendJson(res, 201, { ok: true, member: created.rows[0] });
    return true;
  }

  if (url.pathname === '/api/chamber/tasks' && req.method === 'POST') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate access required.' });
      return true;
    }
    const body = await readBody(req);
    if (!String(body.title || '').trim()) {
      sendJson(res, 400, { ok: false, error: 'Task title is required.' });
      return true;
    }
    const userId = await resolveDatabaseUserId(authUser);
    const chamberResult = await db.query('SELECT * FROM chambers WHERE owner_id = $1 LIMIT 1', [userId]);
    const chamber = chamberResult.rows[0];
    if (!chamber) {
      sendJson(res, 404, { ok: false, error: 'Chamber not found.' });
      return true;
    }
    const subscription = chamberSubscriptionSnapshot(chamber, await isMasterTestUser(authUser));
    if (subscription.required) {
      sendJson(res, 402, { ok: false, error: 'Activate a Chamber Vault plan to delegate tasks.', code: 'subscription_required', subscription });
      return true;
    }
    if (subscription.maxOpenTasks) {
      const openCount = await db.query(
        `SELECT count(*)::int AS count FROM chamber_tasks WHERE chamber_id = $1 AND status <> 'completed'`,
        [chamber.id],
      );
      if (openCount.rows[0].count >= subscription.maxOpenTasks) {
        sendJson(res, 403, { ok: false, error: `Your ${subscription.planName} plan allows ${subscription.maxOpenTasks} open tasks. Upgrade for unlimited.` });
        return true;
      }
    }
    const created = await db.query(`INSERT INTO chamber_tasks
      (chamber_id, case_id, title, details, assigned_to, assignee_name, status, priority, due_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, 'assigned', $7, $8, $9) RETURNING *`, [
      chamber.id, isUuid(body.caseId) ? body.caseId : null, String(body.title).trim(), body.details || null,
      isUuid(body.assignedTo) ? body.assignedTo : null, body.assigneeName || 'Unassigned', body.priority || 'normal', body.dueAt || null, userId,
    ]);
    await writeAuditLog(authUser, 'chamber_task_created', 'chamber_task', created.rows[0].id, 'A chamber task was delegated.', { caseId: body.caseId || null });
    {
      const assigneeId = isUuid(body.assignedTo) ? body.assignedTo : null;
      const recipients = assigneeId
        ? await resolveRecipients([assigneeId])
        : [];
      if (recipients.length || body.assigneeEmail) {
        await notify({
          eventType: 'chamber_task_delegated',
          title: 'Chamber task assigned',
          message: `${created.rows[0].title} was delegated to ${body.assigneeName || 'you'}.`,
          recipients: recipients.length
            ? recipients
            : [{ userId: created.rows[0].id, name: body.assigneeName || 'Chamber member', email: body.assigneeEmail || null }],
          payload: { taskId: created.rows[0].id, chamberId: chamber.id },
          sendEmail: true,
          ctaLabel: 'Open Chamber Vault',
          ctaUrl: portalUrl('/advocate/chamber'),
        });
      }
    }
    sendJson(res, 201, { ok: true, task: created.rows[0], syncedAt: new Date().toISOString() });
    return true;
  }

  const chamberTaskStatusMatch = url.pathname.match(/^\/api\/chamber\/tasks\/([^/]+)\/status$/);
  if (chamberTaskStatusMatch && req.method === 'PATCH') {
    const authUser = getAuthUser(req);
    if (!authUser || authUser.role !== 'advocate') {
      sendJson(res, 403, { ok: false, error: 'Advocate access required.' });
      return true;
    }
    const body = await readBody(req);
    const status = ['assigned', 'accepted', 'in_progress', 'blocked', 'completed'].includes(body.status) ? body.status : null;
    if (!status) {
      sendJson(res, 400, { ok: false, error: 'Select a valid task status.' });
      return true;
    }
    const userId = await resolveDatabaseUserId(authUser);
    const updated = await db.query(`UPDATE chamber_tasks SET status = $2, updated_at = now(),
      accepted_at = CASE WHEN $2 IN ('accepted', 'in_progress') THEN COALESCE(accepted_at, now()) ELSE accepted_at END,
      completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END
      WHERE id = $1 AND chamber_id IN (SELECT id FROM chambers WHERE owner_id = $3) RETURNING *`, [chamberTaskStatusMatch[1], status, userId]);
    if (!updated.rows[0]) {
      sendJson(res, 404, { ok: false, error: 'Task not found.' });
      return true;
    }
    {
      const taskRow = updated.rows[0];
      const recipients = await resolveRecipients([userId, taskRow.assigned_to].filter(Boolean));
      await notify({
        eventType: 'chamber_task_status_updated',
        title: 'Chamber task updated',
        message: `${taskRow.title} is now ${status.replace(/_/g, ' ')}.`,
        recipients,
        payload: { taskId: taskRow.id, status },
        sendEmail: true,
        ctaLabel: 'Open Chamber Vault',
        ctaUrl: portalUrl('/advocate/chamber'),
      });
    }
    sendJson(res, 200, { ok: true, task: updated.rows[0], syncedAt: new Date().toISOString() });
    return true;
  }

  if (url.pathname === '/api/admin/verifications' && req.method === 'GET') {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: 'Admin access required.' });
      return true;
    }
    const result = await db.query(`SELECT iv.id, iv.user_id, iv.role, iv.credential_kind, iv.reference_last4, iv.status,
      iv.metadata, iv.review_note, iv.reviewed_at, iv.created_at, u.name, u.email, u.phone
      FROM identity_verifications iv JOIN users u ON u.id = iv.user_id ORDER BY
      CASE iv.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, iv.created_at DESC`);
    sendJson(res, 200, { ok: true, verifications: result.rows.map((row) => ({
      id: row.id, userId: row.user_id, role: row.role, name: row.name, emailMasked: maskEmail(row.email), phoneMasked: maskPhone(row.phone),
      credentialKind: row.credential_kind, credentialMasked: maskCredential(row.credential_kind, row.reference_last4), status: row.status,
      metadata: row.metadata || {}, reviewNote: row.review_note, reviewedAt: row.reviewed_at, createdAt: row.created_at,
    })) });
    return true;
  }

  const verificationMatch = url.pathname.match(/^\/api\/admin\/verifications\/([^/]+)$/);
  if (verificationMatch && req.method === 'PATCH') {
    const authUser = getAuthUser(req);
    if (!authUser || !canSeeAll(authUser)) {
      sendJson(res, 403, { ok: false, error: 'Admin access required.' });
      return true;
    }
    const body = await readBody(req);
    const status = ['approved', 'rejected'].includes(body.status) ? body.status : null;
    if (!status) {
      sendJson(res, 400, { ok: false, error: 'Status must be approved or rejected.' });
      return true;
    }
    const reviewerId = await resolveDatabaseUserId(authUser);
    const updated = await db.query(`UPDATE identity_verifications SET status = $2, reviewed_by = $3, reviewed_at = now(),
      review_note = $4, updated_at = now() WHERE id = $1 RETURNING *`, [verificationMatch[1], status, reviewerId, String(body.note || '').slice(0, 500) || null]);
    const verification = updated.rows[0];
    if (!verification) {
      sendJson(res, 404, { ok: false, error: 'Verification record not found.' });
      return true;
    }
    const profileTable = { client: 'profile_clients', advocate: 'profile_advocates', intern: 'profile_interns' }[verification.role];
    if (profileTable) await db.query(`UPDATE ${profileTable} SET verification_status = $2, updated_at = now() WHERE user_id = $1`, [verification.user_id, status]);
    await writeAuditLog(authUser, `identity_${status}`, 'identity_verification', verification.id, `Identity verification ${status}.`, { userId: verification.user_id, role: verification.role });
    {
      const recipients = await resolveRecipients([verification.user_id]);
      const approved = status === 'approved';
      const portalHome = verification.role === 'advocate' ? '/advocate' : verification.role === 'intern' ? '/intern' : '/client';
      await notify({
        eventType: approved ? 'identity_approved' : 'identity_rejected',
        title: approved ? 'Identity verified' : 'Identity verification rejected',
        message: approved
          ? 'Your Legal Connect identity verification was approved. You can continue using your workspace.'
          : `Your identity verification was rejected${body.note ? `: ${String(body.note).slice(0, 180)}` : '.'}`,
        recipients,
        payload: { verificationId: verification.id, status, role: verification.role },
        sendEmail: true,
        sendSms: true,
        ctaLabel: approved ? 'Open workspace' : 'Review account',
        ctaUrl: portalUrl(portalHome),
        priority: approved ? 'high' : 'urgent',
      });
    }
    sendJson(res, 200, { ok: true, verification: { id: verification.id, status, reviewedAt: verification.reviewed_at } });
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
      const managedRequest = req.url && (
        req.url.startsWith('/api/auth')
        || req.url.startsWith('/api/workspaces/')
        || req.url.startsWith('/api/chamber')
        || req.url.startsWith('/api/admin/verifications')
      );
      if (!res.headersSent && managedRequest) {
        const requestId = crypto.randomBytes(6).toString('hex');
        console.error(`[managed:${requestId}] ${req.method || 'UNKNOWN'} ${req.url || '/'} failed`, error);
        sendJson(res, 500, {
          ok: false,
          error: req.url.startsWith('/api/auth') ? 'Authentication service failed.' : 'The secure workspace service could not complete this request.',
          requestId,
          ...(req.url.startsWith('/api/workspaces/advocate') && error?.workspaceStage
            ? { failureStage: error.workspaceStage }
            : {}),
        });
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
