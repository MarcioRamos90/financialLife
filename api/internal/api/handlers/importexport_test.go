package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/xuri/excelize/v2"

	"github.com/marcioramos/financiallife/internal/model"
)

// ─── xlsx helpers ─────────────────────────────────────────────────────────────

// Sheet name constants mirror service/transaction_exportimport.go and income_exportimport.go.
const (
	testTxSheet     = "Transactions"
	testIncomeSheet = "Income Sources"
)

func validTxXLSX(t *testing.T, rows [][]any) []byte {
	t.Helper()
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", testTxSheet)
	headers := []any{"Date", "Type", "Amount", "Currency", "Description", "Category", "Is Joint", "Payment Method", "Recorded By"}
	for col, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(testTxSheet, cell, h)
	}
	for rowIdx, row := range rows {
		for col, v := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			f.SetCellValue(testTxSheet, cell, v)
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatalf("validTxXLSX: %v", err)
	}
	return buf.Bytes()
}

func validIncomeXLSX(t *testing.T, rows [][]any) []byte {
	t.Helper()
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", testIncomeSheet)
	headers := []any{"Name", "Category", "Default Amount", "Currency", "Recurrence Day", "Is Joint", "Owner"}
	for col, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(col+1, 1)
		f.SetCellValue(testIncomeSheet, cell, h)
	}
	for rowIdx, row := range rows {
		for col, v := range row {
			cell, _ := excelize.CoordinatesToCellName(col+1, rowIdx+2)
			f.SetCellValue(testIncomeSheet, cell, v)
		}
	}
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatalf("validIncomeXLSX: %v", err)
	}
	return buf.Bytes()
}

func wrongSheetXLSX(t *testing.T, sheetName string) []byte {
	t.Helper()
	f := excelize.NewFile()
	f.SetSheetName("Sheet1", sheetName)
	f.SetCellValue(sheetName, "A1", "Header")
	f.SetCellValue(sheetName, "A2", "Value")
	buf, err := f.WriteToBuffer()
	if err != nil {
		t.Fatalf("wrongSheetXLSX: %v", err)
	}
	return buf.Bytes()
}

// ─── multipart helper ─────────────────────────────────────────────────────────

