// Claude (Anthropic) answers for the LawBot / AI assistant.
//
// Source-locked: Claude only rewrites what Legal Connect's APPROVED legal source
// excerpts say. It is never called when no approved excerpt matched, and any
// failure (no key, timeout, API error, empty reply) returns null so the caller
// falls back to the template answer. Nothing here can make the assistant answer
// from outside the approved library.

const DEFAULT_MODEL = "claude-opus-5-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

const SYSTEM_PROMPT = [
  "You are the Legal Connect legal information assistant for users in India.",
  "Answer ONLY from the numbered source excerpts in the user message. Do not use outside knowledge, case law, or sections that are not in the excerpts.",
  "If the excerpts do not answer the question, say plainly that Legal Connect's approved sources do not cover it and suggest consulting a verified advocate.",
  "Cite the excerpt numbers you rely on in square brackets, like [1].",
  "This is legal information, not legal advice. Never predict outcomes, bail chances or win probability, and never give strategy.",
  "Use plain English a non-lawyer can follow. Use these section headings exactly: Short Answer, Legal Basis, Practical Meaning, Caution.",
  "Keep it under 350 words.",
].join("\n");

function claudeConfig(env = process.env) {
  const apiKey = String(env.ANTHROPIC_API_KEY || "").trim();
  return {
    enabled: Boolean(apiKey) && String(env.LAWBOT_USE_CLAUDE || "true").toLowerCase() !== "false",
    apiKey,
    model: String(env.CLAUDE_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL,
    maxTokens: Math.min(Math.max(Number(env.CLAUDE_MAX_TOKENS) || 1024, 256), 4096),
    timeoutMs: Math.max(Number(env.CLAUDE_TIMEOUT_MS) || 30000, 1000),
  };
}

function buildUserMessage(question, chunks, citationForChunk) {
  const sources = chunks.slice(0, 5).map((chunk, index) => {
    const c = citationForChunk(chunk);
    const label = [c.actName || c.title, c.sectionNo ? `Section ${c.sectionNo}` : "", c.citation].filter(Boolean).join(", ");
    const text = String(chunk.chunk_text || chunk.chunkText || "").slice(0, 4000);
    return `[${index + 1}] ${label}\n${text}`;
  });
  return `Question:\n${String(question).slice(0, 4000)}\n\nApproved source excerpts:\n\n${sources.join("\n\n")}`;
}

async function answerWithClaude(question, chunks, { citationForChunk, cautionLine, env = process.env, fetchImpl = globalThis.fetch, logger = console } = {}) {
  const cfg = claudeConfig(env);
  if (!cfg.enabled || !Array.isArray(chunks) || chunks.length === 0 || typeof fetchImpl !== "function") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const response = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserMessage(question, chunks, citationForChunk) }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      logger.warn?.(`[lawbot] Claude request failed with HTTP ${response.status}; using template answer.`);
      return null;
    }
    const data = await response.json();
    const text = (Array.isArray(data?.content) ? data.content : [])
      .filter((block) => block?.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) return null;

    const sourceLines = chunks.slice(0, 5).map((chunk, index) => {
      const c = citationForChunk(chunk);
      return `[${index + 1}] ${c.actName || c.title}${c.sectionNo ? `, Section ${c.sectionNo}` : ""}; ${c.citation}; ${c.sourceName}; ${c.chunkRef}.`;
    });
    return {
      answer: [text, "", "Source Citation", ...sourceLines, "", cautionLine].filter((line) => line !== undefined).join("\n"),
      citations: chunks.map(citationForChunk),
      confidence: chunks[0].score >= 3 ? "high" : "medium",
      mode: "source-locked",
      model: cfg.model,
      usage: data?.usage ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens } : undefined,
    };
  } catch (error) {
    logger.warn?.(`[lawbot] Claude unavailable (${error?.name === "AbortError" ? "timeout" : error?.message || "error"}); using template answer.`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { answerWithClaude, claudeConfig, buildUserMessage, SYSTEM_PROMPT, DEFAULT_MODEL };
