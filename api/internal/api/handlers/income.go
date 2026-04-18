package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/service"
)

type IncomeHandler struct {
	svc *service.IncomeService
}

func NewIncomeHandler(svc *service.IncomeService) *IncomeHandler {
	return &IncomeHandler{svc: svc}
}

// GET /api/v1/income-sources
func (h *IncomeHandler) ListSources(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	sources, err := h.svc.ListSources(r.Context(), claims.HouseholdID)
	if err != nil {
		jsonError(w, "failed to fetch income sources", http.StatusInternalServerError)
		return
	}
	jsonOK(w, sources)
}

// POST /api/v1/income-sources
func (h *IncomeHandler) CreateSource(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	var req model.CreateIncomeSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	source, err := h.svc.CreateSource(r.Context(), claims.HouseholdID, claims.UserID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(model.Response{Data: source})
}

// PUT /api/v1/income-sources/{id}
func (h *IncomeHandler) UpdateSource(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	var req model.UpdateIncomeSourceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	source, err := h.svc.UpdateSource(r.Context(), id, claims.HouseholdID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonOK(w, source)
}

// DELETE /api/v1/income-sources/{id}
func (h *IncomeHandler) DeleteSource(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteSource(r.Context(), id, claims.HouseholdID); err != nil {
		jsonError(w, "income source not found", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/income-sources/{id}/entries
func (h *IncomeHandler) RecordEntry(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	sourceID := chi.URLParam(r, "id")
	var req model.CreateIncomeEntryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request body", http.StatusBadRequest)
		return
	}
	entry, err := h.svc.RecordEntry(r.Context(), sourceID, claims.HouseholdID, claims.UserID, req)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(model.Response{Data: entry})
}

// GET /api/v1/income-sources/{id}/history
func (h *IncomeHandler) ListHistory(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	sourceID := chi.URLParam(r, "id")
	entries, err := h.svc.ListHistory(r.Context(), sourceID, claims.HouseholdID)
	if err != nil {
		jsonError(w, "income source not found", http.StatusNotFound)
		return
	}
	jsonOK(w, entries)
}
