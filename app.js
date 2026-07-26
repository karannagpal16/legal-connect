const titles = {
  home: "Legal Connect",
  login: "Secure Login",
  advocate: "Advocate Command",
  chambers: "Chamber Command",
  matter: "Matter Vault",
  diary: "Case Diary",
  bar: "Digital Library",
  bareact: "Digital Library - Bare Acts",
  judgment: "Digital Library - Judgments",
  appearance: "Mission Board",
  posttask: "Post Court Mission",
  task: "Task Detail",
  escrow: "Work Completion Hold",
  client: "People Shield",
  documents: "Documents Without Drama",
  "service-room": "Service Room",
  intern: "Intern XP Board",
  admin: "RNA Control Room",
  "account-privacy": "Privacy & Data",
  "data-deletion": "Data Deletion",
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
let loginVerified = false;
const flowStatus = document.querySelector("#flow-status");
const flowStatusToggle = document.querySelector("#flow-status-toggle");
const flowStatusTitle = document.querySelector("#flow-status-title");
const flowStatusDetail = document.querySelector("#flow-status-detail");
const privacySessionStatus = document.querySelector("#privacy-session-status");
const confirmAccountDeletion = document.querySelector("#confirm-account-deletion");
const requestAccountDeletion = document.querySelector("#request-account-deletion");
const deletionRequestStatus = document.querySelector("#deletion-request-status");
const deletionRequestList = document.querySelector("#deletion-request-list");
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

function isReviewSession(session = getSession()) {
  return Boolean(session?.user?.isReviewAccount || session?.reviewAccess?.enabled);
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

function refreshPrivacyAccountState() {
  if (!privacySessionStatus) return;
  const session = getSession();
  if (!session?.user) {
    privacySessionStatus.textContent = "Not signed in";
    return;
  }
  privacySessionStatus.textContent = `${session.user.name || "Legal Connect User"} - ${session.user.role || "user"}`;
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
      ? "Local OTP fallback is available for this build."
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
  setFlowStatus(titles[id] || "Legal Connect", "Choose a service, booking, receipt, or status card to continue.");
  history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (id === "account-privacy") {
    refreshPrivacyAccountState();
    refreshOwnDeletionRequests();
  }
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
    ? "Advocate board ready: saved cases load under your login, proxy queue shows None until assigned, and work-hold receipts stay private."
    : role === "client"
      ? "People Shield ready: bookings, SOS, receipts and documents stay private."
      : role === "intern"
        ? "XP board ready: missions, deadlines and PPO progress are saved."
        : "RNA/Admin control ready: sources, receipts, SOS and work holds supervised.";
  document.querySelectorAll("[data-user-status]").forEach((node) => {
    node.textContent = status;
  });
  renderReviewSwitcher(session);
  setFlowStatus(label, status);
  refreshPrivacyAccountState();
}

function renderReviewSwitcher(session = getSession(), workspace) {
  const panel = document.querySelector("#review-switcher");
  const roleOptions = document.querySelector("#review-role-options");
  const seedStatus = document.querySelector("#review-seed-status");
  if (!panel || !roleOptions || !seedStatus) return;
  if (!isReviewSession(session)) {
    panel.hidden = true;
    roleOptions.innerHTML = "";
    return;
  }
  const activeRole = session?.reviewAccess?.activeRole || session?.user?.role || "client";
  const roles = session?.reviewAccess?.roles || session?.user?.reviewRoles || ["client", "advocate", "intern"];
  panel.hidden = false;
  roleOptions.innerHTML = roles.map((role) => {
    const selected = role === activeRole ? " selected" : "";
    const label = role === "client" ? "Client Portal" : role === "advocate" ? "Advocate Portal" : "Intern Board";
    return `<button type="button" class="review-role-pill${selected}" data-review-role="${escapeHtml(role)}">${escapeHtml(label)}</button>`;
  }).join("");
  const data = workspace || session?.seededWorkspace;
  if (data?.reviewOnly) {
    seedStatus.textContent = `Review mode: ${data.bookings?.length || 0} booking, ${data.receipts?.length || 0} receipt, ${data.sosRequests?.length || 0} SOS request, ${data.tasks?.length || 0} court mission and ${data.notifications?.length || 0} notification are synthetic.`;
  } else {
    seedStatus.textContent = "Review mode is active. Synthetic workspace data loads after login.";
  }
}

async function refreshReviewWorkspace() {
  const session = getSession();
  if (!isReviewSession(session)) return null;
  try {
    const result = await apiFetch("/api/review/workspace");
    currentSession = { ...session, reviewAccess: result.reviewAccess, seededWorkspace: result.workspace };
    localStorage.setItem("legalConnectSession", JSON.stringify(currentSession));
    renderReviewSwitcher(currentSession, result.workspace);
    const seed = result.workspace || {};
    updateSafeBoard({ cases: seed.cases || [], tasks: seed.tasks || [], bookings: seed.bookings || [] });
    if (seed.bookings?.[0]) {
      const booking = seed.bookings[0];
      const receipt = {
        id: booking.receiptNo || booking.receipt_no || booking.id,
        plan: booking.serviceType || booking.service_type || "Review booking",
        amount: booking.amount,
        status: "Review receipt ready - no charge",
        route: booking.nextDestination || booking.next_destination || booking.payload?.route,
        problem: booking.payload?.problemSummary || "",
        paymentMode: "google-play-review",
      };
      localStorage.setItem("legalConnectClientBooking", JSON.stringify(receipt));
      renderClientDesk(receipt);
      if (bookingConfirmation) {
        bookingConfirmation.innerHTML = `<span>Review Booking</span><strong>${escapeHtml(receipt.id)} - ${escapeHtml(receipt.plan)} - Rs. ${escapeHtml(String(receipt.amount))}</strong><p>${escapeHtml(receipt.route || "Service Room ready.")}</p><p><b>Status:</b> ${escapeHtml(receipt.status)}</p><p class="fine-print">Google Play review data is synthetic. No Razorpay charge is created.</p>`;
      }
    }
    return result;
  } catch (error) {
    renderReviewSwitcher(session);
    const seedStatus = document.querySelector("#review-seed-status");
    if (seedStatus) seedStatus.textContent = error.message || "Review workspace could not load.";
    return null;
  }
}

function markLoginVerified(message = "OTP verified successfully. Continue secure login.") {
  loginVerified = true;
  if (verificationStatus) {
    verificationStatus.textContent = message;
    verificationStatus.classList.add("verified");
  }
  if (authStatus) authStatus.textContent = "Verification successful. Press Open My Board to enter your role dashboard.";
  roleLoginForm?.classList.add("verified-login");
  const submit = roleLoginForm?.querySelector('button[type="submit"]');
  if (submit) submit.textContent = "Open My Board";
  setFlowStatus("OTP Verified", "Secure lane is ready. Your role dashboard will open after login.");
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
    if (isReviewSession()) await refreshReviewWorkspace();
  } catch {
    updateSafeBoard();
  }
}

document.addEventListener("click", async (event) => {
  const roleButton = event.target.closest("[data-review-role]");
  if (!roleButton) return;
  event.preventDefault();
  const nextRole = roleButton.dataset.reviewRole;
  const seedStatus = document.querySelector("#review-seed-status");
  try {
    if (seedStatus) seedStatus.textContent = `Switching review workspace to ${nextRole}...`;
    const result = await apiFetch("/api/review/switch-role", {
      method: "POST",
      body: JSON.stringify({ role: nextRole }),
    });
    currentSession = result;
    localStorage.setItem("legalConnectSession", JSON.stringify(result));
    applySessionToUi(result);
    renderReviewSwitcher(result, result.seededWorkspace);
    setDemoStatus(`Review workspace switched to ${nextRole}.`);
    activateView(roleRoutes[result.user.role] || "client");
    await refreshReviewWorkspace();
  } catch (error) {
    if (seedStatus) seedStatus.textContent = error.message || "Review workspace switch failed.";
  }
});

document.addEventListener("click", (event) => {
  const navTarget = event.target.closest("[data-view], [data-jump]");
  if (!navTarget) return;

  const viewId = navTarget.dataset.view || navTarget.dataset.jump;
  if (!viewId) return;

  event.preventDefault();
  if (navTarget.dataset.selectedPortal) {
    const selectedPortal = navTarget.dataset.selectedPortal;
    const roleSelect = document.querySelector("#login-role");
    if (roleSelect) roleSelect.value = selectedPortal;
    document.querySelectorAll(".role-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.loginRole === selectedPortal);
    });
    updatePortalHeading(selectedPortal);
  }
  if (viewId === "client" || viewId === "advocate" || viewId === "intern" || viewId === "admin") {
    const selected = navTarget.dataset.selectedPortal || viewId;
    const roleSelect = document.querySelector("#login-role");
    if (roleSelect) roleSelect.value = selected;
    document.querySelectorAll(".role-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.loginRole === selected);
    });
    updatePortalHeading(selected);
    const session = getSession();
    if (session?.user) {
      const nextRoute = getPostLoginRoute(session.user);
      if (nextRoute) {
        window.location.hash = nextRoute;
        activateView(resolveViewIdForRoute(nextRoute));
        return;
      }
    }
    activateView("login");
    return;
  }
  activateView(viewId);
});

