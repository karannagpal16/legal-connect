export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function caseTitle(value: unknown) {
  const item = asRecord(value);
  return text(item.caseTitle || item.title, "Untitled matter");
}

export function caseCourt(value: unknown) {
  const item = asRecord(value);
  return text(item.courtName || item.court, "Court not listed");
}

export function caseNumber(value: unknown) {
  const item = asRecord(value);
  return text(item.caseNumber || item.caseNo, "Number pending");
}

export function objectNumber(value: unknown, key: string) {
  const result = Number(asRecord(value)[key]);
  return Number.isFinite(result) ? result : 0;
}
