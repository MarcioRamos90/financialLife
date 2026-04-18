# E2E Testing Plan — FinancialLife

## Directory Structure

```
financiallife/
├── apps/
│   ├── web/          ← renamed from frontend/
│   └── mobile/       ← future
├── api/
├── e2e/
│   ├── package.json
│   ├── playwright.config.ts
│   ├── tests/
│   │   ├── login.spec.ts
│   │   ├── logout.spec.ts
│   │   └── transactions.spec.ts
│   └── fixtures/
│       └── auth.ts   ← shared login helper (reused across test files)
├── docker-compose.yml
└── project_phase1.md
```

---

## Step 1 — Rename frontend/ → apps/web/

- Move `frontend/` to `apps/web/`
- Update `docker-compose.yml` build context paths
- Update any CI references

---

## Step 2 — Initialise the e2e/ package

- Create `e2e/package.json` with Playwright as the only dependency
- make sure to fix the same node version ">=22.14.0" in `package.json`
- Run `npm init playwright@latest` to generate `playwright.config.ts`
- Configure:
  - `baseURL: http://localhost:5173`
  - `testDir: ./tests`
  - Browser: Chromium only for now (cross-browser can be added later)
  - `retries: 1` on CI, `0` locally
  - HTML reporter so failures produce a browsable report

---

## Step 3 — Test data strategy

E2E tests need a clean, predictable database state. Two options were considered:

**Option A — Dev-only reset endpoint**
Add `POST /api/v1/test/reset` to the Go API, guarded by `APP_ENV=test`. This endpoint wipes all tables and re-seeds the two known dev users. Playwright calls it in `globalSetup` before the test suite runs.

**Option B — Playwright globalSetup hits the DB directly**
A `globalSetup.ts` script connects to PostgreSQL and runs seed SQL before the suite starts.

**Decision: Option A** — keeps DB knowledge inside the API, no DB credentials needed in the e2e package, and is easier to maintain as the schema evolves.

The reset endpoint will:
1. Truncate all tables (transactions, refresh_tokens, users, households)
2. Re-seed with one household and two users:
   - `marcio@home.local` / role: admin
   - `wife@home.local` / role: admin

---

## Step 4 — Shared fixtures

`fixtures/auth.ts` exports a `loginAs(page, email, password)` helper so every test file can authenticate in one line without repeating the login flow.

---

## Step 5 — Test scenarios

### login.spec.ts
- Shows login page when unauthenticated
- Logs in with valid credentials → lands on dashboard
- Shows error message for wrong password
- Shows error message for unknown email

### logout.spec.ts
- Logs in → clicks sign out → redirected to `/login`
- Cannot access protected route after logout

### transactions.spec.ts
- Create a transaction → appears in the list
- Edit a transaction → list reflects the updated amount
- Delete a transaction → confirm dialog → removed from list
- Filter by type → only matching transactions shown

---

## Step 6 — GitHub Actions CI

Add `.github/workflows/e2e.yml`:

1. Trigger: push to `main` and pull requests
2. Steps:
   - Checkout code
   - Start `docker compose up -d` (postgres + api + web)
   - Wait for `GET /health` to return 200 (retry loop)
   - `cd e2e && npm ci && npx playwright install --with-deps chromium`
   - `npx playwright test`
   - Upload HTML report as artifact on failure

---

## Implementation Order

1. Rename `frontend/` → `apps/web/` and fix docker-compose paths
2. Create `e2e/` package and Playwright config
3. Add reset endpoint to Go API
4. Write `fixtures/auth.ts`
5. Write `login.spec.ts`
6. Write `logout.spec.ts`
7. Write `transactions.spec.ts`
8. Add GitHub Actions workflow

---

## Definition of Done

- [ ] `cd e2e && npx playwright test` passes against a running docker-compose stack
- [ ] All 5 test scenarios from `project_phase1.md` are covered
- [ ] Tests are isolated — each suite starts from a clean DB state
- [ ] CI runs E2E on every push and uploads a report on failure
- [ ] No hardcoded credentials in test files (use environment variables or fixtures)