document.querySelectorAll(".role-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".role-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    const roleSelect = document.querySelector("#login-role");
    if (roleSelect && card.dataset.loginRole) roleSelect.value = card.dataset.loginRole;
    const label = card.querySelector("strong")?.textContent || "Role";
    updatePortalHeading(card.dataset.loginRole);
    if (authStatus) authStatus.textContent = `${label} selected. Verify OTP, then open your private board.`;
    setFlowStatus("Role selected", `${label} lane is ready.`);
  });
});

const roleLoginForm = document.querySelector("#role-login-form");
const authStatus = document.querySelector("#auth-status");
const verificationStatus = document.querySelector("#verification-status");
const requestLoginCode = document.querySelector("#request-login-code");
const demoAccounts = {
  advocate: { name: "Adv. Maya Rao", email: "advocate.demo@legalconnect.local", phone: "+91 99999 00001", role: "advocate" },
  client: { name: "Aarav Mehta", email: "client.demo@legalconnect.local", phone: "+91 99999 00002", role: "client" },
  intern: { name: "Nisha Verma", email: "intern.demo@legalconnect.local", phone: "+91 99999 00003", role: "intern" },
  admin: { name: "RNA Admin", email: "admin.demo@legalconnect.local", phone: "+91 99999 00004", role: "admin" },
};

function getDemoAccount(payload = {}) {
  const email = String(payload.email || "").trim().toLowerCase();
  const phone = String(payload.phone || "").trim();
  const role = String(payload.role || "").trim().toLowerCase();
  const candidate = demoAccounts[role] || Object.values(demoAccounts).find((account) => account.email.toLowerCase() === email || account.phone === phone);
  if (!candidate) return null;
  if (email && candidate.email.toLowerCase() !== email && phone && candidate.phone !== phone) return null;
  return {
    token: `demo-${candidate.role}`,
    user: {
      ...candidate,
      onboardingCompleted: true,
      verificationStatus: "verified",
      accountStatus: "active",
    },
    postLoginRoute: getPostLoginRoute({ ...candidate, onboardingCompleted: true, verificationStatus: "verified", accountStatus: "active" }),
    verification: { emailVerified: true, phoneVerified: true },
  };
}

document.querySelectorAll("[data-demo-account]").forEach((button) => {
  button.addEventListener("click", () => {
    const role = button.dataset.demoAccount;
    const account = demoAccounts[role];
    if (!account) return;
    const roleSelect = document.querySelector("#login-role");
    if (roleSelect) roleSelect.value = role;
    document.querySelector("#login-name").value = account.name;
    document.querySelector("#login-email").value = account.email;
    document.querySelector("#login-phone").value = account.phone;
    document.querySelector("#privacy-consent").checked = true;
    document.querySelectorAll(".role-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.loginRole === role);
    });
    updatePortalHeading(role);
    loginVerified = true;
    if (verificationStatus) verificationStatus.textContent = `${account.name} is ready for a one-tap demo login.`;
    if (authStatus) authStatus.textContent = `${account.name} ready. Launching your ${role} workspace.`;
    setFlowStatus("Demo account ready", `${account.name} is set to open the ${role} workspace.`);
    roleLoginForm?.requestSubmit();
  });
});
const verifyLoginCode = document.querySelector("#verify-login-code");
const serviceRoomTitle = document.querySelector("#service-room-title");
const serviceRoomStatus = document.querySelector("#service-room-status");
const serviceRoomRoute = document.querySelector("#service-room-route");
const serviceRoomDetail = document.querySelector("#service-room-detail");
const serviceRoomTimeline = document.querySelector("#service-room-timeline");
const roleRoutes = {
  client: "client",
  advocate: "advocate",
  rna: "advocate",
  intern: "intern",
  admin: "admin",
};

function getPortalSelection() {
  const selected = document.querySelector("[data-selected-portal]")?.dataset.selectedPortal || document.querySelector("#login-role")?.value || "client";
  return selected;
}

