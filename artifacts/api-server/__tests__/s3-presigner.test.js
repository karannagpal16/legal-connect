const test = require('node:test');
const assert = require('node:assert/strict');
const { presignS3Url } = require('../s3-presigner');

test('presigns an S3 PUT with a signed content type and bounded expiry', () => {
  const url = new URL(presignS3Url({ method: 'PUT', bucket: 'legal-orders', region: 'ap-south-1', key: 'court-orders/case one/order.pdf', accessKeyId: 'AKIATEST', secretAccessKey: 'secret', contentType: 'application/pdf', expiresSeconds: 600, now: new Date('2026-10-01T10:00:00.000Z') }));
  assert.equal(url.hostname, 'legal-orders.s3.ap-south-1.amazonaws.com');
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600');
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host');
  assert.match(url.pathname, /court-orders\/case%20one\/order.pdf/);
  assert.equal(url.searchParams.get('X-Amz-Signature').length, 64);
});

test('rejects incomplete S3 configuration', () => {
  assert.throws(() => presignS3Url({ method: 'PUT' }), /configuration is incomplete/);
});