// multipartImport builds an authenticated POST request with the xlsx bytes in a
// multipart "file" field. Pass filename="" and nil fileBytes to produce a form
// with no file field (for testing the missing-file-field error path).
func (e *testEnv) multipartImport(t *testing.T, path, filename string, fileBytes []byte) *http.Request {
	t.Helper()
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	if filename != "" && fileBytes != nil {
		fw, err := w.CreateFormFile("file", filename)
		if err != nil {
			t.Fatalf("CreateFormFile: %v", err)
		}
		fw.Write(fileBytes)
	}
	w.Close()

	_, token, _ := e.login(t, e.seeds.Email, "password")
	req := httptest.NewRequest("POST", path, &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

// ─── Transactions — Export ────────────────────────────────────────────────────

func TestExportTransactions_Empty(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/transactions/export", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	ct := rec.Header().Get("Content-Type")
	if !strings.Contains(ct, "spreadsheetml") {
		t.Errorf("Content-Type = %q, want spreadsheetml", ct)
	}
	f, err := excelize.OpenReader(rec.Body)
	if err != nil {
		t.Fatalf("response is not a valid xlsx: %v", err)
	}
	rows, _ := f.GetRows(testTxSheet)
	if len(rows) != 1 {
		t.Errorf("got %d rows, want 1 (header only)", len(rows))
	}
}

func TestExportTransactions_WithData(t *testing.T) {
	e := newTestEnv(t)

	for _, tmpl := range []string{
		`{"account_id":%q,"type":"expense","amount":50,"description":"Coffee","transaction_date":"2025-01-01"}`,
		`{"account_id":%q,"type":"income","amount":5000,"description":"Salary","transaction_date":"2025-01-02"}`,
	} {
		body := fmt.Sprintf(tmpl, e.seeds.AccountID)
		rec := do(e.srv, e.authed(t, "POST", "/transactions", body))
		if rec.Code != http.StatusCreated {
			t.Fatalf("create tx: status %d body %s", rec.Code, rec.Body.String())
		}
	}

	rec := do(e.srv, e.authed(t, "GET", "/transactions/export", ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	f, _ := excelize.OpenReader(rec.Body)
	rows, _ := f.GetRows(testTxSheet)
	if len(rows) != 3 {
		t.Errorf("got %d rows, want 3 (header + 2 data)", len(rows))
	}
}

func TestExportTransactions_Template(t *testing.T) {
	e := newTestEnv(t)
	rec := do(e.srv, e.authed(t, "GET", "/transactions/export/template", ""))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	cd := rec.Header().Get("Content-Disposition")
	if !strings.Contains(cd, "transactions-template.xlsx") {
		t.Errorf("Content-Disposition = %q, want transactions-template.xlsx", cd)
	}
	if _, err := excelize.OpenReader(rec.Body); err != nil {
		t.Fatalf("template response is not valid xlsx: %v", err)
	}
}

func TestExportTransactions_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	for _, path := range []string{"/transactions/export", "/transactions/export/template"} {
		req := httptest.NewRequest("GET", path, nil)
		rec := do(e.srv, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET %s: status = %d, want 401", path, rec.Code)
		}
	}
}

// ─── Transactions — Import ────────────────────────────────────────────────────

func TestImportTransactions_Valid(t *testing.T) {
	e := newTestEnv(t)
	xlsx := validTxXLSX(t, [][]any{
		{"2025-03-01", "expense", 120.0, "BRL", "Groceries", "Food", "no", "", ""},
		{"2025-03-02", "income", 5000.0, "BRL", "Salary", "Work", "no", "", ""},
	})

	req := e.multipartImport(t, "/transactions/import", "import.xlsx", xlsx)
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.ImportResult `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.Imported != 2 {
		t.Errorf("imported = %d, want 2", resp.Data.Imported)
	}
	if resp.Data.Errors == nil {
		t.Error("errors field is nil; expected initialised empty slice (must not marshal as null)")
	}
	if len(resp.Data.Errors) != 0 {
		t.Errorf("errors = %v, want none", resp.Data.Errors)
	}
}

func TestImportTransactions_WrongSheet(t *testing.T) {
	e := newTestEnv(t)
	xlsx := wrongSheetXLSX(t, "Plan1")

	req := e.multipartImport(t, "/transactions/import", "import.xlsx", xlsx)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Error string `json:"error"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if !strings.Contains(resp.Error, "not found") {
		t.Errorf("error = %q, want message containing 'not found'", resp.Error)
	}
}

func TestImportTransactions_MissingFileField(t *testing.T) {
	e := newTestEnv(t)
	req := e.multipartImport(t, "/transactions/import", "", nil)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestImportTransactions_NotMultipart(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "POST", "/transactions/import", `{"file":"notafile"}`)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestImportTransactions_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	req := httptest.NewRequest("POST", "/transactions/import", nil)
	rec := do(e.srv, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

// ─── Income Sources — Export ──────────────────────────────────────────────────

func TestExportIncomeSources_Empty(t *testing.T) {
	e := newTestEnv(t)
	rec := do(e.srv, e.authed(t, "GET", "/income-sources/export", ""))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	ct := rec.Header().Get("Content-Type")
	if !strings.Contains(ct, "spreadsheetml") {
		t.Errorf("Content-Type = %q, want spreadsheetml", ct)
	}
	f, err := excelize.OpenReader(rec.Body)
	if err != nil {
		t.Fatalf("response is not valid xlsx: %v", err)
	}
	rows, _ := f.GetRows(testIncomeSheet)
	if len(rows) != 1 {
		t.Errorf("got %d rows, want 1 (header only)", len(rows))
	}
}

func TestExportIncomeSources_WithData(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"Salary","default_amount":5000,"category":"Work"}`
	rec := do(e.srv, e.authed(t, "POST", "/income-sources", body))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create source: status %d", rec.Code)
	}

	rec = do(e.srv, e.authed(t, "GET", "/income-sources/export", ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	f, _ := excelize.OpenReader(rec.Body)
	rows, _ := f.GetRows(testIncomeSheet)
	if len(rows) != 2 {
		t.Errorf("got %d rows, want 2 (header + 1 data)", len(rows))
	}
}

func TestExportIncomeSources_Template(t *testing.T) {
	e := newTestEnv(t)
	rec := do(e.srv, e.authed(t, "GET", "/income-sources/export/template", ""))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	cd := rec.Header().Get("Content-Disposition")
	if !strings.Contains(cd, "income-sources-template.xlsx") {
		t.Errorf("Content-Disposition = %q, want income-sources-template.xlsx", cd)
	}
	if _, err := excelize.OpenReader(rec.Body); err != nil {
		t.Fatalf("template response is not valid xlsx: %v", err)
	}
}

func TestExportIncomeSources_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	for _, path := range []string{"/income-sources/export", "/income-sources/export/template"} {
		req := httptest.NewRequest("GET", path, nil)
		rec := do(e.srv, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET %s: status = %d, want 401", path, rec.Code)
		}
	}
}

// ─── Income Sources — Import ──────────────────────────────────────────────────

func TestImportIncomeSources_Valid(t *testing.T) {
	e := newTestEnv(t)
	xlsx := validIncomeXLSX(t, [][]any{
		{"Salary", "Work", 5000.0, "BRL", 0, "no", ""},
		{"Freelance", "Work", 1500.0, "BRL", 0, "no", ""},
	})

	req := e.multipartImport(t, "/income-sources/import", "import.xlsx", xlsx)
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.ImportResult `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.Imported != 2 {
		t.Errorf("imported = %d, want 2", resp.Data.Imported)
	}
	if resp.Data.Errors == nil {
		t.Error("errors field is nil; expected initialised empty slice (must not marshal as null)")
	}
	if len(resp.Data.Errors) != 0 {
		t.Errorf("errors = %v, want none", resp.Data.Errors)
	}
}

func TestImportIncomeSources_WrongSheet(t *testing.T) {
	e := newTestEnv(t)
	xlsx := wrongSheetXLSX(t, "Planilha1")

	req := e.multipartImport(t, "/income-sources/import", "import.xlsx", xlsx)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Error string `json:"error"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if !strings.Contains(resp.Error, "not found") {
		t.Errorf("error = %q, want message containing 'not found'", resp.Error)
	}
}

func TestImportIncomeSources_MissingFileField(t *testing.T) {
	e := newTestEnv(t)
	req := e.multipartImport(t, "/income-sources/import", "", nil)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestImportIncomeSources_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	req := httptest.NewRequest("POST", "/income-sources/import", nil)
	rec := do(e.srv, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}