function resolveViewIdForRoute(route = "") {
  const normalized = String(route || "").replace(/^\//, "").split("?")[0];
  if (!normalized) return "home";
  if (normalized.startsWith("client")) return "client";
  if (normalized.startsWith("advocate")) return "advocate";
  if (normalized.startsWith("intern")) return "intern";
  if (normalized.startsWith("admin")) return "admin";
  if (normalized.startsWith("account-restricted") || normalized.startsWith("access-denied") || normalized.startsWith("portal-mismatch")) return "login";
  return normalized;
}

function updatePortalHeading(selectedPortal = getPortalSelection()) {
  const heading = document.querySelector("#portal-heading");
  if (!heading) return;
  const titleByPortal = {
    advocate: "Welcome to your Litigation Command Centre",
    client: "Welcome to your Personal Legal Hub",
    intern: "Welcome to Internverse",
    admin: "Welcome to Administrative Control",
  };
  heading.textContent = titleByPortal[selectedPortal] || "Welcome to Legal Connect";
}

function getPostLoginRoute(user = {}) {
  if (user.accountStatus === "suspended") return "/account-restricted";
  if (!user.onboardingCompleted) return `/${user.role}/onboarding`;
  if (["advocate", "intern"].includes(user.role) && user.verificationStatus !== "verified") return `/${user.role}/verification-pending`;
  switch (user.role) {
    case "client":
      return "/client/dashboard";
    case "advocate":
    case "rna":
      return "/advocate/dashboard";
    case "intern":
      return "/intern/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/access-denied";
  }
}

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
    const devHint = result.devCode ? " Verification code filled. Tap Verify." : "";
    if (verificationStatus) {
      verificationStatus.textContent = `${result.destinationMasked || "Contact"} verification ${result.status}. ${result.message || ""}${devHint}`;
      verificationStatus.classList.remove("verified");
    }
    loginVerified = false;
    roleLoginForm?.classList.remove("verified-login");
  } catch (error) {
    const codeInput = document.querySelector("#login-code");
    if (publicHealth.otp_fallback_enabled) {
      const localCode = "111111";
      localStorage.setItem("legalConnectLocalOtp", localCode);
      if (codeInput) codeInput.value = localCode;
      if (verificationStatus) verificationStatus.textContent = "Local verification fallback active. Code filled as 111111.";
      loginVerified = false;
      roleLoginForm?.classList.remove("verified-login");
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
    markLoginVerified(`${result.destinationMasked || "Contact"} OTP verified successfully. Continue secure login.`);
  } catch (error) {
    const localCode = localStorage.getItem("legalConnectLocalOtp");
    if (publicHealth.otp_fallback_enabled && localCode && code === localCode) {
      markLoginVerified("OTP verified successfully. Continue secure login.");
      return;
    }
    if (verificationStatus) verificationStatus.textContent = "Invalid or expired code.";
  }
});

roleLoginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const selectedPortal = getPortalSelection();
  const payload = {
    name: document.querySelector("#login-name")?.value || "Legal Connect User",
    email: document.querySelector("#login-email")?.value || "",
    phone: document.querySelector("#login-phone")?.value || "",
    role: document.querySelector("#login-role")?.value || selectedPortal || "client",
    portal: selectedPortal,
    privacyConsent: Boolean(document.querySelector("#privacy-consent")?.checked),
  };
  if (!payload.email && !payload.phone) {
    if (authStatus) authStatus.textContent = "Enter an email or phone number before requesting your role board.";
    return;
  }
  if (!payload.privacyConsent) {
    if (authStatus) authStatus.textContent = "Consent is required for role-based login, receipts, notifications, and support records.";
    return;
  }
  if (!loginVerified && (payload.email || payload.phone)) {
    if (authStatus) authStatus.textContent = "Verify the OTP first. Your private board opens only after verification.";
    return;
  }
  const demoSession = getDemoAccount(payload);
  if (demoSession) {
    currentSession = demoSession;
    localStorage.setItem("legalConnectSession", JSON.stringify(demoSession));
    const destination = demoSession.postLoginRoute || roleRoutes[demoSession.user.role] || "client";
    if (authStatus) authStatus.textContent = `${demoSession.user.name} signed in with a demo account. Your private board is ready.`;
    setDemoStatus(`${demoSession.user.name} signed in as ${demoSession.user.role}.`);
    applySessionToUi(demoSession);
    if (destination.startsWith("/")) {
      window.location.hash = destination;
      activateView(resolveViewIdForRoute(destination));
    } else {
      activateView(destination);
    }
    window.setTimeout(refreshWorkspaceData, 120);
    return;
  }

  try {
    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    currentSession = result;
    localStorage.setItem("legalConnectSession", JSON.stringify(result));
    const destination = result.postLoginRoute || getPostLoginRoute(result.user) || roleRoutes[result.user.role] || "client";
    const verifyNote = result.verification?.emailVerified || result.verification?.phoneVerified ? " Contact verified." : " Contact verification pending.";
    if (authStatus) authStatus.textContent = `${result.user.name} logged in as ${result.user.role}.${verifyNote} Your private board is ready.`;
    setDemoStatus(`${result.user.name} logged in successfully.`);
    applySessionToUi(result);
    if (destination.startsWith("/")) {
      window.location.hash = destination;
      activateView(resolveViewIdForRoute(destination));
    } else {
      activateView(destination);
    }
    window.setTimeout(refreshWorkspaceData, 120);
  } catch (error) {
    if (!localTestingRuntime) {
      if (authStatus) authStatus.textContent = error.message || "Login could not be completed. Please try again after the server is available.";
      return;
    }
    if (authStatus) authStatus.textContent = `${payload.name} opened local testing as ${payload.role}. Permanent account records need the backend.`;
    currentSession = { token: "", user: payload };
    localStorage.setItem("legalConnectSession", JSON.stringify(currentSession));
    applySessionToUi(currentSession);
    activateView(roleRoutes[payload.role] || "client");
    window.setTimeout(refreshWorkspaceData, 120);
  }
});

updatePortalHeading(getPortalSelection());
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
  appendLawbotMessage("bot", "Legal AI is coming soon for source-locked answers. The Source Library is ready in RNA/Admin: upload official text or PDFs, approve, then index before the LawBot is enabled.");
  setDemoStatus("Legal AI marked Coming Soon. Source Library remains available in RNA/Admin.");
}

