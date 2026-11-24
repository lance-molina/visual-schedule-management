// Talking board: tap a picture to hear the word and add it to the sentence; Speak reads the whole sentence.
// Built-in starter cards come from board-cards.js; cards the adult adds are saved through /api/cards.
// Speech: speech.js tries the online Edge voice first and falls back to the browser's own voice; if neither works the words stay on screen.

import { cards as cardsApi } from "./api.js";
import { BUILT_IN, CATEGORIES, PICTURES } from "./board-cards.js";
import { clear, confirmModal, h, icon, setBusy } from "./components.js";
import { t } from "./i18n.js";
import { cardKey, sentenceText, prefixFor, toggleCard } from "./board-sentence.js";
import { shrinkPhoto } from "./photo.js";
import { speak as say, stop as stopSpeaking } from "./speech.js";
import { getCachedSettings, initPage, showToast } from "./script.js";

const $ = (id) => document.getElementById(id);
await initPage("communication");
const lang = getCachedSettings().language;

const state = { custom: [], category: CATEGORIES[0], sentence: [], icon: PICTURES[0], photo: null };

// ------------------------------------------------------------------ static text (this page is for the child, so it is translated)

$("talk-title").textContent = t("talk_title", lang);
$("talk-help").textContent = t("talk_help", lang);
$("speak-label").textContent = t("talk_speak", lang);
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
  return [...BUILT_IN, ...state.custom.map((c) => ({ ...c, fil: c.label_fil, custom: true }))];
}

function categoryNames() {
  const extra = [...new Set(state.custom.map((c) => c.category))].filter((c) => !CATEGORIES.includes(c)).sort();
  return [...CATEGORIES, ...extra];
}

const categoryLabel = (name) => (CATEGORIES.includes(name) ? t(`cat_${name}`, lang) : name);

// Opening another category starts a new sentence: the cards are cleared and the prefix changes at once.
function setCategory(name) {
  if (name === state.category) return;
  state.category = name;
  state.sentence = [];
  stopSpeaking();
  renderTabs();
  renderGrid();
  renderSentence();
}

function renderTabs() {
  const names = categoryNames();
  if (!names.includes(state.category)) state.category = names[0];
  clear($("cat-tabs"));
  names.forEach((name) => $("cat-tabs").append(
    h("button", { type: "button", class: `btn btn-lg ${name === state.category ? "btn-primary" : "btn-outline-primary"}`,
                  "aria-pressed": String(name === state.category),
                  onClick: () => setCategory(name) }, categoryLabel(name))));
}

// A photo when the adult added one, otherwise the preset picture.
const picture = (card, cls) => (card.image
  ? h("img", { class: `${cls} talk-photo`, src: card.image, alt: "", width: 96, height: 96 })
  : h("span", { class: cls, "aria-hidden": "true" }, icon(card.icon)));

function renderGrid() {
  clear($("card-grid"));
  const chosen = new Set(state.sentence.map(cardKey));
  allCards().filter((c) => c.category === state.category).forEach((card) => {
    const selected = chosen.has(cardKey(card));
    $("card-grid").append(h("button", { type: "button", class: `talk-card${selected ? " is-selected" : ""}`,
                                         "aria-pressed": String(selected), onClick: () => pick(card) },
      selected ? h("span", { class: "talk-check", "aria-hidden": "true" }, icon("fa-check")) : null,
      picture(card, "talk-pic"),
      h("span", { class: "talk-word" }, spoken(card))));
  });
}

// ------------------------------------------------------------------ sentence

function renderSentence() {
  const list = $("sentence");
  clear(list);
  const prefix = prefixFor(state.sentence, lang, state.category);
  if (prefix) list.append(h("li", { class: "sentence-word sentence-start" }, prefix));
  else if (!state.sentence.length) list.append(h("li", { class: "text-muted fs-5" }, t("talk_empty", lang)));   // Basics has no prefix
  state.sentence.forEach((card) => list.append(
    h("li", { class: "sentence-word" }, card.image ? h("img", { class: "sentence-photo", src: card.image, alt: "", width: 28, height: 28 }) : icon(card.icon), ` ${spoken(card)}`)));
  $("clear-btn").disabled = state.sentence.length === 0;
  $("speak-btn").disabled = state.sentence.length === 0;
}

function pick(card) {
  const result = toggleCard(state.sentence, card);        // tapping a chosen card again removes it
  if (result.change === "full") { showToast(t("talk_full", lang), "error"); return; }
  state.sentence = result.sentence;
  renderSentence();
  renderGrid();
  if (result.change === "added") speak(spoken(card));
}

$("speak-btn").addEventListener("click", () => speak(sentenceText(state.sentence, lang, spoken)));
$("clear-btn").addEventListener("click", () => { state.sentence = []; stopSpeaking(); renderSentence(); renderGrid(); });

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
      picture(card, "my-card-pic"),
      h("span", { class: "flex-grow-1" }, card.label, card.label_fil ? h("span", { class: "text-muted ms-2" }, `(${card.label_fil})`) : null, h("span", { class: "text-muted small ms-2" }, categoryLabel(card.category))),
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
  const body = { label: $("card-label").value.trim(), category, icon: state.icon,
                 label_fil: $("card-label-fil").value.trim() || null, image: state.photo };
  if (!body.label) { error.textContent = "Type the word to speak."; return; }
  if (!body.category) { error.textContent = "Type a name for the new category."; return; }
  setBusy(button, true);
  try {
    const created = await cardsApi.create(body);
    state.custom.push(created);
    setCategory(created.category);                          // shows the new card; clears an unfinished sentence
    $("card-label").value = "";
    $("card-label-fil").value = "";
    $("card-new-category").value = "";
    setPhoto(null);
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

function setPhoto(dataUrl) {
  state.photo = dataUrl;
  $("photo-preview").hidden = !dataUrl;
  if (dataUrl) $("photo-preview-img").src = dataUrl; else { $("photo-preview-img").removeAttribute("src"); $("card-photo").value = ""; }
}

$("card-photo").addEventListener("change", async () => {
  const file = $("card-photo").files[0];
  $("card-form-error").textContent = "";
  if (!file) { setPhoto(null); return; }
  try {
    setPhoto(await shrinkPhoto(file));
  } catch (err) {
    setPhoto(null);
    $("card-form-error").textContent = err.message;
  }
});
$("photo-remove").addEventListener("click", () => setPhoto(null));

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
