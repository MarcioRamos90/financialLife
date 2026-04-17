-- SQLite equivalent of db/migrations/002_auth.up.sql
-- Key differences from PostgreSQL:
--   * UUID columns are TEXT
--   * TIMESTAMPTZ → TEXT
--   * The dev-seed password UPDATE is included as plain SQL (safe on empty DB too)

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          TEXT    PRIMARY KEY,
    user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT    NOT NULL UNIQUE,
    expires_at  TEXT    NOT NULL,
    revoked_at  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Fix dev-seed password hashes (no-op on a clean DB, safe to run regardless)
UPDATE users
SET    password_hash = '$2b$10$GHk5DADWwtKXONzd.eSskuIose5LWOyDuz3CgncckKTMZdvp1bWf6'
WHERE  email IN ('marcio@home.local', 'wife@home.local');
