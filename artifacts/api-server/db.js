const connectionString = process.env.DATABASE_URL || process.env.DB_URL;
const isProduction = process.env.NODE_ENV === "production";

let pool = null;
let available = false;
let initError = null;
let migrationStatus = "not_started";
let lastLatencyMs = null;

function numberEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function safeError(error) {
  if (!error) return "";
  if (error.code === "MODULE_NOT_FOUND" && /pg/.test(String(error.message || ""))) {
    return "PostgreSQL driver 'pg' is not installed.";
  }
  return String(error.message || error).replace(connectionString || "", "[redacted]");
}

function sslConfig() {
  if (!connectionString) return false;
  if (process.env.PGSSL === "false") return false;
  const ca = process.env.PGSSL_CA || "";
  try {
    const host = new URL(connectionString).hostname;
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(host);
    if (localHost && process.env.PGSSL !== "true") return false;
    // Prefer verified TLS when a CA is provided; otherwise require SSL but allow
    // provider-managed certs (Render/Neon) unless explicitly forced.
    if (ca) {
      return { rejectUnauthorized: true, ca };
    }
    const forceVerify = String(process.env.PGSSL_REJECT_UNAUTHORIZED || "").toLowerCase() === "true";
    return { rejectUnauthorized: forceVerify };
  } catch {
    return isProduction ? { rejectUnauthorized: Boolean(ca), ...(ca ? { ca } : {}) } : false;
  }
}

function poolState(label = available ? "healthy" : "unavailable") {
  return {
    status: label,
    total: pool?.totalCount || 0,
    idle: pool?.idleCount || 0,
    waiting: pool?.waitingCount || 0,
    max: numberEnv("PGPOOL_MAX", 10),
  };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(operation, label) {
  const attempts = numberEnv("PG_CONNECT_RETRIES", isProduction ? 5 : 2);
  const baseDelayMs = numberEnv("PG_CONNECT_RETRY_DELAY_MS", 750);
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`${label} failed on attempt ${attempt}/${attempts}. Retrying... ${safeError(error)}`);
        await sleep(baseDelayMs * attempt);
      }
    }
  }
  throw lastError;
}

if (connectionString) {
  try {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString,
      ssl: sslConfig(),
      max: numberEnv("PGPOOL_MAX", 10),
      idleTimeoutMillis: numberEnv("PG_IDLE_TIMEOUT_MS", 30000),
      connectionTimeoutMillis: numberEnv("PG_CONNECTION_TIMEOUT_MS", 10000),
      allowExitOnIdle: !isProduction,
    });
    pool.on("error", (error) => {
      available = false;
      initError = safeError(error);
      console.warn(`PostgreSQL pool error: ${initError}`);
    });
  } catch (error) {
    initError = safeError(error);
    if (!isProduction) {
      console.warn(`PostgreSQL driver unavailable. Local memory fallback may be used. ${initError}`);
    }
  }
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }
  return pool.query(text, params);
}

async function checkConnection() {
  if (!pool) return false;
  const started = Date.now();
  await query("SELECT 1");
  lastLatencyMs = Date.now() - started;
  available = true;
  initError = null;
  return true;
}

