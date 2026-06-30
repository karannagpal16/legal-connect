const titles = {
  home: "Legal Connect",
  login: "Secure Login",
  advocate: "Advocate Operating System",
  chambers: "Chambers",
  matter: "Matter Vault",
  diary: "Case Diary",
  bar: "Bar Desk",
  bareact: "Bare Act Universe",
  judgment: "Judgment Detail",
  appearance: "Court Mission Board",
  posttask: "Post Court Mission",
  task: "Task Detail",
  escrow: "Escrow Status",
  client: "Client Portal",
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
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function setDemoStatus(message) {
  if (!demoStatus || !message) return;
  demoStatus.textContent = message;
  demoStatus.classList.add("pulse");
  window.setTimeout(() => demoStatus.classList.remove("pulse"), 450);
}

function activateView(id) {
  const target = document.getElementById(id);
  if (!target) return;

  views.forEach((view) => view.classList.toggle("active", view.id === id));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === id));
  title.textContent = titles[id] || "Legal Connect";
  setDemoStatus(`${titles[id] || "Legal Connect"} opened.`);
  history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "admin") refreshAdminDashboard();
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
const roleRoutes = {
  client: "client",
  advocate: "advocate",
  rna: "admin",
  intern: "intern",
  admin: "admin",
};

roleLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: document.querySelector("#login-name")?.value || "Legal Connect User",
    email: document.querySelector("#login-email")?.value || "",
    phone: document.querySelector("#login-phone")?.value || "",
    role: document.querySelector("#login-role")?.value || "client",
  };
  try {
    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    currentSession = result;
    localStorage.setItem("legalConnectSession", JSON.stringify(result));
    const destination = roleRoutes[result.user.role] || "client";
    if (authStatus) authStatus.textContent = `${result.user.name} logged in as ${result.user.role}. Routing to ${titles[destination]}.`;
    setDemoStatus(`Logged in as ${result.user.role}.`);
    activateView(destination);
  } catch (error) {
    if (authStatus) authStatus.textContent = "Login API unavailable. Demo lane selected locally.";
    currentSession = { token: "", user: payload };
    localStorage.setItem("legalConnectSession", JSON.stringify(currentSession));
    activateView(roleRoutes[payload.role] || "client");
  }
});

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

const lawbotAnswers = {
  concierge: "I can take you to the right lane: urgent Legal SOS, book a verified counsel, check a case timeline, open advocate command, or answer from approved mock legal sources.",
  phase: "Phase 1 is demo-ready: LawBot mock sources, Client and Advocate UI, booking/payment simulation, Legal SOS demo, case tracker demo, and Render deployment path are visible.",
  sources: "LawBot is source-locked in mock mode. It uses only approved demo snippets for BNS, BNSS, BSA, NI Act Section 138, Consumer Protection, tenancy, sample Supreme Court and High Court notes, and amendment updates.",
  booking: "Booking flow: client selects Attorney Shield, video, audio, chat, or doorstep; the demo locks a payment receipt in browser storage and routes the client to the right next step.",
  next: "Next build: connect backend database, real login roles for Client, Advocate, RNA and Intern, save bookings/chats/tasks/SOS requests, and add RNA admin review dashboard.",
  sos: "Legal SOS starts with a simple issue type, prepares an AI summary, then routes to trusted RNA counsel. Real calls and payments need backend plus provider integration.",
  case: "Case tracker demo shows timeline, orders, reminders and next action. Court Sync adds POST /api/cases, GET /api/cases/:id and /api/case-updates for next-date update flow. Live eCourts access needs permitted official endpoints and compliance checks.",
  advocate: "Lawyer portal opens the Advocate OS: Court Mission Board, lawyer services, eCourts links, case diary, chambers coordination, proxy workflow, and RNA trust oversight."
};

function appendLawbotMessage(role, message) {
  if (!lawbotThread) return;
  const bubble = document.createElement("p");
  bubble.className = role === "user" ? "user" : "";
  bubble.innerHTML = `<strong>${role === "user" ? "You" : "LawBot"}:</strong> ${message}`;
  lawbotThread.appendChild(bubble);
  lawbotThread.scrollTop = lawbotThread.scrollHeight;
}

