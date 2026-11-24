// board-sentence.js: how tapped cards become a spoken sentence. Pure functions (no page access) so they can be
// tested with plain Node: node frontend/tests/board-sentence.test.mjs
//
//   Food / Activities / your own categories:  "I want Water, Rice and Apple"   (Filipino: "Gusto ko ng Tubig, Kanin at Mansanas")
//   Emotions (starts with a feeling):         "I feel Happy"                    (Filipino: "Ako ay Masaya")
//   Core words (Yes, No, Stop, Help...):      spoken on their own: "Yes", "More and Help"

import { t } from "./i18n.js";

export const MAX_WORDS = 6;

export const cardKey = (card) => (card.custom ? `c${card.id}` : `b:${card.label}`);

/** Tap a card: remove it if it is already in the sentence, add it if there is room. */
export function toggleCard(sentence, card) {
  const key = cardKey(card);
  if (sentence.some((c) => cardKey(c) === key)) {
    return { sentence: sentence.filter((c) => cardKey(c) !== key), change: "removed" };
  }
  if (sentence.length >= MAX_WORDS) return { sentence, change: "full" };
  return { sentence: [...sentence, card], change: "added" };
}

/** The words that come before the cards. They follow the first card's category, or the category that is open while
 *  the sentence is still empty. "" means no prefix (Core words are spoken on their own). */
export function prefixFor(sentence, lang, category = null) {
  const kind = sentence[0] ? sentence[0].category : category;
  if (kind === "Core") return "";
  if (kind === "Emotions") return t("talk_prefix_feel", lang);
  if (kind === "Activities") return t("talk_prefix_want_activity", lang);
  return t("talk_prefix_want", lang);                           // Food, categories the adult made, or nothing chosen yet
}

/** ["A"] -> "A"; ["A","B"] -> "A and B"; ["A","B","C"] -> "A, B and C" */
export function joinWords(words, lang) {
  if (words.length <= 1) return words.join("");
  const and = t("talk_and", lang);
  return `${words.slice(0, -1).join(", ")} ${and} ${words[words.length - 1]}`;
}

/** The full sentence as text, using `spoken(card)` for each word. */
export function sentenceText(sentence, lang, spoken) {
  const prefix = prefixFor(sentence, lang);
  const words = joinWords(sentence.map(spoken), lang);
  return [prefix, words].filter(Boolean).join(" ");
}
