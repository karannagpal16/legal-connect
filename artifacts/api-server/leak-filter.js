/**
 * Contact leak filter for LC Consultation Room (and matter messages).
 * Parties never see raw phones, emails, or off-platform handles.
 * Admin audit keeps the original line.
 */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const E164_RE = /(?:\+|00)?91[\s\-()]*[6-9]\d(?:[\s\-()]*\d){8}/g;
const TEN_DIGIT_RE = /(?<!\d)[6-9]\d{9}(?!\d)/g;
const HANDLE_RE = /\b(?:wa\.me\/|whatsapp\s*(?:me|at|:)?|telegram|t\.me\/|insta(?:gram)?(?:\s*id)?|signal\s+me|zoom\.us|join\.zoom|meet\.google|gmeet)\b/gi;
const LEAK_PHRASE_RE = /\b(?:call me(?: on)?|ping me|dm me|text me|whatsapp|wp me|number pe|mera number|my number is)\b/gi;

const DIGIT_WORDS = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};

const SPELLED_DIGIT_RE = new RegExp(
  String.raw`\b((?:zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[\s,\-]+(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)){7,})\b`,
  "gi",
);

function uniqueHits(hits) {
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    const key = `${hit.type}:${String(hit.match || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out;
}

function collectMatches(text, regex, type) {
  const hits = [];
  const copy = String(text || "");
  regex.lastIndex = 0;
  let match = regex.exec(copy);
  while (match) {
    hits.push({ type, match: match[0] });
    match = regex.exec(copy);
  }
  regex.lastIndex = 0;
  return hits;
}

function spelledDigitHits(text) {
  const hits = [];
  const copy = String(text || "");
  SPELLED_DIGIT_RE.lastIndex = 0;
  let match = SPELLED_DIGIT_RE.exec(copy);
  while (match) {
    const words = String(match[1] || "").toLowerCase().split(/[\s,\-]+/).filter(Boolean);
    const digits = words.map((word) => DIGIT_WORDS[word]).filter(Boolean).join("");
    if (digits.length >= 8) {
      hits.push({ type: "spelled_phone", match: match[0] });
    }
    match = SPELLED_DIGIT_RE.exec(copy);
  }
  SPELLED_DIGIT_RE.lastIndex = 0;
  return hits;
}

function redactContactLeaks(raw) {
  const original = String(raw || "");
  let redacted = original;
  const hits = [];

  for (const hit of collectMatches(original, EMAIL_RE, "email")) hits.push(hit);
  for (const hit of collectMatches(original, E164_RE, "phone")) hits.push(hit);
  for (const hit of collectMatches(original, TEN_DIGIT_RE, "phone")) hits.push(hit);
  for (const hit of collectMatches(original, HANDLE_RE, "off_platform")) hits.push(hit);
  for (const hit of collectMatches(original, LEAK_PHRASE_RE, "off_platform")) hits.push(hit);
  for (const hit of spelledDigitHits(original)) hits.push(hit);

  redacted = redacted.replace(EMAIL_RE, "[contact hidden]");
  redacted = redacted.replace(E164_RE, "[contact hidden]");
  redacted = redacted.replace(TEN_DIGIT_RE, "[contact hidden]");
  redacted = redacted.replace(SPELLED_DIGIT_RE, "[contact hidden]");
  redacted = redacted.replace(HANDLE_RE, "[contact hidden]");
  redacted = redacted.replace(LEAK_PHRASE_RE, "[contact hidden]");

  const unique = uniqueHits(hits);
  return {
    original,
    redacted: unique.length ? redacted : original,
    hits: unique,
    leaked: unique.length > 0,
  };
}

module.exports = {
  redactContactLeaks,
};
