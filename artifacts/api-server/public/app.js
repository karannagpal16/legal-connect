const titles = {
  home: "Legal Connect",
  login: "Secure Login",
  advocate: "Advocate Operating System",
  chambers: "Chambers",
  matter: "Matter Vault",
  diary: "Case Diary",
  bar: "Digital Library",
  bareact: "Digital Library - Bare Acts",
  judgment: "Digital Library - Judgments",
  appearance: "Court Mission Board",
  posttask: "Post Court Mission",
  task: "Task Detail",
  escrow: "Work Completion Hold",
  client: "Client Portal",
  documents: "Documents Without Drama",
  "service-room": "Service Room",
  intern: "Intern Portal",
  admin: "Admin Panel",
  "privacy-policy": "Privacy Policy",
  terms: "Terms",
  "refund-policy": "Refund Policy",
  disclaimer: "Disclaimer",
  contact: "Contact"
};

const navItems = [...document.querySelectorAll(".nav-item")];
const views = [...document.querySelectorAll(".view")];
const title = document.querySelector("#view-title");
const demoStatus = document.querySelector("#demo-status");
const API_BASE = location.protocol === "file:" ? "http://127.0.0.1:3000" : "";
let currentSession = null;
const flowStatus = document.querySelector("#flow-status");
const flowStatusToggle = document.querySelector("#flow-status-toggle");
const flowStatusTitle = document.querySelector("#flow-status-title");
const flowStatusDetail = document.querySelector("#flow-status-detail");
const localTestingRuntime = location.protocol === "file:" || ["localhost", "127.0.0.1"].includes(location.hostname);
let publicHealth = {
  otp_mode: localTestingRuntime ? "demo" : "unknown",
  otp_fallback_enabled: localTestingRuntime,
};

function getSession() {
  if (currentSession) return currentSession;
  try {
    currentSession = JSON.parse(localStorage.getItem("legalConnectSession") || "null");
  } catch {
    currentSession = null;
  }
  return currentSession;
}

function authHeaders() {
  const session = getSession();
  return session?.token ? { Authorization: `Bearer ${session.token}` } : {};
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const payload = await response.json();
      message = payload.error_message || payload.error || message;
    } catch {
      // Keep the generic status message when the server does not return JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Razorpay checkout could not load. Please try again."));
    document.head.appendChild(script);
  });
}

function setDemoStatus(message) {
  if (!demoStatus || !message) return;
  demoStatus.textContent = message;
  demoStatus.classList.add("pulse", "show");
  window.clearTimeout(window.legalConnectStatusTimer);
  window.legalConnectStatusTimer = window.setTimeout(() => {
    demoStatus.classList.remove("pulse", "show");
  }, 2600);
  setFlowStatus("Latest Action", message);
}

function setFlowStatus(titleText, detailText) {
  if (flowStatusTitle && titleText) flowStatusTitle.textContent = titleText;
  if (flowStatusDetail && detailText) flowStatusDetail.textContent = detailText;
}

function showUpdateBanner(version) {
  let banner = document.querySelector("#app-update-banner");
  if (!banner) {
    banner = document.createElement("button");
    banner.id = "app-update-banner";
    banner.className = "app-update-banner";
    banner.type = "button";
    document.body.appendChild(banner);
  }
  banner.textContent = "Legal Connect has been updated. Tap to refresh.";
  banner.hidden = false;
  banner.onclick = () => {
    localStorage.setItem("legalConnectWebVersion", version.web_version);
    const hash = location.hash || "#home";
    location.replace(`${location.pathname}?v=${encodeURIComponent(version.web_version)}${hash}`);
  };
}

async function checkAppVersion() {
  try {
    const version = await apiFetch("/api/app-version");
    const previous = localStorage.getItem("legalConnectWebVersion");
    if (previous && previous !== version.web_version) {
      showUpdateBanner(version);
    } else {
      localStorage.setItem("legalConnectWebVersion", version.web_version);
    }
    document.querySelectorAll("[data-web-version]").forEach((node) => {
      node.textContent = version.web_version || "unknown";
    });
    document.querySelectorAll("[data-build-time]").forEach((node) => {
      node.textContent = version.build_time ? new Date(version.build_time).toLocaleString() : "unknown";
    });
    document.querySelectorAll("[data-public-url]").forEach((node) => {
      node.textContent = version.public_url || location.origin;
    });
  } catch {
    // Version checks are advisory; keep the app usable if the backend is waking up.
  }
}

async function refreshPublicHealth() {
  try {
    publicHealth = await apiFetch("/api/health");
    const otpLabel = publicHealth.otp_fallback_enabled
      ? "Testing OTP enabled for this build."
      : publicHealth.otp_mode === "email"
        ? "Email OTP is active for this environment."
        : "OTP fallback is disabled in production.";
    document.querySelectorAll("[data-otp-status]").forEach((node) => {
      node.textContent = `${otpLabel} Mode: ${publicHealth.otp_mode || "unknown"}.`;
    });
  } catch {
    if (!localTestingRuntime) {
      publicHealth.otp_fallback_enabled = false;
    }
  }
}

function activateView(id) {
  const sessionRole = getSession()?.user?.role || getSession()?.role;
  if (id === "matter" && !["rna", "admin"].includes(sessionRole)) {
    setDemoStatus("Matter Vault is RNA/Admin only. Login as RNA/Admin to open confidential vault records.");
    id = "login";
  }
  const target = document.getElementById(id);
  if (!target) return;

  views.forEach((view) => view.classList.toggle("active", view.id === id));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === id));
  title.textContent = titles[id] || "Legal Connect";
  setDemoStatus(`${titles[id] || "Legal Connect"} opened.`);
  history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "admin") refreshAdminDashboard();
  if (id === "client" || id === "advocate" || id === "appearance" || id === "matter") refreshReceipts();
  if (id === "client" || id === "advocate" || id === "admin") refreshWorkspaceData();
}

function applySessionToUi(session) {
  const user = session?.user || session || {};
  const name = user.name || "Legal Connect User";
  const role = user.role || "client";
  const label = role === "advocate"
    ? `Adv. ${name}`
    : role === "rna"
      ? `${name} - RNA Trust Desk`
      : role === "intern"
        ? `${name} - Intern XP`
        : `${name}`;
  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = label;
  });
  document.querySelectorAll("[data-user-role]").forEach((node) => {
    node.textContent = role.toUpperCase();
  });
  const status = role === "advocate"
    ? "Board ready: 2 cases tracked, proxy queue none, work hold receipts private."
    : role === "client"
      ? "People Shield ready: bookings, SOS, receipts and documents stay private."
      : role === "intern"
        ? "XP board ready: missions, deadlines and PPO progress are saved."
        : "RNA/Admin control ready: sources, receipts, SOS and work holds supervised.";
  document.querySelectorAll("[data-user-status]").forEach((node) => {
    node.textContent = status;
  });
  setFlowStatus(label, status);
}

flowStatusToggle?.addEventListener("click", () => {
  flowStatus?.classList.toggle("open");
});

function updateSafeBoard({ cases = [], tasks = [], bookings = [] } = {}) {
  const cells = document.querySelectorAll(".safe-board-grid article");
  if (!cells.length) return;
  const openTasks = tasks.filter((task) => !/closed|completed|released/i.test(task.status || ""));
  const pendingHolds = bookings.filter((booking) => /pending|hold|verification/i.test(`${booking.paymentStatus || booking.payment_status || ""} ${booking.workHoldStatus || booking.work_hold_status || ""}`));
  const values = [
    [`${cases.length || "No"} active`, cases.length ? "Private case cards are loaded under your login." : "No cases stored for this login yet."],
    [openTasks.length ? `${openTasks.length} open` : "None", openTasks.length ? "Open court missions visible for your role." : "No open proxy assigned to you right now."],
    [pendingHolds.length ? `${pendingHolds.length} pending` : "Safe", pendingHolds.length ? "Payment/work completion holds need follow-up." : "Payments release only after proof approval."],
    [getSession()?.user?.role?.toUpperCase() || "LOGIN", "Role-based privacy shield active."],
  ];
  cells.forEach((cell, index) => {
    const strong = cell.querySelector("strong");
    const small = cell.querySelector("small");
    if (strong) strong.textContent = values[index]?.[0] || strong.textContent;
    if (small) small.textContent = values[index]?.[1] || small.textContent;
  });
}

