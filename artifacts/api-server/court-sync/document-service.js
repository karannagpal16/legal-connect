/**
 * Optional document helpers for Verified Court Updates.
 * Prefer official source links; store copies only when licence permits.
 */

const PDF_MAGIC = Buffer.from("%PDF");

function isPdfBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return false;
  return buf.subarray(0, 4).equals(PDF_MAGIC);
}

function assertSafePdf(buf, { maxBytes = 15 * 1024 * 1024 } = {}) {
  if (!Buffer.isBuffer(buf)) {
    const error = new Error("PDF payload must be a buffer.");
    error.code = "VALIDATION";
    throw error;
  }
  if (buf.length > maxBytes) {
    const error = new Error("PDF exceeds size limit.");
    error.code = "VALIDATION";
    throw error;
  }
  if (!isPdfBuffer(buf)) {
    const error = new Error("File is not a valid PDF.");
    error.code = "VALIDATION";
    throw error;
  }
  return true;
}

module.exports = { isPdfBuffer, assertSafePdf };
