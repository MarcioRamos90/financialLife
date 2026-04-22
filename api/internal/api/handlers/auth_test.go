package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	apimiddleware "github.com/marcioramos/financiallife/internal/api/middleware"
	"github.com/marcioramos/financiallife/internal/model"
	"github.com/marcioramos/financiallife/internal/repository"
	"github.com/marcioramos/financiallife/internal/service"
	"github.com/marcioramos/financiallife/internal/testutil"
)

// ─── Shared test environment ──────────────────────────────────────────────────

type testEnv struct {
	db      *gorm.DB
	seeds   testutil.Seeds
	auth    *service.AuthService
	tx      *service.TransactionService
	income  *service.IncomeService
	account *service.AccountService
	srv     http.Handler
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	db, seeds := testutil.NewDB(t)

	userRepo    := repository.NewUserRepository(db)
	txRepo      := repository.NewTransactionRepository(db)
	incomeRepo  := repository.NewIncomeRepository(db)
	accountRepo := repository.NewAccountRepository(db)

	authSvc, err := service.NewAuthService(userRepo, "test-secret-32-characters-long!!", "15m", "720h")
	if err != nil {
		t.Fatalf("NewAuthService: %v", err)
	}
	txSvc      := service.NewTransactionService(txRepo)
	incomeSvc  := service.NewIncomeService(incomeRepo)
	accountSvc := service.NewAccountService(accountRepo)

	authH    := NewAuthHandler(authSvc)
	txH      := NewTransactionHandler(txSvc)
	incomeH  := NewIncomeHandler(incomeSvc)
	accountH := NewAccountHandler(accountSvc)
	ieH      := NewImportExportHandler(txSvc, incomeSvc, accountSvc, userRepo, txRepo)

	r := chi.NewRouter()
	r.Post("/auth/login", authH.Login)
	r.Post("/auth/refresh", authH.Refresh)
	r.Post("/auth/logout", authH.Logout)
	r.Group(func(r chi.Router) {
		r.Use(apimiddleware.JWTAuth(authSvc))
		r.Get("/auth/me", authH.Me)
		// Static transaction routes must come before /{id} to avoid Chi matching them as params.
		r.Get("/transactions", txH.List)
		r.Post("/transactions", txH.Create)
		r.Get("/transactions/payment-methods", txH.ListPaymentMethods)
		r.Get("/transactions/export", ieH.ExportTransactions)
		r.Get("/transactions/export/template", ieH.TransactionTemplate)
		r.Post("/transactions/import", ieH.ImportTransactions)
		r.Put("/transactions/{id}", txH.Update)
		r.Delete("/transactions/{id}", txH.Delete)
		// Static income-source routes before /{id}.
		r.Get("/income-sources", incomeH.ListSources)
		r.Post("/income-sources", incomeH.CreateSource)
		r.Get("/income-sources/export", ieH.ExportIncomeSources)
		r.Get("/income-sources/export/template", ieH.IncomeSourceTemplate)
		r.Post("/income-sources/import", ieH.ImportIncomeSources)
		r.Put("/income-sources/{id}", incomeH.UpdateSource)
		r.Delete("/income-sources/{id}", incomeH.DeleteSource)
		r.Post("/income-sources/{id}/entries", incomeH.RecordEntry)
		r.Get("/income-sources/{id}/history", incomeH.ListHistory)
		// Account routes — static before {id}.
		r.Get("/accounts", accountH.List)
		r.Post("/accounts", accountH.Create)
		r.Get("/accounts/{id}", accountH.GetByID)
		r.Get("/accounts/{id}/balance", accountH.Balance)
		r.Put("/accounts/{id}", accountH.Update)
		r.Delete("/accounts/{id}", accountH.Archive)
	})

	return &testEnv{db: db, seeds: seeds, auth: authSvc, tx: txSvc, income: incomeSvc, account: accountSvc, srv: r}
}

