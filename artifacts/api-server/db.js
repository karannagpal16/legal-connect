const connectionString = process.env.DB_URL || process.env.DATABASE_URL;

let pool = null;
let available = false;

if (connectionString) {
  try {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });
    available = true;
  } catch (error) {
    console.warn(`PostgreSQL driver unavailable. Using memory fallback. ${error.message}`);
  }
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }
  return pool.query(text, params);
}

async function initDb() {
  if (!pool) {
    available = false;
    return false;
  }

  try {
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

    await query(`
      CREATE TABLE IF NOT EXISTS case_updates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        case_id uuid,
        update_type text,
        message text,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      )
    `);

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

    await query(`CREATE INDEX IF NOT EXISTS legal_sources_status_idx ON legal_sources (status)`);
    await query(`CREATE INDEX IF NOT EXISTS legal_chunks_source_idx ON legal_chunks (source_id)`);
    await query(`CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS receipts_user_created_idx ON receipts (user_id, created_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS receipts_created_idx ON receipts (created_at DESC)`);

    available = true;
    return true;
  } catch (error) {
    available = false;
    console.warn(`PostgreSQL init failed. Using memory fallback. ${error.message}`);
    return false;
  }
}

module.exports = {
  get pool() {
    return pool;
  },
  get dbAvailable() {
    return available;
  },
  query,
  initDb,
};
