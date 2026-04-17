-- Migration 002: refresh tokens + fix dev seed password hashes

-- ─── refresh_tokens ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT        NOT NULL UNIQUE,   -- SHA-256 of the raw token
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,                   -- NULL = still valid
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ─── Fix dev seed: set both users' password to "password" (bcrypt cost 10) ───
-- Only runs if the seed rows exist (safe to run on a clean DB too)
UPDATE users
SET    password_hash = '$2b$10$GHk5DADWwtKXONzd.eSskuIose5LWOyDuz3CgncckKTMZdvp1bWf6'
WHERE  email IN ('marcio@home.local', 'wife@home.local');
