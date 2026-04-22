package handlers

import (
	"io"
	"net/http"

	"github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
	"github.com/marcioramos/financiallife/internal/service"
)

const maxImportBytes = 10 << 20 // 10 MB

// ImportExportHandler serves all import/export endpoints.
type ImportExportHandler struct {
	txSvc      *service.TransactionService
	accountSvc *service.AccountService
	userRepo   *repository.UserRepository
	txRepo     *repository.TransactionRepository
}

func NewImportExportHandler(
	txSvc *service.TransactionService,
	accountSvc *service.AccountService,
	userRepo *repository.UserRepository,
	txRepo *repository.TransactionRepository,
) *ImportExportHandler {
	return &ImportExportHandler{
		txSvc:      txSvc,
		accountSvc: accountSvc,
		userRepo:   userRepo,
		txRepo:     txRepo,
	}
}

// GET /api/v1/transactions/export
func (h *ImportExportHandler) ExportTransactions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	q := r.URL.Query()
	filters := model.TransactionFilters{
		StartDate:  q.Get("start_date"),
		EndDate:    q.Get("end_date"),
		Type:       q.Get("type"),
		Category:   q.Get("category"),
		RecordedBy: q.Get("recorded_by"),
	}
	data, err := h.txSvc.ExportXLSX(r.Context(), claims.HouseholdID, filters)
	if err != nil {
		jsonError(w, "failed to export transactions", http.StatusInternalServerError)
		return
	}
	writeXLSX(w, "transactions.xlsx", data)
}

// GET /api/v1/transactions/export/template
func (h *ImportExportHandler) TransactionTemplate(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)
	data, err := h.txSvc.ExportXLSX(r.Context(), claims.HouseholdID, model.TransactionFilters{})
	if err != nil {
		jsonError(w, "failed to generate template", http.StatusInternalServerError)
		return
	}
	writeXLSX(w, "transactions-template.xlsx", data)
}

// POST /api/v1/transactions/import
func (h *ImportExportHandler) ImportTransactions(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromCtx(r)

	fileBytes, ok := readUpload(w, r)
	if !ok {
		return
	}

	users, err := h.userRepo.ListByHousehold(r.Context(), claims.HouseholdID)
	if err != nil {
		jsonError(w, "failed to load users", http.StatusInternalServerError)
		return
	}
	pms, err := h.txRepo.ListPaymentMethods(r.Context(), claims.HouseholdID)
	if err != nil {
		jsonError(w, "failed to load payment methods", http.StatusInternalServerError)
		return
	}

	// Resolve target account: use ?account_id= query param, or fall back to the
	// first non-archived account for the household.
	accountID := r.URL.Query().Get("account_id")
	if accountID == "" {
		accounts, aErr := h.accountSvc.List(r.Context(), claims.HouseholdID)
		if aErr != nil || len(accounts) == 0 {
			jsonError(w, "no account found — create an account first", http.StatusBadRequest)
			return
		}
		accountID = accounts[0].ID
	}

	result, err := h.txSvc.ImportXLSX(r.Context(), claims.HouseholdID, claims.UserID, accountID, fileBytes, users, pms)
	if err != nil {
		jsonError(w, err.Error(), http.StatusBadRequest)
		return
	}
	jsonOK(w, result)
}

// readUpload reads the multipart "file" field, returning the bytes or writing an error.
func readUpload(w http.ResponseWriter, r *http.Request) ([]byte, bool) {
	if err := r.ParseMultipartForm(maxImportBytes); err != nil {
		jsonError(w, "failed to parse multipart form", http.StatusBadRequest)
		return nil, false
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		jsonError(w, "file field is required", http.StatusBadRequest)
		return nil, false
	}
	defer file.Close()
	data, err := io.ReadAll(file)
	if err != nil {
		jsonError(w, "failed to read file", http.StatusInternalServerError)
		return nil, false
	}
	return data, true
}

// writeXLSX writes an xlsx byte slice as a file download response.
func writeXLSX(w http.ResponseWriter, filename string, data []byte) {
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
