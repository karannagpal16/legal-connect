const assert = require("assert");
const { answerWithClaude, claudeConfig, DEFAULT_MODEL } = require("./claude-answer");

const citationForChunk = (c) => ({
  title: c.title || "Source",
  citation: c.citation || "Cit",
  sourceName: "LC Library",
  actName: c.act_name || "",
  sectionNo: c.section_no || "",
  sourceUrl: "",
  chunkRef: "Excerpt",
});
const chunks = [{ chunk_text: "Bail is the rule, jail the exception.", act_name: "BNSS", section_no: "480", score: 4 }];
const quiet = { warn() {} };

function fakeFetch({ ok = true, status = 200, body, throws } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    if (throws) throw throws;
    return { ok, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

(async () => {
  // Defaults to Opus 5.5; off without a key or when switched off.
  assert.strictEqual(DEFAULT_MODEL, "claude-opus-5-5");
  assert.strictEqual(claudeConfig({ ANTHROPIC_API_KEY: "k" }).model, "claude-opus-5-5");
  assert.strictEqual(claudeConfig({ ANTHROPIC_API_KEY: "k", CLAUDE_MODEL: "claude-haiku-5-5" }).model, "claude-haiku-5-5");
  assert.strictEqual(claudeConfig({}).enabled, false);
  assert.strictEqual(claudeConfig({ ANTHROPIC_API_KEY: "k", LAWBOT_USE_CLAUDE: "false" }).enabled, false);

  const env = { ANTHROPIC_API_KEY: "test-key" };

  // No key → no call, caller falls back.
  let f = fakeFetch();
  assert.strictEqual(await answerWithClaude("bail?", chunks, { citationForChunk, env: {}, fetchImpl: f, logger: quiet }), null);
  assert.strictEqual(f.calls.length, 0);

  // No approved excerpts → never calls Claude (source-locked).
  f = fakeFetch();
  assert.strictEqual(await answerWithClaude("bail?", [], { citationForChunk, env, fetchImpl: f, logger: quiet }), null);
  assert.strictEqual(f.calls.length, 0);

  // Success: request shape and answer shape.
  f = fakeFetch({ body: { content: [{ type: "text", text: "Short Answer\nBail is the rule [1]." }], usage: { input_tokens: 300, output_tokens: 80 } } });
  const r = await answerWithClaude("Can I get bail?", chunks, { citationForChunk, cautionLine: "Caution\nInfo only.", env, fetchImpl: f, logger: quiet });
  assert.ok(r);
  assert.strictEqual(f.calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.strictEqual(f.calls[0].init.headers["x-api-key"], "test-key");
  const sent = JSON.parse(f.calls[0].init.body);
  assert.strictEqual(sent.model, "claude-opus-5-5");
  assert.match(sent.messages[0].content, /Bail is the rule/);
  assert.match(sent.system, /ONLY from the numbered source excerpts/);
  assert.match(r.answer, /Bail is the rule \[1\]/);
  assert.match(r.answer, /BNSS, Section 480/);
  assert.match(r.answer, /Caution\nInfo only\./);
  assert.strictEqual(r.mode, "source-locked");
  assert.strictEqual(r.citations.length, 1);
  assert.deepStrictEqual(r.usage, { inputTokens: 300, outputTokens: 80 });

  // API error, network error, empty reply → null (fallback).
  assert.strictEqual(await answerWithClaude("q", chunks, { citationForChunk, env, fetchImpl: fakeFetch({ ok: false, status: 529 }), logger: quiet }), null);
  assert.strictEqual(await answerWithClaude("q", chunks, { citationForChunk, env, fetchImpl: fakeFetch({ throws: new Error("ECONNRESET") }), logger: quiet }), null);
  assert.strictEqual(await answerWithClaude("q", chunks, { citationForChunk, env, fetchImpl: fakeFetch({ body: { content: [] } }), logger: quiet }), null);

  console.log("claude-answer.test.js OK");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
