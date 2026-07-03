// artifacts/api-server/server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("./config");
const db = require("./db");

const PORT = config.port;
const publicDir = path.join(__dirname, "public");

const demoStore = {
  users: [],
  bookings: [],
  cases: [
    {
      id: "case-demo-1",
      title: "Tenancy Dispute - Rohini Property",
      status: "Active",
      nextDate: "2026-07-04",
      court: "District Court, Rohini",
      courtType: "district",
      stateCode: "DL",
      caseNo: "2023/CRL-1234",
      reminder: "24h before",
      stage: "Reply awaited",
    },
    {
      id: "case-demo-2",
      title: "Consumer Complaint - Electronics Refund",
      status: "Active",
      nextDate: "2026-07-12",
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
      fee: 1000,
      court: "Saket District Court",
    },
  ],
  notifications: [],
  legalSources: [],
  legalChunks: [],
  lawbotQueries: [],
  lawbotFeedback: [],
  auditLogs: [],
};

const roles = new Set(["client", "advocate", "rna", "intern", "admin"]);

function encodeSession(user) {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    iat: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeSession(token) {
  if (!token) return null;
  try {
    const clean = token.replace(/^Bearer\s+/i, "");
    const parsed = JSON.parse(Buffer.from(clean, "base64url").toString("utf8"));
    if (!parsed.id || !roles.has(parsed.role)) return null;
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
  return user?.id || body.userId || body.user_id || null;
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

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": config.allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Legal-Connect-Token",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function sendSse(res, data) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": config.allowedOrigin,
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
  return {
    provider: status.provider,
    resend_configured: status.provider === "resend" && status.status === "ready",
    from_email_configured: Boolean(config.fromEmail),
    support_email_configured: Boolean(config.supportEmail),
    status: status.status,
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

function mapCase(row) {
  return {
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
  };
}

function mapBooking(row) {
  return {
    id: row.id,
    userId: row.user_id,
    serviceType: row.service_type,
    amount: row.amount,
    paymentStatus: row.payment_status,
    receiptNo: row.receipt_no,
    nextDestination: row.next_destination,
    createdAt: row.created_at,
    ...(row.payload || {}),
  };
}

function mapTask(row) {
  return {
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
  };
}

function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
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
  const reviewLine = needsAdvocateReview(question)
    ? " This is source-based legal information only; a verified advocate must review strategy, drafting, risk, bail, settlement, or court action before you rely on it."
    : " This is legal information, not legal advice. Consult a verified advocate before taking action.";
  return {
    answer: `Source-locked answer based only on Legal Connect's approved sources: ${excerpts.join(" ")}${reviewLine}`,
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

function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = path.join(publicDir, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (url.pathname === "/health" || url.pathname === "/api/health") {
    const lawbotCounts = await lawbotHealthCounts();
    sendJson(res, 200, {
      ok: true,
      app: "Legal Connect",
      mode: "Phase 1 running backend",
      db: db.dbAvailable ? "connected" : "fallback",
      auth: "enabled",
      lawbot: "source-locked",
      approved_sources_count: lawbotCounts.approved_sources_count,
      legal_chunks_count: lawbotCounts.legal_chunks_count,
      payments: config.razorpayKeyId && config.razorpayKeySecret ? "razorpay-ready" : "demo",
      email: emailProviderStatus(),
    });
    return;
  }

  if (url.pathname === "/api/admin/email/status" && req.method === "GET") {
    const authUser = sourceAdminUser(req, res);
    if (!authUser) return;
    sendJson(res, 200, emailAdminStatus());
    return;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const role = roles.has(body.role) ? body.role : "client";
    const name = body.name || body.email || body.phone || "Legal Connect User";
    const email = body.email || null;
    const phone = body.phone || null;
    let user;

    if (db.dbAvailable) {
      const existing = email
        ? await db.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [email])
        : phone
          ? await db.query("SELECT * FROM users WHERE phone = $1 LIMIT 1", [phone])
          : { rows: [] };

      if (existing.rows.length) {
        const previousRole = existing.rows[0].role;
        const updated = await db.query(
          "UPDATE users SET name = $2, phone = COALESCE($3, phone), role = $4 WHERE id = $1 RETURNING *",
          [existing.rows[0].id, name, phone, role],
        );
        user = mapUser(updated.rows[0]);
        if (previousRole !== role) {
          await writeAuditLog(user, "role_changed", "user", user.id, `User role changed from ${previousRole || "unknown"} to ${role}`, { previousRole, nextRole: role, email, phone });
        }
      } else {
        const created = await db.query(
          "INSERT INTO users (name, email, phone, role) VALUES ($1, $2, $3, $4) RETURNING *",
          [name, email, phone, role],
        );
        user = mapUser(created.rows[0]);
      }
    } else {
      user = demoStore.users.find((item) => (email && item.email === email) || (phone && item.phone === phone));
      if (!user) {
        user = { id: `user-${Date.now()}`, name, email, phone, role, createdAt: new Date().toISOString() };
        demoStore.users.push(user);
      } else {
        const previousRole = user.role;
        Object.assign(user, { name, phone, role });
        if (previousRole !== role) {
          await writeAuditLog(user, "role_changed", "user", user.id, `User role changed from ${previousRole || "unknown"} to ${role}`, { previousRole, nextRole: role, email, phone });
        }
      }
    }

    const token = encodeSession(user);
    sendJson(res, 200, { ok: true, token, user });
    return;
  }

  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = getAuthUser(req);
    sendJson(res, 200, { ok: true, user: user || { id: "demo-user", name: "Demo User", role: "demo" } });
    return;
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/cases" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (db.dbAvailable) {
      const result = canSeeAll(authUser) || !authUser
        ? await db.query("SELECT * FROM cases ORDER BY created_at DESC")
        : await db.query("SELECT * FROM cases WHERE user_id = $1 OR payload->>'assignedTo' = $1 ORDER BY created_at DESC", [authUser.id]);
      sendJson(res, 200, result.rows.map(mapCase));
      return;
    }
    sendJson(res, 200, demoStore.cases);
    return;
  }

  if (url.pathname === "/api/cases" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const caseNumber = body.caseNo || body.case_number;
    const missing = [];
    if (!body.court) missing.push("court");
    if (!caseNumber) missing.push("caseNo");
    if (missing.length > 0) {
      sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const trackedCase = {
      id: `case-${Date.now()}`,
      title: body.title || `${body.court} | ${caseNumber}`,
      status: "Active",
      nextDate: body.nextDate || "Sync pending",
      court: body.court,
      courtType: body.courtType || "district",
      stateCode: body.stateCode,
      caseNo: caseNumber,
      reminder: body.reminder || "24h before",
      stage: body.stage || "Court Sync pending",
      createdAt: new Date().toISOString(),
    };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO cases (user_id, title, court, case_number, cnr, next_date, status, notes, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userIdForWrite(body, authUser),
          trackedCase.title,
          trackedCase.court,
          caseNumber,
          body.cnr || null,
          trackedCase.nextDate,
          trackedCase.status,
          body.notes || null,
          JSON.stringify({ ...body, user_id: userIdForWrite(body, authUser), role: userRole(authUser), stateCode: body.stateCode, courtType: trackedCase.courtType, reminder: trackedCase.reminder, stage: trackedCase.stage }),
        ],
      );
      sendJson(res, 201, mapCase(result.rows[0]));
      return;
    }
    demoStore.cases.push(trackedCase);
    sendJson(res, 201, trackedCase);
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
      if (authUser && !canSeeAll(authUser) && mapped.userId !== authUser.id) {
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
    sendJson(res, 200, trackedCase);
    return;
  }

  if (url.pathname === "/api/case-updates" && req.method === "GET") {
    const update = {
      type: "caseUpdate",
      message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.",
      caseId: "case-demo-1",
      nextDate: "2026-07-04",
      source: "Official eCourts Services data - demo stream",
    };
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": config.allowedOrigin,
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
      const demoMessage = "Demo/in-app notification queued because Resend is not configured.";
      await createNotification("notify_test", title, message, { mode: "demo", channels: ["in-app", "email-demo"] }, authUser.id || body.userId || null);
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
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2 style="color:#0f2a25">Legal Connect</h2><p>${escapeHtml(message)}</p><p style="color:#64748b;font-size:12px">This is a Legal Connect notification test.</p></div>`,
    });
    if (emailResult.sent) {
      await createNotification("notify_test", title, message, { mode: "resend", status: "sent", providerMessageId: emailResult.id }, authUser.id || body.userId || null);
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
    await createNotification("notify_test_failed", title, `Resend email failed: ${errorMessage}`, { mode: "resend", status: "failed" }, authUser.id || body.userId || null);
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
    if (db.dbAvailable) {
      const result = canSeeAll(authUser) || !authUser
        ? await db.query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50")
        : await db.query("SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50", [authUser.id]);
      sendJson(res, 200, result.rows.map(mapNotification));
      return;
    }
    sendJson(res, 200, demoStore.notifications);
    return;
  }

  if (url.pathname === "/api/notifications/mark-read" && req.method === "POST") {
    const body = await readBody(req);
    if (db.dbAvailable) {
      await db.query("UPDATE notifications SET read_at = now() WHERE id = $1", [body.id]);
    } else {
      const item = demoStore.notifications.find((notification) => notification.id === body.id);
      if (item) item.readAt = new Date().toISOString();
    }
    sendJson(res, 200, { ok: true });
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
        [body.caseId || body.case_id || null, body.updateType || body.update_type || "calendar_decision", message, JSON.stringify({ ...body, user_id: authUser?.id || body.userId || body.user_id || null })],
      );
      await createNotification("clash_warning", "Calendar decision saved", message, { caseUpdateId: result.rows[0].id }, authUser?.id || body.userId || body.user_id || null);
      sendJson(res, 201, result.rows[0]);
      return;
    }
    const update = { id: `case-update-${Date.now()}`, message, createdAt: new Date().toISOString(), ...body };
    demoStore.caseUpdates = demoStore.caseUpdates || [];
    demoStore.caseUpdates.unshift(update);
    await createNotification("clash_warning", "Calendar decision saved", message, update, authUser?.id || body.userId || body.user_id || null);
    sendJson(res, 201, update);
    return;
  }

  if (url.pathname === "/api/admin/summary" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (authUser && !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "RNA/Admin access required" });
      return;
    }
    if (db.dbAvailable) {
      const [users, bookings, tasks, cases, lawbot, sos] = await Promise.all([
        db.query("SELECT role, count(*)::int AS count FROM users GROUP BY role"),
        db.query("SELECT payment_status, count(*)::int AS count FROM bookings GROUP BY payment_status"),
        db.query("SELECT status, escrow_status, count(*)::int AS count FROM tasks GROUP BY status, escrow_status"),
        db.query("SELECT id, title, court, next_date, status FROM cases ORDER BY created_at DESC LIMIT 8"),
        db.query("SELECT question, created_at FROM lawbot_chats ORDER BY created_at DESC LIMIT 8"),
        db.query("SELECT service_type, urgency, status, created_at FROM sos_requests ORDER BY created_at DESC LIMIT 8"),
      ]);
      sendJson(res, 200, {
        users: users.rows,
        bookings: bookings.rows,
        tasks: tasks.rows,
        recentCases: cases.rows,
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
      recentLawbotQuestions: [],
      sosRequests: demoStore.sosRequests || [],
    });
    return;
  }

  if (url.pathname === "/api/admin/task-action" && req.method === "POST") {
    const authUser = getAuthUser(req);
    if (authUser && !canSeeAll(authUser)) {
      sendJson(res, 403, { error: "RNA/Admin access required" });
      return;
    }
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
      sendJson(res, 200, { ok: true, task: result.rows[0] ? mapTask(result.rows[0]) : null });
      return;
    }
    await writeAuditLog(authUser, body.action || "task_action", "task", body.taskId || "demo-task", `Task action saved: ${nextStatus}`, { action: body.action, status: nextStatus });
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
    const body = await readBody(req);
    const amount = Number(body.amount || 0);
    const hasRazorpay = Boolean(config.razorpayKeyId && config.razorpayKeySecret);
    sendJson(res, 200, {
      ok: true,
      mode: hasRazorpay ? "razorpay-ready-placeholder" : "demo",
      order: {
        id: hasRazorpay ? `order_todo_${Date.now()}` : `demo_order_${Date.now()}`,
        amount,
        currency: body.currency || "INR",
        status: "created",
        payment_lock_status: "locked",
      },
      keyId: config.razorpayKeyId || "demo_key",
      todo: hasRazorpay ? "Install Razorpay SDK and replace placeholder creation." : "Add Razorpay env vars for real test-mode orders.",
    });
    return;
  }

  if (url.pathname === "/api/payments/verify" && req.method === "POST") {
    const body = await readBody(req);
    sendJson(res, 200, {
      ok: true,
      mode: config.razorpayKeySecret ? "razorpay-ready-placeholder" : "demo",
      payment_status: body.paymentId || body.razorpay_payment_id ? "paid" : "demo_paid",
      payment_lock_status: "locked",
    });
    return;
  }

  if (url.pathname === "/api/payments/webhook" && req.method === "POST") {
    const body = await readBody(req);
    sendJson(res, 200, { ok: true, received: true, mode: config.razorpayWebhookSecret ? "razorpay-ready-placeholder" : "demo", event: body.event || "demo.event" });
    return;
  }

  if (url.pathname.startsWith("/api/cases/") && url.pathname.endsWith("/complete") && req.method === "POST") {
    const id = url.pathname.split("/")[3];
    if (db.dbAvailable) {
      const result = await db.query(
        "UPDATE cases SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
        [id, "Completed"],
      );
      if (result.rows.length === 0) {
        sendJson(res, 404, { error: "Case not found" });
        return;
      }
      sendJson(res, 200, {
        ok: true,
        case: mapCase(result.rows[0]),
        message: "Diary entry completed after proof approval and escrow release.",
      });
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
      message: "Diary entry completed after proof approval and escrow release.",
    });
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (db.dbAvailable) {
      const result = canSeeAll(authUser) || !authUser
        ? await db.query("SELECT * FROM tasks ORDER BY created_at DESC")
        : authUser.role === "intern"
          ? await db.query("SELECT * FROM tasks WHERE accepted_by = $1 OR payload->>'assignedIntern' = $1 ORDER BY created_at DESC", [authUser.id])
          : await db.query("SELECT * FROM tasks WHERE posted_by = $1 OR accepted_by = $1 OR payload->>'user_id' = $1 ORDER BY created_at DESC", [authUser.id]);
      sendJson(res, 200, result.rows.map(mapTask));
      return;
    }
    sendJson(res, 200, demoStore.tasks);
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "GET") {
    const authUser = getAuthUser(req);
    if (db.dbAvailable) {
      const result = canSeeAll(authUser) || !authUser
        ? await db.query("SELECT * FROM bookings ORDER BY created_at DESC")
        : await db.query("SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC", [authUser.id]);
      sendJson(res, 200, result.rows.map(mapBooking));
      return;
    }
    sendJson(res, 200, demoStore.bookings);
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const bookingUserId = userIdForWrite(body, authUser);
    const booking = { id: `booking-${Date.now()}`, userId: bookingUserId, status: "Pending", createdAt: new Date().toISOString(), ...body };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO bookings (user_id, service_type, amount, payment_status, receipt_no, next_destination, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          bookingUserId,
          body.serviceType || body.service_type || body.plan || "Legal Connect booking",
          Number(body.amount || body.price || 0),
          body.paymentStatus || body.payment_status || body.status || "Pending",
          body.receiptNo || body.receipt_no || null,
          body.nextDestination || body.next_destination || body.route || null,
          JSON.stringify({ ...body, user_id: bookingUserId, role: userRole(authUser) }),
        ],
      );
      await createNotification("booking_confirmed", "Booking received", "Your Legal Connect booking has been recorded.", { bookingId: result.rows[0].id }, bookingUserId);
      sendJson(res, 201, mapBooking(result.rows[0]));
      return;
    }
    await createNotification("booking_confirmed", "Booking received", "Your Legal Connect booking has been recorded.", { bookingId: booking.id }, booking.userId || null);
    demoStore.bookings.push(booking);
    sendJson(res, 201, booking);
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const actorId = userIdForWrite(body, authUser);
    const task = { id: `task-${Date.now()}`, postedBy: actorId, status: "Open", createdAt: new Date().toISOString(), ...body };
    if (db.dbAvailable) {
      const result = await db.query(
        `INSERT INTO tasks (title, court, task_type, amount, escrow_status, status, posted_by, accepted_by, proof_url, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          body.title || "Legal Connect mission",
          body.court || null,
          body.taskType || body.task_type || body.type || "Mission",
          Number(body.amount || body.fee || 0),
          body.escrowStatus || body.escrow_status || "Not locked",
          body.status || "Open",
          body.postedBy || body.posted_by || actorId,
          body.acceptedBy || body.accepted_by || null,
          body.proofUrl || body.proof_url || null,
          JSON.stringify({ ...body, user_id: actorId, role: userRole(authUser), payment_lock_status: body.paymentLockStatus || body.payment_lock_status || body.escrowStatus || "none" }),
        ],
      );
      await createNotification("task_posted", "Mission posted", result.rows[0].title || "A court mission was posted.", { taskId: result.rows[0].id }, actorId);
      sendJson(res, 201, mapTask(result.rows[0]));
      return;
    }
    await createNotification("task_posted", "Mission posted", task.title || "A court mission was posted.", { taskId: task.id }, task.postedBy || null);
    demoStore.tasks.push(task);
    sendJson(res, 201, task);
    return;
  }

  if (url.pathname === "/api/lawbot/query" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const question = body.query || body.message || "";
    const result = await queryLawbot(question, userIdForWrite(body, authUser), body.mode || "lawbot");
    await saveLawbotChat(userIdForWrite(body, authUser), question, result);
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
      sendJson(res, 201, {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        serviceType: result.rows[0].service_type,
        urgency: result.rows[0].urgency,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at,
        ...(result.rows[0].payload || {}),
      });
      return;
    }
    demoStore.sosRequests = demoStore.sosRequests || [];
    demoStore.sosRequests.push(sosRequest);
    await createNotification("sos_created", "Legal SOS created", `${sosRequest.urgency} SOS request saved.`, { sosId: sosRequest.id }, sosUserId);
    sendJson(res, 201, sosRequest);
    return;
  }

  serveStatic(req, res);
});

async function startServer() {
  await db.initDb();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on ${PORT}`);
    console.log(`Database mode: ${db.dbAvailable ? "connected" : "fallback"}`);
    console.log(`Email provider: ${emailProviderStatus().provider === "resend" && emailProviderStatus().status === "ready" ? "resend configured" : "demo fallback"}`);
  });
}

startServer().catch((error) => {
  console.error("Server failed to start", error);
  process.exit(1);
});
