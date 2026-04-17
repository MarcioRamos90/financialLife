-- SQLite equivalent of db/migrations/001_initial.up.sql
-- Key differences from PostgreSQL:
--   * UUID columns are TEXT (IDs generated in Go, not by the DB)
--   * TIMESTAMPTZ → TEXT, stored as RFC3339 via strftime default
--   * CHAR(3)/SMALLINT → TEXT/INTEGER (SQLite type affinity)
--   * gen_random_uuid() removed — caller must supply the id value
--   * PL/pgSQL set_updated_at() function replaced by a SQLite AFTER UPDATE trigger
--   * DO $$ ... $$ seed block omitted — testutil.seedData() handles test fixtures

CREATE TABLE IF NOT EXISTS households (
    id          TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL,
    currency    TEXT        NOT NULL DEFAULT 'BRL',
    timezone    TEXT        NOT NULL DEFAULT 'America/Sao_Paulo',
    pay_day     INTEGER     CHECK (pay_day BETWEEN 1 AND 31),
    created_at  TEXT        NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT        NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
    id             TEXT    PRIMARY KEY,
    household_id   TEXT    NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email          TEXT    NOT NULL UNIQUE,
    display_name   TEXT    NOT NULL,
    password_hash  TEXT    NOT NULL,
    role           TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    deleted_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_household_id ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);

CREATE TRIGGER IF NOT EXISTS trg_households_updated_at
    AFTER UPDATE ON households
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at
    BEGIN
        UPDATE households
        SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at
    BEGIN
        UPDATE users
        SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = NEW.id;
    END;