async function refreshWorkspaceData() {
  try {
    const [casesResult, tasksResult, bookingsResult] = await Promise.allSettled([
      apiFetch("/api/cases"),
      apiFetch("/api/tasks"),
      apiFetch("/api/bookings"),
    ]);
    const cases = casesResult.status === "fulfilled" && Array.isArray(casesResult.value) ? casesResult.value : [];
    const tasks = tasksResult.status === "fulfilled" && Array.isArray(tasksResult.value) ? tasksResult.value : [];
    const bookings = bookingsResult.status === "fulfilled" && Array.isArray(bookingsResult.value) ? bookingsResult.value : [];
    updateSafeBoard({ cases, tasks, bookings });
    const latestBooking = bookings[0];
    if (latestBooking && !localStorage.getItem("legalConnectClientBooking")) {
      renderClientDesk({
        id: latestBooking.receiptNo || latestBooking.receipt_no || latestBooking.id,
        plan: latestBooking.serviceType || latestBooking.service_type || "Legal Connect booking",
        amount: latestBooking.amount,
        status: latestBooking.paymentStatus || latestBooking.payment_status || "recorded",
        route: latestBooking.nextDestination || latestBooking.next_destination || latestBooking.payload?.route,
        paymentMode: "backend",
      });
    }
  } catch {
    updateSafeBoard();
  }
}

document.addEventListener("click", (event) => {
  const navTarget = event.target.closest("[data-view], [data-jump]");
  if (!navTarget) return;

  const viewId = navTarget.dataset.view || navTarget.dataset.jump;
  if (!viewId) return;

  event.preventDefault();
  activateView(viewId);
});

document.querySelectorAll(".role-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".role-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    const roleSelect = document.querySelector("#login-role");
    if (roleSelect && card.dataset.loginRole) roleSelect.value = card.dataset.loginRole;
    setDemoStatus(`${card.querySelector("strong")?.textContent || "Role"} selected. Login routing preview updated.`);
  });
});

const roleLoginForm = document.querySelector("#role-login-form");
const authStatus = document.querySelector("#auth-status");
const verificationStatus = document.querySelector("#verification-status");
const requestLoginCode = document.querySelector("#request-login-code");
const verifyLoginCode = document.querySelector("#verify-login-code");
const serviceRoomTitle = document.querySelector("#service-room-title");
const serviceRoomStatus = document.querySelector("#service-room-status");
const serviceRoomRoute = document.querySelector("#service-room-route");
const serviceRoomDetail = document.querySelector("#service-room-detail");
const serviceRoomTimeline = document.querySelector("#service-room-timeline");
const roleRoutes = {
  client: "client",
  advocate: "advocate",
  rna: "admin",
  intern: "intern",
  admin: "admin",
};

function loginContactPayload() {
  return {
    email: document.querySelector("#login-email")?.value || "",
    phone: document.querySelector("#login-phone")?.value || "",
  };
}

requestLoginCode?.addEventListener("click", async () => {
  const payload = loginContactPayload();
  if (!payload.email && !payload.phone) {
    if (verificationStatus) verificationStatus.textContent = "Add an email or phone number first.";
    return;
  }
  try {
    const result = await apiFetch("/api/auth/request-code", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const codeInput = document.querySelector("#login-code");
    if (result.devCode && codeInput) codeInput.value = result.devCode;
    const devHint = result.devCode ? " Testing code filled. Tap Verify." : "";
    if (verificationStatus) {
      verificationStatus.textContent = `${result.destinationMasked || "Contact"} verification ${result.status}. ${result.message || ""}${devHint}`;
      verificationStatus.classList.remove("verified");
    }
  } catch (error) {
    const codeInput = document.querySelector("#login-code");
    if (publicHealth.otp_fallback_enabled) {
      const localCode = "111111";
      localStorage.setItem("legalConnectLocalOtp", localCode);
      if (codeInput) codeInput.value = localCode;
      if (verificationStatus) verificationStatus.textContent = "Testing OTP enabled for this build. Code filled as 111111.";
      return;
    }
    localStorage.removeItem("legalConnectLocalOtp");
    if (codeInput) codeInput.value = "";
    if (verificationStatus) verificationStatus.textContent = error.message || "OTP delivery is not configured for production. Use email OTP after Resend is ready.";
  }
});

verifyLoginCode?.addEventListener("click", async () => {
  const code = document.querySelector("#login-code")?.value || "";
  const payload = { ...loginContactPayload(), code };
  if (!code) {
    if (verificationStatus) verificationStatus.textContent = "Enter the 6-digit code first.";
    return;
  }
  try {
    const result = await apiFetch("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (verificationStatus) {
      verificationStatus.textContent = `${result.destinationMasked || "Contact"} OTP verified successfully. Continue secure login.`;
      verificationStatus.classList.add("verified");
    }
  } catch (error) {
    const localCode = localStorage.getItem("legalConnectLocalOtp");
    if (publicHealth.otp_fallback_enabled && localCode && code === localCode) {
      if (verificationStatus) {
        verificationStatus.textContent = "Testing OTP verified successfully. Continue secure login.";
        verificationStatus.classList.add("verified");
      }
      return;
    }
    if (verificationStatus) verificationStatus.textContent = "Invalid or expired code.";
  }
});

roleLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: document.querySelector("#login-name")?.value || "Legal Connect User",
    email: document.querySelector("#login-email")?.value || "",
    phone: document.querySelector("#login-phone")?.value || "",
    role: document.querySelector("#login-role")?.value || "client",
    privacyConsent: Boolean(document.querySelector("#privacy-consent")?.checked),
  };
  if (!payload.privacyConsent) {
    if (authStatus) authStatus.textContent = "Consent is required for role-based login, receipts, notifications, and support records.";
    return;
  }
  try {
    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    currentSession = result;
    localStorage.setItem("legalConnectSession", JSON.stringify(result));
    const destination = roleRoutes[result.user.role] || "client";
    const verifyNote = result.verification?.emailVerified || result.verification?.phoneVerified ? " Contact verified." : " Contact verification pending.";
    if (authStatus) authStatus.textContent = `${result.user.name} logged in as ${result.user.role}. Routing to ${titles[destination]}.${verifyNote}`;
    setDemoStatus(`Logged in as ${result.user.role}.`);
    applySessionToUi(result);
    activateView(destination);
  } catch (error) {
    if (authStatus) authStatus.textContent = "Login saved locally for testing. Start the backend for permanent account records.";
    currentSession = { token: "", user: payload };
    localStorage.setItem("legalConnectSession", JSON.stringify(currentSession));
    applySessionToUi(currentSession);
    activateView(roleRoutes[payload.role] || "client");
  }
});

applySessionToUi(getSession());

const dailyGreetings = [
  {
    quote: '"Yato dharmastato jayah." Where duty stands, justice follows.',
    prompt: "Tell me what happened. I will help you choose the safest first step."
  },
  {
    quote: '"Justice is the constant will to render every person their due."',
    prompt: "Need a lawyer, a draft, a case update, or just plain-language legal clarity?"
  },
  {
    quote: "Duty first. Panic later. One calm step can protect the whole matter.",
    prompt: "I can route you to People Shield, Advocate Command, eCourts tools, or legal updates."
  }
];

const greeting = document.querySelector("#daily-greeting");
const quote = document.querySelector("#daily-quote");
const aiResponse = document.querySelector("#ai-response");

if (greeting && quote && aiResponse) {
  const hour = new Date().getHours();
  const greetingText = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = dailyGreetings[new Date().getDate() % dailyGreetings.length];
  greeting.textContent = `${greetingText}. What do you need today?`;
  quote.textContent = today.quote;
  aiResponse.textContent = today.prompt;
}

document.querySelectorAll("[data-ai-reply]").forEach((button) => {
  button.addEventListener("click", () => {
    if (aiResponse) aiResponse.textContent = button.dataset.aiReply;
    setDemoStatus("AI Desk response updated.");
  });
});

const floatingLawbot = document.querySelector("#floating-lawbot");
const lawbotToggle = document.querySelector("#lawbot-toggle");
const lawbotGreeting = document.querySelector("#lawbot-greeting");
const lawbotClose = document.querySelector("#lawbot-close");
const lawbotThread = document.querySelector("#lawbot-thread");
const lawbotForm = document.querySelector("#lawbot-form");
const lawbotInput = document.querySelector("#lawbot-input");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function citationMarkup(citations = []) {
  if (!citations.length) return "";
  return `
    <div class="lawbot-citations">
      <span>Verified citations</span>
      ${citations.map((source) => `
        <article>
          <strong>${escapeHtml(source.title || "Approved source")}</strong>
          <small>${escapeHtml(source.citation || source.sourceName || "Citation pending")} ${source.chunkRef ? `- ${escapeHtml(source.chunkRef)}` : ""}</small>
          ${source.sourceUrl ? `<a href="${escapeHtml(source.sourceUrl)}" target="_blank" rel="noreferrer">Open source metadata</a>` : ""}
        </article>
      `).join("")}
    </div>
  `;
}

function feedbackMarkup(queryId) {
  if (!queryId) return "";
  return `
    <div class="lawbot-feedback">
      <button data-lawbot-feedback="helpful" data-query-id="${escapeHtml(queryId)}">Helpful</button>
      <button data-lawbot-feedback="incorrect" data-query-id="${escapeHtml(queryId)}">Incorrect</button>
      <button data-lawbot-feedback="needs advocate review" data-query-id="${escapeHtml(queryId)}">Needs advocate review</button>
    </div>
  `;
}

