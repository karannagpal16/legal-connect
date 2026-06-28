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
  admin: "Admin Panel"
};

const navItems = [...document.querySelectorAll(".nav-item")];
const views = [...document.querySelectorAll(".view")];
const title = document.querySelector("#view-title");
const demoStatus = document.querySelector("#demo-status");

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
    setDemoStatus(`${card.querySelector("strong")?.textContent || "Role"} selected. Login routing preview updated.`);
  });
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
  case: "Case tracker demo shows timeline, orders, reminders and next action. Live court data needs backend polling, compliance checks and source permissions.",
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
  button.addEventListener("click", () => {
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

const initialView = location.hash.replace("#", "");
if (initialView && document.getElementById(initialView)) {
  activateView(initialView);
}

window.addEventListener("hashchange", () => {
  const nextView = location.hash.replace("#", "");
  if (nextView && document.getElementById(nextView)) {
    activateView(nextView);
  }
});
