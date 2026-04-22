package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/marcioramos/financiallife/internal/model"
)

// ─── Account handler tests ────────────────────────────────────────────────────

func TestListAccounts_HasDefaultAccount(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/accounts", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data []model.Account `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	// testutil seeds a default "Cash" account
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 account (seeded default), got %d", len(resp.Data))
	}
	if resp.Data[0].Name != "Cash" {
		t.Errorf("default account name = %q, want Cash", resp.Data[0].Name)
	}
}

func TestCreateAccount_Success(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"Main Checking","type":"checking","is_joint":true,"initial_balance":1000}`
	req := e.authed(t, "POST", "/accounts", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.Account `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.ID == "" {
		t.Fatal("created account has no ID")
	}
	if resp.Data.Name != "Main Checking" {
		t.Errorf("name = %q, want Main Checking", resp.Data.Name)
	}
	if resp.Data.Type != "checking" {
		t.Errorf("type = %q, want checking", resp.Data.Type)
	}
	if resp.Data.InitialBalance != 1000 {
		t.Errorf("initial_balance = %v, want 1000", resp.Data.InitialBalance)
	}
}

func TestCreateAccount_MissingName(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"","type":"cash"}`
	req := e.authed(t, "POST", "/accounts", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestCreateAccount_InvalidType(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"My Card","type":"credit_card"}`
	req := e.authed(t, "POST", "/accounts", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestGetAccountByID_Success(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/accounts/"+e.seeds.AccountID, "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data model.Account `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.ID != e.seeds.AccountID {
		t.Errorf("id = %q, want %q", resp.Data.ID, e.seeds.AccountID)
	}
}

func TestGetAccountByID_NotFound(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/accounts/00000000-0000-0000-0000-000000000000", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestAccountBalance_Empty(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/accounts/"+e.seeds.AccountID+"/balance", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.AccountBalanceResponse `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.Balance != 0 {
		t.Errorf("balance = %v, want 0 (no transactions)", resp.Data.Balance)
	}
}

func TestAccountBalance_WithTransactions(t *testing.T) {
	e := newTestEnv(t)

	// Income +500
	incomeBody := fmt.Sprintf(`{"account_id":%q,"type":"income","amount":500,"transaction_date":"2025-01-10"}`, e.seeds.AccountID)
	rec := do(e.srv, e.authed(t, "POST", "/transactions", incomeBody))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create income: %d – %s", rec.Code, rec.Body.String())
	}

	// Expense -200
	expenseBody := fmt.Sprintf(`{"account_id":%q,"type":"expense","amount":200,"transaction_date":"2025-01-11"}`, e.seeds.AccountID)
	rec = do(e.srv, e.authed(t, "POST", "/transactions", expenseBody))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create expense: %d – %s", rec.Code, rec.Body.String())
	}

	req := e.authed(t, "GET", "/accounts/"+e.seeds.AccountID+"/balance", "")
	rec = do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("balance status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data model.AccountBalanceResponse `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.Balance != 300 {
		t.Errorf("balance = %v, want 300 (500 income - 200 expense)", resp.Data.Balance)
	}
}

func TestUpdateAccount_Success(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"Renamed Wallet","type":"savings","is_joint":false}`
	req := e.authed(t, "PUT", "/accounts/"+e.seeds.AccountID, body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.Account `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.Name != "Renamed Wallet" {
		t.Errorf("name = %q, want Renamed Wallet", resp.Data.Name)
	}
	if resp.Data.Type != "savings" {
		t.Errorf("type = %q, want savings", resp.Data.Type)
	}
}

func TestArchiveAccount_Success(t *testing.T) {
	e := newTestEnv(t)

	// Create a second account to archive (we keep the default for transaction tests)
	createBody := `{"name":"Old Account","type":"other"}`
	createRec := do(e.srv, e.authed(t, "POST", "/accounts", createBody))
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create account: status %d", createRec.Code)
	}
	var created struct {
		Data model.Account `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	id := created.Data.ID

	// Archive it
	archiveReq := e.authed(t, "DELETE", "/accounts/"+id, "")
	archiveRec := do(e.srv, archiveReq)
	if archiveRec.Code != http.StatusNoContent {
		t.Fatalf("archive: status = %d, want 204", archiveRec.Code)
	}

	// Verify it's gone from the list
	listRec := do(e.srv, e.authed(t, "GET", "/accounts", ""))
	var listResp struct {
		Data []model.Account `json:"data"`
	}
	json.NewDecoder(listRec.Body).Decode(&listResp)
	for _, a := range listResp.Data {
		if a.ID == id {
			t.Error("archived account still appears in list")
		}
	}
}

func TestArchiveAccount_NotFound(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "DELETE", "/accounts/00000000-0000-0000-0000-000000000000", "")
	rec := do(e.srv, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestAccounts_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/accounts"},
		{"POST", "/accounts"},
		{"GET", "/accounts/some-id"},
		{"GET", "/accounts/some-id/balance"},
		{"PUT", "/accounts/some-id"},
		{"DELETE", "/accounts/some-id"},
	}
	for _, tc := range tests {
		req, _ := http.NewRequest(tc.method, tc.path, nil)
		rec := do(e.srv, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s: status = %d, want 401", tc.method, tc.path, rec.Code)
		}
	}
}

func TestTransferBalance_DebitAndCredit(t *testing.T) {
	e := newTestEnv(t)

	// Create a second account
	createBody := `{"name":"Savings","type":"savings","initial_balance":0}`
	createRec := do(e.srv, e.authed(t, "POST", "/accounts", createBody))
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create savings: %d", createRec.Code)
	}
	var createdAcc struct {
		Data model.Account `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&createdAcc)
	savingsID := createdAcc.Data.ID

	// Transfer 300 from default (Cash) to Savings
	transferBody := fmt.Sprintf(
		`{"account_id":%q,"to_account_id":%q,"type":"transfer","amount":300,"transaction_date":"2025-01-15"}`,
		e.seeds.AccountID, savingsID,
	)
	rec := do(e.srv, e.authed(t, "POST", "/transactions", transferBody))
	if rec.Code != http.StatusCreated {
		t.Fatalf("create transfer: %d – %s", rec.Code, rec.Body.String())
	}

	// Cash balance should be -300 (initial 0 - 300 out)
	cashBalRec := do(e.srv, e.authed(t, "GET", "/accounts/"+e.seeds.AccountID+"/balance", ""))
	var cashResp struct {
		Data model.AccountBalanceResponse `json:"data"`
	}
	json.NewDecoder(cashBalRec.Body).Decode(&cashResp)
	if cashResp.Data.Balance != -300 {
		t.Errorf("cash balance = %v, want -300", cashResp.Data.Balance)
	}

	// Savings balance should be +300
	savBalRec := do(e.srv, e.authed(t, "GET", "/accounts/"+savingsID+"/balance", ""))
	var savResp struct {
		Data model.AccountBalanceResponse `json:"data"`
	}
	json.NewDecoder(savBalRec.Body).Decode(&savResp)
	if savResp.Data.Balance != 300 {
		t.Errorf("savings balance = %v, want 300", savResp.Data.Balance)
	}
}
