package service

import (
	"context"
	"fmt"

	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
)

type AccountService struct {
	repo *repository.AccountRepository
}

func NewAccountService(repo *repository.AccountRepository) *AccountService {
	return &AccountService{repo: repo}
}

func (s *AccountService) List(ctx context.Context, householdID string) ([]model.Account, error) {
	return s.repo.List(ctx, householdID)
}

func (s *AccountService) GetByID(ctx context.Context, id, householdID string) (*model.Account, error) {
	return s.repo.GetByID(ctx, id, householdID)
}

func (s *AccountService) Create(ctx context.Context, householdID string, req model.CreateAccountRequest) (*model.Account, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	currency := req.Currency
	if currency == "" {
		currency = "BRL"
	}
	a := &model.Account{
		HouseholdID:    householdID,
		Name:           req.Name,
		Type:           req.Type,
		IsJoint:        req.IsJoint,
		Currency:       currency,
		Color:          req.Color,
		Icon:           req.Icon,
		InitialBalance: req.InitialBalance,
	}
	if err := s.repo.Create(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

// CreateDefault seeds one "Cash" account for a new household.
// Used during dev seed and test setup.
func (s *AccountService) CreateDefault(ctx context.Context, householdID, currency string) (*model.Account, error) {
	if currency == "" {
		currency = "BRL"
	}
	return s.Create(ctx, householdID, model.CreateAccountRequest{
		Name:     "Cash",
		Type:     "cash",
		IsJoint:  true,
		Currency: currency,
	})
}

func (s *AccountService) Update(ctx context.Context, id, householdID string, req model.UpdateAccountRequest) (*model.Account, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	return s.repo.Update(ctx, id, householdID, req)
}

func (s *AccountService) Archive(ctx context.Context, id, householdID string) error {
	return s.repo.Archive(ctx, id, householdID)
}

func (s *AccountService) Balance(ctx context.Context, id, householdID string, f model.AccountBalanceFilters) (*model.AccountBalanceResponse, error) {
	return s.repo.Balance(ctx, id, householdID, f)
}
