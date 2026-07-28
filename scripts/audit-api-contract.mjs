import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = path.join(rootDir, "artifacts/api-server/server.js");

async function availablePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const address = probe.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
const output = [];
const child = spawn(process.execPath, [serverPath], {
  cwd: rootDir,
  env: {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(port),
    DATABASE_URL: "",
    DB_URL: "",
    SESSION_SECRET: "legal-connect-contract-audit-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk) => output.push(chunk.toString()));
child.stderr.on("data", (chunk) => output.push(chunk.toString()));

async function request(urlPath, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (response.status === 204) return null;
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${urlPath} returned non-JSON content (${response.status})`);
  }
  if (!response.ok) {
    throw new Error(`${method} ${urlPath} failed (${response.status}): ${data?.error || text}`);
  }
  return data;
}

async function waitUntilReady() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`API server exited with code ${child.exitCode}`);
    try {
      const health = await request("/api/healthz");
      if (health?.status === "ok") return health;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }
  throw new Error("API server did not become ready in time");
}

const created = { caseId: null, taskId: null, bookingId: null };
let token = null;

try {
  await waitUntilReady();

  const preflight = await fetch(`${baseUrl}/api/cases`, {
    method: "OPTIONS",
    headers: { Origin: "https://legal-connect.in", "Access-Control-Request-Method": "PUT" },
  });
  assert.match(preflight.headers.get("access-control-allow-methods") || "", /PUT/);
  console.log("PASS health and production CORS contract");

  const login = await request("/api/auth/demo-login", { method: "POST", body: { role: "admin" } });
  token = login.token;
  assert.ok(token);
  assert.equal(login.user.role, "admin");
  console.log("PASS role login and authenticated session");

  const createdCase = await request("/api/cases", {
    method: "POST",
    token,
    body: {
      caseTitle: "Contract Audit Matter",
      caseNumber: "AUDIT/2026/001",
      courtName: "Delhi High Court",
      courtRoomNo: "12",
      judgeName: "Audit Judge",
      nextDate: "2026-08-18",
      status: "Active",
    },
  });
  created.caseId = createdCase.id;
  assert.equal(createdCase.caseTitle, "Contract Audit Matter");
  assert.equal(createdCase.courtName, "Delhi High Court");
  assert.equal(createdCase.courtRoomNo, "12");
  assert.equal(createdCase.judgeName, "Audit Judge");

  const updatedCase = await request(`/api/cases/${created.caseId}`, {
    method: "PUT",
    token,
    body: { status: "Adjourned", nextDate: "2026-09-01" },
  });
  assert.equal(updatedCase.status, "Adjourned");
  assert.equal((await request(`/api/cases/${created.caseId}`, { token })).caseNumber, "AUDIT/2026/001");
  console.log("PASS case create, read, and update contract");

  const createdTask = await request("/api/tasks", {
    method: "POST",
    token,
    body: {
      taskDescription: "Collect certified order copy",
      taskType: "Other",
      fee: "₹1,500",
      location: "Saket District Court",
      status: "Open",
    },
  });
  created.taskId = createdTask.id;
  assert.equal(createdTask.taskDescription, "Collect certified order copy");
  assert.equal(createdTask.location, "Saket District Court");
  assert.equal((await request(`/api/tasks/${created.taskId}/accept`, { method: "POST", token })).status, "Accepted");
  const updatedTask = await request(`/api/tasks/${created.taskId}`, {
    method: "PUT",
    token,
    body: { status: "Completed", fee: "₹1,750" },
  });
  assert.equal(updatedTask.status, "Completed");
  assert.equal((await request(`/api/tasks/${created.taskId}`, { token })).taskType, "Other");
  console.log("PASS task create, accept, read, and update contract");

  const createdBooking = await request("/api/bookings", {
    method: "POST",
    body: {
      clientName: "Audit Client",
      clientEmail: "audit@example.com",
      clientPhone: "+919999999999",
      legalIssueType: "Civil",
      preferredLawyer: "Demo Lawyer",
      preferredDate: "2026-08-20",
      preferredTime: "11:00 AM",
      briefDescription: "Contract test consultation",
      status: "Pending",
    },
  });
  created.bookingId = createdBooking.id;
  assert.equal(createdBooking.legalIssueType, "Civil");
  const updatedBooking = await request(`/api/bookings/${created.bookingId}`, {
    method: "PUT",
    token,
    body: { status: "Confirmed" },
  });
  assert.equal(updatedBooking.status, "Confirmed");
  console.log("PASS booking create and status update contract");

  const [cases, tasks, bookings, users, analytics] = await Promise.all([
    request("/api/cases", { token }),
    request("/api/tasks", { token }),
    request("/api/bookings", { token }),
    request("/api/users", { token }),
    request("/api/analytics/revenue", { token }),
  ]);
  assert.ok(Array.isArray(cases) && Array.isArray(tasks) && Array.isArray(bookings) && Array.isArray(users));
  assert.equal(typeof analytics.totalUsers, "number");
  console.log("PASS dashboard list and analytics contracts");

  await request(`/api/cases/${created.caseId}`, { method: "DELETE", token });
  created.caseId = null;
  await request(`/api/tasks/${created.taskId}`, { method: "DELETE", token });
  created.taskId = null;
  await request(`/api/bookings/${created.bookingId}`, { method: "DELETE", token });
  created.bookingId = null;
  console.log("PASS case, task, and booking delete contracts");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  const logs = output.join("").trim().split("\n").slice(-20).join("\n");
  if (logs) console.error(`\nAPI server output:\n${logs}`);
  process.exitCode = 1;
} finally {
  if (token) {
    await Promise.allSettled([
      created.caseId ? request(`/api/cases/${created.caseId}`, { method: "DELETE", token }) : null,
      created.taskId ? request(`/api/tasks/${created.taskId}`, { method: "DELETE", token }) : null,
      created.bookingId ? request(`/api/bookings/${created.bookingId}`, { method: "DELETE", token }) : null,
    ]);
  }
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
}