function appendLawbotMessage(role, message, citations = [], queryId = "") {
  if (!lawbotThread) return;
  const bubble = document.createElement("p");
  bubble.className = role === "user" ? "user" : "";
  bubble.innerHTML = `<strong>${role === "user" ? "You" : "LawBot"}:</strong> ${escapeHtml(message)}${citationMarkup(citations)}${feedbackMarkup(queryId)}`;
  lawbotThread.appendChild(bubble);
  lawbotThread.scrollTop = lawbotThread.scrollHeight;
}

async function askLawbot(question) {
  appendLawbotMessage("user", question);
  appendLawbotMessage("bot", "Legal AI is coming soon for live testing. The Source Library is ready in RNA/Admin: upload official text or PDFs, approve, then index before the LawBot is enabled.");
  setDemoStatus("Legal AI marked Coming Soon. Source Library remains available in RNA/Admin.");
}

function toggleLawbot(open) {
  floatingLawbot?.classList.toggle("open", open ?? !floatingLawbot.classList.contains("open"));
  setDemoStatus("LawBot opened. Choose your first legal move.");
}

lawbotToggle?.addEventListener("click", () => toggleLawbot());
lawbotGreeting?.addEventListener("click", () => toggleLawbot(true));

lawbotClose?.addEventListener("click", () => {
  floatingLawbot?.classList.remove("open");
});

document.querySelectorAll("[data-lawbot-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    askLawbot(button.dataset.lawbotPrompt || button.textContent || "Legal source query");
  });
});

lawbotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = lawbotInput?.value.trim();
  if (!question) return;
  lawbotInput.value = "";
  floatingLawbot?.classList.add("open");
  await askLawbot(question);
});

document.querySelectorAll("[data-demo-action]").forEach((button) => {
  button.addEventListener("click", () => setDemoStatus(button.dataset.demoAction));
});

const missionSaveStatus = document.querySelector("#mission-save-status");
const savedMission = localStorage.getItem("legalConnectMission");

if (missionSaveStatus && savedMission) {
  missionSaveStatus.textContent = `Saved: ${savedMission}`;
}

document.querySelectorAll("[data-save-mission]").forEach((button) => {
  button.addEventListener("click", async () => {
    const court = document.querySelector("#mission-court")?.value || "Saket District Court";
    const type = document.querySelector("#mission-type")?.value || "Inspection";
    const instruction = document.querySelector("#mission-instruction")?.value || "Inspect file and upload proof.";
    const amountInput = Number(document.querySelector("#mission-fee")?.value || 300);
    const amount = Math.max(300, amountInput);
    const urgency = document.querySelector("#mission-urgency")?.value || "Normal - RNA sets 4 hour timer";
    const note = document.querySelector("#mission-note")?.value || "No extra note.";
    const mission = `${court} - ${type} - Rs. ${amount} work completion hold - ${urgency}`;
    localStorage.setItem("legalConnectMission", mission);
    if (missionSaveStatus) missionSaveStatus.textContent = `Saved: ${mission}`;
    if (missionBoardStatus) missionBoardStatus.textContent = `Mission board status: ${type} at ${court}. Amount Rs. ${amount}. Poster sees status and timestamp; completing counsel sees court/task/proof only. RNA timer: ${urgency}.`;
    try {
      const savedTask = await apiFetch("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: `${type} - ${court}`,
          court,
          taskType: type,
          amount,
          escrowStatus: "Work completion hold pending",
          status: "Posted - awaiting RNA acceptance",
          proofRequired: document.querySelector("#mission-proof-required")?.value || "Timestamped proof and short report",
          urgency,
          noteForCounsel: note,
        }),
      });
      if (missionSaveStatus) missionSaveStatus.textContent = `Saved to Mission Board: ${savedTask.title || type}. Receipt: ${savedTask.transparencyReceipt?.receiptNo || savedTask.transparencyReceipt?.receipt_no || "created"}.`;
      saveLocalReceipt({
        id: savedTask.transparencyReceipt?.receiptNo || savedTask.transparencyReceipt?.receipt_no || savedTask.id,
        title: `Court mission: ${type}`,
        amount,
        status: "Mission posted",
        message: `${court}. RNA timer: ${urgency}.`,
      });
      setDemoStatus("Mission saved. RNA can assign counsel and set the work timer.");
    } catch {
      saveLocalReceipt({
        title: `Court mission: ${type}`,
        amount,
        status: "Local mission saved",
        message: `${court}. Backend login required for permanent receipt.`,
      });
      setDemoStatus("Mission saved locally. Start/login backend to persist it for RNA/Admin.");
    }
    activateView("appearance");
  });
});

const taskActionStatus = document.querySelector("#task-action-status");
const missionBoardStatus = document.querySelector("#mission-board-status");
const escrowStatus = document.querySelector("#escrow-status");
const missionProofStep = document.querySelector("#mission-proof-step");
const missionApprovalStep = document.querySelector("#mission-approval-step");
const missionReleaseStep = document.querySelector("#mission-release-step");
const escrowProofStep = document.querySelector("#escrow-proof-step");
const escrowApprovalStep = document.querySelector("#escrow-approval-step");
const escrowReleaseStep = document.querySelector("#escrow-release-step");
const courtSyncStatus = document.querySelector("#court-sync-status");
const courtSyncTimeline = document.querySelector("#court-sync-timeline");
const courtSyncReleaseEntry = document.querySelector("#court-sync-release-entry");
const clashStatus = document.querySelector("#clash-status");
let activeReminderSetting = "24h before";
let caseUpdateStream = null;

function addCourtSyncTimelineEntry(time, title, message) {
  if (!courtSyncTimeline) return;
  courtSyncTimeline.insertAdjacentHTML("afterbegin", `<div><time>${time}</time><strong>${title}</strong><span>${message}</span></div>`);
}

function handleCaseUpdate(update) {
  const message = update.message || "Court Sync update received.";
  if (courtSyncStatus) courtSyncStatus.textContent = message;
  addCourtSyncTimelineEntry("Live", update.caseId || "Court Sync", message);
  setDemoStatus(message);
}

document.querySelectorAll("[data-reminder-setting]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-reminder-setting]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeReminderSetting = button.dataset.reminderSetting;
    if (courtSyncStatus) courtSyncStatus.textContent = `Reminder set: ${activeReminderSetting}. Court Sync will notify through the Legal Connect status strip.`;
    setDemoStatus(`Court Sync reminder set: ${activeReminderSetting}.`);
  });
});

document.querySelectorAll("[data-track-case]").forEach((button) => {
  button.addEventListener("click", async () => {
    const court = document.querySelector("#court-sync-court")?.value || "Delhi High Court";
    const stateCode = document.querySelector("#court-sync-state")?.value || "DL";
    const caseNo = document.querySelector("#court-sync-case")?.value || "2023/CRL-1234";
    const message = `Court Sync tracking added: ${court} | ${caseNo} | reminder ${activeReminderSetting}.`;

    localStorage.setItem("legalConnectCourtSyncCase", JSON.stringify({ court, stateCode, caseNo, reminder: activeReminderSetting }));
    if (courtSyncStatus) courtSyncStatus.textContent = `${message} API route ready: POST /api/cases.`;
    addCourtSyncTimelineEntry("Sync", court, `${caseNo} tracked. Next-date check queued every 6 hours.`);
    setDemoStatus(message);
    try {
      const saved = await apiFetch("/api/cases", {
        method: "POST",
        body: JSON.stringify({ court, stateCode, caseNo, reminder: activeReminderSetting, title: `${court} | ${caseNo}` }),
      });
      localStorage.setItem("legalConnectLastCaseId", saved.id);
      if (courtSyncStatus) courtSyncStatus.textContent = `${message} Saved to backend case diary.`;
    } catch {
      if (courtSyncStatus) courtSyncStatus.textContent = `${message} Local preview saved; backend unavailable.`;
    }
  });
});

document.querySelectorAll("[data-sync-stream]").forEach((button) => {
  button.addEventListener("click", () => {
    if (location.protocol === "file:") {
      handleCaseUpdate({
        caseId: "case-demo-1",
        message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5. Local preview stream simulated.",
      });
      return;
    }

    if (caseUpdateStream) {
      if (courtSyncStatus) courtSyncStatus.textContent = "Court Sync update stream is already watching.";
      return;
    }

    caseUpdateStream = new EventSource("/api/case-updates");
    caseUpdateStream.addEventListener("caseUpdate", (event) => {
      handleCaseUpdate(JSON.parse(event.data));
      caseUpdateStream.close();
      caseUpdateStream = null;
    });
    caseUpdateStream.onerror = () => {
      if (courtSyncStatus) courtSyncStatus.textContent = "Court Sync stream is unavailable in this preview. Testing fallback loaded.";
      handleCaseUpdate({
        caseId: "case-demo-1",
        message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5. Testing fallback.",
      });
      caseUpdateStream?.close();
      caseUpdateStream = null;
    };
    if (courtSyncStatus) courtSyncStatus.textContent = "Watching Court Sync update stream...";
  });
});

