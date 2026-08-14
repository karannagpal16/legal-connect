/**
 * Optional document helpers for Verified Court Updates / Order PDF Sync.
 * Prefer official source links; never fetch client-supplied URLs (SSRF).
 * Fixture PDFs may be streamed from a generated safe buffer.
 */

const crypto = require("crypto");

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

/** Minimal valid one-page PDF for fixture/demo streaming only. */
function buildFixtureOrderPdf({ title = "Daily Order", cnr = "", orderDate = "" } = {}) {
  const safeTitle = String(title).replace(/[()\\]/g, " ").slice(0, 80);
  const line2 = `CNR: ${cnr}  Date: ${orderDate}`.slice(0, 80);
  const line3 = "This is a Legal Connect demo order sheet. Official court PDF prevails.";
  const content = `BT /F1 12 Tf 50 750 Td (${safeTitle}) Tj 0 -24 Td (${line2}) Tj 0 -24 Td (${line3}) Tj ET`;
  const objects = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push("3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n");
  objects.push(`4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const buf = Buffer.from(pdf, "utf8");
  assertSafePdf(buf);
  return {
    buffer: buf,
    checksum: crypto.createHash("sha256").update(buf).digest("hex"),
    mimeType: "application/pdf",
    sizeBytes: buf.length,
  };
}

module.exports = { isPdfBuffer, assertSafePdf, buildFixtureOrderPdf };
