package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/service"
)

type AccountHandler struct {
	svc *service.AccountService
}

func NewAccountHandler(svc *service.AccountService) *AccountHandler {
	return &AccountHandler{svc: svc}
}

// GET /api/v1/accounts
func (h *AccountHandler) List(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	accounts, err := h.svc.List(r.Context(), claims.HouseholdID)
	if err != nil {
		jsonError(w, "failed to fetch accounts", http.StatusInternalServerError)
		return
	}
	jsonOK(w, accounts)
}

// POST /api/v1/accounts
func (h *AccountHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	var req model.CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	account, err := h.svc.Create(r.Context(), claims.HouseholdID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(model.Response{Data: account})
}

// GET /api/v1/accounts/:id
func (h *AccountHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	account, err := h.svc.GetByID(r.Context(), id, claims.HouseholdID)
	if err != nil {
		jsonError(w, "account not found", http.StatusNotFound)
		return
	}
	jsonOK(w, account)
}

// GET /api/v1/accounts/:id/balance
func (h *AccountHandler) Balance(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	balance, err := h.svc.Balance(r.Context(), id, claims.HouseholdID)
	if err != nil {
		jsonError(w, "account not found", http.StatusNotFound)
		return
	}
	jsonOK(w, balance)
}

// PUT /api/v1/accounts/:id
func (h *AccountHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	var req model.UpdateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	account, err := h.svc.Update(r.Context(), id, claims.HouseholdID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonOK(w, account)
}

// DELETE /api/v1/accounts/:id
func (h *AccountHandler) Archive(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	if err := h.svc.Archive(r.Context(), id, claims.HouseholdID); err != nil {
		jsonError(w, "account not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
