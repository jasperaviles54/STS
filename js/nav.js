import { logout, getSession } from "./auth.js";
import { DEMO_EMAIL } from "./config.js";

export async function renderNav(active) {
  const items = [
    { href: "today.html",    label: "Today",    key: "today" },
    { href: "weekly.html",   label: "Weekly",   key: "weekly" },
    { href: "monthly.html",  label: "Monthly",  key: "monthly" },
    { href: "yearly.html",   label: "Yearly",   key: "yearly" },
    { href: "products.html", label: "Products", key: "products" },
  ];
  const links = items.map(i =>
    `<li class="nav-item"><a class="nav-link ${i.key === active ? "active" : ""}" href="${i.href}">${i.label}</a></li>`
  ).join("");

  const session = await getSession();
  const isDemo = !!DEMO_EMAIL && session?.user?.email === DEMO_EMAIL;
  const demoBadge = isDemo
    ? `<span class="badge bg-warning text-dark me-2">DEMO MODE</span>`
    : "";

  const html = `
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div class="container-fluid">
        <a class="navbar-brand" href="today.html">Sales Tracker</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav me-auto">${links}</ul>
          ${demoBadge}
          <button id="logoutBtn" class="btn btn-outline-light btn-sm">Logout</button>
        </div>
      </div>
    </nav>`;
  const slot = document.getElementById("nav");
  if (slot) slot.innerHTML = html;
  document.getElementById("logoutBtn")?.addEventListener("click", logout);
}