async function initDb() {
  migrationStatus = "running";

  if (!pool) {
    available = false;
    initError = connectionString ? initError || "Pool could not be created." : "DATABASE_URL or DB_URL is not configured.";
    migrationStatus = "not_configured";
    if (isProduction) {
      throw new Error(`Production PostgreSQL is required. ${initError}`);
    }
    console.warn(`PostgreSQL not configured. Local memory fallback may be used. ${initError}`);
    return false;
  }

  try {
    await withRetry(checkConnection, "PostgreSQL connection");

    await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text,
        email text,
        phone text,
        role text,
        created_at timestamptz DEFAULT now()
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS users_email_idx ON users (email) WHERE email IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS users_phone_idx ON users (phone) WHERE phone IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS users_role_idx ON users (role)`);
    await query(`CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC)`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_at timestamptz`);

    await query(`
      CREATE TABLE IF NOT EXISTS login_verifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        phone text,
        code_hash text,
        purpose text DEFAULT 'login',
        expires_at timestamptz,
        consumed_at timestamptz,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS login_verifications_email_idx ON login_verifications (email) WHERE email IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS login_verifications_phone_idx ON login_verifications (phone) WHERE phone IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS login_verifications_created_at_idx ON login_verifications (created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text,
        phone text,
        code_hash text,
        purpose text DEFAULT 'login',
        expires_at timestamptz,
        consumed_at timestamptz,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS otp_codes_email_idx ON otp_codes (email) WHERE email IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone) WHERE phone IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS otp_codes_created_at_idx ON otp_codes (created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        token_hash text,
        expires_at timestamptz,
        revoked_at timestamptz,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions (token_hash) WHERE token_hash IS NOT NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        email text,
        token_hash text,
        expires_at timestamptz,
        consumed_at timestamptz,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON password_reset_tokens (email) WHERE email IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id, created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS cases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        title text,
        court text,
        case_number text,
        cnr text,
        next_date text,
        status text,
        notes text,
        payload jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS cases_user_created_idx ON cases (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS cases_case_number_idx ON cases (case_number) WHERE case_number IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS cases_status_idx ON cases (status)`);
    await query(`CREATE INDEX IF NOT EXISTS cases_next_date_idx ON cases (next_date)`);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS cases_booking_id_unique_idx ON cases ((payload->>'bookingId')) WHERE payload->>'bookingId' IS NOT NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        service_type text,
        amount integer,
        payment_status text,
        receipt_no text,
        next_destination text,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_order_id text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS razorpay_payment_id text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS work_hold_status text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS failure_reason text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS verified_at timestamptz`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stage_status text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS case_title text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS case_number text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS court_name text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS case_type text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS problem_summary text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attached_files jsonb`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_advocate_id text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_advocate_name text`);
    await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_advocate_enrollment text`);
    await query(`CREATE INDEX IF NOT EXISTS bookings_user_created_idx ON bookings (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS bookings_payment_status_idx ON bookings (payment_status)`);
    await query(`CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS booking_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
        file_name text NOT NULL,
        mime_type text NOT NULL,
        size_bytes bigint NOT NULL,
        checksum text NOT NULL,
        file_data bytea NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS booking_attachments_booking_idx ON booking_attachments (booking_id, created_at)`);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        booking_id text,
        task_id text,
        amount integer,
        currency text DEFAULT 'INR',
        provider text DEFAULT 'razorpay',
        provider_order_id text,
        provider_payment_id text,
        status text,
        work_hold_status text,
        failure_reason text,
        payload jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS payments_user_created_idx ON payments (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status)`);
    await query(`CREATE INDEX IF NOT EXISTS payments_provider_order_idx ON payments (provider_order_id) WHERE provider_order_id IS NOT NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text,
        court text,
        task_type text,
        amount integer,
        escrow_status text,
        status text,
        posted_by text,
        accepted_by text,
        proof_url text,
        payload jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks (status)`);
    await query(`CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks (created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS tasks_posted_by_idx ON tasks (posted_by) WHERE posted_by IS NOT NULL`);
    await query(`CREATE INDEX IF NOT EXISTS tasks_accepted_by_idx ON tasks (accepted_by) WHERE accepted_by IS NOT NULL`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_hash text`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_status text DEFAULT 'none'`);
    await query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS health_score integer`);
    await query(`ALTER TABLE cases ADD COLUMN IF NOT EXISTS health_scored_at timestamptz`);
    await query(`
      CREATE TABLE IF NOT EXISTS grievances (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text,
        against_user_id text,
        target_type text,
        target_id text,
        category text,
        description text,
        status text DEFAULT 'open',
        sla_due_at timestamptz,
        resolution text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS grievances_status_idx ON grievances (status, created_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS engagement_agreements (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id text,
        booking_id text,
        client_user_id text,
        advocate_user_id text,
        html_body text,
        content_hash text,
        client_signed_at timestamptz,
        advocate_signed_at timestamptz,
        client_signature text,
        advocate_signature text,
        status text DEFAULT 'draft',
        pdf_url text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS reminder_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id text,
        user_id text,
        channel text,
        template_key text,
        fire_at timestamptz,
        status text DEFAULT 'pending',
        last_error text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        sent_at timestamptz
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS task_ratings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id text NOT NULL,
        rater_id text NOT NULL,
        ratee_id text,
        rater_role text,
        stars integer NOT NULL,
        comment text,
        created_at timestamptz DEFAULT now(),
        UNIQUE (task_id, rater_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS case_updates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid,
        update_type text,
        message text,
        payload jsonb,
        status text DEFAULT 'pending_lc_review',
        author_id text,
        author_role text,
        reviewed_by text,
        reviewed_at timestamptz,
        return_reason text,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_lc_review'`);
    // Legacy rows defaulted to 'visible' and bypassed the LC gate — force them into review.
    await query(`UPDATE case_updates SET status = 'pending_lc_review' WHERE status IS NULL OR status = 'visible'`);
    await query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS author_id text`);
    await query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS author_role text`);
    await query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS reviewed_by text`);
    await query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`);
    await query(`ALTER TABLE case_updates ADD COLUMN IF NOT EXISTS return_reason text`);
    await query(`CREATE INDEX IF NOT EXISTS case_updates_case_created_idx ON case_updates (case_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS case_updates_status_idx ON case_updates (status, created_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS case_update_replies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        update_id uuid NOT NULL,
        case_id uuid,
        author_id text,
        author_role text,
        message text NOT NULL,
        status text DEFAULT 'pending_lc_review',
        reviewed_by text,
        reviewed_at timestamptz,
        return_reason text,
        payload jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS case_update_replies_status_idx ON case_update_replies (status, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS case_update_replies_update_idx ON case_update_replies (update_id, created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS lawbot_chats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        question text,
        answer text,
        sources jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS lawbot_chats_user_created_idx ON lawbot_chats (user_id, created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS sos_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        service_type text,
        urgency text,
        status text,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS sos_requests_user_created_idx ON sos_requests (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS sos_requests_status_idx ON sos_requests (status)`);

    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        event_type text,
        title text,
        message text,
        read_at timestamptz,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel_log jsonb DEFAULT '{}'::jsonb`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'`);
    await query(`CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (read_at)`);
    await query(`CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications (user_id, read_at) WHERE read_at IS NULL`);

    await query(`
      CREATE TABLE IF NOT EXISTS receipts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_no text,
        user_id uuid,
        actor_id uuid,
        actor_role text,
        receipt_type text,
        title text,
        message text,
        status text,
        amount integer,
        target_type text,
        target_id text,
        visibility text DEFAULT 'private',
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS legal_sources (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type text,
        source_name text,
        title text,
        court text,
        act_name text,
        section_no text,
        citation text,
        source_url text,
        published_date text,
        status text DEFAULT 'pending',
        text_content text,
        uploaded_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS legal_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_id uuid,
        chunk_index integer,
        chunk_ref text,
        chunk_text text,
        embedding jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lawbot_queries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        question text,
        answer text,
        sources jsonb,
        confidence text,
        mode text,
        created_at timestamptz DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS lawbot_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        query_id uuid,
        user_id uuid,
        rating text,
        comment text,
        created_at timestamptz DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id uuid,
        actor_role text,
        action text,
        target_type text,
        target_id text,
        message text,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS account_deletion_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        status text DEFAULT 'received',
        requested_at timestamptz DEFAULT now(),
        payload jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);

    await query(`CREATE INDEX IF NOT EXISTS legal_sources_status_idx ON legal_sources (status)`);
    await query(`CREATE INDEX IF NOT EXISTS legal_sources_type_status_idx ON legal_sources (source_type, status)`);
    await query(`CREATE INDEX IF NOT EXISTS legal_sources_title_idx ON legal_sources (title)`);
    await query(`CREATE INDEX IF NOT EXISTS legal_chunks_source_idx ON legal_chunks (source_id)`);
    await query(`CREATE INDEX IF NOT EXISTS legal_chunks_created_idx ON legal_chunks (created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS lawbot_queries_user_created_idx ON lawbot_queries (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS lawbot_queries_created_idx ON lawbot_queries (created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS lawbot_feedback_query_idx ON lawbot_feedback (query_id)`);
    await query(`CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (action)`);
    await query(`CREATE INDEX IF NOT EXISTS receipts_user_created_idx ON receipts (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS receipts_created_idx ON receipts (created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS account_deletion_requests_user_idx ON account_deletion_requests (user_id, requested_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS identity_verifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL,
        credential_kind text NOT NULL,
        reference_hash text NOT NULL,
        reference_last4 text,
        status text NOT NULL DEFAULT 'pending',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        reviewed_by uuid,
        reviewed_at timestamptz,
        review_note text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (user_id, credential_kind)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS identity_verifications_status_idx ON identity_verifications (status, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS identity_verifications_user_idx ON identity_verifications (user_id, created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS identity_credentials_vault (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_kind text NOT NULL,
        ciphertext text NOT NULL,
        key_version text NOT NULL DEFAULT 'v1',
        reference_hash text NOT NULL,
        reference_last4 text,
        status text NOT NULL DEFAULT 'sealed',
        label text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        deposited_at timestamptz DEFAULT now(),
        rotated_at timestamptz,
        last_revealed_at timestamptz,
        last_revealed_by uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (user_id, credential_kind)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS identity_vault_user_idx ON identity_credentials_vault (user_id, credential_kind)`);
    await query(`CREATE INDEX IF NOT EXISTS identity_vault_status_idx ON identity_credentials_vault (status, updated_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS identity_vault_access_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        vault_id uuid REFERENCES identity_credentials_vault(id) ON DELETE SET NULL,
        user_id uuid,
        actor_id uuid,
        action text NOT NULL,
        detail jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS identity_vault_access_idx ON identity_vault_access_log (vault_id, created_at DESC)`);

    await query(`
      CREATE TABLE IF NOT EXISTS chambers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (owner_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS chamber_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chamber_id uuid NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        display_name text NOT NULL,
        email text,
        member_role text NOT NULL DEFAULT 'associate',
        status text NOT NULL DEFAULT 'invited',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS chamber_members_chamber_idx ON chamber_members (chamber_id, status)`);
    await query(`
      CREATE TABLE IF NOT EXISTS chamber_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        chamber_id uuid NOT NULL REFERENCES chambers(id) ON DELETE CASCADE,
        case_id uuid REFERENCES cases(id) ON DELETE SET NULL,
        title text NOT NULL,
        details text,
        assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
        assignee_name text,
        status text NOT NULL DEFAULT 'assigned',
        priority text NOT NULL DEFAULT 'normal',
        due_at timestamptz,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        accepted_at timestamptz,
        completed_at timestamptz,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS chamber_tasks_chamber_idx ON chamber_tasks (chamber_id, status, updated_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS chamber_tasks_assignee_idx ON chamber_tasks (assigned_to, status)`);

    await query(`
      CREATE TABLE IF NOT EXISTS case_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        advocate_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
        status text NOT NULL DEFAULT 'active',
        assigned_at timestamptz DEFAULT now(),
        ended_at timestamptz,
        UNIQUE (case_id, advocate_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS case_assignments_advocate_idx ON case_assignments (advocate_id, status)`);

    await query(`
      CREATE TABLE IF NOT EXISTS case_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
        file_name text NOT NULL,
        category text,
        storage_key text NOT NULL,
        mime_type text,
        size_bytes bigint,
        checksum text,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS category text`);
    await query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS public_url text`);
    await query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS provider text DEFAULT 'local'`);
    await query(`ALTER TABLE case_documents ADD COLUMN IF NOT EXISTS checksum text`);
    await query(`CREATE INDEX IF NOT EXISTS case_documents_case_idx ON case_documents (case_id, created_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS case_communications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
        communication_type text NOT NULL,
        title text NOT NULL,
        summary text,
        storage_key text,
        recording_consent boolean NOT NULL DEFAULT false,
        occurred_at timestamptz DEFAULT now(),
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS case_communications_case_idx ON case_communications (case_id, occurred_at DESC)`);
    await query(`
      CREATE TABLE IF NOT EXISTS case_fees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        label text NOT NULL,
        amount integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'due',
        due_date text,
        payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS case_fees_case_idx ON case_fees (case_id, status, due_date)`);

    await checkConnection();
    migrationStatus = "up_to_date";
    available = true;
    return true;
  } catch (error) {
    available = false;
    initError = safeError(error);
    migrationStatus = "failed";
    if (isProduction) {
      throw new Error(`PostgreSQL init failed in production: ${initError}`);
    }
    console.warn(`PostgreSQL init failed. Local memory fallback may be used. ${initError}`);
    return false;
  }
}

async function healthCheck() {
  if (!pool) {
    return {
      connected: false,
      db: "disconnected",
      latency_ms: null,
      pool: poolState("not_configured"),
      migrations: migrationStatus,
      error: initError || "DATABASE_URL or DB_URL is not configured.",
    };
  }

  if (!available && migrationStatus !== "up_to_date") {
    return {
      connected: false,
      db: "disconnected",
      latency_ms: lastLatencyMs,
      pool: poolState(migrationStatus === "running" ? "initializing" : "unhealthy"),
      migrations: migrationStatus,
      error: initError || "PostgreSQL initialization is still in progress.",
    };
  }

  const started = Date.now();
  try {
    await query("SELECT 1");
    lastLatencyMs = Date.now() - started;
    available = true;
    return {
      connected: true,
      db: "connected",
      latency_ms: lastLatencyMs,
      pool: poolState("healthy"),
      migrations: migrationStatus,
      error: "",
    };
  } catch (error) {
    available = false;
    initError = safeError(error);
    return {
      connected: false,
      db: "disconnected",
      latency_ms: Date.now() - started,
      pool: poolState("unhealthy"),
      migrations: migrationStatus,
      error: initError,
    };
  }
}

module.exports = {
  get pool() {
    return pool;
  },
  get dbAvailable() {
    return available;
  },
  get migrationStatus() {
    return migrationStatus;
  },
  get lastError() {
    return initError;
  },
  get lastLatencyMs() {
    return lastLatencyMs;
  },
  query,
  initDb,
  healthCheck,
  poolState,
};
