const crypto = require('crypto');

function encodePath(key) {
  return `/${String(key).split('/').map((part) => encodeURIComponent(part)).join('/')}`;
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function signingKey(secret, shortDate, region) {
  const dateKey = hmac(`AWS4${secret}`, shortDate);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function presignS3Url({ method, bucket, region, key, accessKeyId, secretAccessKey, sessionToken, contentType, expiresSeconds = 900, now = new Date() }) {
  if (!bucket || !region || !key || !accessKeyId || !secretAccessKey) throw new Error('S3 upload configuration is incomplete.');
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = timestamp.slice(0, 8);
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const scope = `${shortDate}/${region}/s3/aws4_request`;
  const headers = contentType ? { 'content-type': contentType, host } : { host };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name]}\n`).join('');
  const query = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${scope}`,
    'X-Amz-Date': timestamp,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
    ...(sessionToken ? { 'X-Amz-Security-Token': sessionToken } : {}),
  };
  const canonicalQuery = Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&');
  const canonicalRequest = [method.toUpperCase(), encodePath(key), canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', timestamp, scope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
  const signature = hmac(signingKey(secretAccessKey, shortDate, region), stringToSign, 'hex');
  return `https://${host}${encodePath(key)}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

module.exports = { presignS3Url };
