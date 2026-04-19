package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/marcioramos/financiallife/internal/model"
)

// ─── Income handler tests ─────────────────────────────────────────────────────

func TestListIncomeSources_Empty(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/income-sources", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data []model.IncomeSource `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 income sources, got %d", len(resp.Data))
	}
}

func TestCreateIncomeSource_Success(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"Monthly Salary","category":"Salary","default_amount":5000,"currency":"BRL","recurrence_day":5,"is_joint":false}`
	req := e.authed(t, "POST", "/income-sources", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.ID == "" {
		t.Fatal("created income source has no ID")
	}
	if resp.Data.Name != "Monthly Salary" {
		t.Errorf("name = %q, want Monthly Salary", resp.Data.Name)
	}
	if resp.Data.DefaultAmount != 5000 {
		t.Errorf("default_amount = %v, want 5000", resp.Data.DefaultAmount)
	}
	if resp.Data.RecurrenceDay != 5 {
		t.Errorf("recurrence_day = %d, want 5", resp.Data.RecurrenceDay)
	}
	if resp.Data.IsJoint {
		t.Error("is_joint = true, want false")
	}
}

func TestCreateIncomeSource_JointSource(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"Rent Income","default_amount":2000,"is_joint":true}`
	req := e.authed(t, "POST", "/income-sources", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201; body: %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if !resp.Data.IsJoint {
		t.Error("is_joint = false, want true")
	}
}

func TestCreateIncomeSource_MissingName(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"","default_amount":1000}`
	req := e.authed(t, "POST", "/income-sources", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestCreateIncomeSource_NegativeAmount(t *testing.T) {
	e := newTestEnv(t)
	body := `{"name":"Salary","default_amount":-100}`
	req := e.authed(t, "POST", "/income-sources", body)
	rec := do(e.srv, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestListIncomeSources_AfterCreate(t *testing.T) {
	e := newTestEnv(t)

	for i := range 3 {
		body := fmt.Sprintf(`{"name":"Source %d","default_amount":%d000}`, i+1, i+1)
		req := e.authed(t, "POST", "/income-sources", body)
		rec := do(e.srv, req)
		if rec.Code != http.StatusCreated {
			t.Fatalf("create source %d: status %d", i+1, rec.Code)
		}
	}

	req := e.authed(t, "GET", "/income-sources", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("list status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data []model.IncomeSource `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if len(resp.Data) != 3 {
		t.Errorf("got %d income sources, want 3", len(resp.Data))
	}
}

func TestUpdateIncomeSource_Success(t *testing.T) {
	e := newTestEnv(t)

	// Create
	createBody := `{"name":"Freelance","default_amount":1000}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	id := created.Data.ID

	// Update
	updateBody := `{"name":"Freelance Design","default_amount":1500,"recurrence_day":10}`
	updateReq := e.authed(t, "PUT", "/income-sources/"+id, updateBody)
	updateRec := do(e.srv, updateReq)

	if updateRec.Code != http.StatusOK {
		t.Fatalf("update: status = %d, want 200; body: %s", updateRec.Code, updateRec.Body.String())
	}
	var updated struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(updateRec.Body).Decode(&updated)
	if updated.Data.Name != "Freelance Design" {
		t.Errorf("name = %q, want Freelance Design", updated.Data.Name)
	}
	if updated.Data.DefaultAmount != 1500 {
		t.Errorf("default_amount = %v, want 1500", updated.Data.DefaultAmount)
	}
}

func TestUpdateIncomeSource_MissingName(t *testing.T) {
	e := newTestEnv(t)

	// Create first
	createBody := `{"name":"Consulting","default_amount":3000}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)

	updateReq := e.authed(t, "PUT", "/income-sources/"+created.Data.ID, `{"name":"","default_amount":3000}`)
	updateRec := do(e.srv, updateReq)

	if updateRec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", updateRec.Code)
	}
}

func TestDeleteIncomeSource_Success(t *testing.T) {
	e := newTestEnv(t)

	// Create
	createBody := `{"name":"Side Project","default_amount":500}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	id := created.Data.ID

	// Delete
	deleteReq := e.authed(t, "DELETE", "/income-sources/"+id, "")
	deleteRec := do(e.srv, deleteReq)

	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("delete: status = %d, want 204", deleteRec.Code)
	}

	// Verify gone from list
	listReq := e.authed(t, "GET", "/income-sources", "")
	listRec := do(e.srv, listReq)
	var listResp struct {
		Data []model.IncomeSource `json:"data"`
	}
	json.NewDecoder(listRec.Body).Decode(&listResp)
	if len(listResp.Data) != 0 {
		t.Errorf("expected 0 sources after delete, got %d", len(listResp.Data))
	}
}

func TestDeleteIncomeSource_NotFound(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "DELETE", "/income-sources/00000000-0000-0000-0000-000000000000", "")
	rec := do(e.srv, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestRecordIncomeEntry_Success(t *testing.T) {
	e := newTestEnv(t)

	// Create source
	createBody := `{"name":"Salary","default_amount":4000}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create source: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	sourceID := created.Data.ID

	// Record entry
	entryBody := `{"year":2025,"month":1,"expected_amount":4000,"received_amount":3800,"received_on":"2025-01-28","notes":"Partial"}`
	entryReq := e.authed(t, "POST", "/income-sources/"+sourceID+"/entries", entryBody)
	entryRec := do(e.srv, entryReq)

	if entryRec.Code != http.StatusCreated {
		t.Fatalf("record entry: status = %d, want 201; body: %s", entryRec.Code, entryRec.Body.String())
	}
	var entryResp struct {
		Data model.IncomeEntry `json:"data"`
	}
	json.NewDecoder(entryRec.Body).Decode(&entryResp)
	if entryResp.Data.ID == "" {
		t.Fatal("recorded entry has no ID")
	}
	if entryResp.Data.ReceivedAmount != 3800 {
		t.Errorf("received_amount = %v, want 3800", entryResp.Data.ReceivedAmount)
	}
	if entryResp.Data.Year != 2025 || entryResp.Data.Month != 1 {
		t.Errorf("year/month = %d/%d, want 2025/1", entryResp.Data.Year, entryResp.Data.Month)
	}
}

