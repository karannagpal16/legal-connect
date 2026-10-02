# Phase 1 — Court Order Verification and Chamber Pricing

## Court-order workflow

Court orders reuse `case_documents`. `case_hearing_orders` is the relational
workflow record that links an S3 object and document to its matter, hearing
assignment and append-only hearing update. A file is not marked uploaded until
the API verifies the object exists in S3 with the expected byte length.

Supported files are PDF, JPG and PNG up to 20 MB. The assigned advocate or
Chamber Owner can upload. Only the Chamber Owner can verify or correct the
record. Corrections append a new `case_hearing_updates` record and update the
matter diary; the previous record remains retrievable through the ledger.

Required deployment configuration:

- `S3_BUCKET` (or `AWS_S3_BUCKET`)
- `S3_REGION` (or `AWS_REGION`)
- `S3_ACCESS_KEY_ID` (or `AWS_ACCESS_KEY_ID`)
- `S3_SECRET_ACCESS_KEY` (or `AWS_SECRET_ACCESS_KEY`)
- optional `AWS_SESSION_TOKEN`

The bucket CORS policy must permit browser `PUT` requests from the Legal
Connect application origins and expose `Content-Length` for verification.

## Chamber catalog

The existing plan ids remain stable for compatibility while customer-facing
names and prices become Core, Pro and Elite. Monthly prices are ₹999, ₹2,499
and ₹4,999; annual prices are ₹9,999, ₹24,999 and ₹49,999. All plans have
unlimited chamber tasks.

Senior/Partner and Team Member seats are enforced separately. The technical
chamber owner consumes one Senior/Partner seat. Payment activation uses a
server-recorded checkout row so the plan and billing cycle cannot be replaced
by client input during signature verification.