document.querySelectorAll("[data-enable-push]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) {
      if (courtSyncStatus) courtSyncStatus.textContent = "Push test is not supported in this browser preview.";
      return;
    }
    if (location.protocol === "file:") {
      if (courtSyncStatus) courtSyncStatus.textContent = "Push test needs the local server URL, not a file preview. Open http://127.0.0.1:3000.";
      return;
    }

    const registration = await navigator.serviceWorker.register("./service-worker.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (courtSyncStatus) courtSyncStatus.textContent = "Notification permission was not granted. Court Sync can still show in-app alerts.";
      return;
    }

    registration.showNotification("Legal Connect Court Sync", {
      body: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5.",
      tag: "legal-connect-court-sync",
    });
    if (courtSyncStatus) courtSyncStatus.textContent = "Push test enabled. Real delivery needs VAPID keys and notify-worker deployment.";
  });
});

document.querySelectorAll("[data-case-link]").forEach((button) => {
  button.addEventListener("click", () => {
    const caseId = button.dataset.caseLink || "case-demo-1";
    const route = `#case-${caseId}`;
    history.pushState(null, "", route);
    addCourtSyncTimelineEntry("Open", "Case Snapshot", `${caseId} opened as a Legal Connect deep link.`);
    if (courtSyncStatus) courtSyncStatus.textContent = `Case snapshot opened: ${route}. Backend route GET /api/cases/${caseId} is ready.`;
  });
});

document.querySelectorAll("[data-diary-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-diary-tab]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const tab = button.dataset.diaryTab;
    if (courtSyncStatus) courtSyncStatus.textContent = `${tab} matters loaded. Diary data is ready for DB-backed testing.`;
    setDemoStatus(`Case Diary switched to ${tab}.`);
  });
});

document.querySelectorAll("[data-calendar-note]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-calendar-note]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const note = button.dataset.calendarNote;
    const day = button.dataset.calendarDay;
    if (clashStatus) clashStatus.textContent = `${day} June: ${note}`;
    if (courtSyncStatus) courtSyncStatus.textContent = `Calendar intelligence: ${note}`;
    setDemoStatus(`Calendar checked for ${day} June.`);
    apiFetch("/api/case-updates", {
      method: "POST",
      body: JSON.stringify({
        caseId: localStorage.getItem("legalConnectLastCaseId"),
        updateType: "calendar_decision",
        decision: `${day} June: ${note}`,
        day,
      }),
    }).catch(() => undefined);
  });
});

document.querySelectorAll("[data-check-clashes]").forEach((button) => {
  button.addEventListener("click", () => {
    const message = "Clash check complete: avoid 25 June, prefer 5 June for Saket matters, keep 10 June for Delhi HC only.";
    if (clashStatus) clashStatus.textContent = message;
    if (courtSyncStatus) courtSyncStatus.textContent = message;
    addCourtSyncTimelineEntry("Calendar", "Date strategy updated", message);
    setDemoStatus(message);
    apiFetch("/api/case-updates", {
      method: "POST",
      body: JSON.stringify({
        caseId: localStorage.getItem("legalConnectLastCaseId"),
        updateType: "clash_warning",
        message,
      }),
    }).catch(() => undefined);
  });
});

document.querySelectorAll("[data-task-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const message = button.dataset.taskAction;
    if (taskActionStatus) taskActionStatus.textContent = `Current status: ${message}`;
    if (missionBoardStatus) missionBoardStatus.textContent = `Mission board status: ${message}`;
    if (escrowStatus) escrowStatus.textContent = `Work Completion Hold: ${message}`;

    if (message.includes("Proof uploaded")) {
      missionProofStep?.classList.add("done");
      escrowProofStep?.classList.add("done");
    }
    if (message.includes("approved")) {
      missionApprovalStep?.classList.add("done");
      escrowApprovalStep?.classList.add("done");
    }
    if (message.includes("released")) {
      missionReleaseStep?.classList.add("done");
      escrowReleaseStep?.classList.add("done");
      courtSyncReleaseEntry?.classList.add("done");
      if (courtSyncReleaseEntry) {
        courtSyncReleaseEntry.querySelector("span").textContent = "Mission proof approved. Diary entry marked completed and removed from Upcoming.";
      }
      if (courtSyncStatus) courtSyncStatus.textContent = "Work completion release synced with Case Diary. Associated mission entry is now completed.";
    }

    setDemoStatus(message);
  });
});

const clientActionStatus = document.querySelector("#client-action-status");
document.querySelectorAll("[data-client-action]").forEach((button) => {
  button.addEventListener("click", () => {
    if (clientActionStatus) clientActionStatus.textContent = button.dataset.clientAction;
    setDemoStatus(button.dataset.clientAction);
  });
});

const clientAiAnswer = document.querySelector("#client-ai-answer");
document.querySelectorAll("[data-client-ai]").forEach((button) => {
  button.addEventListener("click", () => {
    if (clientAiAnswer) clientAiAnswer.innerHTML = `<strong>AI Desk:</strong> ${button.dataset.clientAi}`;
    setDemoStatus("AI Legal Triage updated. Lawyer review still required.");
  });
});

const bookingDock = document.querySelector("#booking-dock");
const bookingStatus = document.querySelector("#booking-status");
const selectedPlan = document.querySelector("#selected-plan");
const selectedPrice = document.querySelector("#selected-price");
const bookingConfirmation = document.querySelector("#booking-confirmation");
const clientDeskStatus = document.querySelector("#client-desk-status");
const deskBookingTitle = document.querySelector("#desk-booking-title");
const deskBookingDetail = document.querySelector("#desk-booking-detail");
const deskNextStep = document.querySelector("#desk-next-step");
const deskNextDetail = document.querySelector("#desk-next-detail");
let activeBooking = null;

function renderClientDesk(receipt) {
  if (!receipt) return;
  if (clientDeskStatus) clientDeskStatus.textContent = receipt.status?.includes("Paid") ? "Booked" : "Selected";
  if (deskBookingTitle) deskBookingTitle.textContent = `${receipt.plan} - Rs. ${receipt.amount || receipt.price}`;
  if (deskBookingDetail) deskBookingDetail.textContent = `Receipt ${receipt.id || "pending"} is saved. Payment mode: ${receipt.paymentMode || "selection pending"}.`;
  if (deskNextStep) deskNextStep.textContent = receipt.plan?.includes("Audio")
    ? "Open Audio SOS"
    : receipt.plan?.includes("Video")
      ? "Open Video Room"
      : receipt.plan?.includes("Chat")
        ? "Open Chat Thread"
        : receipt.plan?.includes("Doorstep")
          ? "Confirm Doorstep Slot"
          : "Open Attorney Shield";
  if (deskNextDetail) deskNextDetail.textContent = receipt.route || "Choose a booking option and confirm payment to unlock the next room.";
  updateServiceRoom(receipt);
}

function serviceStepsFor(receipt = {}) {
  const status = String(receipt.status || "").toLowerCase();
  const paid = /paid|verified|hold active|created/.test(status);
  const counsel = /chat|audio|video|doorstep|shield|draft|sos/i.test(receipt.plan || receipt.route || "");
  return [
    ["1. Request created", true],
    ["2. Payment verification", paid],
    ["3. Counsel / desk selection", counsel],
    ["4. Work Completion Hold", /hold|paid|verified/.test(status)],
    ["5. Receipt + next action", Boolean(receipt.id)],
  ];
}

function updateServiceRoom(receipt = {}) {
  if (!serviceRoomTitle) return;
  const plan = receipt.plan || receipt.serviceType || "Legal Connect service";
  const amount = receipt.amount || receipt.price || 0;
  const status = receipt.status || receipt.paymentStatus || "Selected";
  serviceRoomTitle.textContent = `${plan} room`;
  if (serviceRoomStatus) serviceRoomStatus.textContent = `Status: ${status}${amount ? ` / Rs. ${amount}` : ""}`;
  if (serviceRoomRoute) serviceRoomRoute.textContent = receipt.route || receipt.nextDestination || "RNA desk will assign the next step after confirmation.";
  if (serviceRoomDetail) {
    const fallbackNote = receipt.paymentMode === "local-fallback" || /local/i.test(receipt.status || "")
      ? " Saved locally for testing. Server sync may be required."
      : "";
    serviceRoomDetail.textContent = `Receipt ${receipt.id || receipt.receiptNo || "pending"} is linked to your login. Client details stay private; RNA/Admin can review status and receipts.${fallbackNote}`;
  }
  if (serviceRoomTimeline) {
    serviceRoomTimeline.innerHTML = serviceStepsFor(receipt)
      .map(([label, done], index) => `<span class="${done ? "done" : index === 0 ? "active" : ""}">${escapeHtml(label)}</span>`)
      .join("");
  }
  setFlowStatus(`${plan} status`, `${status}. ${receipt.route || receipt.nextDestination || "Next step pending."}`);
}

