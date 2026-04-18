package service

import (
	"context"
	"fmt"

	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
)

type IncomeService struct {
	repo *repository.IncomeRepository
}

func NewIncomeService(repo *repository.IncomeRepository) *IncomeService {
	return &IncomeService{repo: repo}
}

func (s *IncomeService) ListSources(ctx context.Context, householdID string) ([]model.IncomeSource, error) {
	return s.repo.ListSources(ctx, householdID)
}

func (s *IncomeService) CreateSource(ctx context.Context, householdID, userID string, req model.CreateIncomeSourceRequest) (*model.IncomeSource, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	return s.repo.CreateSource(ctx, householdID, userID, req)
}

func (s *IncomeService) UpdateSource(ctx context.Context, id, householdID string, req model.UpdateIncomeSourceRequest) (*model.IncomeSource, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	return s.repo.UpdateSource(ctx, id, householdID, req)
}

func (s *IncomeService) DeleteSource(ctx context.Context, id, householdID string) error {
	return s.repo.DeleteSource(ctx, id, householdID)
}

func (s *IncomeService) RecordEntry(ctx context.Context, sourceID, householdID, userID string, req model.CreateIncomeEntryRequest) (*model.IncomeEntry, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	// Verify the source belongs to this household before writing the entry.
	if _, err := s.repo.GetSourceByID(ctx, sourceID, householdID); err != nil {
		return nil, fmt.Errorf("income source not found")
	}
	return s.repo.UpsertEntry(ctx, sourceID, userID, req)
}

func (s *IncomeService) ListHistory(ctx context.Context, sourceID, householdID string) ([]model.IncomeEntry, error) {
	return s.repo.ListHistory(ctx, sourceID, householdID)
}
