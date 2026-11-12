// Talking board: tap a picture to hear the word and add it to the sentence; Speak reads the whole sentence.
// Built-in starter cards come from board-cards.js; cards the adult adds are saved through /api/cards.
// Speech: speech.js tries the online Edge voice first and falls back to the browser's own voice; if neither works the words stay on screen.

import { cards as cardsApi } from "./api.js";
import { BUILT_IN, CATEGORIES, PICTURES } from "./board-cards.js";
import { clear, confirmModal, h, icon, setBusy } from "./components.js";
import { t } from "./i18n.js";
import { speak as say, stop as stopSpeaking } from "./speech.js";
import { getCachedSettings, initPage, showToast } from "./script.js";

const $ = (id) => document.getElementById(id);
await initPage("communication");
const lang = getCachedSettings().language;

const state = { custom: [], category: CATEGORIES[0], sentence: [], icon: PICTURES[0] };

// ------------------------------------------------------------------ static text (this page is for the child, so it is translated)

$("talk-title").textContent = t("talk_title", lang);
$("talk-help").textContent = t("talk_help", lang);
$("speak-label").textContent = t("talk_speak", lang);
$("back-label").textContent = t("talk_back", lang);
$("clear-label").textContent = t("talk_clear", lang);
document.title = `${t("talk_title", lang)} | Visual Schedule`;

// ------------------------------------------------------------------ speech

async function speak(text) {
  const how = await say(text, lang);                       // a new word replaces the one still being said
  $("voice-note").textContent = t("talk_no_voice", lang);
  $("voice-note").hidden = how !== "none";                 // only when neither voice could speak
}

const spoken = (card) => (lang === "fil" && card.fil) || card.label;

// ------------------------------------------------------------------ cards and categories

function allCards() {
  return [...BUILT_IN, ...state.custom.map((c) => ({ ...c, custom: true }))];
}

function categoryNames() {
  const extra = [...new Set(state.custom.map((c) => c.category))].filter((c) => !CATEGORIES.includes(c)).sort();
  return [...CATEGORIES, ...extra];
}

const categoryLabel = (name) => (CATEGORIES.includes(name) ? t(`cat_${name}`, lang) : name);

function renderTabs() {
  const names = categoryNames();
  if (!names.includes(state.category)) state.category = names[0];
  clear($("cat-tabs"));
  names.forEach((name) => $("cat-tabs").append(
    h("button", { type: "button", class: `btn btn-lg ${name === state.category ? "btn-primary" : "btn-outline-primary"}`,
                  "aria-pressed": String(name === state.category),
                  onClick: () => { state.category = name; renderTabs(); renderGrid(); } }, categoryLabel(name))));
}

function renderGrid() {
  clear($("card-grid"));
  allCards().filter((c) => c.category === state.category).forEach((card) => $("card-grid").append(
    h("button", { type: "button", class: "talk-card", onClick: () => pick(card) },
      h("span", { class: "talk-pic", "aria-hidden": "true" }, icon(card.icon)),
      h("span", { class: "talk-word" }, spoken(card)))));
}

// ------------------------------------------------------------------ sentence

function renderSentence() {
  const list = $("sentence");
  clear(list);
  list.append(h("li", { class: "sentence-word sentence-start" }, t("talk_starter", lang)));
  state.sentence.forEach((card) => list.append(
    h("li", { class: "sentence-word" }, icon(card.icon), ` ${spoken(card)}`)));
  $("back-btn").disabled = $("clear-btn").disabled = state.sentence.length === 0;
  $("speak-btn").disabled = state.sentence.length === 0;
}

function pick(card) {
  state.sentence.push(card);
  renderSentence();
  speak(spoken(card));
}

$("speak-btn").addEventListener("click", () =>
  speak([t("talk_starter", lang), ...state.sentence.map(spoken)].join(" ")));
$("back-btn").addEventListener("click", () => { state.sentence.pop(); renderSentence(); });
$("clear-btn").addEventListener("click", () => { state.sentence = []; stopSpeaking(); renderSentence(); });