function selectBookingOption(button) {
  if (!button) return;
  activeBooking = {
    plan: button.dataset.bookOption,
    price: button.dataset.bookPrice,
    route: button.dataset.bookRoute
  };
  document.querySelectorAll("[data-book-option]").forEach((option) => option.classList.toggle("selected", option === button));
  if (bookingStatus) bookingStatus.textContent = `${activeBooking.plan} selected. Now press Pay & Confirm.`;
  if (selectedPlan) selectedPlan.textContent = activeBooking.plan;
  if (selectedPrice) selectedPrice.textContent = `Rs. ${activeBooking.price}`;
  renderClientDesk({ ...activeBooking, amount: activeBooking.price, status: "Selected" });
  setDemoStatus(`${activeBooking.plan} selected for Rs. ${activeBooking.price}.`);
}

document.querySelectorAll("[data-open-booking]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!document.querySelector("#client")?.classList.contains("active")) {
      activateView("client");
    }
    if (clientActionStatus) clientActionStatus.textContent = button.dataset.clientAction || "Booking desk opened. Choose Attorney Shield, Video, Audio, Chat, or Doorstep.";
    setDemoStatus("Booking desk opened. Select a consult mode and confirm payment.");
    window.setTimeout(() => bookingDock?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    if (button.dataset.preselectBooking) {
      const preselect = [...document.querySelectorAll("[data-book-option]")].find((option) => option.dataset.bookOption === button.dataset.preselectBooking);
      selectBookingOption(preselect);
    }
  });
});

document.querySelectorAll("[data-book-option]").forEach((button) => {
  button.addEventListener("click", () => {
    selectBookingOption(button);
  });
});

document.querySelectorAll("[data-pay-booking]").forEach((button) => {
  button.addEventListener("click", async () => {
    if (!activeBooking) {
      if (bookingStatus) bookingStatus.textContent = "Please select Attorney Shield, Video, Audio, Chat, or Doorstep first.";
      setDemoStatus("Select a booking mode before payment.");
      return;
    }

    const bookingId = `LC-${Date.now().toString().slice(-6)}`;
    const receipt = {
      id: bookingId,
      plan: activeBooking.plan,
      amount: activeBooking.price,
      route: activeBooking.route,
      status: "Payment pending verification"
    };

    try {
      if (bookingStatus) bookingStatus.textContent = "Creating booking and secure payment order...";
      const savedBooking = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          serviceType: activeBooking.plan,
          amount: Number(activeBooking.price),
          paymentStatus: "pending",
          receiptNo: bookingId,
          nextDestination: activeBooking.route,
          workHoldStatus: "pending",
        }),
      });
      const order = await apiFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: Number(activeBooking.price), serviceType: activeBooking.plan, bookingId: savedBooking.id, receiptNo: bookingId }),
      });
      receipt.backendId = savedBooking.id;
      receipt.paymentMode = order.mode;
      receipt.razorpayOrderId = order.order_id || order.order?.id;
      const razorpayKey = order.key_id || order.keyId;
      const razorpayOrderId = order.order_id || order.order?.id;
      const razorpayAmount = order.amount || order.order?.amount;
      const razorpayCurrency = order.currency || order.order?.currency || "INR";
      if (order.warning && bookingStatus) bookingStatus.textContent = order.warning;
      if (order.provider === "razorpay" && razorpayKey && razorpayOrderId) {
        if (bookingStatus) bookingStatus.textContent = "Opening Razorpay Checkout. Payment will show paid only after backend verification.";
        const Razorpay = await loadRazorpayCheckout();
        const session = getSession()?.user || {};
        const checkout = new Razorpay({
          key: razorpayKey,
          amount: razorpayAmount,
          currency: razorpayCurrency,
          name: "Legal Connect",
          description: activeBooking.plan,
          order_id: razorpayOrderId,
          prefill: {
            name: session.name || "",
            email: session.email || "",
            contact: session.phone || "",
          },
          theme: {
            color: "#d4af37",
          },
          handler: async (response) => {
            try {
              const verification = await apiFetch("/api/payments/verify", {
                method: "POST",
                body: JSON.stringify({ ...response, bookingId: savedBooking.id }),
              });
              receipt.status = verification.payment_status === "paid" ? "Paid - Work Completion Hold active" : "Payment pending";
              receipt.workHoldStatus = verification.work_hold_status || "pending";
              receipt.razorpayPaymentId = response.razorpay_payment_id;
              localStorage.setItem("legalConnectClientBooking", JSON.stringify(receipt));
              saveLocalReceipt({ ...receipt, title: "Booking verified", message: receipt.route });
              renderClientDesk(receipt);
              if (bookingConfirmation) bookingConfirmation.innerHTML = `<span>Booking Verified</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p><p><b>Status:</b> ${receipt.status}</p>`;
              if (clientActionStatus) clientActionStatus.textContent = `${receipt.plan} payment verified. Work Completion Hold is active.`;
              localStorage.setItem("legalConnectPaymentVerified", "true");
              setDemoStatus("Payment verified by backend.");
              updateServiceRoom(receipt);
              refreshReceipts();
              activateView("service-room");
            } catch (error) {
              if (bookingStatus) bookingStatus.textContent = error.message || "Payment verification failed. Please contact support.";
              setDemoStatus("Payment verification failed. Work Completion Hold remains pending.");
            }
          },
          modal: {
            ondismiss: () => {
              if (bookingStatus) bookingStatus.textContent = "Checkout closed. Booking remains pending until payment is verified.";
            },
          },
        });
        checkout.open();
        return;
      }
    } catch (error) {
      receipt.paymentMode = "local-fallback";
      if (bookingStatus) bookingStatus.textContent = error.message || "Razorpay checkout could not load. Please try again.";
      setDemoStatus(error.message || "Payment order could not be created.");
    }

    receipt.status = receipt.paymentMode === "demo" ? "Payment order created - verification pending" : receipt.status;
    localStorage.setItem("legalConnectClientBooking", JSON.stringify(receipt));
    saveLocalReceipt({ ...receipt, title: "Booking created", message: `${receipt.plan} created. ${receipt.route}` });
    renderClientDesk(receipt);
    if (bookingConfirmation) {
      bookingConfirmation.innerHTML = `<span>Booking Created</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p><p><b>Status:</b> ${receipt.status}. Real paid status requires backend verification.</p>`;
    }
    if (clientActionStatus) clientActionStatus.textContent = `${receipt.plan} booking created. Payment is not marked paid until verified.`;
    setDemoStatus(`${receipt.plan} booking created. Verification pending.`);
    updateServiceRoom(receipt);
    refreshReceipts();
    activateView("service-room");
  });
});

const savedClientBooking = localStorage.getItem("legalConnectClientBooking");
if (bookingConfirmation && savedClientBooking) {
  const receipt = JSON.parse(savedClientBooking);
  renderClientDesk(receipt);
  bookingConfirmation.innerHTML = `<span>Last Booking</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p><p><b>Status:</b> This booking is also visible at the top in My Legal Desk.</p>`;
}

const floatingSos = document.querySelector("#floating-sos");
const sosToggle = document.querySelector("#sos-toggle");
const sosClose = document.querySelector("#sos-close");
const sosStatus = document.querySelector("#sos-status");

function openSosPanel() {
  floatingSos?.classList.add("open");
  setDemoStatus("Legal SOS opened. Pick a situation or book emergency counsel.");
}

sosToggle?.addEventListener("click", openSosPanel);
sosClose?.addEventListener("click", () => floatingSos?.classList.remove("open"));

document.querySelectorAll("[data-open-sos]").forEach((button) => {
  button.addEventListener("click", openSosPanel);
});

document.querySelectorAll("[data-sos-case]").forEach((button) => {
  button.addEventListener("click", () => {
    const message = `${button.dataset.sosCase} selected. Save notice/order/photos, then book counsel if urgent.`;
    if (sosStatus) sosStatus.textContent = message;
    if (clientActionStatus) clientActionStatus.textContent = message;
    setDemoStatus(message);
  });
});

