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
  appearance: "Appearance Network",
  posttask: "Post Appearance Task",
  task: "Task Detail",
  escrow: "Escrow Status",
  client: "Client Portal",
  intern: "Intern Portal",
  admin: "Admin Panel"
};

const navItems = [...document.querySelectorAll(".nav-item")];
const views = [...document.querySelectorAll(".view")];
const title = document.querySelector("#view-title");

function activateView(id) {
  const target = document.getElementById(id);
  if (!target) return;

  views.forEach((view) => view.classList.toggle("active", view.id === id));
  navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === id));
  title.textContent = titles[id] || "Legal Connect";
  history.replaceState(null, "", `#${id}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => activateView(item.dataset.view));
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.jump));
});

document.querySelectorAll(".role-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".role-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
  });
});

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