func TestRecordIncomeEntry_InvalidYear(t *testing.T) {
	e := newTestEnv(t)

	// Create source
	createBody := `{"name":"Salary","default_amount":4000}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create source: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)

	entryBody := `{"year":1990,"month":1,"received_amount":1000}`
	entryReq := e.authed(t, "POST", "/income-sources/"+created.Data.ID+"/entries", entryBody)
	entryRec := do(e.srv, entryReq)

	if entryRec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", entryRec.Code)
	}
}

func TestRecordIncomeEntry_UpsertOverwrite(t *testing.T) {
	e := newTestEnv(t)

	// Create source
	createBody := `{"name":"Consulting","default_amount":3000}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create source: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)
	sourceID := created.Data.ID

	// First entry for Jan 2025
	firstBody := `{"year":2025,"month":1,"received_amount":2900,"notes":"Partial payment"}`
	firstReq := e.authed(t, "POST", "/income-sources/"+sourceID+"/entries", firstBody)
	firstRec := do(e.srv, firstReq)
	if firstRec.Code != http.StatusCreated {
		t.Fatalf("first entry: status %d", firstRec.Code)
	}
	var first struct {
		Data model.IncomeEntry `json:"data"`
	}
	json.NewDecoder(firstRec.Body).Decode(&first)

	// Second entry for same month — should update (upsert)
	secondBody := `{"year":2025,"month":1,"received_amount":3000,"notes":"Full payment"}`
	secondReq := e.authed(t, "POST", "/income-sources/"+sourceID+"/entries", secondBody)
	secondRec := do(e.srv, secondReq)
	if secondRec.Code != http.StatusCreated {
		t.Fatalf("second entry: status %d, body: %s", secondRec.Code, secondRec.Body.String())
	}
	var second struct {
		Data model.IncomeEntry `json:"data"`
	}
	json.NewDecoder(secondRec.Body).Decode(&second)

	// Same ID means it was updated, not inserted again
	if second.Data.ID != first.Data.ID {
		t.Errorf("upsert created a new record (IDs differ): first=%s, second=%s", first.Data.ID, second.Data.ID)
	}
	if second.Data.ReceivedAmount != 3000 {
		t.Errorf("received_amount = %v, want 3000 after upsert", second.Data.ReceivedAmount)
	}
	if second.Data.Notes != "Full payment" {
		t.Errorf("notes = %q, want Full payment", second.Data.Notes)
	}

	// History should have only 1 entry for that month
	histReq := e.authed(t, "GET", "/income-sources/"+sourceID+"/history", "")
	histRec := do(e.srv, histReq)
	var histResp struct {
		Data []model.IncomeEntry `json:"data"`
	}
	json.NewDecoder(histRec.Body).Decode(&histResp)
	if len(histResp.Data) != 1 {
		t.Errorf("got %d history entries, want 1 (upsert should not duplicate)", len(histResp.Data))
	}
}

func TestListIncomeHistory_Empty(t *testing.T) {
	e := newTestEnv(t)

	// Create source
	createBody := `{"name":"Bonus","default_amount":500}`
	createReq := e.authed(t, "POST", "/income-sources", createBody)
	createRec := do(e.srv, createReq)
	if createRec.Code != http.StatusCreated {
		t.Fatalf("create source: status %d", createRec.Code)
	}
	var created struct {
		Data model.IncomeSource `json:"data"`
	}
	json.NewDecoder(createRec.Body).Decode(&created)

	histReq := e.authed(t, "GET", "/income-sources/"+created.Data.ID+"/history", "")
	histRec := do(e.srv, histReq)

	if histRec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", histRec.Code)
	}
	var resp struct {
		Data []model.IncomeEntry `json:"data"`
	}
	json.NewDecoder(histRec.Body).Decode(&resp)
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 history entries, got %d", len(resp.Data))
	}
}

func TestListIncomeHistory_NotFound(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/income-sources/00000000-0000-0000-0000-000000000000/history", "")
	rec := do(e.srv, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestIncomeSources_RequiresAuth(t *testing.T) {
	e := newTestEnv(t)
	tests := []struct {
		method string
		path   string
	}{
		{"GET", "/income-sources"},
		{"POST", "/income-sources"},
		{"PUT", "/income-sources/some-id"},
		{"DELETE", "/income-sources/some-id"},
		{"POST", "/income-sources/some-id/entries"},
		{"GET", "/income-sources/some-id/history"},
	}
	for _, tc := range tests {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		rec := do(e.srv, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s: status = %d, want 401", tc.method, tc.path, rec.Code)
		}
	}
}
