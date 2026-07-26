(function () {
  const QUOTES = {
    client: [
      { text: "Justice delayed is justice denied — but clarity should never wait.", author: "Legal Connect" },
      { text: "A lawyer's true function is to unite parties riven asunder.", author: "Mahatma Gandhi" },
      { text: "The first duty of society is justice.", author: "Alexander Hamilton" },
    ],
    advocate: [
      { text: "You have a right to perform your duty, but not to the fruits of action.", author: "Bhagavad Gita", source: "Chapter 2, Verse 47" },
      { text: "Constitutional morality is not a natural sentiment. It has to be cultivated.", author: "Dr. B. R. Ambedkar" },
      { text: "Yato dharmastato jayah — Where there is Dharma, there is victory.", author: "Mahabharata" },
    ],
    intern: [
      { text: "The good lawyer is the man who has an eye to every side, but who prepares himself.", author: "Abraham Lincoln" },
      { text: "Learning law is learning to see the world through the eyes of justice.", author: "Legal Connect Internverse" },
    ],
  };

  const SIGNUP_COPY = {
    client: {
      label: "CLIENT PORTAL",
      headline: "Your Personal Legal Hub",
      sub: "Track cases, connect with counsel, and get help when it matters.",
      perks: ["Case tracking", "Verified lawyers", "Legal SOS", "Secure documents"],
      image: "news/news-1.png",
      cta: "Enter Client Dashboard",
    },
    advocate: {
      label: "ADVOCATE PORTAL",
      headline: "Litigation Command Centre",
      sub: "Cases, court diary, research and clients — one powerful desk.",
      perks: ["Case tracker", "Court diary", "Daily judgments", "Lawyer AI"],
      image: "images/law-library-bg.png",
      cta: "Enter Advocate Dashboard",
    },
    intern: {
      label: "INTERNVERSE",
      headline: "Learn Law by Doing",
      sub: "Complete missions, earn XP, unlock verified rewards.",
      perks: ["Practical missions", "Mentor reviews", "XP & certificates"],
      image: "images/law-library-bg.png",
      cta: "Enter Intern Dashboard",
    },
  };

  let quoteIndex = 0;
  let quoteTimer = null;
  let currentSignupRole = "client";

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem("legalConnectSession") || "null");
    } catch {
      return null;
    }
  }

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  function updateLandingMode(viewId) {
    const isLanding = !getSession()?.user && (viewId === "home" || viewId === "login");
    document.body.classList.toggle("lc-landing-mode", isLanding);
  }

  function setSignupRole(role) {
    currentSignupRole = role in SIGNUP_COPY ? role : "client";
    const copy = SIGNUP_COPY[currentSignupRole];
    const roleSelect = document.querySelector("#login-role");
    if (roleSelect) roleSelect.value = currentSignupRole;

    document.querySelectorAll(".role-card").forEach((card) => {
      card.classList.toggle("selected", card.dataset.loginRole === currentSignupRole);
    });

    const label = document.querySelector("#signup-role-label");
    const headline = document.querySelector("#signup-headline");
    const sub = document.querySelector("#signup-subheadline");
    const perks = document.querySelector("#signup-perks");
    const bg = document.querySelector("#signup-visual-bg");
    const submitBtn = document.querySelector("#role-login-form .gold-button");

    if (label) label.textContent = copy.label;
    if (headline) headline.textContent = copy.headline;
    if (sub) sub.textContent = copy.sub;
    if (submitBtn) submitBtn.textContent = copy.cta;
    if (bg) bg.style.backgroundImage = `url('${copy.image}')`;
    if (perks) {
      perks.innerHTML = copy.perks.map((p) => `<span>${p}</span>`).join("");
    }

    quoteIndex = 0;
    renderQuote();
    restartQuoteTimer();
  }

  function renderQuote() {
    const quotes = QUOTES[currentSignupRole] || QUOTES.client;
    const q = quotes[quoteIndex % quotes.length];
    const block = document.querySelector("#signup-quote-text");
    const author = document.querySelector("#signup-quote-author");
    if (block) block.textContent = `"${q.text}"`;
    if (author) {
      author.textContent = q.source ? `— ${q.author} · ${q.source}` : `— ${q.author}`;
    }
  }

  function restartQuoteTimer() {
    if (quoteTimer) clearInterval(quoteTimer);
    quoteTimer = setInterval(() => {
      const quotes = QUOTES[currentSignupRole] || QUOTES.client;
      quoteIndex = (quoteIndex + 1) % quotes.length;
      renderQuote();
    }, 7000);
  }

  window.openSignup = function openSignup(role) {
    setSignupRole(role || "client");
    if (typeof activateView === "function") activateView("login");
  };

  window.handlePortalClick = function handlePortalClick(role) {
    const session = getSession();
    const routes = { client: "client", advocate: "advocate", intern: "intern" };
    if (session?.user?.role) {
      const userRole = session.user.role;
      if (userRole === role || (role === "advocate" && userRole === "rna")) {
        if (typeof activateView === "function") activateView(routes[role] || "client");
        return;
      }
    }
    openSignup(role);
  };

  document.addEventListener("click", (event) => {
    const signupBtn = event.target.closest("[data-signup]");
    if (signupBtn) {
      event.preventDefault();
      event.stopImmediatePropagation();
      handlePortalClick(signupBtn.dataset.signup);
      return;
    }

    const scrollBtn = event.target.closest("[data-scroll]");
    if (scrollBtn) {
      event.preventDefault();
      scrollToSection(scrollBtn.dataset.scroll);
    }

    const backBtn = event.target.closest("[data-back-home]");
    if (backBtn) {
      event.preventDefault();
      if (typeof activateView === "function") activateView("home");
    }
  }, true);

  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection(btn.dataset.scroll);
    });
  });

  document.querySelectorAll(".role-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.dataset.loginRole) setSignupRole(card.dataset.loginRole);
    });
  });

  const origActivate = window.activateView;
  if (typeof origActivate === "function") {
    window.activateView = function wrappedActivate(id) {
      updateLandingMode(id);
      if (id === "login") setSignupRole(currentSignupRole);
      return origActivate(id);
    };
  }

  document.querySelectorAll(".lc-reveal").forEach((el, i) => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
    );
    el.style.transitionDelay = `${i * 0.05}s`;
    observer.observe(el);
  });

  updateLandingMode(location.hash.replace("#", "") || "home");
  setSignupRole("client");
})();
