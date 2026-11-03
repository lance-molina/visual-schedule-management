// Dashboard: the three stat cards and the children grid with add, edit and delete.
// Never calls fetch directly (use api.js). Every piece of user text goes through textContent via h().

import { children as childrenApi, dashboard } from "./api.js";
import { AVATARS, DELAY_DOMAINS, applyFieldErrors, avatarIconClass, clear, clearFieldErrors, confirmModal, domainLabel,
         h, icon, renderAvatar, renderEmptyState, setBusy, todayLocal } from "./components.js";
import { initPage, showToast } from "./script.js";

const els = {
  list: document.getElementById("children-list"),
  error: document.getElementById("dash-error"),
  errorText: document.getElementById("dash-error-text"),
  modalEl: document.getElementById("child-modal"),
  form: document.getElementById("child-form"),
  title: document.getElementById("child-modal-title"),
  save: document.getElementById("child-save"),
  formError: document.getElementById("child-form-error"),
};
const modal = window.bootstrap.Modal.getOrCreateInstance(els.modalEl);
let editingId = null;

// ------------------------------------------------------------------ loading

async function load() {
  els.error.hidden = true;
  try {
    const [summary, kids] = await Promise.all([dashboard.summary(todayLocal()), childrenApi.list({ per_page: 100 })]);
    document.getElementById("stat-children").textContent = summary.total_children;
    document.getElementById("stat-completed").textContent = summary.tasks_completed_today;
    document.getElementById("stat-upcoming").textContent = summary.upcoming_routines;
    renderChildren(kids.items);
  } catch (err) {
    els.errorText.textContent = `Could not load the dashboard. ${err.message}`;
    els.error.hidden = false;
  }
}

function renderChildren(items) {
  clear(els.list);
  if (!items.length) {
    els.list.append(h("div", { class: "col-12" }, renderEmptyState("No children yet. Add the first one.")));
    return;
  }
  for (const child of items) els.list.append(childCard(child));
}

function childCard(child) {
  const link = (page, label, symbol) => h("a", { class: "btn btn-outline-primary btn-sm", href: `${page}?child=${child.id}` },
    icon(symbol), h("span", {}, label));
  return h("div", { class: "col-md-6 col-xl-4" },
    h("div", { class: "card child-card h-100 p-3" },
      h("div", { class: "child-card-head" },
        renderAvatar(child.photo_url, "avatar-lg"),
        h("div", { class: "child-card-title" },
          h("h3", { class: "h5 mb-0" }, child.name),
          h("div", { class: "child-meta" }, `Age ${child.age}`),
          h("div", { class: "child-meta" }, domainLabel(child.delay_domain))),
        h("div", { class: "child-card-tools" },
          h("button", { type: "button", class: "btn btn-outline-secondary btn-sm", "aria-label": `Edit ${child.name}`,
                        onClick: () => openModal(child) }, icon("fa-pen")),
          h("button", { type: "button", class: "btn btn-outline-danger btn-sm", "aria-label": `Delete ${child.name}`,
                        onClick: () => removeChild(child) }, icon("fa-trash")))),
      child.notes ? h("p", { class: "child-notes" }, child.notes) : null,
      h("div", { class: "child-actions" },
        link("schedule-creator.html", "Schedule", "fa-calendar-days"),
        link("child-view.html", "Child view", "fa-child"),
        link("progress.html", "Progress", "fa-chart-simple"))));
}

// ------------------------------------------------------------------ add / edit

function buildFormOptions() {
  const select = document.getElementById("child-domain");
  select.append(h("option", { value: "" }, "Choose one"));
  for (const [value, label] of DELAY_DOMAINS) select.append(h("option", { value }, label));

  const picker = document.getElementById("avatar-picker");
  const options = [["", "None"], ...AVATARS.map((id) => [id, id.charAt(0).toUpperCase() + id.slice(1)])];
  for (const [value, label] of options) {
    const id = `avatar-${value || "none"}`;
    picker.append(
      h("div", {}, h("input", { type: "radio", name: "avatar", id, value }),
        h("label", { for: id }, icon(value ? avatarIconClass(value) : "fa-child"), label)));
  }
}

function openModal(child = null) {
  editingId = child ? child.id : null;
  clearFieldErrors(els.form);
  els.formError.textContent = "";
  els.title.textContent = child ? `Edit ${child.name}` : "Add child";
  document.getElementById("child-name").value = child ? child.name : "";
  document.getElementById("child-age").value = child ? child.age : "";
  const select = document.getElementById("child-domain");
  // A value that is not in the list (old data) is kept as an extra option so saving does not lose it.
  if (child && !DELAY_DOMAINS.some(([id]) => id === child.delay_domain)) {
    select.append(h("option", { value: child.delay_domain }, child.delay_domain));
  }
  select.value = child ? child.delay_domain : "";
  document.getElementById("child-notes").value = child && child.notes ? child.notes : "";
  const avatar = child && child.photo_url ? child.photo_url : "";
  els.form.querySelector(`input[name=avatar][value="${avatar}"]`)?.click();
  modal.show();
  els.modalEl.addEventListener("shown.bs.modal", () => document.getElementById("child-name").focus(), { once: true });
}

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(els.form);
  els.formError.textContent = "";
  const name = document.getElementById("child-name").value.trim();
  const ageText = document.getElementById("child-age").value.trim();
  const age = Number(ageText);
  const domain = document.getElementById("child-domain").value;

  const problems = {};
  if (!name) problems.name = "Enter a first name";
  if (!ageText || !Number.isInteger(age) || age < 1 || age > 18) problems.age = "Enter an age from 1 to 18";
  if (!domain) problems.delay_domain = "Choose a category";
  if (Object.keys(problems).length) { applyFieldErrors(els.form, problems); return; }

  const body = {
    name, age, delay_domain: domain,
    notes: document.getElementById("child-notes").value.trim() || null,
    photo_url: els.form.querySelector("input[name=avatar]:checked")?.value || null,
  };
  setBusy(els.save, true);
  try {
    if (editingId) await childrenApi.update(editingId, body);
    else await childrenApi.create(body);
    modal.hide();
    showToast(editingId ? "Changes saved" : `${name} was added`);
    await load();
  } catch (err) {
    const unmatched = applyFieldErrors(els.form, err.fields || {});
    if (unmatched.length || !Object.keys(err.fields || {}).length) {
      els.formError.replaceChildren(icon("fa-circle-exclamation", "me-1"), unmatched.join(" ") || err.message);
    }
  } finally {
    setBusy(els.save, false);
  }
});

// ------------------------------------------------------------------ delete

async function removeChild(child) {
  const ok = await confirmModal(
    `Delete ${child.name}? This also deletes every schedule and task for ${child.name}. This cannot be undone.`,
    { title: "Delete child", confirmLabel: "Delete", danger: true });
  if (!ok) return;
  try {
    await childrenApi.remove(child.id);
    showToast(`${child.name} was deleted`);
    await load();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ------------------------------------------------------------------ start

document.getElementById("add-child-btn").addEventListener("click", () => openModal());
document.getElementById("dash-retry").addEventListener("click", load);
buildFormOptions();
await initPage("dashboard");
await load();
