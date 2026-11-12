// components.js: small reusable helpers shared by every page.
// Rule: build DOM with createElement/textContent (the h() helper below). Never put user-supplied text
// into innerHTML.

import { t } from "./i18n.js";

// ------------------------------------------------------------------ DOM helpers

/**
 * h("div", { class: "card", "aria-label": "x", onClick: fn }, child, "text", ...)
 * Strings become text nodes (never HTML), so user text is always safe here.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

/** A Font Awesome icon that screen readers skip (the words next to it carry the meaning). */
export function icon(name, extra = "") {
  return h("i", { class: `fa-solid ${name} ${extra}`.trim(), "aria-hidden": "true" });
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function setBusy(button, busy) {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
}

// ------------------------------------------------------------------ shared data

export const ROLE_LABELS = {
  caregiver: "Caregiver",
  occupational_therapist: "Occupational therapist",
  sped_teacher: "SPED teacher",
};

// The first value is what the API stores; the second is what the adult reads.
export const DELAY_DOMAINS = [
  ["speech", "Speech and language"],
  ["motor", "Motor skills"],
  ["cognitive", "Learning and thinking"],
  ["social_emotional", "Social and emotional"],
  ["adaptive", "Self-care (adaptive)"],
  ["global", "Global developmental delay"],
  ["other", "Other"],
];

export function domainLabel(value) {
  const found = DELAY_DOMAINS.find(([id]) => id === value);
  return found ? found[1] : value;
}

// Preset avatars (real photo upload is out of scope). The id is also the Font Awesome icon name.
export const AVATARS = ["cat", "dog", "fish", "dragon", "paw", "rocket", "star", "train"];

export function avatarIconClass(id) {
  return AVATARS.includes(id) ? `fa-${id}` : "fa-child";
}

export function renderAvatar(id, extra = "") {
  return h("span", { class: `avatar ${extra}`.trim(), "aria-hidden": "true" }, icon(avatarIconClass(id)));
}

// ------------------------------------------------------------------ dates and times

const pad = (n) => String(n).padStart(2, "0");

/** The browser's local calendar day as YYYY-MM-DD (the child's day, not the server's). */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse YYYY-MM-DD as a LOCAL date (new Date("2026-11-04") would be read as UTC and can shift a day). */
export function parseLocalDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLong(iso, lang = "en") {
  return parseLocalDate(iso).toLocaleDateString(lang === "fil" ? "fil-PH" : "en-US",
    { weekday: "long", month: "long", day: "numeric" });
}

export function formatDateShort(iso) {
  return parseLocalDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "08:30" -> "8:30 AM" (friendlier for a child than the 24-hour clock). */
export function formatTime12(hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${pad(mm)} ${hh < 12 ? "AM" : "PM"}`;
}

export function percent(rate) {
  return rate == null ? "–" : `${Math.round(rate * 100)}%`;
}

// ------------------------------------------------------------------ navigation shell

const NAV_ITEMS = [
  { href: "dashboard.html", key: "nav_dashboard", icon: "fa-house", page: "dashboard" },
  { href: "schedule-creator.html", key: "nav_schedule", icon: "fa-calendar-days", page: "schedule-creator" },
  { href: "child-view.html", key: "nav_child_view", icon: "fa-child", page: "child-view" },
  { href: "communication.html", key: "nav_talk", icon: "fa-comments", page: "communication" },
  { href: "progress.html", key: "nav_progress", icon: "fa-chart-simple", page: "progress" },
  { href: "settings.html", key: "nav_settings", icon: "fa-gear", page: "settings" },
];

/**
 * Builds the navbar into #app-header: a hamburger that opens an offcanvas menu below 992px,
 * the signed-in name and role, a log out button, and aria-current on the active page.
 * The child view has no navbar on purpose: a child should not see adult navigation.
 */
export function renderShell(activePage, { lang = "en", user = null, onLogout } = {}) {
  const header = document.getElementById("app-header");
  if (!header || activePage === "child-view") return;
  clear(header);

  const links = NAV_ITEMS.map((item) => h("li", { class: "nav-item" },
    h("a", { class: `nav-link${item.page === activePage ? " active" : ""}`, href: item.href,
             "aria-current": item.page === activePage ? "page" : null },
      icon(item.icon, "me-2 d-xl-none"), t(item.key, lang))));

  // Wide screens: name only (the role is in the menu and on hover). Between 1200 and 1399px the name collapses to an
  // icon (still read aloud) so the whole bar fits on one line at a common laptop width.
  const who = user ? h("span", { class: "navbar-text me-xl-3 text-nowrap", id: "user-badge", title: `${user.name} \u00b7 ${ROLE_LABELS[user.role] || user.role}` },
    icon("fa-circle-user", "me-1 user-icon"),
    h("strong", { class: "user-name-text" }, user.name),
    h("span", { class: "text-muted d-xl-none" }, ` \u00b7 ${ROLE_LABELS[user.role] || user.role}`)) : null;

  header.append(
    h("nav", { class: "navbar navbar-expand-xl bg-white border-bottom", "aria-label": "Main" },
      h("div", { class: "container" },
        h("a", { class: "navbar-brand fw-semibold", href: "dashboard.html" }, icon("fa-calendar-check", "me-2"), "Visual Schedule"),
        h("button", { class: "navbar-toggler", type: "button", "data-bs-toggle": "offcanvas",
                      "data-bs-target": "#nav-offcanvas", "aria-controls": "nav-offcanvas", "aria-label": t("menu", lang) },
          h("span", { class: "navbar-toggler-icon" })),
        h("div", { class: "offcanvas-xl offcanvas-end flex-grow-1", tabindex: "-1", id: "nav-offcanvas", "aria-labelledby": "nav-offcanvas-title" },
          h("div", { class: "offcanvas-header" },
            h("h2", { class: "offcanvas-title h5", id: "nav-offcanvas-title" }, t("menu", lang)),
            h("button", { type: "button", class: "btn-close", "data-bs-dismiss": "offcanvas", "data-bs-target": "#nav-offcanvas", "aria-label": "Close" })),
          h("div", { class: "offcanvas-body align-items-xl-center" },
            h("ul", { class: "navbar-nav me-auto" }, links),
            h("div", { class: "d-flex flex-column flex-xl-row align-items-xl-center gap-2" }, who,
              h("button", { type: "button", class: "btn btn-outline-secondary text-nowrap", id: "logout-btn", onClick: onLogout },
                icon("fa-right-from-bracket", "me-2"), t("logout", lang))))))));
}

// ------------------------------------------------------------------ task rendering

/** One task in a strip or list. State is shown with an icon AND a word, never colour alone. */
export function renderTaskCard(task, { state = "later", lang = "en" } = {}) {
  const stateIcon = state === "done" ? "fa-circle-check" : state === "now" ? "fa-circle-dot" : "fa-clock";
  return h("li", { class: `task-chip task-${state}`, ...(state === "now" ? { "aria-current": "step" } : {}) },
    h("span", { class: "task-chip-icon" }, icon(task.icon)),
    h("span", { class: "task-chip-name" }, task.name),
    h("span", { class: "task-chip-time" }, formatTime12(task.time)),
    h("span", { class: "task-chip-state" }, icon(stateIcon, "me-1"), t(state, lang)));
}

/**
 * The state of each task for display: done, now (always the FIRST pending task in order), or later.
 * Shared by the child view and the schedule preview so they can never disagree.
 */
export function taskStates(tasks) {
  const firstPending = tasks.findIndex((task) => task.status !== "completed");
  return tasks.map((task, index) => (task.status === "completed" ? "done" : index === firstPending ? "now" : "later"));
}

/** Empty state block with a message and an optional action element. */
export function renderEmptyState(message, action = null) {
  return h("div", { class: "empty-state text-center text-muted py-4" }, h("p", { class: "mb-2" }, message), action);
}

// ------------------------------------------------------------------ errors and confirmation

/** Marks one input as invalid with an icon AND words (never colour alone), linked for screen readers. */
export function setFieldError(input, message) {
  input.classList.add("is-invalid");
  input.setAttribute("aria-invalid", "true");
  const id = `${input.id || input.name}-error`;
  input.setAttribute("aria-describedby", id);
  const box = h("div", { class: "field-error", id, role: "alert" }, icon("fa-circle-exclamation", "me-1"), message);
  (input.closest(".mb-3, .form-check, .col-md-6") || input.parentElement).append(box);
}

export function clearFieldErrors(root) {
  root.querySelectorAll(".field-error").forEach((el) => el.remove());
  root.querySelectorAll(".is-invalid").forEach((el) => {
    el.classList.remove("is-invalid");
    el.removeAttribute("aria-invalid");
    el.removeAttribute("aria-describedby");
  });
}

/**
 * Shows server (or client) field errors next to inputs marked data-field="<name>".
 * Messages with no matching input are returned so the caller can show them in a general area.
 */
export function applyFieldErrors(root, fields = {}) {
  const unmatched = [];
  let first = null;
  for (const [name, message] of Object.entries(fields)) {
    const input = root.querySelector(`[data-field="${name}"]`);
    if (input) {
      setFieldError(input, message);
      first = first || input;
    } else {
      unmatched.push(`${name}: ${message}`);
    }
  }
  if (first) first.focus();
  return unmatched;
}

/** A Bootstrap confirmation dialog that resolves true (confirmed) or false (cancelled, Esc, or backdrop). */
export function confirmModal(message, { title = "Please confirm", confirmLabel = "Confirm", cancelLabel = "Cancel", danger = false } = {}) {
  return new Promise((resolve) => {
    const id = `confirm-${Date.now()}`;
    const modal = h("div", { class: "modal fade", id, tabindex: "-1", "aria-labelledby": `${id}-title`, "aria-hidden": "true" },
      h("div", { class: "modal-dialog modal-dialog-centered" },
        h("div", { class: "modal-content" },
          h("div", { class: "modal-header" }, h("h2", { class: "modal-title h5", id: `${id}-title` }, title)),
          h("div", { class: "modal-body" }, h("p", { class: "mb-0" }, message)),
          h("div", { class: "modal-footer" },
            h("button", { type: "button", class: "btn btn-outline-secondary", "data-answer": "no" }, cancelLabel),
            h("button", { type: "button", class: `btn ${danger ? "btn-danger" : "btn-primary"}`, "data-answer": "yes" }, confirmLabel)))));
    document.body.append(modal);
    const instance = new window.bootstrap.Modal(modal);
    let answer = false;
    modal.addEventListener("click", (e) => {
      const button = e.target.closest("[data-answer]");
      if (button) { answer = button.dataset.answer === "yes"; instance.hide(); }
    });
    modal.addEventListener("hidden.bs.modal", () => { instance.dispose(); modal.remove(); resolve(answer); });
    instance.show();
  });
}
