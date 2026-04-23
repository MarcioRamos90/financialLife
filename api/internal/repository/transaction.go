package repository

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/marcioramos/financiallife/internal/model"
)

type TransactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

// List returns all transactions for the household, with optional filters.
func (r *TransactionRepository) List(ctx context.Context, householdID string, f model.TransactionFilters) ([]model.Transaction, error) {
	var txs []model.Transaction
	q := r.db.WithContext(ctx).
		Preload("RecordedByUser").
		Preload("PaymentMethod").
		Where("household_id = ?", householdID)

	if f.StartDate != "" {
		q = q.Where("transaction_date >= ?", f.StartDate)
	}
	if f.EndDate != "" {
		q = q.Where("transaction_date <= ?", f.EndDate)
	}
	if f.Type != "" {
		q = q.Where("type = ?", f.Type)
	}
	if f.Category != "" {
		q = q.Where("category = ?", f.Category)
	}
	if f.RecordedBy != "" {
		q = q.Where("recorded_by = ?", f.RecordedBy)
	}
	if f.AccountID != "" {
		q = q.Where("account_id = ? OR to_account_id = ?", f.AccountID, f.AccountID)
	}

	if err := q.Order("transaction_date DESC, created_at DESC").Find(&txs).Error; err != nil {
		return nil, fmt.Errorf("List transactions: %w", err)
	}
	populateVirtualFields(txs)
	return txs, nil
}

// GetByID returns a single transaction, ensuring it belongs to the household.
func (r *TransactionRepository) GetByID(ctx context.Context, id, householdID string) (*model.Transaction, error) {
	var tx model.Transaction
	err := r.db.WithContext(ctx).
		Preload("RecordedByUser").
		Preload("PaymentMethod").
		Where("id = ? AND household_id = ?", id, householdID).
		First(&tx).Error
	if err != nil {
		return nil, fmt.Errorf("GetByID: %w", err)
	}
	populateVirtualFields([]model.Transaction{tx})
	return &tx, nil
}

// Create inserts a new transaction and returns the full record with associations.
func (r *TransactionRepository) Create(ctx context.Context, householdID, userID string, req model.CreateTransactionRequest) (*model.Transaction, error) {
	currency := req.Currency
	if currency == "" {
		currency = "BRL"
	}
	tx := model.Transaction{
		HouseholdID:     householdID,
		RecordedBy:      userID,
		AccountID:       req.AccountID,
		ToAccountID:     req.ToAccountID,
		Type:            req.Type,
		Amount:          req.Amount,
		Currency:        currency,
		Description:     req.Description,
		Category:        req.Category,
		IsJoint:         req.IsJoint,
		PaymentMethodID: req.PaymentMethodID,
		TransactionDate: req.TransactionDate,
	}
	if err := r.db.WithContext(ctx).Create(&tx).Error; err != nil {
		return nil, fmt.Errorf("Create transaction: %w", err)
	}
	return r.GetByID(ctx, tx.ID, householdID)
}

// Update modifies an existing transaction.
func (r *TransactionRepository) Update(ctx context.Context, id, householdID string, req model.UpdateTransactionRequest) (*model.Transaction, error) {
	result := r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("id = ? AND household_id = ?", id, householdID).
		Updates(map[string]any{
			"account_id":        req.AccountID,
			"to_account_id":     req.ToAccountID,
			"type":              req.Type,
			"amount":            req.Amount,
			"currency":          req.Currency,
			"description":       req.Description,
			"category":          req.Category,
			"is_joint":          req.IsJoint,
			"payment_method_id": req.PaymentMethodID,
			"transaction_date":  req.TransactionDate,
		})
	if result.Error != nil {
		return nil, fmt.Errorf("Update transaction: %w", result.Error)
	}
	return r.GetByID(ctx, id, householdID)
}

// Delete soft-deletes a transaction (GORM sets deleted_at automatically).
func (r *TransactionRepository) Delete(ctx context.Context, id, householdID string) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND household_id = ?", id, householdID).
		Delete(&model.Transaction{})
	if result.Error != nil {
		return fmt.Errorf("Delete transaction: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("transaction not found")
	}
	return nil
}

// ListPaymentMethods returns all active payment methods for the household.
func (r *TransactionRepository) ListPaymentMethods(ctx context.Context, householdID string) ([]model.PaymentMethod, error) {
	var methods []model.PaymentMethod
	if err := r.db.WithContext(ctx).
		Where("household_id = ?", householdID).
		Order("name").
		Find(&methods).Error; err != nil {
		return nil, fmt.Errorf("ListPaymentMethods: %w", err)
	}
	return methods, nil
}

// populateVirtualFields copies association data into the virtual JSON fields.
func populateVirtualFields(txs []model.Transaction) {
	for i := range txs {
		txs[i].RecordedByName = txs[i].RecordedByUser.DisplayName
		if txs[i].PaymentMethod != nil {
			name := txs[i].PaymentMethod.Name
			txs[i].PaymentMethodName = &name
		}
	}
}