document.querySelectorAll("[data-sos-book]").forEach((button) => {
  button.addEventListener("click", async () => {
    const serviceType = button.dataset.sosBook || "Legal SOS Video";
    const amount = Number(button.dataset.sosPrice || 1500);
    const sosReceipt = {
      id: `SOS-${Date.now().toString().slice(-6)}`,
      plan: serviceType,
      amount,
      status: "Counsel selection pending",
      route: "RNA SOS desk: emergency counsel selection, video route, timer and receipt tracking.",
      paymentMode: "SOS route",
    };
    const message = `${serviceType} selected. Status: hold active, counsel selection pending.`;
    if (sosStatus) sosStatus.textContent = message;
    if (clientActionStatus) clientActionStatus.textContent = message;
    try {
      const saved = await apiFetch("/api/sos", {
        method: "POST",
        body: JSON.stringify({ serviceType, urgency: "High", status: "Counsel selection pending", amount }),
      });
      sosReceipt.id = saved.transparencyReceipt?.receiptNo || saved.transparencyReceipt?.receipt_no || saved.id || sosReceipt.id;
      if (sosStatus) sosStatus.textContent = `${serviceType} saved. RNA/Admin can see SOS tracker. Receipt: ${sosReceipt.id}.`;
      setDemoStatus("Legal SOS saved and receipt generated.");
      refreshReceipts();
    } catch {
      setDemoStatus("SOS selected locally. Start/login backend to save it for RNA/Admin.");
    }
    const videoOption = [...document.querySelectorAll("[data-book-option]")].find((option) => option.dataset.bookOption === "SOS Video");
    saveLocalReceipt({ ...sosReceipt, title: "Legal SOS receipt", message: sosReceipt.route });
    selectBookingOption(videoOption || [...document.querySelectorAll("[data-book-option]")][0]);
    updateServiceRoom(sosReceipt);
    activateView("service-room");
  });
});

const draftForm = document.querySelector("#draft-form");
const draftStatus = document.querySelector("#draft-status");

draftForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const draftType = document.querySelector("#draft-type")?.value || "Agreement draft";
  const contact = document.querySelector("#draft-contact")?.value || "";
  const amount = Number(document.querySelector("#draft-fee")?.value || 499);
  const receiptNeeded = document.querySelector("#draft-receipt")?.checked ? "Receipt requested" : "Receipt not requested";
  const stampPaper = document.querySelector("#draft-stamp")?.checked ? "Stamp paper support requested" : "No stamp paper support";
  const details = document.querySelector("#draft-details")?.value || "Details to be filled by client.";
  const route = `${draftType}: ${receiptNeeded}. ${stampPaper}. Contact: ${contact || "pending"}.`;
  if (draftStatus) draftStatus.textContent = "Draft request created. Payment and document review status: pending.";
  try {
    const saved = await apiFetch("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        serviceType: `Documents Without Drama - ${draftType}`,
        amount,
        paymentStatus: "draft payment pending",
        receiptNo: `LCD-${Date.now().toString().slice(-6)}`,
        nextDestination: "Draft desk: upload documents, pay fee, RNA document team reviews.",
        workHoldStatus: "draft in queue",
        route,
        details,
      }),
    });
    if (draftStatus) draftStatus.textContent = `Draft request saved. ${draftType} fee Rs. ${amount}. Receipt: ${saved.transparencyReceipt?.receiptNo || saved.transparencyReceipt?.receipt_no || "created"}.`;
    setDemoStatus("Documents Without Drama request saved.");
    updateServiceRoom({
      id: saved.transparencyReceipt?.receiptNo || saved.transparencyReceipt?.receipt_no || saved.receiptNo || saved.id,
      plan: `Draft: ${draftType}`,
      amount,
      status: "Draft desk queued",
      route: "Draft desk: RNA document team reviews uploaded facts, receipt preference and stamp-paper support.",
      paymentMode: "draft fee",
    });
    saveLocalReceipt({
      id: saved.transparencyReceipt?.receiptNo || saved.transparencyReceipt?.receipt_no || saved.receiptNo || saved.id,
      title: `Draft: ${draftType}`,
      amount,
      status: "Draft desk queued",
      message: "Draft request saved for RNA document review.",
    });
    refreshReceipts();
    activateView("service-room");
  } catch {
    if (draftStatus) draftStatus.textContent = "Draft request saved locally. Backend login required for permanent receipts.";
    updateServiceRoom({
      id: `LCD-${Date.now().toString().slice(-6)}`,
      plan: `Draft: ${draftType}`,
      amount,
      status: "Local draft queue",
      route: "Draft desk preview saved locally. Start backend/login for permanent receipt.",
      paymentMode: "local fallback",
    });
    saveLocalReceipt({
      title: `Draft: ${draftType}`,
      amount,
      status: "Local draft queue",
      message: "Draft request saved locally.",
    });
    setDemoStatus("Draft request saved locally.");
    activateView("service-room");
  }
});

document.querySelectorAll("[data-scroll-booking]").forEach((button) => {
  button.addEventListener("click", () => bookingDock?.scrollIntoView({ behavior: "smooth", block: "center" }));
});

