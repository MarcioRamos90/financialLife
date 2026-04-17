package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/service"
)

type TransactionHandler struct {
	svc *service.TransactionService
}

func NewTransactionHandler(svc *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{svc: svc}
}

// GET /api/v1/transactions
func (h *TransactionHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	q := r.URL.Query()
	filters := model.TransactionFilters{
		StartDate:  q.Get("start_date"),
		EndDate:    q.Get("end_date"),
		Type:       q.Get("type"),
		Category:   q.Get("category"),
		RecordedBy: q.Get("recorded_by"),
	}
	txs, err := h.svc.List(r.Context(), claims.HouseholdID, filters)
	if err != nil {
		jsonError(w, "failed to fetch transactions", http.StatusInternalServerError)
		return
	}
	jsonOK(w, txs)
}

// POST /api/v1/transactions
func (h *TransactionHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	var req model.CreateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	tx, err := h.svc.Create(r.Context(), claims.HouseholdID, claims.UserID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(model.Response{Data: tx})
}

// PUT /api/v1/transactions/:id
func (h *TransactionHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	var req model.UpdateTransactionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	tx, err := h.svc.Update(r.Context(), id, claims.HouseholdID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonOK(w, tx)
}

// DELETE /api/v1/transactions/:id
func (h *TransactionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	if err := h.svc.Delete(r.Context(), id, claims.HouseholdID); err != nil {
		jsonError(w, "transaction not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// GET /api/v1/transactions/payment-methods
func (h *TransactionHandler) ListPaymentMethods(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	methods, err := h.svc.ListPaymentMethods(r.Context(), claims.HouseholdID)
	if err != nil {
		jsonError(w, "failed to fetch payment methods", http.StatusInternalServerError)
		return
	}
	jsonOK(w, methods)
}
