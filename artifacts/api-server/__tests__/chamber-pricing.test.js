const test = require('node:test');
const assert = require('node:assert/strict');
const { quoteProduct } = require('../products');

test('server-owned chamber monthly prices match the launch catalog', () => {
  assert.equal(quoteProduct({ planId: 'core' }).amountInr, 999);
  assert.equal(quoteProduct({ planId: 'growth' }).amountInr, 2499);
  assert.equal(quoteProduct({ planId: 'chambers_plus' }).amountInr, 4999);
});

test('client supplied amounts cannot override a chamber price', () => {
  assert.equal(quoteProduct({ planId: 'core', amount: 1 }).amountInr, 999);
});
