(function () {
  const HERO_QUOTES = [
    {
      sanskrit: "यतो धर्मस्ततो जयः",
      english: "Where there is Dharma, there is Victory.",
      source: "Mahabharata",
      category: "Indian Epics",
    },
    {
      sanskrit: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",
      english: "You have a right to perform your duty, but not to the fruits of action.",
      source: "Bhagavad Gita · 2.47",
      category: "Bhagavad Gita",
    },
    {
      english: "Constitutional morality is not a natural sentiment. It has to be cultivated.",
      source: "Dr. B. R. Ambedkar",
      category: "Constitutional Thinkers",
    },
    {
      english: "A lawyer's true function is to unite parties riven asunder.",
      source: "Mahatma Gandhi",
      category: "Famous Jurists",
    },
    {
      english: "The life of the law has not been logic; it has been experience.",
      source: "Oliver Wendell Holmes Jr.",
      category: "Legal Classics",
    },
    {
      sanskrit: "धर्म एव हतो हन्ति धर्मो रक्षति रक्षितः",
      english: "Dharma destroyed destroys; Dharma protected protects.",
      source: "Manusmriti · 8.15",
      category: "Dharma Shastra",
    },
    {
      english: "Injustice anywhere is a threat to justice everywhere.",
      source: "Martin Luther King Jr.",
      category: "Justice & Law",
    },
    {
      english: "Sunlight is said to be the best of disinfectants.",
      source: "Justice Louis D. Brandeis",
      category: "Famous Jurists",
    },
  ];

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
  let heroQuoteIndex = 0;
  let quoteTimer = null;
  let heroQuoteTimer = null;
  let currentSignupRole = "client";

  function renderHeroQuote(index) {
    const q = HERO_QUOTES[index % HERO_QUOTES.length];
    const box = document.getElementById("hero-quote-box");
    const sans = document.getElementById("hero-quote-sanskrit");
    const eng = document.getElementById("hero-quote-english");
    const src = document.getElementById("hero-quote-source");
    const dots = document.getElementById("hero-quote-dots");

    if (box) {
      box.classList.remove("lc-quote-visible");
      box.classList.add("lc-quote-changing");
    }

    window.setTimeout(() => {
      if (sans) {
        sans.textContent = q.sanskrit || "";
        sans.style.display = q.sanskrit ? "block" : "none";
      }
      if (eng) eng.textContent = q.english;
      if (src) src.textContent = `— ${q.source}`;
      if (dots) {
        dots.innerHTML = HERO_QUOTES.map((_, i) =>
          `<span class="${i === index ? "active" : ""}"></span>`,
        ).join("");
      }
      if (box) {
        box.classList.remove("lc-quote-changing");
        box.classList.add("lc-quote-visible");
      }
    }, 320);
  }

  function startHeroQuotes() {
    renderHeroQuote(heroQuoteIndex);
    if (heroQuoteTimer) clearInterval(heroQuoteTimer);
    heroQuoteTimer = setInterval(() => {
      heroQuoteIndex = (heroQuoteIndex + 1) % HERO_QUOTES.length;
      renderHeroQuote(heroQuoteIndex);
    }, 8000);
  }

  function initParallax() {
    const bg = document.getElementById("lc-hero-bg");
    if (!bg || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        bg.style.transform = `scale(1.08) translateY(${y * 0.18}px)`;
      }
    }, { passive: true });
  }

  function initHeaderScroll() {
    const header = document.querySelector(".lc-header");
    if (!header) return;
    window.addEventListener("scroll", () => {
      header.classList.toggle("lc-header-scrolled", window.scrollY > 40);
    }, { passive: true });
  }

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
  startHeroQuotes();
  initParallax();
  initHeaderScroll();
})();