function getLawbotAnswer(prompt) {
  const text = String(prompt || "").toLowerCase();
  if (lawbotAnswers[prompt]) return lawbotAnswers[prompt];
  if (text.includes("phase") || text.includes("ready") || text.includes("render")) return lawbotAnswers.phase;
  if (text.includes("source") || text.includes("scc") || text.includes("bar") || text.includes("kanoon") || text.includes("lawbot")) return lawbotAnswers.sources;
  if (text.includes("book") || text.includes("payment") || text.includes("razor") || text.includes("pay")) return lawbotAnswers.booking;
  if (text.includes("sos") || text.includes("emergency") || text.includes("call")) return lawbotAnswers.sos;
  if (text.includes("case") || text.includes("tracker") || text.includes("diary") || text.includes("order")) return lawbotAnswers.case;
  if (text.includes("lawyer") || text.includes("advocate") || text.includes("portal") || text.includes("court mission")) return lawbotAnswers.advocate;
  if (text.includes("backend") || text.includes("login") || text.includes("database") || text.includes("admin") || text.includes("next")) return lawbotAnswers.next;
  return "I could not find this in the approved legal sources. Try asking about Phase 1, Legal SOS, booking, case tracker, or next backend build.";
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
    const prompt = button.dataset.lawbotPrompt;
    appendLawbotMessage("user", button.textContent || "Quick prompt");
    appendLawbotMessage("bot", getLawbotAnswer(prompt));
    setDemoStatus("LawBot answered from approved Phase 1 demo sources.");
  });
});

lawbotForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = lawbotInput?.value.trim();
  if (!question) return;
  appendLawbotMessage("user", question);
  appendLawbotMessage("bot", getLawbotAnswer(question));
  lawbotInput.value = "";
  floatingLawbot?.classList.add("open");
  setDemoStatus("LawBot response generated with demo guardrails.");
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
  button.addEventListener("click", () => {
    const mission = "Saket Court inspection - Rs. 1,000 locked - status: in progress";
    localStorage.setItem("legalConnectMission", mission);
    if (missionSaveStatus) missionSaveStatus.textContent = `Saved: ${mission}`;
    setDemoStatus("Mission posted. Rs. 1,000 locked in escrow. It now appears on Court Mission Board.");
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
    if (courtSyncStatus) courtSyncStatus.textContent = `${message} Demo API route: POST /api/cases.`;
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
      if (courtSyncStatus) courtSyncStatus.textContent = "Court Sync stream is unavailable in this preview. Demo fallback loaded.";
      handleCaseUpdate({
        caseId: "case-demo-1",
        message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5. Demo fallback.",
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
      if (courtSyncStatus) courtSyncStatus.textContent = "Push demo is not supported in this browser preview.";
      return;
    }
    if (location.protocol === "file:") {
      if (courtSyncStatus) courtSyncStatus.textContent = "Push demo needs the local server URL, not a file preview. Open http://127.0.0.1:3000.";
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
    if (courtSyncStatus) courtSyncStatus.textContent = "Push demo enabled. Real delivery needs VAPID keys and notify-worker deployment.";
  });
});

document.querySelectorAll("[data-case-link]").forEach((button) => {
  button.addEventListener("click", () => {
    const caseId = button.dataset.caseLink || "case-demo-1";
    const route = `#case-${caseId}`;
    history.pushState(null, "", route);
    addCourtSyncTimelineEntry("Open", "Case Snapshot", `${caseId} opened as a Legal Connect deep link.`);
    if (courtSyncStatus) courtSyncStatus.textContent = `Case snapshot opened: ${route}. Backend route GET /api/cases/${caseId} is ready in demo mode.`;
  });
});

