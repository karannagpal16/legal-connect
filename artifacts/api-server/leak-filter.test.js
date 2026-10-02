const assert = require("assert");
const { redactContactLeaks } = require("./leak-filter");

function leaked(text) {
  return redactContactLeaks(text);
}

{
  const result = leaked("Call me on +91 98765 43210 tonight");
  assert.equal(result.leaked, true);
  assert.ok(!result.redacted.includes("98765"));
  assert.ok(result.redacted.includes("[contact hidden]"));
  assert.ok(result.hits.some((hit) => hit.type === "phone"));
}

{
  const result = leaked("Email me at counsel@example.com please");
  assert.equal(result.leaked, true);
  assert.ok(!result.redacted.includes("counsel@example.com"));
  assert.ok(result.hits.some((hit) => hit.type === "email"));
}

{
  const result = leaked("whatsapp me on 9876543210");
  assert.equal(result.leaked, true);
  assert.ok(!result.redacted.includes("9876543210"));
  assert.ok(result.hits.some((hit) => hit.type === "off_platform" || hit.type === "phone"));
}

{
  const result = leaked("nine eight seven six five four three two one zero");
  assert.equal(result.leaked, true);
  assert.ok(result.hits.some((hit) => hit.type === "spelled_phone"));
  assert.ok(!/nine eight seven/.test(result.redacted));
}

{
  const result = leaked("Hearing listed tomorrow at Saket, pass over if not reached.");
  assert.equal(result.leaked, false);
  assert.equal(result.redacted, result.original);
}

{
  const result = leaked("telegram me after 5");
  assert.equal(result.leaked, true);
}

{
  const result = leaked("join.zoom.us/j/123 and instagram counsel_delhi");
  assert.equal(result.leaked, true);
}

console.log("leak-filter.test.js OK");