function toggleLawbot(open) {
  floatingLawbot?.classList.toggle("open", open ?? !floatingLawbot.classList.contains("open"));
  setFlowStatus("Legal Concierge", "Ask a source-locked legal question or use the action buttons.");
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
  button.addEventListener("click", () => {
    const message = (button.dataset.demoAction || "Action ready.").replace(/\bopened\b/gi, "ready");
    setFlowStatus("Action ready", message);
  });
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
        status: "Mission sync pending",
        message: `${court}. Permanent receipt requires backend sync.`,
      });
      setDemoStatus("Mission sync pending. Login and retry so RNA/Admin receives a permanent receipt.");
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
      if (courtSyncStatus) courtSyncStatus.textContent = "Court Sync stream is unavailable right now. Local fallback loaded.";
      handleCaseUpdate({
        caseId: "case-demo-1",
        message: "Delhi HC | 2023/CRL-1234 listed tomorrow in Court-5. Local fallback.",
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
    if (courtSyncStatus) courtSyncStatus.textContent = `${tab} matters loaded. Diary data is ready for DB-backed sync.`;
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
    setFlowStatus("Client action", button.dataset.clientAction || "Client action selected.");
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
const bookingProblem = document.querySelector("#booking-problem");
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
  if (deskBookingDetail) deskBookingDetail.textContent = `Receipt ${receipt.id || "pending"} is saved. Payment status: ${receipt.status || "selection pending"}.`;
  if (deskNextStep) deskNextStep.textContent = receipt.plan?.includes("Audio")
    ? "Open Audio SOS"
    : receipt.plan?.includes("Video")
      ? "Open Video Room"
      : receipt.plan?.includes("Chat")
        ? "Open Chat Thread"
        : receipt.plan?.includes("Doorstep")
          ? "Confirm Doorstep Slot"
          : receipt.plan?.includes("Office")
            ? "Confirm Office Slot"
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
      ? " Server sync is pending; permanent receipt appears after retry."
      : "";
    const problemNote = receipt.problem ? ` Problem summary: ${receipt.problem}` : "";
    serviceRoomDetail.textContent = `Receipt ${receipt.id || receipt.receiptNo || "pending"} is linked to your login. Client details stay private; RNA/Admin can review status and receipts.${problemNote}${fallbackNote}`;
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
  setFlowStatus("Booking selected", `${activeBooking.plan} / Rs. ${activeBooking.price}. Add a short problem summary, then Pay & Confirm.`);
}

document.querySelectorAll("[data-open-booking]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!document.querySelector("#client")?.classList.contains("active")) {
      activateView("client");
    }
    if (clientActionStatus) clientActionStatus.textContent = button.dataset.clientAction || "Choose Attorney Shield, SOS Video, Chat, Office, or Doorstep.";
    if (bookingStatus) bookingStatus.textContent = "Choose a consult mode, write the problem, then Pay & Confirm.";
    setFlowStatus("Booking desk", "Choose a consult mode and confirm payment.");
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
      if (bookingStatus) bookingStatus.textContent = "Please select Attorney Shield, SOS Video, Chat, Office, or Doorstep first.";
      setDemoStatus("Select a booking mode before payment.");
      return;
    }

    const problemSummary = bookingProblem?.value.trim() || "";
    if (!problemSummary) {
      if (bookingStatus) bookingStatus.textContent = "Write a short problem summary before payment so counsel knows what to review.";
      bookingProblem?.focus();
      setDemoStatus("Add your problem summary before booking.");
      return;
    }
    const bookingId = `LC-${Date.now().toString().slice(-6)}`;
    const receipt = {
      id: bookingId,
      plan: activeBooking.plan,
      amount: activeBooking.price,
      route: activeBooking.route,
      problem: problemSummary,
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
          problemSummary,
          payload: { problemSummary },
        }),
      });
      const order = await apiFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({ amount: Number(activeBooking.price), serviceType: activeBooking.plan, bookingId: savedBooking.id, receiptNo: bookingId, problemSummary }),
      });
      receipt.backendId = savedBooking.id;
      receipt.paymentMode = order.mode;
      receipt.razorpayOrderId = order.order_id || order.order?.id;
      const razorpayKey = order.key_id || order.keyId;
      const razorpayOrderId = order.order_id || order.order?.id;
      const razorpayAmount = order.amount || order.order?.amount;
      const razorpayCurrency = order.currency || order.order?.currency || "INR";
      if (order.mode === "google-play-review") {
        receipt.status = "Review receipt ready - no charge";
        receipt.workHoldStatus = "Review inspection only";
        localStorage.setItem("legalConnectClientBooking", JSON.stringify(receipt));
        saveLocalReceipt({ ...receipt, title: "Review booking receipt", message: `${receipt.route} Problem: ${receipt.problem}` });
        renderClientDesk(receipt);
        if (bookingConfirmation) {
          bookingConfirmation.innerHTML = `<span>Review Booking</span><strong>${escapeHtml(receipt.id)} - ${escapeHtml(receipt.plan)} - Rs. ${escapeHtml(String(receipt.amount))}</strong><p>${escapeHtml(receipt.route)}</p><p><b>Problem:</b> ${escapeHtml(receipt.problem)}</p><p><b>Status:</b> ${escapeHtml(receipt.status)}</p><p class="fine-print">Google Play review account can inspect this Service Room without a Razorpay charge.</p>`;
        }
        if (bookingStatus) bookingStatus.textContent = "Review receipt created. Razorpay charge skipped for Google Play review account.";
        if (clientActionStatus) clientActionStatus.textContent = `${receipt.plan} review booking is ready. No payment was charged.`;
        updateServiceRoom(receipt);
        await refreshReviewWorkspace();
        activateView("service-room");
        return;
      }
      if (order.warning && bookingStatus) bookingStatus.textContent = order.warning;
      if (order.provider === "razorpay" && razorpayKey && razorpayOrderId) {
        if (bookingStatus) bookingStatus.textContent = "Opening Razorpay Checkout. Paid status activates after secure backend verification.";
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
              saveLocalReceipt({ ...receipt, title: "Booking verified", message: `${receipt.route} Problem: ${receipt.problem}` });
              renderClientDesk(receipt);
              if (bookingConfirmation) bookingConfirmation.innerHTML = `<span>Booking Verified</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p><p><b>Problem:</b> ${escapeHtml(receipt.problem)}</p><p><b>Status:</b> ${receipt.status}</p><p class="fine-print">Receipt is saved for client, RNA/Admin review, and notification follow-up.</p>`;
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
      const paymentErrorMessage = error.message || "Payment order could not be created. Please retry after server sync is available.";
      if (bookingStatus) bookingStatus.textContent = paymentErrorMessage;
      setDemoStatus(paymentErrorMessage);
      if (!localTestingRuntime) return;
      receipt.paymentMode = "local-fallback";
    }

    receipt.status = receipt.paymentMode === "demo" ? "Payment order created - Razorpay verification pending" : receipt.status;
    localStorage.setItem("legalConnectClientBooking", JSON.stringify(receipt));
    saveLocalReceipt({ ...receipt, title: "Booking created", message: `${receipt.plan} created. ${receipt.route} Problem: ${receipt.problem}` });
    renderClientDesk(receipt);
    if (bookingConfirmation) {
      bookingConfirmation.innerHTML = `<span>Booking Created</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p><p><b>Problem:</b> ${escapeHtml(receipt.problem)}</p><p><b>Status:</b> ${receipt.status}. Paid status updates after Razorpay verification.</p><p class="fine-print">Counsel sees the problem summary before accepting the request.</p>`;
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
  bookingConfirmation.innerHTML = `<span>Last Booking</span><strong>${receipt.id} - ${receipt.plan} - Rs. ${receipt.amount}</strong><p>${receipt.route}</p>${receipt.problem ? `<p><b>Problem:</b> ${escapeHtml(receipt.problem)}</p>` : ""}<p><b>Status:</b> This booking is also visible at the top in My Legal Desk.</p>`;
  if (bookingProblem && receipt.problem) bookingProblem.value = receipt.problem;
}

const floatingSos = document.querySelector("#floating-sos");
const sosToggle = document.querySelector("#sos-toggle");
const sosClose = document.querySelector("#sos-close");
const sosStatus = document.querySelector("#sos-status");