document.querySelectorAll("[data-scroll-client-section]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.querySelector(`.${button.dataset.scrollClientSection}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

const adminMetrics = document.querySelector("#admin-metrics");
const adminFeedList = document.querySelector("#admin-feed-list");
const adminActionStatus = document.querySelector("#admin-action-status");
const legalSourceForm = document.querySelector("#legal-source-form");
const legalSourceList = document.querySelector("#legal-source-list");
const legalSourceStatus = document.querySelector("#legal-source-status");
const auditLogList = document.querySelector("#audit-log-list");
const clientReceiptList = document.querySelector("#client-receipt-list");
const adminReceiptList = document.querySelector("#admin-receipt-list");
const betaReadinessList = document.querySelector("#beta-readiness-list");
const notifyTestForm = document.querySelector("#notify-test-form");
const notifyTestStatus = document.querySelector("#notify-test-status");
const paymentStatusPanel = document.querySelector("#payment-status-panel");

function countRows(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
}

function renderBetaReadiness(health = {}) {
  if (!betaReadinessList) return;
  const checks = [
    [`Web version: ${health.web_version || "unknown"}`, Boolean(health.web_version)],
    [`Build time: ${health.build_time ? new Date(health.build_time).toLocaleString() : "unknown"}`, Boolean(health.build_time)],
    [`Public URL: ${health.public_url || "not configured"}`, Boolean(health.public_url)],
    [`Android wrapper: ${health.android_wrapper_version || "1.0.0"}`, Boolean(health.android_wrapper_version)],
    ["Update refresh ready", true],
    ["DB connected", health.db === "connected"],
    ["LawBot source-locked", health.lawbot === "source-locked"],
    ["PDF ingestion enabled", health.pdf_ingestion === "enabled"],
    ["Audit logs enabled", health.audit_logs === "enabled"],
    ["Resend ready", health.email?.provider === "resend" && health.email?.status === "ready"],
    ["Razorpay ready", health.payments === "razorpay-ready"],
    [`OTP mode: ${health.otp_mode || "unknown"}`, health.otp_mode === "email" || health.otp_fallback_enabled === true],
    [`OTP fallback: ${health.otp_fallback_enabled ? "testing only" : "disabled"}`, health.otp_fallback_enabled !== undefined],
    ["UDYAM badge visible", document.body.textContent.includes("UDYAM-DL-11-0164811")],
    ["Domain configured", String(health.public_url || "").includes("legal-connect")],
    ["Legal pages present", Boolean(document.querySelector("#privacy-policy") && document.querySelector("#terms") && document.querySelector("#refund-policy"))],
    ["Test notification sent", localStorage.getItem("legalConnectNotifyTest") === "sent"],
    ["Test payment verified", localStorage.getItem("legalConnectPaymentVerified") === "true"],
    ["BNSS source indexed", Number(health.legal_chunks_count || 0) > 0],
    ["UI duplication fixed", document.querySelectorAll(".rail").length === 1 && document.querySelectorAll(".legal-footer").length === 1 && document.querySelectorAll("#floating-lawbot").length === 1],
  ];
  betaReadinessList.innerHTML = checks.map(([label, ok]) => `<div><time>${ok ? "Pass" : "Warning"}</time><strong>${escapeHtml(label)}</strong><span>${ok ? "Ready for controlled beta." : "Needs live verification or configured provider."}</span></div>`).join("");
}

function renderPaymentStatus(status = {}) {
  if (!paymentStatusPanel) return;
  const latest = status.latest_payment || {};
  const modeMessage = status.mode === "live"
    ? "Live key detected. Use small controlled pilot only after verification."
    : status.mode === "test"
      ? "Test mode detected. Use Razorpay test card/UPI details."
      : "Razorpay mode unknown or not configured.";
  const rows = [
    ["Configured", status.payments_configured ? "Yes" : "No", status.payments_configured ? "Razorpay key id and secret are present." : "Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."],
    ["Mode", status.mode || "unknown", modeMessage],
    ["Webhook", status.webhook_secret_present ? "Present" : "Missing", status.webhook_secret_present ? "Webhook signature can be verified." : "Add RAZORPAY_WEBHOOK_SECRET before launch."],
    ["Latest Status", status.latest_payment_status || latest.paymentStatus || "None", `Work Completion Hold: ${status.latest_work_hold_status || latest.workHoldStatus || "none"}`],
    ["Latest Order", status.latest_order_id || latest.razorpayOrderId || "Not created", `Payment ID: ${status.latest_payment_id || latest.razorpayPaymentId || "not verified"}`],
    ["Last Error", status.last_payment_error || latest.failureReason || "None", "Failed UPI/card attempts should stay unpaid until verified."],
  ];
  paymentStatusPanel.innerHTML = rows.map(([time, title, detail]) => `<div><time>${escapeHtml(time)}</time><strong>${escapeHtml(String(title))}</strong><span>${escapeHtml(String(detail))}</span></div>`).join("");
}

function receiptHtml(item) {
  const amount = item.amount || item.payload?.amount ? ` / Rs. ${item.amount || item.payload.amount}` : "";
  const receiptNo = item.receiptNo || item.receipt_no || item.id || "receipt";
  const status = item.status || "recorded";
  const created = item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleString() : "Now";
  return `<div><time>${escapeHtml(status)}</time><strong>${escapeHtml(item.title || item.receiptType || "Receipt")} ${amount}</strong><span>${escapeHtml(receiptNo)} - ${escapeHtml(item.message || "Activity recorded.")}<br>${escapeHtml(created)}</span><div class="receipt-actions"><button data-receipt-action="pdf" data-receipt-title="${escapeHtml(item.title || "Legal Connect Receipt")}" data-receipt-body="${escapeHtml(`${receiptNo} - ${item.message || "Activity recorded."} - ${created}`)}">PDF</button><button data-receipt-action="email" data-receipt-body="${escapeHtml(`${receiptNo} - ${item.message || "Activity recorded."}`)}">Email</button><button data-receipt-action="whatsapp" data-receipt-body="${escapeHtml(`${receiptNo} - ${item.message || "Activity recorded."}`)}">WhatsApp</button></div></div>`;
}

function localReceipts() {
  try {
    return JSON.parse(localStorage.getItem("legalConnectLocalReceipts") || "[]");
  } catch {
    return [];
  }
}

function saveLocalReceipt(receipt) {
  const next = [
    {
      id: receipt.id || `LCR-${Date.now().toString().slice(-6)}`,
      receiptNo: receipt.id || receipt.receiptNo || `LCR-${Date.now().toString().slice(-6)}`,
      title: receipt.title || receipt.plan || "Legal Connect receipt",
      message: receipt.message || receipt.route || "Activity recorded.",
      status: receipt.status || "recorded",
      amount: receipt.amount || receipt.price || null,
      createdAt: new Date().toISOString(),
    },
    ...localReceipts(),
  ].slice(0, 30);
  localStorage.setItem("legalConnectLocalReceipts", JSON.stringify(next));
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-receipt-action]");
  if (!button) return;
  const body = button.dataset.receiptBody || "Legal Connect receipt";
  const action = button.dataset.receiptAction;
  if (action === "pdf") {
    const receiptWindow = window.open("", "_blank", "width=420,height=640");
    receiptWindow?.document.write(`<title>Legal Connect Receipt</title><body style="font-family:Arial,sans-serif;padding:24px;line-height:1.6"><h2>${escapeHtml(button.dataset.receiptTitle || "Legal Connect Receipt")}</h2><p>${escapeHtml(body)}</p><p>Legal Connect - UDYAM-DL-11-0164811</p><script>window.print();</script></body>`);
    setDemoStatus("Receipt opened as printable PDF.");
  }
  if (action === "email") {
    window.location.href = `mailto:?subject=Legal Connect Receipt&body=${encodeURIComponent(body)}`;
    setDemoStatus("Email receipt draft opened.");
  }
  if (action === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Legal Connect receipt: ${body}`)}`, "_blank", "noreferrer");
    setDemoStatus("WhatsApp receipt share opened.");
  }
});

async function refreshReceipts() {
  if (!clientReceiptList && !adminReceiptList) return;
  try {
    const receipts = await apiFetch("/api/receipts?limit=50");
    const allReceipts = [...localReceipts(), ...receipts];
    const html = allReceipts.length
      ? allReceipts.map(receiptHtml).join("")
      : `<div><time>Ready</time><strong>No receipts yet</strong><span>Use booking, SOS, LawBot or admin actions to generate receipts.</span></div>`;
    if (clientReceiptList) clientReceiptList.innerHTML = html;
    if (adminReceiptList) adminReceiptList.innerHTML = html;
  } catch {
    const receipts = localReceipts();
    const locked = receipts.length
      ? receipts.map(receiptHtml).join("")
      : `<div><time>Offline</time><strong>Receipts unavailable</strong><span>Login again or check backend connection.</span></div>`;
    if (clientReceiptList) clientReceiptList.innerHTML = locked;
    if (adminReceiptList) adminReceiptList.innerHTML = locked;
  }
}