document.querySelectorAll("[data-diary-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-diary-tab]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const tab = button.dataset.diaryTab;
    if (courtSyncStatus) courtSyncStatus.textContent = `${tab} matters loaded. Phase 1 uses demo diary data; live filtering needs DB persistence.`;
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
    if (escrowStatus) escrowStatus.textContent = `Escrow status: ${message}`;

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
      if (courtSyncStatus) courtSyncStatus.textContent = "Escrow release synced with Case Diary. Associated mission entry is now completed.";
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
let activeBooking = null;

document.querySelectorAll("[data-open-booking]").forEach((button) => {
  button.addEventListener("click", () => {
    if (clientActionStatus) clientActionStatus.textContent = "Booking desk opened. Choose Attorney Shield, Video, Audio, Chat, or Doorstep.";
    setDemoStatus("Booking desk opened. Select a consult mode and confirm payment.");
    bookingDock?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
});

document.querySelectorAll("[data-book-option]").forEach((button) => {
  button.addEventListener("click", () => {
    activeBooking = {
      plan: button.dataset.bookOption,
      price: button.dataset.bookPrice,
      route: button.dataset.bookRoute
    };
    if (bookingStatus) bookingStatus.textContent = `${activeBooking.plan} selected. Review amount and confirm payment.`;
    if (selectedPlan) selectedPlan.textContent = activeBooking.plan;
    if (selectedPrice) selectedPrice.textContent = `Rs. ${activeBooking.price}`;
    setDemoStatus(`${activeBooking.plan} selected for Rs. ${activeBooking.price}.`);
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
      status: "Paid demo booking"
    };

    try {
      const order = await apiFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: Number(activeBooking.price), serviceType: activeBooking.plan }),
      });
      const savedBooking = await apiFetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          serviceType: activeBooking.plan,
          amount: Number(activeBooking.price),
          paymentStatus: order.order?.payment_lock_status || "locked",
          receiptNo: bookingId,
          nextDestination: activeBooking.route,
        }),
      });
      receipt.backendId = savedBooking.id;
      receipt.paymentMode = order.mode;
    } catch {
      receipt.paymentMode = "local-fallback";
    }

    localStorage.setItem("legalConnectClientBooking", JSON.stringify(receipt));
    if (bookingConfirmation) {
      bookingConfirmation.innerHTML = `<span>Booking Confirmed</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p>`;
    }
    if (clientActionStatus) clientActionStatus.textContent = `${receipt.plan} confirmed. Receipt ${receipt.id} saved in this browser.`;
    setDemoStatus(`${receipt.plan} paid. Receipt ${receipt.id} saved.`);
  });
});

const savedClientBooking = localStorage.getItem("legalConnectClientBooking");
if (bookingConfirmation && savedClientBooking) {
  const receipt = JSON.parse(savedClientBooking);
  bookingConfirmation.innerHTML = `<span>Last Booking</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p>`;
}

const adminMetrics = document.querySelector("#admin-metrics");
const adminFeedList = document.querySelector("#admin-feed-list");
const adminActionStatus = document.querySelector("#admin-action-status");

function countRows(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
}

async function refreshAdminDashboard() {
  if (!adminMetrics || !adminFeedList) return;
  try {
    const summary = await apiFetch("/api/admin/summary");
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
    adminFeedList.innerHTML = cases.length
      ? cases.map((item) => `<div><time>${item.next_date || item.nextDate || "Date pending"}</time><strong>${item.title || "Case"}</strong><span>${item.court || "Court pending"} - ${item.status || "Active"}</span></div>`).join("")
      : `<div><time>Live</time><strong>No recent cases</strong><span>Create a case from Case Diary to populate this feed.</span></div>`;
    setDemoStatus("RNA Control Room refreshed.");
  } catch {
    if (adminActionStatus) adminActionStatus.textContent = "Admin API unavailable. Login as RNA/Admin after backend deploy.";
  }
}

document.querySelectorAll("[data-refresh-admin]").forEach((button) => {
  button.addEventListener("click", refreshAdminDashboard);
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
    } catch {
      if (adminActionStatus) adminActionStatus.textContent = `Demo action queued locally: ${action}.`;
    }
  });
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
