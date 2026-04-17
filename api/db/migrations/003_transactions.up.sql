-- Migration 003: payment_methods and transactions

-- ─── payment_methods ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name         TEXT        NOT NULL,   -- e.g. "Nubank", "Itaú", "Cash"
    type         TEXT        NOT NULL CHECK (type IN ('credit_card','debit_card','bank_transfer','pix','cash','other')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_household ON payment_methods(household_id);

-- ─── transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id      UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    recorded_by       UUID        NOT NULL REFERENCES users(id),
    type              TEXT        NOT NULL CHECK (type IN ('income','expense','transfer')),
    amount            NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency          CHAR(3)     NOT NULL DEFAULT 'BRL',
    description       TEXT,
    category          TEXT,
    is_joint          BOOLEAN     NOT NULL DEFAULT false,
    payment_method_id UUID        REFERENCES payment_methods(id),
    income_source_id  UUID,       -- populated for income transactions (FK added in week 4)
    transaction_date  DATE        NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_household    ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recorded_by ON transactions(recorded_by);
CREATE INDEX IF NOT EXISTS idx_transactions_date        ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type        ON transactions(type);

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Seed: a few sample transactions for development ─────────────────────────
DO $$
DECLARE
    hid  UUID;
    uid1 UUID;
    uid2 UUID;
    pmid UUID;
BEGIN
    SELECT id INTO hid  FROM households LIMIT 1;
    SELECT id INTO uid1 FROM users WHERE email = 'marcio@home.local';
    SELECT id INTO uid2 FROM users WHERE email = 'wife@home.local';

    IF hid IS NULL THEN RETURN; END IF;

    -- Payment method
    INSERT INTO payment_methods (household_id, name, type)
    VALUES (hid, 'Nubank', 'credit_card')
    RETURNING id INTO pmid;

    -- Sample transactions
    INSERT INTO transactions (household_id, recorded_by, type, amount, description, category, transaction_date)
    VALUES
        (hid, uid1, 'income',  5000.00, 'Monthly salary',   'Salary',        date_trunc('month', now())::date),
        (hid, uid2, 'income',  4000.00, 'Monthly salary',   'Salary',        date_trunc('month', now())::date),
        (hid, uid1, 'expense',  850.00, 'Rent',             'Housing',       date_trunc('month', now())::date),
        (hid, uid1, 'expense',  120.00, 'Supermarket',      'Food',          now()::date),
        (hid, uid2, 'expense',   80.00, 'Bus pass',         'Transport',     now()::date),
        (hid, uid1, 'expense',   45.00, 'Netflix + Spotify','Entertainment', now()::date);
END $$;