async function refreshAdminDashboard() {
  if (!adminMetrics || !adminFeedList) return;
  try {
    const [summary, health, paymentStatus] = await Promise.all([
      apiFetch("/api/admin/summary"),
      apiFetch("/api/health"),
      apiFetch("/api/admin/payments/status"),
    ]);
    const totalUsers = countRows(summary.users);
    const totalBookings = countRows(summary.bookings);
    const totalTasks = countRows(summary.tasks);
    const sosCount = (summary.sosRequests || []).length;
    const lawbotCount = (summary.recentLawbotQuestions || []).length;
    adminMetrics.innerHTML = `
      <article><span>Total Users</span><strong>${totalUsers}</strong><small>${(summary.users || []).map((item) => `${item.role}: ${item.count}`).join(" / ") || "No users yet"}</small></article>
      <article><span>Bookings</span><strong>${totalBookings}</strong><small>${(summary.bookings || []).map((item) => `${item.payment_status || "pending"}: ${item.count}`).join(" / ") || "No bookings yet"}</small></article>
      <article><span>Proxy Missions</span><strong>${totalTasks}</strong><small>${(summary.tasks || []).map((item) => `${item.status}: ${item.count}`).join(" / ") || "No missions yet"}</small></article>
      <article><span>SOS + LawBot</span><strong>${sosCount + lawbotCount}</strong><small>${sosCount} SOS / ${lawbotCount} questions</small></article>
    `;
    const cases = summary.recentCases || [];
    const payments = summary.recentBookings || [];
    const feedItems = [
      ...payments.map((item) => `<div><time>${item.payment_status || item.paymentStatus || "pending"}</time><strong>${escapeHtml(item.service_type || item.serviceType || "Booking")} - Rs. ${item.amount || 0}</strong><span>Work Hold: ${escapeHtml(item.work_hold_status || item.workHoldStatus || "pending")} / Order: ${escapeHtml(item.razorpay_order_id || item.razorpayOrderId || "not created")} / Payment: ${escapeHtml(item.razorpay_payment_id || item.razorpayPaymentId || "not verified")}${item.failure_reason || item.failureReason ? ` / ${escapeHtml(item.failure_reason || item.failureReason)}` : ""}</span></div>`),
      ...cases.map((item) => `<div><time>${item.next_date || item.nextDate || "Date pending"}</time><strong>${escapeHtml(item.title || "Case")}</strong><span>${escapeHtml(item.court || "Court pending")} - ${escapeHtml(item.status || "Active")}</span></div>`),
    ];
    adminFeedList.innerHTML = feedItems.length
      ? feedItems.join("")
      : `<div><time>Live</time><strong>No recent cases</strong><span>Create a case from Case Diary to populate this feed.</span></div>`;
    setDemoStatus("RNA Control Room refreshed.");
    renderBetaReadiness(health);
    renderPaymentStatus(paymentStatus);
    refreshLegalSources();
    refreshAuditLogs();
    refreshReceipts();
  } catch {
    if (adminActionStatus) adminActionStatus.textContent = "Admin API unavailable. Login as RNA/Admin after backend deploy.";
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function refreshLegalSources() {
  if (!legalSourceList) return;
  try {
    const sources = await apiFetch("/api/admin/legal-sources");
    legalSourceList.innerHTML = sources.length
      ? sources.map((source) => `
        <article>
          <div>
            <span>${escapeHtml(source.sourceType || "Legal source")} - ${escapeHtml(source.status || "pending")}</span>
            <strong>${escapeHtml(source.title || "Untitled source")}</strong>
            <small>${escapeHtml(source.citation || source.sourceName || "Citation pending")}</small>
          </div>
          <div class="source-actions">
            <button data-source-action="approve" data-source-id="${escapeHtml(source.id)}">Approve</button>
            <button data-source-action="reject" data-source-id="${escapeHtml(source.id)}">Reject</button>
            <button data-source-action="chunk" data-source-id="${escapeHtml(source.id)}">Index chunks</button>
            <button data-source-action="delete" data-source-id="${escapeHtml(source.id)}">Delete</button>
          </div>
        </article>
      `).join("")
      : `<article><strong>No sources yet</strong><span>Add a pending source, approve it, then index chunks.</span></article>`;
    if (legalSourceStatus) legalSourceStatus.textContent = `${sources.length} source record(s) loaded. LawBot only uses approved indexed chunks.`;
  } catch {
    if (legalSourceStatus) legalSourceStatus.textContent = "Login as RNA/Admin to manage the Legal AI Source Library.";
  }
}

legalSourceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const pdfFile = document.querySelector("#source-pdf")?.files?.[0];
  const payload = {
    sourceType: document.querySelector("#source-type")?.value || "Bare Acts",
    sourceName: document.querySelector("#source-name")?.value || "Legal Connect Source Library",
    title: document.querySelector("#source-title")?.value || "Untitled legal source",
    citation: document.querySelector("#source-citation")?.value || "",
    sourceUrl: document.querySelector("#source-url")?.value || "",
    textContent: document.querySelector("#source-text")?.value || "",
    status: "pending",
  };
  try {
    if (pdfFile) {
      const pdfBase64 = await readFileAsDataUrl(pdfFile);
      const result = await apiFetch("/api/admin/legal-sources/pdf", {
        method: "POST",
        body: JSON.stringify({ ...payload, fileName: pdfFile.name, pdfBase64 }),
      });
      if (legalSourceStatus) legalSourceStatus.textContent = `PDF ingested: ${result.sourcesCreated} pending source(s), ${result.extractedWords} extracted words. Approve and index before LawBot can use them.`;
    } else {
      const created = await apiFetch("/api/admin/legal-sources", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (legalSourceStatus) legalSourceStatus.textContent = `Pending source added: ${created.title}. Approve and index it before LawBot can use it.`;
    }
    legalSourceForm.reset();
    await refreshLegalSources();
    await refreshAuditLogs();
  } catch {
    if (legalSourceStatus) legalSourceStatus.textContent = "Could not add source/PDF. Login as RNA/Admin. If PDF is scanned, run OCR or paste extracted text.";
  }
});

async function refreshAuditLogs() {
  if (!auditLogList) return;
  try {
    const logs = await apiFetch("/api/admin/audit-logs");
    auditLogList.innerHTML = logs.length
      ? logs.map((item) => `<div><time>${new Date(item.createdAt).toLocaleString()}</time><strong>${escapeHtml(item.action || "audit")}</strong><span>${escapeHtml(item.message || "Action recorded")} ${item.actorRole ? `- ${escapeHtml(item.actorRole)}` : ""}</span></div>`).join("")
      : `<div><time>Live</time><strong>No audit logs yet</strong><span>Approve a source, chunk a source, or run an admin task action.</span></div>`;
  } catch {
    auditLogList.innerHTML = `<div><time>Locked</time><strong>RNA/Admin login required</strong><span>Audit logs are protected.</span></div>`;
  }
}

document.querySelectorAll("[data-refresh-admin]").forEach((button) => {
  button.addEventListener("click", refreshAdminDashboard);
});

document.querySelectorAll("[data-refresh-sources]").forEach((button) => {
  button.addEventListener("click", refreshLegalSources);
});

document.querySelectorAll("[data-refresh-audit]").forEach((button) => {
  button.addEventListener("click", refreshAuditLogs);
});

document.querySelectorAll("[data-refresh-receipts]").forEach((button) => {
  button.addEventListener("click", refreshReceipts);
});

legalSourceList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-source-action]");
  if (!button) return;
  const sourceId = button.dataset.sourceId;
  const action = button.dataset.sourceAction;
  try {
    const method = action === "delete" ? "DELETE" : "POST";
    const path = action === "delete" ? `/api/admin/legal-sources/${sourceId}` : `/api/admin/legal-sources/${sourceId}/${action}`;
    const result = await apiFetch(path, { method, body: method === "POST" ? JSON.stringify({}) : undefined });
    if (legalSourceStatus) {
      legalSourceStatus.textContent = action === "chunk"
        ? `Indexed ${result.chunks || 0} chunk(s). LawBot can now cite approved content.`
        : `Source ${action} saved.`;
    }
    await refreshLegalSources();
    await refreshAuditLogs();
  } catch {
    if (legalSourceStatus) legalSourceStatus.textContent = `Could not ${action} this source. Check RNA/Admin login.`;
  }
});

document.querySelectorAll("[data-admin-action]").forEach((button) => {
  button.addEventListener("click", async () => {
    const action = button.dataset.adminAction;
    try {
      const result = await apiFetch("/api/admin/task-action", {
        method: "POST",
        body: JSON.stringify({ action, status: action.replaceAll("_", " ") }),
      });
      if (adminActionStatus) adminActionStatus.textContent = `Action saved: ${result.status || action}.`;
      setDemoStatus(`RNA action saved: ${action}.`);
      refreshAuditLogs();
    } catch {
      if (adminActionStatus) adminActionStatus.textContent = `Testing action queued locally: ${action}.`;
    }
  });
});

notifyTestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    email: document.querySelector("#notify-test-email")?.value || "",
    title: document.querySelector("#notify-test-title")?.value || "Legal Connect reminder",
    message: document.querySelector("#notify-test-message")?.value || "Your Legal Connect reminder is active.",
  };
  try {
    const result = await apiFetch("/api/notify/test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    let channel = "Testing notification queued";
    let message = "Testing notification queued. Add EMAIL_PROVIDER=resend and RESEND_API_KEY in Render for live email.";
    if (result.mode === "resend" && result.status === "sent") {
      channel = "Resend email sent";
      message = `Email sent through Resend. Provider ID: ${result.provider_message_id || "not returned"}`;
      localStorage.setItem("legalConnectNotifyTest", "sent");
    } else if (result.mode === "resend" && result.status === "failed") {
      channel = "Resend email failed";
      message = `Resend email failed: ${result.error_message || "safe error unavailable"}`;
    } else if (result.mode === "demo") {
      channel = "Testing notification queued";
      message = "Testing notification queued. Add EMAIL_PROVIDER=resend and RESEND_API_KEY in Render for live email.";
    }
    if (notifyTestStatus) notifyTestStatus.textContent = message;
    setDemoStatus(channel);
    await refreshAuditLogs();
    await refreshNotifications();
  } catch {
    if (notifyTestStatus) notifyTestStatus.textContent = "Notification test failed. Login as RNA/Admin or check server env keys.";
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-lawbot-feedback]");
  if (!button) return;
  try {
    await apiFetch("/api/lawbot/feedback", {
      method: "POST",
      body: JSON.stringify({ queryId: button.dataset.queryId, rating: button.dataset.lawbotFeedback }),
    });
    setDemoStatus(`LawBot feedback saved: ${button.dataset.lawbotFeedback}.`);
  } catch {
    setDemoStatus("LawBot feedback could not be saved yet.");
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.type === "submit" || button.disabled || button.closest("form")) return;
  const handledKeys = [
    "view",
    "jump",
    "loginRole",
    "aiReply",
    "demoAction",
    "clientAction",
    "clientAi",
    "openBooking",
    "bookOption",
    "payBooking",
    "openSos",
    "sosCase",
    "sosBook",
    "saveMission",
    "taskAction",
    "courtSync",
    "refreshAdmin",
    "adminAction",
    "refreshSources",
    "refreshAudit",
    "refreshReceipts",
    "receiptAction",
    "sourceAction",
    "lawbotPrompt",
    "lawbotFeedback",
    "scrollBooking",
    "scrollClientSection",
  ];
  if (handledKeys.some((key) => Object.prototype.hasOwnProperty.call(button.dataset, key))) return;
  const label = button.textContent.trim().replace(/\s+/g, " ") || "This action";
  setDemoStatus(`${label} is prepared for beta. Use Service Room or RNA Control Room to track the next step.`);
});

async function refreshNotifications() {
  try {
    const notifications = await apiFetch("/api/notifications");
    if (notifications[0]) {
      setDemoStatus(`${notifications[0].title || "Notification"}: ${notifications[0].message || "New update"}`);
    }
  } catch {
    // Keep static preview quiet.
  }
}

refreshNotifications();
checkAppVersion();
refreshPublicHealth();

const pathView = location.pathname.replace("/", "");
const initialView = location.hash.replace("#", "") || (document.getElementById(pathView) ? pathView : "");
if (initialView && document.getElementById(initialView)) {
  activateView(initialView);
}

window.addEventListener("hashchange", () => {
  const nextView = location.hash.replace("#", "");
  if (nextView && document.getElementById(nextView)) {
    activateView(nextView);
  }
});
