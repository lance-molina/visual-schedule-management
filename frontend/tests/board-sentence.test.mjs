// Run with: node frontend/tests/board-sentence.test.mjs   (no install needed; exits with an error if a check fails)
import assert from "node:assert/strict";
import { MAX_WORDS, joinWords, prefixFor, sentenceText, toggleCard } from "../js/board-sentence.js";
import { prepareForSpeech } from "../js/speech-text.js";

const card = (label, category, fil, extra = {}) => ({ label, category, fil, ...extra });
const water = card("Water", "Food", "Tubig"), rice = card("Rice", "Food", "Kanin"), apple = card("Apple", "Food", "Mansanas");
const happy = card("Happy", "Emotions", "Masaya"), play = card("Play", "Activities", "Laro");
const yes = card("Yes", "Core", "Oo"), help = card("Help", "Core", "Tulong");
const en = (c) => c.label, fil = (c) => c.fil || c.label;

assert.equal(sentenceText([water], "en", en), "I want Water");
assert.equal(sentenceText([water, rice, apple], "en", en), "I want Water, Rice and Apple");
assert.equal(sentenceText([water, rice], "en", en), "I want Water and Rice");
assert.equal(sentenceText([water, rice, apple], "fil", fil), "Gusto ko ng Tubig, Kanin at Mansanas");
assert.equal(sentenceText([happy], "en", en), "I feel Happy");
assert.equal(sentenceText([happy], "fil", fil), "Ako ay Masaya");
assert.equal(sentenceText([play], "fil", fil), "Gusto ko Laro");
assert.equal(sentenceText([yes], "en", en), "Yes");
assert.equal(sentenceText([help, yes], "en", en), "Help and Yes");
assert.equal(sentenceText([], "en", en), "I want");
assert.equal(prefixFor([card("Toys", "My toys", "")], "en"), "I want");          // a category the adult made
assert.equal(joinWords([], "en"), "");

// an empty sentence shows the prefix of the OPEN category, so changing category changes it at once
assert.equal(prefixFor([], "en", "Food"), "I want");
assert.equal(prefixFor([], "en", "Emotions"), "I feel");
assert.equal(prefixFor([], "fil", "Emotions"), "Ako ay");
assert.equal(prefixFor([], "fil", "Activities"), "Gusto ko");
assert.equal(prefixFor([], "en", "Core"), "");
assert.equal(prefixFor([], "en", "My toys"), "I want");
assert.equal(prefixFor([], "en"), "I want");
assert.equal(prefixFor([water], "en", "Emotions"), "I want");   // once a card is chosen, the card decides

// tapping again removes; the sentence is capped
let s = [];
s = toggleCard(s, water).sentence; s = toggleCard(s, rice).sentence;
assert.deepEqual(s.map(en), ["Water", "Rice"]);
const again = toggleCard(s, water);
assert.equal(again.change, "removed"); assert.deepEqual(again.sentence.map(en), ["Rice"]);
const mine = (id) => card("W" + id, "Food", "", { custom: true, id });
let full = [];
for (let i = 0; i < MAX_WORDS; i++) full = toggleCard(full, mine(i)).sentence;
assert.equal(full.length, MAX_WORDS);
const over = toggleCard(full, mine(99));
assert.equal(over.change, "full"); assert.equal(over.sentence.length, MAX_WORDS);
assert.equal(toggleCard(full, mine(0)).change, "removed");                    // a full sentence can still lose a word
// a built-in card and a custom card with the same label are different cards
assert.equal(toggleCard([water], card("Water", "Food", "", { custom: true, id: 5 })).change, "added");

// Filipino speech fixes
assert.equal(prepareForSpeech("Manood ng TV", "fil"), "Manood ng ti-vi");
assert.equal(prepareForSpeech("Gusto ko ng CR", "fil"), "Gusto ko ng si-ar");
assert.equal(prepareForSpeech("TV time", "en"), "TV time");                   // English is left alone
assert.equal(prepareForSpeech("  Tubig  ", "fil"), "Tubig");
console.log("board-sentence and speech-text checks passed");
