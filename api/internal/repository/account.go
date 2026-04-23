package repository

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/marcioramos/financiallife/internal/model"
)

type AccountRepository struct {
	db *gorm.DB
}

func NewAccountRepository(db *gorm.DB) *AccountRepository {
	return &AccountRepository{db: db}
}

// List returns all non-archived accounts for the household.
func (r *AccountRepository) List(ctx context.Context, householdID string) ([]model.Account, error) {
	var accounts []model.Account
	if err := r.db.WithContext(ctx).
		Where("household_id = ? AND archived_at IS NULL", householdID).
		Order("created_at ASC").
		Find(&accounts).Error; err != nil {
		return nil, fmt.Errorf("List accounts: %w", err)
	}
	return accounts, nil
}

// GetByID returns a single account, ensuring it belongs to the household.
func (r *AccountRepository) GetByID(ctx context.Context, id, householdID string) (*model.Account, error) {
	var account model.Account
	if err := r.db.WithContext(ctx).
		Where("id = ? AND household_id = ?", id, householdID).
		First(&account).Error; err != nil {
		return nil, fmt.Errorf("GetByID account: %w", err)
	}
	return &account, nil
}

// Create inserts a new account.
func (r *AccountRepository) Create(ctx context.Context, a *model.Account) error {
	if err := r.db.WithContext(ctx).Create(a).Error; err != nil {
		return fmt.Errorf("Create account: %w", err)
	}
	return nil
}

// Update modifies an existing account by ID, scoped to the household.
func (r *AccountRepository) Update(ctx context.Context, id, householdID string, req model.UpdateAccountRequest) (*model.Account, error) {
	currency := req.Currency
	if currency == "" {
		currency = "BRL"
	}
	result := r.db.WithContext(ctx).Model(&model.Account{}).
		Where("id = ? AND household_id = ?", id, householdID).
		Updates(map[string]any{
			"name":            req.Name,
			"type":            req.Type,
			"is_joint":        req.IsJoint,
			"currency":        currency,
			"color":           req.Color,
			"icon":            req.Icon,
			"initial_balance": req.InitialBalance,
		})
	if result.Error != nil {
		return nil, fmt.Errorf("Update account: %w", result.Error)
	}
	return r.GetByID(ctx, id, householdID)
}

// Archive soft-deletes an account by setting archived_at.
func (r *AccountRepository) Archive(ctx context.Context, id, householdID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).Model(&model.Account{}).
		Where("id = ? AND household_id = ? AND archived_at IS NULL", id, householdID).
		Update("archived_at", now)
	if result.Error != nil {
		return fmt.Errorf("Archive account: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("account not found")
	}
	return nil
}

// Balance calculates the current balance of an account:
//   initial_balance + income - expenses - transfers_out + transfers_in
// Income and Expense totals in the response are scoped to the optional date range in f.
func (r *AccountRepository) Balance(ctx context.Context, id, householdID string, f model.AccountBalanceFilters) (*model.AccountBalanceResponse, error) {
	acc, err := r.GetByID(ctx, id, householdID)
	if err != nil {
		return nil, err
	}

	type sumResult struct{ Total float64 }
	var res sumResult

	applyDate := func(q *gorm.DB) *gorm.DB {
		if f.StartDate != "" {
			q = q.Where("transaction_date >= ?", f.StartDate)
		}
		if f.EndDate != "" {
			q = q.Where("transaction_date <= ?", f.EndDate)
		}
		return q
	}

	// Total balance is always unfiltered (full account history)
	balance := acc.InitialBalance

	r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("account_id = ? AND type = ?", id, "income").
		Select("COALESCE(SUM(amount), 0) as total").Scan(&res)
	balance += res.Total

	res.Total = 0
	r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("account_id = ? AND type = ?", id, "expense").
		Select("COALESCE(SUM(amount), 0) as total").Scan(&res)
	balance -= res.Total

	res.Total = 0
	r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("account_id = ? AND type = ?", id, "transfer").
		Select("COALESCE(SUM(amount), 0) as total").Scan(&res)
	balance -= res.Total

	res.Total = 0
	r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("to_account_id = ? AND type = ?", id, "transfer").
		Select("COALESCE(SUM(amount), 0) as total").Scan(&res)
	balance += res.Total

	// Income/Expense totals are scoped to the date range (for the panel summary)
	var income, expense sumResult
	applyDate(r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("account_id = ? AND type = ?", id, "income")).
		Select("COALESCE(SUM(amount), 0) as total").Scan(&income)

	applyDate(r.db.WithContext(ctx).Model(&model.Transaction{}).
		Where("account_id = ? AND type = ?", id, "expense")).
		Select("COALESCE(SUM(amount), 0) as total").Scan(&expense)

	return &model.AccountBalanceResponse{
		AccountID: id,
		Balance:   balance,
		Income:    income.Total,
		Expense:   expense.Total,
	}, nil
}
