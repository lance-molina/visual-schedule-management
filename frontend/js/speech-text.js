// speech-text.js: small fixes so the Filipino voice says everyday abbreviations the way people do.
// Pure function (no page access). The list is short on purpose; add a pair when a word sounds wrong.
// These readings are our own and have not been reviewed by a native speaker.

const FIL_FIXES = [
  [/\bTV\b/g, "ti-vi"],
  [/\bCR\b/g, "si-ar"],
];

export function prepareForSpeech(text, lang) {
  let out = String(text).trim().replace(/\s+/g, " ");
  if (lang === "fil") FIL_FIXES.forEach(([pattern, spoken]) => { out = out.replace(pattern, spoken); });
  return out;
}
