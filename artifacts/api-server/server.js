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

const lawbotSources = [
  {
    id: "nia-138",
    title: "Negotiable Instruments Act Section 138",
    citation: "NI Act, 1881, Section 138 demo source",
    text: "Section 138 concerns dishonour of cheque. The usual flow is cheque return memo, statutory demand notice, non-payment after notice, and complaint within limitation.",
    tags: ["cheque", "bounce", "138", "notice", "dishonour"],
  },
  {
    id: "consumer",
    title: "Consumer Protection Act demo source",
    citation: "Consumer Protection Act, 2019 demo source",
    text: "Consumer complaints may involve defective goods, service deficiency, unfair trade practice, or misleading advertisement. Keep invoice, proof, complaint emails, photos, and relief sought ready.",
    tags: ["consumer", "refund", "defective", "warranty", "complaint"],
  },
  {
    id: "rent",
    title: "Rent agreement checklist",
    citation: "Legal Connect tenancy template demo source",
    text: "A rent agreement should record parties, property, rent, deposit, lock-in, maintenance, notice period, permitted use, and dispute clause.",
    tags: ["rent", "agreement", "tenant", "landlord", "deposit"],
  },
];

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": config.allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function sendSse(res, data) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": config.allowedOrigin,
  });
  res.write(`data: ${JSON.stringify({ content: data.answer })}\n\n`);
  res.write(`data: ${JSON.stringify({ done: true, citations: data.citations })}\n\n`);
  res.end();
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

function queryLawbot(question) {
  const q = String(question || "").toLowerCase();
  const words = q.split(/\s+/).filter((word) => word.length > 2);
  const matches = lawbotSources.filter((source) =>
    source.tags.some((tag) => q.includes(tag)) || words.some((word) => source.text.toLowerCase().includes(word)),
  );

  if (matches.length === 0) {
    return {
      answer: "I could not find this in the approved legal sources.",
      citations: [],
    };
  }

  return {
    answer: `Based only on approved demo sources: ${matches.map((source) => source.text).join(" ")} This is legal information, not legal advice. Consult a verified advocate before taking action.`,
    citations: matches,
  };
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

async function saveLawbotChat(userId, question, result) {
  if (!db.dbAvailable) return;
  await db.query(
    "INSERT INTO lawbot_chats (user_id, question, answer, sources) VALUES ($1, $2, $3, $4)",
    [userId || null, question, result.answer, JSON.stringify(result.citations || [])],
  );
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
    sendJson(res, 200, {
      ok: true,
      app: "Legal Connect",
      mode: "Phase 1 running backend",
      db: db.dbAvailable ? "connected" : "fallback",
      auth: "enabled",
      payments: config.razorpayKeyId && config.razorpayKeySecret ? "razorpay-ready" : "demo",
    });
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
        const updated = await db.query(
          "UPDATE users SET name = $2, phone = COALESCE($3, phone), role = $4 WHERE id = $1 RETURNING *",
          [existing.rows[0].id, name, phone, role],
        );
        user = mapUser(updated.rows[0]);
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
        Object.assign(user, { name, phone, role });
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
    const body = await readBody(req);
    sendJson(res, 202, {
      queued: true,
      mode: "demo",
      channels: ["web-push-demo", "email-demo", "sms-placeholder"],
      message: body.message || "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.",
      requiredEnv: ["REDIS_URL", "SENDGRID_KEY", "WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY"],
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
      sendJson(res, 200, { ok: true, task: result.rows[0] ? mapTask(result.rows[0]) : null });
      return;
    }
    sendJson(res, 200, { ok: true, action: body.action, status: nextStatus });
    return;
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
    const result = queryLawbot(question);
    await saveLawbotChat(userIdForWrite(body, authUser), question, result);
    sendJson(res, 200, result);
    return;
  }

  if (url.pathname === "/api/ai/chat" && req.method === "POST") {
    const authUser = getAuthUser(req);
    const body = await readBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    const result = queryLawbot(lastUserMessage);
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
  });
}

startServer().catch((error) => {
  console.error("Server failed to start", error);
  process.exit(1);
});
