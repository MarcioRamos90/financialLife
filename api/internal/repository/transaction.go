package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jmoiron/sqlx"

	"github.com/marcioramos/financiallife/internal/model"
)

type TransactionRepository struct {
	db *sqlx.DB
}

func NewTransactionRepository(db *sqlx.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

const transactionSelectBase = `
	SELECT
		t.id, t.household_id, t.recorded_by,
		u.display_name  AS recorded_by_name,
		t.type, t.amount::float8 AS amount, t.currency,
		COALESCE(t.description, '')  AS description,
		COALESCE(t.category, '')     AS category,
		t.is_joint,
		t.payment_method_id,
		pm.name AS payment_method_name,
		t.income_source_id,
		t.transaction_date::text AS transaction_date,
		t.created_at, t.updated_at
	FROM transactions t
	JOIN users u ON u.id = t.recorded_by
	LEFT JOIN payment_methods pm ON pm.id = t.payment_method_id
	WHERE t.household_id = $1 AND t.deleted_at IS NULL
`

// List returns all transactions for the household, with optional filters.
func (r *TransactionRepository) List(ctx context.Context, householdID string, f model.TransactionFilters) ([]model.Transaction, error) {
	args := []any{householdID}
	conditions := []string{}

	if f.StartDate != "" {
		args = append(args, f.StartDate)
		conditions = append(conditions, fmt.Sprintf("t.transaction_date >= $%d", len(args)))
	}
	if f.EndDate != "" {
		args = append(args, f.EndDate)
		conditions = append(conditions, fmt.Sprintf("t.transaction_date <= $%d", len(args)))
	}
	if f.Type != "" {
		args = append(args, f.Type)
		conditions = append(conditions, fmt.Sprintf("t.type = $%d", len(args)))
	}
	if f.Category != "" {
		args = append(args, f.Category)
		conditions = append(conditions, fmt.Sprintf("t.category = $%d", len(args)))
	}
	if f.RecordedBy != "" {
		args = append(args, f.RecordedBy)
		conditions = append(conditions, fmt.Sprintf("t.recorded_by = $%d", len(args)))
	}

	query := transactionSelectBase
	if len(conditions) > 0 {
		query += " AND " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY t.transaction_date DESC, t.created_at DESC"

	var txs []model.Transaction
	if err := r.db.SelectContext(ctx, &txs, query, args...); err != nil {
		return nil, fmt.Errorf("List transactions: %w", err)
	}
	return txs, nil
}

// GetByID returns a single transaction, ensuring it belongs to the household.
func (r *TransactionRepository) GetByID(ctx context.Context, id, householdID string) (*model.Transaction, error) {
	query := transactionSelectBase + " AND t.id = $2"
	var tx model.Transaction
	if err := r.db.GetContext(ctx, &tx, query, householdID, id); err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	return &tx, nil
}

// Create inserts a new transaction and returns it.
func (r *TransactionRepository) Create(ctx context.Context, householdID, userID string, req model.CreateTransactionRequest) (*model.Transaction, error) {
	currency := req.Currency
	if currency == "" {
		currency = "BRL"
	}
	var id string
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO transactions
			(household_id, recorded_by, type, amount, currency, description, category, is_joint, payment_method_id, transaction_date)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date)
		RETURNING id`,
		householdID, userID, req.Type, req.Amount, currency,
		req.Description, req.Category, req.IsJoint, req.PaymentMethodID, req.TransactionDate,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("Create transaction: %w", err)
	}
	return r.GetByID(ctx, id, householdID)
}

// Update modifies an existing transaction.
func (r *TransactionRepository) Update(ctx context.Context, id, householdID string, req model.UpdateTransactionRequest) (*model.Transaction, error) {
	_, err := r.db.ExecContext(ctx, `
		UPDATE transactions
		SET type=$1, amount=$2, currency=$3, description=$4, category=$5,
		    is_joint=$6, payment_method_id=$7, transaction_date=$8::date
		WHERE id=$9 AND household_id=$10 AND deleted_at IS NULL`,
		req.Type, req.Amount, req.Currency, req.Description, req.Category,
		req.IsJoint, req.PaymentMethodID, req.TransactionDate, id, householdID,
	)
	if err != nil {
		return nil, fmt.Errorf("Update transaction: %w", err)
	}
	return r.GetByID(ctx, id, householdID)
}

// Delete soft-deletes a transaction.
func (r *TransactionRepository) Delete(ctx context.Context, id, householdID string) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE transactions SET deleted_at = now() WHERE id=$1 AND household_id=$2 AND deleted_at IS NULL`,
		id, householdID,
	)
	if err != nil {
		return fmt.Errorf("Delete transaction: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return fmt.Errorf("transaction not found")
	}
	return nil
}

// ListPaymentMethods returns all active payment methods for the household.
func (r *TransactionRepository) ListPaymentMethods(ctx context.Context, householdID string) ([]model.PaymentMethod, error) {
	var methods []model.PaymentMethod
	err := r.db.SelectContext(ctx, &methods,
		`SELECT id, household_id, name, type, created_at FROM payment_methods
		 WHERE household_id=$1 AND deleted_at IS NULL ORDER BY name`,
		householdID,
	)
	if err != nil {
		return nil, fmt.Errorf("ListPaymentMethods: %w", err)
	}
	return methods, nil
}
