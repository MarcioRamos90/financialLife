package service

import (
	"context"
	"fmt"

	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
)

type TransactionService struct {
	repo *repository.TransactionRepository
}

func NewTransactionService(repo *repository.TransactionRepository) *TransactionService {
	return &TransactionService{repo: repo}
}

func (s *TransactionService) List(ctx context.Context, householdID string, f model.TransactionFilters) ([]model.Transaction, error) {
	return s.repo.List(ctx, householdID, f)
}

func (s *TransactionService) GetByID(ctx context.Context, id, householdID string) (*model.Transaction, error) {
	return s.repo.GetByID(ctx, id, householdID)
}

func (s *TransactionService) Create(ctx context.Context, householdID, userID string, req model.CreateTransactionRequest) (*model.Transaction, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	return s.repo.Create(ctx, householdID, userID, req)
}

func (s *TransactionService) Update(ctx context.Context, id, householdID string, req model.UpdateTransactionRequest) (*model.Transaction, error) {
	if msg := req.Validate(); msg != "" {
		return nil, fmt.Errorf("%s", msg)
	}
	return s.repo.Update(ctx, id, householdID, req)
}

func (s *TransactionService) Delete(ctx context.Context, id, householdID string) error {
	return s.repo.Delete(ctx, id, householdID)
}

func (s *TransactionService) ListPaymentMethods(ctx context.Context, householdID string) ([]model.PaymentMethod, error) {
	return s.repo.ListPaymentMethods(ctx, householdID)
}
