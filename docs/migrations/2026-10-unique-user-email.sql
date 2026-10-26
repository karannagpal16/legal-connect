-- Make user emails unique (case-insensitive) so a double-tapped "Sign up" can't
-- create two accounts for one person. Run MANUALLY against the database, in order.
-- Not run automatically at startup, because it fails if duplicates already exist.

-- 1. Look for existing duplicates. If this returns rows, merge or delete the extra
--    accounts first (keep the one with bookings/cases), then continue.
SELECT lower(email) AS email, count(*) AS accounts, array_agg(id ORDER BY created_at) AS user_ids
FROM users
WHERE email IS NOT NULL
GROUP BY lower(email)
HAVING count(*) > 1;

-- 2. Add the unique index without locking the table.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_unique_ci
  ON users (lower(email))
  WHERE email IS NOT NULL;

-- Rollback (if ever needed):
-- DROP INDEX CONCURRENTLY IF EXISTS users_email_unique_ci;
