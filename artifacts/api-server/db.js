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
