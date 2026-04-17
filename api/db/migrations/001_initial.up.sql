-- Migration 001: households and users
-- Run order: households first (users references it)

-- ─── Extension ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- provides gen_random_uuid()

-- ─── households ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT        NOT NULL,
    currency     CHAR(3)     NOT NULL DEFAULT 'BRL',
    timezone     TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
    pay_day      SMALLINT    CHECK (pay_day BETWEEN 1 AND 31),  -- day of month salaries arrive
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id   UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email          TEXT        NOT NULL UNIQUE,
    display_name   TEXT        NOT NULL,
    password_hash  TEXT        NOT NULL,
    role           TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ           -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_users_household_id ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_households_updated_at
    BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Seed: default household + two users (development only) ──────────────────
-- Password for both: "changeme123"  (bcrypt hash cost 12)
-- REMOVE or gate behind APP_ENV check before production deploy
DO $$
DECLARE
    hid UUID := gen_random_uuid();
BEGIN
    INSERT INTO households (id, name, currency, timezone, pay_day)
    VALUES (hid, 'Our Household', 'BRL', 'America/Sao_Paulo', 5);

    INSERT INTO users (household_id, email, display_name, password_hash, role)
    VALUES
        (hid, 'marcio@home.local',  'Marcio', '$2a$12$K9.3xELqVP7M1S2zB0fOlOZ3y5T6wR8uA9vC4dX1mN7pQ2jH6eI0G', 'admin'),
        (hid, 'wife@home.local',    'Wife',   '$2a$12$K9.3xELqVP7M1S2zB0fOlOZ3y5T6wR8uA9vC4dX1mN7pQ2jH6eI0G', 'admin');
END $$;