// login calls POST /auth/login and returns the access token and response cookies.
func (e *testEnv) login(t *testing.T, email, password string) (int, string, []*http.Cookie) {
	t.Helper()
	body := fmt.Sprintf(`{"email":%q,"password":%q}`, email, password)
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	e.srv.ServeHTTP(rec, req)

	var resp struct {
		Data model.LoginResponse `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	return rec.Code, resp.Data.AccessToken, rec.Result().Cookies()
}

// authed returns a request with a valid Bearer token for seeds.Email / "password".
func (e *testEnv) authed(t *testing.T, method, path, body string) *http.Request {
	t.Helper()
	_, token, _ := e.login(t, e.seeds.Email, "password")
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func do(srv http.Handler, req *http.Request) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

// ─── Auth handler tests ───────────────────────────────────────────────────────

func TestLogin_Success(t *testing.T) {
	e := newTestEnv(t)
	status, token, cookies := e.login(t, e.seeds.Email, "password")

	if status != http.StatusOK {
		t.Fatalf("status = %d, want 200", status)
	}
	if token == "" {
		t.Fatal("access_token is empty")
	}
	var refreshCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "refresh_token" {
			refreshCookie = c
		}
	}
	if refreshCookie == nil {
		t.Fatal("refresh_token cookie not set")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	e := newTestEnv(t)
	status, _, _ := e.login(t, e.seeds.Email, "wrongpassword")
	if status != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", status)
	}
}

func TestLogin_UnknownEmail(t *testing.T) {
	e := newTestEnv(t)
	status, _, _ := e.login(t, "nobody@test.local", "password")
	if status != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", status)
	}
}

func TestLogin_MissingFields(t *testing.T) {
	e := newTestEnv(t)
	req := httptest.NewRequest("POST", "/auth/login", strings.NewReader(`{"email":""}`))
	req.Header.Set("Content-Type", "application/json")
	rec := do(e.srv, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestMe_Authenticated(t *testing.T) {
	e := newTestEnv(t)
	req := e.authed(t, "GET", "/auth/me", "")
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data model.UserProfile `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.Email != e.seeds.Email {
		t.Errorf("email = %q, want %q", resp.Data.Email, e.seeds.Email)
	}
}

func TestMe_Unauthenticated(t *testing.T) {
	e := newTestEnv(t)
	req := httptest.NewRequest("GET", "/auth/me", nil)
	rec := do(e.srv, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestRefresh_ValidCookie(t *testing.T) {
	e := newTestEnv(t)
	_, _, cookies := e.login(t, e.seeds.Email, "password")

	var refreshCookie *http.Cookie
	for _, c := range cookies {
		if c.Name == "refresh_token" {
			refreshCookie = c
		}
	}
	if refreshCookie == nil {
		t.Fatal("no refresh_token cookie from login")
	}

	req := httptest.NewRequest("POST", "/auth/refresh", nil)
	req.AddCookie(refreshCookie)
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Data model.RefreshResponse `json:"data"`
	}
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp.Data.AccessToken == "" {
		t.Fatal("new access_token is empty")
	}
}

func TestRefresh_NoCookie(t *testing.T) {
	e := newTestEnv(t)
	req := httptest.NewRequest("POST", "/auth/refresh", nil)
	rec := do(e.srv, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rec.Code)
	}
}

func TestLogout_ClearsCookie(t *testing.T) {
	e := newTestEnv(t)
	_, _, cookies := e.login(t, e.seeds.Email, "password")

	req := httptest.NewRequest("POST", "/auth/logout", nil)
	for _, c := range cookies {
		if c.Name == "refresh_token" {
			req.AddCookie(c)
		}
	}
	rec := do(e.srv, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	// Verify the cookie is cleared (MaxAge -1 or expired)
	for _, c := range rec.Result().Cookies() {
		if c.Name == "refresh_token" && c.MaxAge >= 0 && c.Value != "" {
			t.Error("refresh_token cookie was not cleared after logout")
		}
	}
}
