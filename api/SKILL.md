---
name: financiallife-api-tests
description: >
  Guide for writing Go unit tests inside the FinancialLife api/ directory.
  Use this whenever adding new Go code (model, service, handler, middleware,
  repository interface) to ensure every new feature ships with tests.
  Trigger this skill when the user asks to "add tests", "write tests for",
  "test the new endpoint", or mentions anything about Go test coverage in this project.
---

# FinancialLife — Go Testing Guide

## Quick facts about this codebase

| Item | Value |
|---|---|
| Module path | `github.com/marcioramos/financiallife` |
| Go version | 1.25 |
| Test runner | standard `go test ./...` |
| No test DB needed | model + service pure-logic tests run without Docker |

---

## Three layers, three test strategies

### 1. Model layer — pure validation tests

Location: `api/internal/model/`

These are the cheapest tests to write. `Validate()` methods have no
dependencies at all — just construct the struct, call `Validate()`, and
assert the result string.

```go
// Pattern: table-driven tests with named sub-tests
func TestCreateTransactionRequest_Validate(t *testing.T) {
    tests := []struct {
        name    string
        req     model.CreateTransactionRequest
        wantErr string
    }{
        {"valid", model.CreateTransactionRequest{Type: "expense", Amount: 50, TransactionDate: "2024-01-01"}, ""},
        {"zero amount", model.CreateTransactionRequest{Type: "expense", Amount: 0, TransactionDate: "2024-01-01"}, "amount must be greater than zero"},
    }
    for _, tc := range tests {
        t.Run(tc.name, func(t *testing.T) {
            got := tc.req.Validate()
            if got != tc.wantErr {
                t.Errorf("got %q, want %q", got, tc.wantErr)
            }
        })
    }
}
```

### 2. Service layer — test pure logic without a database

Location: `api/internal/service/`

Most service methods delegate directly to the repository (which needs a
real DB). Focus tests on the parts that are **pure logic**:

- `NewAuthService()` — parses duration strings; test valid and invalid values.
- `ValidateAccessToken()` — pure JWT parsing; use `buildTestToken()` helper
  (see `service/auth_test.go`) to generate tokens without a DB call.
- `hashToken()` — determinism, uniqueness, correct output length.
- Any service method that does validation *before* calling the repository
  (e.g. `Create` / `Update` in transaction service) can be tested by
  verifying the early return when the model's `Validate()` fails.

**When you need to test a service method that calls the repo**, convert the
concrete `*repository.FooRepository` field to an interface first:

```go
// In the service file, define a local interface:
type userRepository interface {
    GetByEmail(ctx context.Context, email string) (*model.User, error)
    // … other methods the service actually uses
}

// In the test file, write a hand-rolled stub:
type stubUserRepo struct{ user *model.User; err error }
func (s *stubUserRepo) GetByEmail(_ context.Context, _ string) (*model.User, error) {
    return s.user, s.err
}
```

This keeps tests fast (no Docker needed) and makes the service's
dependencies explicit.

### 3. Handler layer — HTTP integration tests

Location: `api/internal/api/handlers/`

Use `net/http/httptest` to exercise a full HTTP round-trip with a
fake service stub. This is the right level to test status codes, JSON
response shapes, and error serialisation.

```go
func TestListTransactions_ReturnsJSON(t *testing.T) {
    svc := &stubTransactionService{txs: []model.Transaction{ /* … */ }}
    h   := handlers.NewTransactionHandler(svc)
    r   := chi.NewRouter()
    r.Get("/transactions", h.List)

    req  := httptest.NewRequest(http.MethodGet, "/transactions", nil)
    // Inject JWT claims the middleware would normally add:
    ctx  := context.WithValue(req.Context(), middleware.ClaimsKey, &model.Claims{HouseholdID: "hh-1"})
    req   = req.WithContext(ctx)
    w    := httptest.NewRecorder()
    r.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Fatalf("status = %d, want 200", w.Code)
    }
    // Parse body and assert shape …
}
```

---

## Running the tests

```bash
# All packages — run from the api/ directory inside the container,
# or from within WSL if Go is installed there.
go test ./...

# Specific package
go test ./internal/model/...
go test ./internal/service/...

# With verbose output
go test -v ./internal/service/...

# With coverage report
go test -cover ./...
```

Because these tests have **no external dependencies** (no DB, no network),
you can run `go test ./internal/model/... ./internal/service/...` directly
from a Windows terminal if Go 1.25 is installed locally, or inside the
running `api` container:

```bash
docker exec -it finaltiallife-api-1 go test ./...
```

---

## Conventions used in this project

- **Table-driven tests** — always prefer a `tests []struct{...}` slice and a
  single `for _, tc := range tests { t.Run(...) }` loop over separate
  `TestFoo_case1`, `TestFoo_case2` functions.
- **t.Helper()** — call this in any shared helper function so failure lines
  point at the call site, not inside the helper.
- **No global state** — each test sets up its own data; never rely on
  `init()` or package-level variables that mutate.
- **One assertion per sub-test** — keep sub-tests focused; if you need to
  assert multiple things, name them clearly.
- **Test file location** — test files live alongside the source file they
  test, in the **same package** (white-box testing). Use `_test` suffix in
  the package name only when you specifically want black-box testing of the
  public API.

---

## What NOT to test here

- The `repository` layer talks directly to PostgreSQL — test it with
  integration tests that spin up a real DB (or use `testcontainers-go`).
  That's a Phase 2 concern; skip for now.
- `docker-compose.yml`, `.env` handling, and migration files — these are
  infrastructure, not logic; verify them manually or via smoke tests.