// ------------------------------------------------------------------ adult tools

const NEW_CATEGORY = "__new__";

function renderCategoryOptions() {
  const select = $("card-category");
  const current = select.value;
  clear(select);
  categoryNames().forEach((name) => select.append(h("option", { value: name }, categoryLabel(name))));
  select.append(h("option", { value: NEW_CATEGORY }, "New category..."));
  select.value = [...select.options].some((o) => o.value === current) ? current : CATEGORIES[0];
  $("new-category-wrap").hidden = select.value !== NEW_CATEGORY;
}

function renderPicker() {
  clear($("picture-picker"));
  PICTURES.forEach((pic) => {
    const id = `pic-${PICTURES.indexOf(pic)}`;
    const input = h("input", { type: "radio", name: "picture", id, value: pic, class: "visually-hidden", checked: pic === state.icon,
                               onChange: () => { state.icon = pic; } });
    $("picture-picker").append(h("span", { class: "pic-option" }, input,
      h("label", { for: id, class: "pic-label", title: pic.replace("fa-", "").replace(/-/g, " ") }, icon(pic), h("span", { class: "visually-hidden" }, pic.replace("fa-", "").replace(/-/g, " ")))));
  });
}

function renderMyCards() {
  const list = $("my-cards");
  clear(list);
  $("my-cards-empty").hidden = state.custom.length > 0;
  state.custom.forEach((card) => list.append(
    h("li", { class: "d-flex align-items-center gap-2 py-1 border-bottom" },
      h("span", { class: "fs-4", "aria-hidden": "true" }, icon(card.icon)),
      h("span", { class: "flex-grow-1" }, card.label, h("span", { class: "text-muted small ms-2" }, categoryLabel(card.category))),
      h("button", { type: "button", class: "btn btn-outline-danger btn-sm", "aria-label": `Delete ${card.label}`,
                    onClick: () => removeCard(card) }, icon("fa-trash"), h("span", { class: "ms-1" }, "Delete")))));
}

async function removeCard(card) {
  const ok = await confirmModal(`Delete the card "${card.label}"?`,
    { title: "Delete card", confirmLabel: "Delete", cancelLabel: t("cancel", lang), danger: true });
  if (!ok) return;
  try {
    await cardsApi.remove(card.id);
    state.custom = state.custom.filter((c) => c.id !== card.id);
    refreshAll();
    showToast("Card deleted");
  } catch (err) {
    showToast(err.message, "error");
  }
}

$("card-category").addEventListener("change", () => {
  $("new-category-wrap").hidden = $("card-category").value !== NEW_CATEGORY;
});

$("card-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("card-save");
  const error = $("card-form-error");
  error.textContent = "";
  const category = $("card-category").value === NEW_CATEGORY ? $("card-new-category").value.trim() : $("card-category").value;
  const body = { label: $("card-label").value.trim(), category, icon: state.icon };
  if (!body.label) { error.textContent = "Type the word to speak."; return; }
  if (!body.category) { error.textContent = "Type a name for the new category."; return; }
  setBusy(button, true);
  try {
    const created = await cardsApi.create(body);
    state.custom.push(created);
    state.category = created.category;
    $("card-label").value = "";
    $("card-new-category").value = "";
    refreshAll();
    $("card-category").value = created.category;
    showToast("Card added");
    $("card-label").focus();
  } catch (err) {
    error.textContent = Object.values(err.fields || {})[0] || err.message;
  } finally {
    setBusy(button, false);
  }
});

function refreshAll() {
  renderTabs();
  renderGrid();
  renderCategoryOptions();
  renderMyCards();
}

// ------------------------------------------------------------------ start

renderPicker();
renderSentence();
refreshAll();
try {
  state.custom = (await cardsApi.list({ per_page: 100 })).items;
  refreshAll();
} catch (err) {
  showToast(err.message, "error");                         // the starter cards still work
}
