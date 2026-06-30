// artifacts/api-server/server.js
const http = require("http");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const PORT = config.port;
const publicDir = path.join(__dirname, "public");

const demoStore = {
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
};

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
    "Access-Control-Allow-Origin": "*",
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
    sendJson(res, 200, { ok: true, app: "Legal Connect", mode: "Phase 1 demo backend" });
    return;
  }

  if (url.pathname === "/api/cases" && req.method === "GET") {
    sendJson(res, 200, demoStore.cases);
    return;
  }

  if (url.pathname === "/api/cases" && req.method === "POST") {
    const body = await readBody(req);
    const missing = ["court", "stateCode", "caseNo"].filter((field) => !body[field]);
    if (missing.length > 0) {
      sendJson(res, 400, { error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const trackedCase = {
      id: `case-${Date.now()}`,
      title: body.title || `${body.court} | ${body.caseNo}`,
      status: "Active",
      nextDate: body.nextDate || "Sync pending",
      court: body.court,
      courtType: body.courtType || "district",
      stateCode: body.stateCode,
      caseNo: body.caseNo,
      reminder: body.reminder || "24h before",
      stage: body.stage || "Court Sync pending",
      createdAt: new Date().toISOString(),
    };
    demoStore.cases.push(trackedCase);
    sendJson(res, 201, trackedCase);
    return;
  }

  if (url.pathname.startsWith("/api/cases/") && req.method === "GET") {
    const id = url.pathname.split("/").pop();
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

  if (url.pathname.startsWith("/api/cases/") && url.pathname.endsWith("/complete") && req.method === "POST") {
    const id = url.pathname.split("/")[3];
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
    sendJson(res, 200, demoStore.tasks);
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "GET") {
    sendJson(res, 200, demoStore.bookings);
    return;
  }

  if (url.pathname === "/api/bookings" && req.method === "POST") {
    const body = await readBody(req);
    const booking = { id: `booking-${Date.now()}`, status: "Pending", createdAt: new Date().toISOString(), ...body };
    demoStore.bookings.push(booking);
    sendJson(res, 201, booking);
    return;
  }

  if (url.pathname === "/api/tasks" && req.method === "POST") {
    const body = await readBody(req);
    const task = { id: `task-${Date.now()}`, status: "Open", createdAt: new Date().toISOString(), ...body };
    demoStore.tasks.push(task);
    sendJson(res, 201, task);
    return;
  }

  if (url.pathname === "/api/lawbot/query" && req.method === "POST") {
    const body = await readBody(req);
    sendJson(res, 200, queryLawbot(body.query || body.message || ""));
    return;
  }

  if (url.pathname === "/api/ai/chat" && req.method === "POST") {
    const body = await readBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content || "";
    sendSse(res, queryLawbot(lastUserMessage));
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on ${PORT}`);
});
