package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/marcioramos/financiallife/internal/model"
)

// ─── Transaction handler tests ────────────────────────────────────────────────

func TestListTransactions_Empty(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/transactions", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data []model.Transaction `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 transactions, got %d", len(resp.Data))
	}
}

func TestCreateTransaction_Success(t *testing.T) {
	e := newTestEnv(t)
	body := `{"type":"expense","amount":50.00,"description":"Coffee","category":"Food","transaction_date":"2025-01-15"}`
	req := e.authed(t, "POST", "/transactions", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.Transaction `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.ID == "" {
		t.Fatal("created transaction has no ID")
	}
	if resp.Data.Amount != 50.00 {
		t.Errorf("amount = %v, want 50.00", resp.Data.Amount)
	}
	if resp.Data.Type != "expense" {
		t.Errorf("type = %q, want expense", resp.Data.Type)
	}
	if resp.Data.Description != "Coffee" {
		t.Errorf("description = %q, want Coffee", resp.Data.Description)
	}
	if resp.Data.TransactionDate != "2025-01-15" {
		t.Errorf("transaction_date = %q, want 2025-01-15", resp.Data.TransactionDate)
	}
}

func TestCreateTransaction_InvalidType(t *testing.T) {
	e := newTestEnv(t)
	body := `{"type":"invalid","amount":50.00,"transaction_date":"2025-01-15"}`
	req := e.authed(t, "POST", "/transactions", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestCreateTransaction_ZeroAmount(t *testing.T) {
	e := newTestEnv(t)
	body := `{"type":"expense","amount":0,"transaction_date":"2025-01-15"}`
	req := e.authed(t, "POST", "/transactions", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestCreateTransaction_MissingDate(t *testing.T) {
	e := newTestEnv(t)
	body := `{"type":"income","amount":1000.00}`
	req := e.authed(t, "POST", "/transactions", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestListTransactions_AfterCreate(t *testing.T) {
	e := newTestEnv(t)

	// Create two transactions
	for i := range 2 {
		body := fmt.Sprintf(`{"type":"expense","amount":%d0.00,"description":"Item %d","transaction_date":"2025-01-15"}`, i+1, i+1)
		req := e.authed(t, "POST", "/transactions", body)
		rec := do(e.srv, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("create tx %d: status %d", i+1, rec.Code)
		}
	}

	req := e.authed(t, "GET", "/transactions", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data []model.Transaction `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if len(resp.Data) != 2 {
		t.Errorf("got %d transactions, want 2", len(resp.Data))
	}
}

func TestUpdateTransaction_Success(t *testing.T) {
	e := newTestEnv(t)

	// Create a transaction
	createBody := `{"type":"expense","amount":100.00,"description":"Original","transaction_date":"2025-01-15"}`
	createReq := e.authed(t, "POST", "/transactions", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create: status %d", createRec.Code)
	}
	var created struct {
		Data model.Transaction `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	id := created.Data.ID

	// Update it
	updateBody := `{"type":"income","amount":200.00,"description":"Updated","transaction_date":"2025-02-01"}`
	updateReq := e.authed(t, "PUT", "/transactions/"+id, updateBody)
	updateRec := do(e.srv, updateReq)

	if updateRec.Code != http.StatusOK {
		t.Fatalf("update: status = %d, want 200; body: %s", updateRec.Code, updateRec.Body.String())
	}
	var updated struct {
		Data model.Transaction `json:"data"`
	}
	json.NewDecoder(updateRec.Body).Decode(&updated)
	if updated.Data.Amount != 200.00 {
		t.Errorf("amount = %v, want 200.00", updated.Data.Amount)
	}
	if updated.Data.Type != "income" {
		t.Errorf("type = %q, want income", updated.Data.Type)
	}
	if updated.Data.Description != "Updated" {
		t.Errorf("description = %q, want Updated", updated.Data.Description)
	}
}

func TestDeleteTransaction_Success(t *testing.T) {
	e := newTestEnv(t)

	// Create a transaction
	createBody := `{"type":"expense","amount":75.00,"transaction_date":"2025-01-20"}`
	createReq := e.authed(t, "POST", "/transactions", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create: status %d", createRec.Code)
	}
	var created struct {
		Data model.Transaction `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	id := created.Data.ID

	// Delete it
	deleteReq := e.authed(t, "DELETE", "/transactions/"+id, "")
	deleteRec := do(e.srv, deleteReq)

	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("delete: status = %d, want 204", deleteRec.Code)
	}

	// Verify it's gone from the list
	listReq := e.authed(t, "GET", "/transactions", "")
	listRec := do(e.srv, listReq)
	var listResp struct {
		Data []model.Transaction `json:"data"`
	}
	json.NewDecoder(listRec.Body).Decode(&listResp)
	if len(listResp.Data) != 0 {
		t.Errorf("expected 0 after delete, got %d", len(listResp.Data))
	}
}

func TestDeleteTransaction_NotFound(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "DELETE", "/transactions/00000000-0000-0000-0000-000000000000", "")
	rec := do(e.srv, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestListPaymentMethods_Empty(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/transactions/payment-methods", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data []model.PaymentMethod `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 payment methods, got %d", len(resp.Data))
	}
}

func TestTransactions_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/transactions"},
		{"POST", "/transactions"},
		{"PUT", "/transactions/some-id"},
		{"DELETE", "/transactions/some-id"},
	}
	for _, tc := range tests {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := do(e.srv, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s: status = %d, want 401", tc.method, tc.path, rec.Code)
		}
	}
}
