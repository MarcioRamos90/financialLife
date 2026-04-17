-- SQLite equivalent of db/migrations/003_transactions.up.sql
-- Key differences from PostgreSQL:
--   * UUID columns are TEXT
--   * TIMESTAMPTZ → TEXT, DATE → TEXT
--   * NUMERIC(15,2) → REAL
--   * BOOLEAN → INTEGER (SQLite has no native boolean; 0/1)
--   * The set_updated_at() function is replaced by a SQLite AFTER UPDATE trigger
--   * DO $$ ... $$ seed block omitted — testutil.seedData() handles test fixtures

CREATE TABLE IF NOT EXISTS payment_methods (
    id           TEXT    PRIMARY KEY,
    household_id TEXT    NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    type         TEXT    NOT NULL CHECK (type IN ('credit_card','debit_card','bank_transfer','pix','cash','other')),
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    deleted_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_household ON payment_methods(household_id);

CREATE TABLE IF NOT EXISTS transactions (
    id                TEXT    PRIMARY KEY,
    household_id      TEXT    NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    recorded_by       TEXT    NOT NULL REFERENCES users(id),
    type              TEXT    NOT NULL CHECK (type IN ('income','expense','transfer')),
    amount            REAL    NOT NULL CHECK (amount > 0),
    currency          TEXT    NOT NULL DEFAULT 'BRL',
    description       TEXT,
    category          TEXT,
    is_joint          INTEGER NOT NULL DEFAULT 0,
    payment_method_id TEXT    REFERENCES payment_methods(id),
    income_source_id  TEXT,
    transaction_date  TEXT    NOT NULL,
    created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    deleted_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_household    ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recorded_by ON transactions(recorded_by);
CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type        ON transactions(type);

CREATE TRIGGER IF NOT EXISTS trg_transactions_updated_at
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at
    BEGIN
        UPDATE transactions
        SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
        WHERE id = NEW.id;
    END;
