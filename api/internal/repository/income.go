package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/marcioramos/financiallife/internal/model"
)

type IncomeRepository struct {
	db *gorm.DB
}

func NewIncomeRepository(db *gorm.DB) *IncomeRepository {
	return &IncomeRepository{db: db}
}

// ListSources returns all active income sources for the household.
func (r *IncomeRepository) ListSources(ctx context.Context, householdID string) ([]model.IncomeSource, error) {
	var sources []model.IncomeSource
	if err := r.db.WithContext(ctx).
		Preload("User").
		Where("household_id = ? AND is_active = true", householdID).
		Order("created_at ASC").
		Find(&sources).Error; err != nil {
		return nil, fmt.Errorf("ListSources: %w", err)
	}
	for i := range sources {
		sources[i].OwnerName = sources[i].User.DisplayName
	}
	return sources, nil
}

// GetSourceByID returns a single active income source, ensuring it belongs to the household.
func (r *IncomeRepository) GetSourceByID(ctx context.Context, id, householdID string) (*model.IncomeSource, error) {
	var s model.IncomeSource
	err := r.db.WithContext(ctx).
		Preload("User").
		Where("id = ? AND household_id = ? AND is_active = true", id, householdID).
		First(&s).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("income source not found")
		}
		return nil, fmt.Errorf("GetSourceByID: %w", err)
	}
	s.OwnerName = s.User.DisplayName
	return &s, nil
}

// CreateSource inserts a new income source and returns the full record.
func (r *IncomeRepository) CreateSource(ctx context.Context, householdID, userID string, req model.CreateIncomeSourceRequest) (*model.IncomeSource, error) {
	currency := req.Currency
	if currency == "" {
		currency = "BRL"
	}
	s := model.IncomeSource{
		HouseholdID:   householdID,
		UserID:        userID,
		Name:          req.Name,
		Category:      req.Category,
		DefaultAmount: req.DefaultAmount,
		Currency:      currency,
		RecurrenceDay: req.RecurrenceDay,
		IsJoint:       req.IsJoint,
		IsActive:      true,
	}
	if err := r.db.WithContext(ctx).Create(&s).Error; err != nil {
		return nil, fmt.Errorf("CreateSource: %w", err)
	}
	return r.GetSourceByID(ctx, s.ID, householdID)
}

// UpdateSource modifies an existing income source.
func (r *IncomeRepository) UpdateSource(ctx context.Context, id, householdID string, req model.UpdateIncomeSourceRequest) (*model.IncomeSource, error) {
	currency := req.Currency
	if currency == "" {
		currency = "BRL"
	}
	result := r.db.WithContext(ctx).Model(&model.IncomeSource{}).
		Where("id = ? AND household_id = ? AND is_active = true", id, householdID).
		Updates(map[string]any{
			"name":           req.Name,
			"category":       req.Category,
			"default_amount": req.DefaultAmount,
			"currency":       currency,
			"recurrence_day": req.RecurrenceDay,
			"is_joint":       req.IsJoint,
		})
	if result.Error != nil {
		return nil, fmt.Errorf("UpdateSource: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return nil, fmt.Errorf("income source not found")
	}
	return r.GetSourceByID(ctx, id, householdID)
}

// DeleteSource soft-deletes by setting is_active = false.
func (r *IncomeRepository) DeleteSource(ctx context.Context, id, householdID string) error {
	result := r.db.WithContext(ctx).Model(&model.IncomeSource{}).
		Where("id = ? AND household_id = ?", id, householdID).
		Update("is_active", false)
	if result.Error != nil {
		return fmt.Errorf("DeleteSource: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("income source not found")
	}
	return nil
}

// UpsertEntry records a monthly income entry. If one already exists for
// (income_source_id, year, month) it is overwritten.
func (r *IncomeRepository) UpsertEntry(ctx context.Context, sourceID, userID string, req model.CreateIncomeEntryRequest) (*model.IncomeEntry, error) {
	var entry model.IncomeEntry
	err := r.db.WithContext(ctx).
		Where("income_source_id = ? AND year = ? AND month = ?", sourceID, req.Year, req.Month).
		First(&entry).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("UpsertEntry lookup: %w", err)
	}

	entry.IncomeSourceID = sourceID
	entry.UserID = userID
	entry.Year = req.Year
	entry.Month = req.Month
	entry.ExpectedAmount = req.ExpectedAmount
	entry.ReceivedAmount = req.ReceivedAmount
	entry.ReceivedOn = req.ReceivedOn
	entry.Notes = req.Notes

	if err := r.db.WithContext(ctx).Save(&entry).Error; err != nil {
		return nil, fmt.Errorf("UpsertEntry save: %w", err)
	}
	return &entry, nil
}

// ListHistory returns all entries for the given source, newest first.
// It verifies the source belongs to the household before querying.
func (r *IncomeRepository) ListHistory(ctx context.Context, sourceID, householdID string) ([]model.IncomeEntry, error) {
	if _, err := r.GetSourceByID(ctx, sourceID, householdID); err != nil {
		return nil, err
	}
	var entries []model.IncomeEntry
	if err := r.db.WithContext(ctx).
		Where("income_source_id = ?", sourceID).
		Order("year DESC, month DESC").
		Find(&entries).Error; err != nil {
		return nil, fmt.Errorf("ListHistory: %w", err)
	}
	return entries, nil
}