function openSosPanel() {
  floatingSos?.classList.add("open");
  if (sosStatus) sosStatus.textContent = "Legal SOS is ready. Pick a situation, then choose a support request. Team coordination starts after the request is saved.";
  setFlowStatus("Legal SOS", "SOS panel ready. Use the close button to exit.");
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
      status: "Support coordination pending",
      route: "RNA SOS desk: request received. Team will coordinate the next available support channel and keep the receipt visible.",
      paymentMode: "SOS route",
    };
    const message = `${serviceType} selected. Your request is received; team coordination is pending.`;
    if (sosStatus) sosStatus.textContent = message;
    if (clientActionStatus) clientActionStatus.textContent = message;
    try {
      const saved = await apiFetch("/api/sos", {
        method: "POST",
        body: JSON.stringify({ serviceType, urgency: "High", status: "Support coordination pending", amount }),
      });
      sosReceipt.id = saved.transparencyReceipt?.receiptNo || saved.transparencyReceipt?.receipt_no || saved.id || sosReceipt.id;
      if (sosStatus) sosStatus.textContent = `${serviceType} saved. RNA/Admin can see SOS tracker. Receipt: ${sosReceipt.id}.`;
      setDemoStatus("Legal SOS saved and receipt generated.");
      refreshReceipts();
    } catch {
      if (sosStatus) sosStatus.textContent = "SOS selected. Backend sync is needed to save it for RNA/Admin review.";
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
  const amount = Number(document.querySelector("#draft-fee")?.value || 799);
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
    if (draftStatus) draftStatus.textContent = "Draft request could not sync. Login and retry for a permanent receipt.";
    updateServiceRoom({
      id: `LCD-${Date.now().toString().slice(-6)}`,
      plan: `Draft: ${draftType}`,
      amount,
      status: "Draft sync pending",
      route: "Draft desk requires backend sync for permanent receipt.",
      paymentMode: "local fallback",
    });
    saveLocalReceipt({
      title: `Draft: ${draftType}`,
      amount,
      status: "Draft sync pending",
      message: "Draft sync pending. Login and retry for permanent receipt.",
    });
    setDemoStatus("Draft sync pending. Login and retry for permanent receipt.");
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
    [`OTP fallback: ${health.otp_fallback_enabled ? "local fallback" : "disabled"}`, health.otp_fallback_enabled !== undefined],
    ["UDYAM badge visible", document.body.textContent.includes("UDYAM-DL-11-0164811")],
    ["Domain configured", String(health.public_url || "").includes("legal-connect")],
    ["Legal pages present", Boolean(document.querySelector("#privacy-policy") && document.querySelector("#terms") && document.querySelector("#refund-policy"))],
    ["Notification sent", localStorage.getItem("legalConnectNotifyTest") === "sent"],
    ["Razorpay payment verified", localStorage.getItem("legalConnectPaymentVerified") === "true"],
    ["BNSS source indexed", Number(health.legal_chunks_count || 0) > 0],
    ["UI duplication fixed", document.querySelectorAll(".rail").length === 1 && document.querySelectorAll(".legal-footer").length === 1 && document.querySelectorAll("#floating-lawbot").length === 1],
  ];
  betaReadinessList.innerHTML = checks.map(([label, ok]) => `<div><time>${ok ? "Pass" : "Warning"}</time><strong>${escapeHtml(label)}</strong><span>${ok ? "Ready." : "Needs live verification or configured provider."}</span></div>`).join("");
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
    setDemoStatus("Printable receipt ready.");
  }
  if (action === "email") {
    window.location.href = `mailto:?subject=Legal Connect Receipt&body=${encodeURIComponent(body)}`;
    setDemoStatus("Email receipt draft ready.");
  }
  if (action === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Legal Connect receipt: ${body}`)}`, "_blank", "noreferrer");
    setDemoStatus("WhatsApp receipt share ready.");
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
    refreshDeletionRequests();
    refreshReceipts();
  } catch {
    if (adminActionStatus) adminActionStatus.textContent = "RNA/Admin access required. Login with an authorised RNA/Admin account, then refresh the Control Room.";
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

async function refreshOwnDeletionRequests() {
  refreshPrivacyAccountState();
  if (!deletionRequestStatus) return;
  if (!getSession()?.token) {
    deletionRequestStatus.textContent = "Login is required before requesting deletion.";
    return;
  }
  try {
    const requests = await apiFetch("/api/account/deletion-request");
    deletionRequestStatus.textContent = requests.length
      ? `Latest request: ${requests[0].status || "received"} on ${new Date(requests[0].requestedAt || requests[0].createdAt).toLocaleString()}.`
      : "No deletion request found for this account.";
  } catch (error) {
    deletionRequestStatus.textContent = error.message || "Could not load deletion request status.";
  }
}

async function refreshDeletionRequests() {
  if (!deletionRequestList) return;
  try {
    const requests = await apiFetch("/api/admin/deletion-requests");
    deletionRequestList.innerHTML = requests.length
      ? requests.map((item) => `<div><time>${new Date(item.requestedAt || item.createdAt).toLocaleString()}</time><strong>${escapeHtml(item.status || "received")} - ${escapeHtml(item.userName || "User")}</strong><span>${escapeHtml(item.userRole || "role pending")} / ${escapeHtml(item.emailMasked || "email not available")} / ${escapeHtml(item.phoneMasked || "phone not available")}</span></div>`).join("")
      : `<div><time>Clear</time><strong>No deletion requests</strong><span>Requests submitted from Privacy & Data will appear here.</span></div>`;
  } catch {
    deletionRequestList.innerHTML = `<div><time>Locked</time><strong>RNA/Admin login required</strong><span>Deletion request governance is protected.</span></div>`;
  }
}

requestAccountDeletion?.addEventListener("click", async () => {
  if (!getSession()?.token) {
    if (deletionRequestStatus) deletionRequestStatus.textContent = "Please login first, then return to Privacy & Data.";
    activateView("login");
    return;
  }
  if (!confirmAccountDeletion?.checked) {
    if (deletionRequestStatus) deletionRequestStatus.textContent = "Tick the confirmation checkbox before submitting a deletion request.";
    return;
  }
  try {
    const result = await apiFetch("/api/account/deletion-request", {
      method: "POST",
      body: JSON.stringify({ confirm: true }),
    });
    if (deletionRequestStatus) deletionRequestStatus.textContent = result.message || "Your account deletion request has been received.";
    setDemoStatus("Account deletion request received.");
    confirmAccountDeletion.checked = false;
    await refreshOwnDeletionRequests();
  } catch (error) {
    if (deletionRequestStatus) deletionRequestStatus.textContent = error.message || "Deletion request could not be submitted.";
  }
});

document.querySelectorAll("[data-refresh-admin]").forEach((button) => {
  button.addEventListener("click", refreshAdminDashboard);
});

document.querySelectorAll("[data-refresh-sources]").forEach((button) => {
  button.addEventListener("click", refreshLegalSources);
});

document.querySelectorAll("[data-refresh-audit]").forEach((button) => {
  button.addEventListener("click", refreshAuditLogs);
});

document.querySelectorAll("[data-refresh-deletions]").forEach((button) => {
  button.addEventListener("click", refreshDeletionRequests);
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
      saveLocalReceipt({
        id: `RNA-${Date.now().toString().slice(-6)}`,
        title: "RNA/Admin action",
        status: "saved",
        message: `${action.replaceAll("_", " ")} recorded in control room.`,
      });
      refreshAuditLogs();
      refreshReceipts();
    } catch {
      const localAction = action.replaceAll("_", " ");
      if (adminActionStatus) adminActionStatus.textContent = `Control action queued: ${localAction}. Backend sync required for permanent audit.`;
      saveLocalReceipt({
        id: `RNA-${Date.now().toString().slice(-6)}`,
        title: "RNA/Admin local action",
        status: "queued",
        message: `${localAction} queued for backend sync.`,
      });
      refreshReceipts();
      setDemoStatus(`RNA action queued: ${localAction}.`);
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
    let channel = "Notification queued";
    let message = "In-app fallback notification queued. Add EMAIL_PROVIDER=resend and RESEND_API_KEY in Render for email sending.";
    if (result.mode === "resend" && result.status === "sent") {
      channel = "Resend email sent";
      message = `Email sent through Resend. Provider ID: ${result.provider_message_id || "not returned"}`;
      localStorage.setItem("legalConnectNotifyTest", "sent");
    } else if (result.mode === "resend" && result.status === "failed") {
      channel = "Resend email failed";
      message = `Resend email failed: ${result.error_message || "safe error unavailable"}`;
    } else if (result.mode === "demo") {
      channel = "Notification queued";
      message = "In-app fallback notification queued. Add EMAIL_PROVIDER=resend and RESEND_API_KEY in Render for email sending.";
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
  setFlowStatus("Action selected", label);
});

const compactPortalConfig = {
  home: {
    label: "Choose your path",
    note: "Two doors first. Everything else opens only when you ask for it.",
    rootSelector: ".cover-stage",
    preserve: 5,
    actions: [
      { label: "People Shield", view: "client" },
      { label: "Advocate Command", view: "advocate" },
      { label: "SOS", action: "sos" },
      { label: "Status", view: "service-room" },
    ],
  },
  client: {
    label: "People Shield",
    note: "Book, SOS, receipts and next steps stay visible without a long scroll.",
    preserve: 3,
    actions: [
      { label: "Book Now", selector: "#booking-dock" },
      { label: "Legal SOS", action: "sos" },
      { label: "Documents", view: "documents" },
      { label: "Status", view: "service-room" },
    ],
  },
  advocate: {
    label: "Advocate Command",
    note: "Your safe board, missions and chamber controls first. Deep tools stay folded.",
    rootSelector: ".advocate-command",
    preserve: 4,
    actions: [
      { label: "Missions", view: "appearance" },
      { label: "Post Work", view: "posttask" },
      { label: "Diary", view: "diary" },
      { label: "Library", view: "bar" },
    ],
  },
  intern: {
    label: "Intern XP Board",
    note: "Short quests, visible XP and one clean next action.",
    preserve: 2,
    actions: [
      { label: "XP Board", selector: ".xp-hero" },
      { label: "Quests", selector: ".feed-grid" },
      { label: "Library", view: "bar" },
    ],
  },
  admin: {
    label: "RNA Control",
    note: "Core controls first. Sources, receipts and audit logs open as separate panels.",
    preserve: 3,
    actions: [
      { label: "Sources", selector: ".source-library" },
      { label: "Audit", selector: "#audit-log-list" },
      { label: "Receipts", selector: "#admin-receipt-list" },
      { label: "Refresh", action: "refreshAdmin" },
    ],
  },
  posttask: {
    label: "Court mission",
    note: "Post the work, set fee and note first. Extra rules stay folded.",
    preserve: 3,
    actions: [
      { label: "Mission Form", selector: "form" },
      { label: "Work Hold", view: "escrow" },
      { label: "Status", view: "appearance" },
    ],
  },
  documents: {
    label: "Draft desk",
    note: "Pick a document, upload files, pay and track the receipt.",
    preserve: 2,
    actions: [
      { label: "Draft Form", selector: "#draft-form" },
      { label: "Client Desk", view: "client" },
      { label: "Status", view: "service-room" },
    ],
  },
  bar: {
    label: "Digital library",
    note: "Bare Acts, judgments and updates are grouped so research does not feel scattered.",
    preserve: 4,
    actions: [
      { label: "Bare Acts", view: "bareact" },
      { label: "Judgments", view: "judgment" },
      { label: "Advocate", view: "advocate" },
    ],
  },
  "service-room": {
    label: "Service room",
    note: "Everything the user booked or posted should resolve here as a clear status card.",
    preserve: 3,
    actions: [
      { label: "Book", view: "client" },
      { label: "Receipts", selector: "#service-room-timeline" },
      { label: "Home", view: "home" },
    ],
  },
};

function getCompactRoot(view, config) {
  if (config.rootSelector) return view.querySelector(config.rootSelector) || view;
  const elementChildren = [...view.children].filter((child) => child instanceof HTMLElement && !child.classList.contains("page-focus-strip"));
  if (elementChildren.length === 1 && !elementChildren[0].matches("form")) return elementChildren[0];
  return view;
}

function createFocusButton(item, view, root) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = item.label;
  button.addEventListener("click", async () => {
    if (item.view) {
      activateView(item.view);
      return;
    }
    if (item.action === "sos") {
      openSosPanel();
      return;
    }
    if (item.action === "refreshAdmin") {
      await refreshAdminDashboard();
      setDemoStatus("RNA Control Room refreshed.");
      return;
    }
    const target = item.selector ? view.querySelector(item.selector) || document.querySelector(item.selector) : null;
    if (target) {
      view.classList.add("show-all");
      root.classList.add("show-all");
      target.classList.remove("secondary-panel");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setFlowStatus(item.label, "Section ready inside this workspace.");
    }
  });
  return button;
}

function initProductReadyMode() {
  Object.entries(compactPortalConfig).forEach(([viewId, config]) => {
    const view = document.getElementById(viewId);
    if (!view || view.dataset.compactReady === "true") return;
    const root = getCompactRoot(view, config);
    const children = [...root.children].filter((child) => {
      if (!(child instanceof HTMLElement)) return false;
      return !child.classList.contains("page-focus-strip") && !child.classList.contains("intro-loader");
    });
    if (!children.length) return;

    view.dataset.compactReady = "true";
    root.classList.add("compact-root");
    root.classList.toggle("compact-home-root", viewId === "home");

    const focusStrip = document.createElement("section");
    focusStrip.className = "page-focus-strip";
    focusStrip.innerHTML = `
      <div class="page-focus-copy">
        <span>${escapeHtml(config.label)}</span>
        <strong>${escapeHtml(titles[viewId] || "Legal Connect")}</strong>
        <p>${escapeHtml(config.note)}</p>
      </div>
      <div class="page-focus-actions"></div>
    `;
    const actionHost = focusStrip.querySelector(".page-focus-actions");
    config.actions.forEach((item) => actionHost.appendChild(createFocusButton(item, view, root)));

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "show-all-toggle";
    toggle.textContent = "Show full page";
    toggle.addEventListener("click", () => {
      const expanded = root.classList.toggle("show-all");
      view.classList.toggle("show-all", expanded);
      toggle.textContent = expanded ? "Short view" : "Show full page";
      setFlowStatus(expanded ? "Full page ready" : "Short view active", expanded ? "All tools are visible." : "Only priority tools are visible.");
    });

    const insertAfter = children[0];
    insertAfter.insertAdjacentElement("afterend", focusStrip);

    let visibleSeen = 0;
    children.forEach((child) => {
      if (child === focusStrip || child.hidden) return;
      visibleSeen += 1;
      if (visibleSeen > config.preserve) child.classList.add("secondary-panel");
    });

    if (root.querySelector(".secondary-panel")) {
      actionHost.appendChild(toggle);
    }
  });
}

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
initProductReadyMode();

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

// Phase 2 UI: role-based dashboards and navigation firewall
(function () {
  const privateViews = new Set(["client", "advocate", "intern", "admin", "matter", "diary", "chambers", "appearance", "posttask", "task", "escrow", "service-room", "documents", "bar", "bareact", "judgment"]);
  const roleHome = { client: "client", advocate: "advocate", intern: "intern", admin: "admin", rna: "admin" };
  const roleNav = {
    client: [
      ["client", "Home"],
      ["service-room", "My Matters"],
      ["documents", "Legal Help"],
      ["account-privacy", "Profile"]
    ],
    advocate: [
      ["advocate", "Today"],
      ["diary", "Matters"],
      ["bar", "Court Desk"],
      ["chambers", "Chamber"],
      ["account-privacy", "Profile"]
    ],
    intern: [
      ["intern", "Quests"],
      ["task", "My Tasks"],
      ["bar", "Learn"],
      ["account-privacy", "Profile"]
    ],
    admin: [
      ["admin", "Overview"],
      ["login", "Users"],
      ["bar", "Verification"],
      ["escrow", "Payments"],
      ["account-privacy", "Settings"]
    ],
    rna: [
      ["admin", "Overview"],
      ["login", "Users"],
      ["bar", "Verification"],
      ["escrow", "Payments"],
      ["account-privacy", "Settings"]
    ]
  };
  const allowed = {
    client: new Set(["home", "login", "client", "service-room", "documents", "account-privacy", "privacy-policy", "terms", "refund-policy", "disclaimer", "contact", "data-deletion"]),
    advocate: new Set(["home", "login", "advocate", "diary", "bar", "bareact", "judgment", "chambers", "appearance", "posttask", "task", "service-room", "account-privacy", "privacy-policy", "terms", "refund-policy", "disclaimer", "contact", "data-deletion"]),
    intern: new Set(["home", "login", "intern", "task", "bar", "bareact", "judgment", "account-privacy", "privacy-policy", "terms", "refund-policy", "disclaimer", "contact", "data-deletion"]),
    admin: new Set(["home", "login", "admin", "matter", "bar", "bareact", "judgment", "escrow", "service-room", "account-privacy", "privacy-policy", "terms", "refund-policy", "disclaimer", "contact", "data-deletion"]),
    rna: new Set(["home", "login", "admin", "matter", "bar", "bareact", "judgment", "escrow", "service-room", "account-privacy", "privacy-policy", "terms", "refund-policy", "disclaimer", "contact", "data-deletion"])
  };

  function session() {
    try { return JSON.parse(localStorage.getItem("legalConnectSession") || "null"); } catch { return null; }
  }

  function roleOf() {
    const value = session()?.user?.role || session()?.role || "guest";
    return value === "rna" ? "rna" : value;
  }

  function displayName() {
    return session()?.user?.name || "Legal Connect User";
  }

  function navItemsFor(role) {
    return roleNav[role] || [["home", "Home"], ["login", "Login"]];
  }

  function setBodyRole(role) {
    document.body.classList.remove("lc-role-client", "lc-role-advocate", "lc-role-intern", "lc-role-admin", "lc-role-rna", "lc-role-guest");
    document.body.classList.add(`lc-role-${role || "guest"}`);
    const loggedIn = role && role !== "guest" && session()?.user;
    const view = location.hash.replace("#", "") || "home";
    document.body.classList.toggle("lc-app-mode", Boolean(loggedIn));
    document.body.classList.toggle("lc-landing-mode", !loggedIn && (view === "home" || view === "login"));
  }

  function ensureRoleNav(activeId) {
    const role = roleOf();
    setBodyRole(role);
    let nav = document.querySelector("#lc-role-nav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "lc-role-nav";
      nav.className = "lc-role-nav";
      nav.setAttribute("aria-label", "Role navigation");
      document.querySelector(".topbar")?.insertAdjacentElement("afterend", nav);
    }
    nav.innerHTML = navItemsFor(role).map(([view, label]) => `<button type="button" data-role-route="${view}" class="${view === activeId ? "active" : ""}">${label}</button>`).join("");
    nav.style.display = role === "guest" && activeId === "home" ? "none" : "flex";
  }

  function clientDashboard() {
    return `
      <div class="lc-role-shell" data-role-dashboard="client">
        <section class="dash-hero">
          <span class="dash-kicker">Client Portal · 5-second view</span>
          <h2 class="dash-title">${displayName()}, here's your legal status.</h2>
          <p class="dash-sub">Book counsel, trigger Legal SOS, track your matter, and download receipts — without legal jargon.</p>
          <span class="dash-badge">No court attendance needed today</span>
          <div class="dash-metrics">
            <div class="dash-metric"><span>Matter Status</span><strong>Active</strong></div>
            <div class="dash-metric"><span>Next Update</span><strong>5 Aug</strong></div>
            <div class="dash-metric"><span>Receipt</span><strong>Ready</strong></div>
          </div>
        </section>
        <div class="dash-grid">
          <article class="dash-card dash-sos">
            <div class="dash-card-icon">🆘</div>
            <h3>Legal SOS</h3>
            <p>Emergency video counsel, police station help, court notice panic — one tap routing.</p>
            <button type="button" data-open-sos>Start Legal SOS</button>
          </article>
          <article class="dash-card">
            <div class="dash-card-icon">⚖</div>
            <h3>Book Counsel</h3>
            <p>Chat, video, office visit or doorstep support with verified advocates.</p>
            <button type="button" data-open-booking>Book counsel</button>
          </article>
          <article class="dash-card">
            <div class="dash-card-icon">📁</div>
            <h3>My Matters</h3>
            <p>Plain-English timeline, next dates, and uploaded documents in one room.</p>
            <button type="button" data-jump="service-room">Open matter room</button>
          </article>
          <article class="dash-card">
            <div class="dash-card-icon">📄</div>
            <h3>Documents &amp; Drafts</h3>
            <p>Upload files, request drafts, pay securely, and receive a receipt instantly.</p>
            <button type="button" data-jump="documents">Open documents</button>
          </article>
        </div>
        <section class="dash-panel">
          <h3>Your case timeline</h3>
          <ol class="dash-timeline">
            <li><strong>Case recorded</strong><p>Your documents are saved privately in your matter room.</p></li>
            <li><strong>Opponent notified</strong><p>Notice stage complete — waiting for their reply.</p></li>
            <li><strong>Next step</strong><p>We'll notify you before any action is needed from you.</p></li>
          </ol>
        </section>
      </div>`;
  }

  function advocateDashboard() {
    return `
      <div class="lc-role-shell" data-role-dashboard="advocate">
        <section class="dash-hero">
          <span class="dash-kicker">Advocate Command · Today</span>
          <h2 class="dash-title">Adv. ${displayName()}, your court cockpit is ready.</h2>
          <p class="dash-sub">ProxyHub, case diary, court calendar, eCourts sync, and daily judgments — one premium desk.</p>
          <div class="dash-metrics">
            <div class="dash-metric"><span>Hearings Today</span><strong>2</strong></div>
            <div class="dash-metric"><span>Filings Due</span><strong>3</strong></div>
            <div class="dash-metric"><span>Proxy Queue</span><strong>1</strong></div>
            <div class="dash-metric"><span>Judgments</span><strong>New</strong></div>
          </div>
        </section>
        <div class="dash-grid">
          <article class="dash-card"><div class="dash-card-icon">🎯</div><h3>ProxyHub</h3><p>Accept proxy appearances, post court missions, and track proof before payment release.</p><button type="button" data-jump="posttask">Open ProxyHub</button></article>
          <article class="dash-card"><div class="dash-card-icon">📓</div><h3>Case Diary</h3><p>Every matter, next date, stage note, and filing reminder in one calm board.</p><button type="button" data-jump="diary">Open case diary</button></article>
          <article class="dash-card"><div class="dash-card-icon">🏛</div><h3>Court Calendar</h3><p>Today's cause list, pass-over watch, and chamber prep checklist.</p><button type="button" data-jump="appearance">Court calendar</button></article>
          <article class="dash-card"><div class="dash-card-icon">🔗</div><h3>eCourts Access</h3><p>Sync CNR, check listing status, and open matter snapshots quickly.</p><button type="button" data-jump="matter">Open eCourts desk</button></article>
          <article class="dash-card"><div class="dash-card-icon">📚</div><h3>Judgments Library</h3><p>Daily judgments, bare acts, and source-locked research for arguments.</p><button type="button" data-jump="judgment">Browse judgments</button></article>
          <article class="dash-card"><div class="dash-card-icon">🏢</div><h3>Chamber Mode</h3><p>Review drafts, assign interns, and keep client identity protected.</p><button type="button" data-jump="chambers">Enter chamber</button></article>
        </div>
        <section class="dash-panel">
          <h3>Today's cause list</h3>
          <table class="dash-table"><thead><tr><th>Matter</th><th>Court</th><th>Item</th><th>Action</th></tr></thead><tbody><tr><td>State v. Mehra</td><td>Delhi HC · Court 5</td><td>17</td><td>Arguments</td></tr><tr><td>Metro Infra dispute</td><td>Saket Court · 214</td><td>8</td><td>Pass-over watch</td></tr></tbody></table>
        </section>
      </div>`;
  }

  function internDashboard() {
    return `
      <div class="lc-role-shell" data-role-dashboard="intern">
        <section class="dash-hero">
          <span class="dash-kicker">Internverse · Learn &amp; Earn</span>
          <h2 class="dash-title">Level 2 Researcher · ${displayName()}</h2>
          <p class="dash-sub">Complete admin-posted missions, earn XP, unlock mentor reviews, and claim rewards at 1,000 XP.</p>
          <div class="dash-xp-wrap">
            <div class="dash-xp-head"><span>XP Progress</span><strong>620 / 1,000 XP</strong></div>
            <div class="dash-xp-bar"><span style="width:62%"></span></div>
            <div class="dash-reward">🎁 Reward unlocks at 1,000 XP — Verified Intern Certificate + chamber priority access</div>
          </div>
          <div class="dash-metrics">
            <div class="dash-metric"><span>Active Quests</span><strong>3</strong></div>
            <div class="dash-metric"><span>XP This Week</span><strong>+180</strong></div>
            <div class="dash-metric"><span>Mentor Reviews</span><strong>2</strong></div>
          </div>
        </section>
        <div class="dash-grid">
          <article class="dash-card"><div class="dash-card-icon">🔍</div><h3>Research Quest · +250 XP</h3><p>Find 5 bail judgments from approved sources and summarise in two pages.</p><button type="button" data-jump="task">Start quest</button></article>
          <article class="dash-card"><div class="dash-card-icon">📋</div><h3>Chamber Assist · +180 XP</h3><p>Index documents for tomorrow's Delhi HC matter — admin assigned.</p><button type="button" data-jump="task">Accept task</button></article>
          <article class="dash-card"><div class="dash-card-icon">📖</div><h3>Learn Track</h3><p>Bare acts, procedure notes, and judgment reading before court-facing work.</p><button type="button" data-jump="bar">Open learning</button></article>
          <article class="dash-card"><div class="dash-card-icon">🏆</div><h3>Rewards Board</h3><p>See XP milestones, certificates, and what unlocks at each level.</p><button type="button" class="dash-btn-ghost" data-jump="intern">View rewards</button></article>
        </div>
      </div>`;
  }

  function adminDashboard() {
    return `
      <div class="lc-role-shell" data-role-dashboard="admin">
        <section class="role-dash-hero">
          <span class="role-dash-kicker">Admin Control Room</span>
          <h2 class="role-dash-title">Platform supervision, separated from user workspaces.</h2>
          <div class="lc-role-metrics">
            <div class="lc-role-metric"><span>Users</span><strong>Active</strong></div>
            <div class="lc-role-metric"><span>Verifications</span><strong>Pending</strong></div>
            <div class="lc-role-metric"><span>Payments</span><strong>Hold</strong></div>
          </div>
        </section>
        <section class="role-dash-card">
          <h3>Operations table</h3>
          <table class="role-dash-table"><thead><tr><th>Queue</th><th>Status</th><th>Owner</th><th>Action</th></tr></thead><tbody><tr><td>User verification</td><td>Review</td><td>RNA Desk</td><td>Check profile</td></tr><tr><td>Work completion hold</td><td>Awaiting proof</td><td>Payments</td><td>Verify</td></tr><tr><td>Source library</td><td>Pending approval</td><td>Legal AI Admin</td><td>Review</td></tr></tbody></table>
        </section>
      </div>`;
  }

  function renderRoleDashboards() {
    const map = { client: clientDashboard, advocate: advocateDashboard, intern: internDashboard, admin: adminDashboard };
    Object.entries(map).forEach(([id, renderer]) => {
      const node = document.getElementById(id);
      if (node) {
        node.innerHTML = renderer();
        node.dataset.phase2Dashboard = "true";
      }
    });
  }

  function canOpen(viewId, role) {
    if (!privateViews.has(viewId)) return true;
    if (!session()?.user) return false;
    return Boolean((allowed[role] || allowed.client).has(viewId));
  }

  const previousActivateView = typeof activateView === "function" ? activateView : null;
  activateView = function phase2ActivateView(viewId) {
    const role = roleOf();
    renderRoleDashboards();
    let next = viewId || "home";
    if (!canOpen(next, role)) {
      next = session()?.user ? (roleHome[role] || "client") : "login";
    }
    ensureRoleNav(next);
    if (previousActivateView) previousActivateView(next);
    document.querySelectorAll("#lc-role-nav [data-role-route]").forEach((button) => button.classList.toggle("active", button.dataset.roleRoute === next));
  };

  const previousApplySessionToUi = typeof applySessionToUi === "function" ? applySessionToUi : null;
  applySessionToUi = function phase2ApplySessionToUi(nextSession) {
    if (previousApplySessionToUi) previousApplySessionToUi(nextSession);
    renderRoleDashboards();
    ensureRoleNav(location.hash.replace("#", "") || "home");
  };

  document.addEventListener("click", (event) => {
    const routeButton = event.target.closest("[data-role-route]");
    if (!routeButton) return;
    event.preventDefault();
    activateView(routeButton.dataset.roleRoute);
  });

  renderRoleDashboards();
  ensureRoleNav(location.hash.replace("#", "") || "home");
  if (privateViews.has(location.hash.replace("#", ""))) activateView(location.hash.replace("#", ""));
})();
