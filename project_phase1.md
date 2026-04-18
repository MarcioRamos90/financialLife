# FinancialLife — Phase 1 Implementation Plan

**Goal:** Get a working MVP running locally — auth, transactions, income, and the allocation engine.  
**Duration:** ~6 weeks  
**Stack:** React 18 + TypeScript · Go 1.25 · PostgreSQL 16 · Docker Compose

### Money model (applies across all weeks)

The household has **three pools of money**:

| Pool | Owned by | Description |
|------|----------|-------------|
| Personal — Marcio | Marcio | His own income and expenses |
| Personal — Wife | Wife | Her own income and expenses |
| Joint | Both | Shared account for household expenses |

**How money moves:**
- Each user records income and expenses against their **personal** pool or marks them as **joint** (`is_joint = true`), which hits the joint pool.
- A **transfer** transaction moves money between a personal pool and the joint pool (e.g. Marcio contributes R$2 000 to the joint account, or withdraws R$500 back to his personal account).
- The allocation engine (Week 5) works on the **surplus** of each pool independently, then can redistribute across pools via transfer rules.

---

## Week 1 — Project Scaffold

Everything else depends on this being solid. Do not skip steps.

### Tasks
- [x] Create Git repository; add `.gitignore` for Go, Node, and `.env` files
- [x] Write `docker-compose.yml` with three services: `postgres`, `api`, `frontend`
- [x] Initialise Go module: `go mod init github.com/yourname/financiallife`
- [x] Initialise React app: `npm create vite@latest frontend -- --template react-ts`
- [x] Install and configure `golang-migrate`; create `db/migrations/` folder
- [x] Write migration `001_initial.up.sql` — creates `households` and `users` tables
- [x] Confirm `docker compose up` starts all three services cleanly
- [x] Add a `/health` endpoint in Go that returns `{ "status": "ok" }` — sanity check

### Deliverable
`docker compose up` → frontend loads at `localhost:5173`, API responds at `localhost:8080/health`.

---

## Week 2 — Authentication

### Tasks
- [x] Write migration `002_auth.up.sql` — add `refresh_tokens` table
- [x] Implement `POST /api/v1/auth/login` — email + password → JWT access token (15 min) + refresh token (30 days)
- [x] Implement `POST /api/v1/auth/refresh` — exchange refresh token for new access token
- [x] Implement `POST /api/v1/auth/logout` — revoke refresh token
- [x] Implement `GET /api/v1/auth/me` — return current user profile
- [x] Add JWT middleware (HS256) that protects all non-auth routes
- [x] Build React login page with email + password form
- [x] Add auth context + token storage (memory for access token, httpOnly cookie for refresh)
- [x] Add route guard: redirect unauthenticated users to `/login`
- [x] Seed the database with two household users (Marcio + Wife) for local dev

### Deliverable
Both users can log in, see their name on screen, and log out. All other routes are protected.

---

## Week 3 — Transaction CRUD

### Tasks
- [x] Write migration `003_transactions.up.sql` — `payment_methods` and `transactions` tables
- [x] Implement API endpoints:
  - `GET /api/v1/transactions` (with filters: date range, type, category)
  - `POST /api/v1/transactions`
  - `PUT /api/v1/transactions/:id`
  - `DELETE /api/v1/transactions/:id` (soft delete)
- [x] Add request validation (amount > 0, valid date, valid type enum)
- [x] Build React `TransactionList` page — sortable table, type colour-coding
- [x] Build `TransactionForm` modal — amount, date, description, category, type, payment method
- [x] Add delete with confirmation dialog

### Deliverable
Both users can record, edit, and delete income and expense transactions. List updates in real time.

---

## Week 4 — Income Sources

Each user has their own income streams (salary, freelance, etc.). Income can be personal or marked as joint (goes straight into the joint pool). Users can also transfer money between their personal pool and the joint pool at any time.

### Tasks
- [ ] Write migration `004_income.up.sql` — `income_sources` and `income_entries` tables
- [ ] Implement API endpoints:
  - `GET /api/v1/income-sources`
  - `POST /api/v1/income-sources`
  - `PUT /api/v1/income-sources/:id`
  - `DELETE /api/v1/income-sources/:id`
  - `POST /api/v1/income-sources/:id/entries` — record a specific month's receipt
  - `GET /api/v1/income-sources/:id/history`
- [ ] Build React `IncomeSourceList` page — card per source, YTD vs. expected, split by personal vs. joint
- [ ] Build `IncomeSourceForm` — name, category, default amount, recurrence day, **is_joint flag**
- [ ] Build `RecordEntryDrawer` — quick form to log this month's actual amount received
- [ ] Ensure `TransactionForm` clearly supports **transfer** type for personal ↔ joint pool movements

### Deliverable
Each user can define their income streams (personal or joint), record what they actually received each month, and move money between their personal pool and the joint pool via transfer transactions.

---

## Week 5 — Allocation Engine

This is the core business logic. Build it as a **pure function first**, test it, then add persistence.

### Tasks
- [ ] Write migration `005_allocations.up.sql` — `allocation_buckets`, `allocation_rules`, `monthly_summaries` tables
- [ ] Implement allocation engine as a pure Go function:
  ```
  func RunAllocation(income, expenses []Transaction, rules []AllocationRule) AllocationResult
  ```
- [ ] Write unit tests covering: fixed amount rules, percentage rules, remainder rule, edge case (surplus = 0)
- [ ] Implement API endpoints:
  - `GET /api/v1/allocations/rules`
  - `POST /api/v1/allocations/rules`
  - `PUT /api/v1/allocations/rules/:id`
  - `GET /api/v1/allocations/buckets`
  - `POST /api/v1/allocations/buckets`
  - `POST /api/v1/allocations/run/:year/:month` — calculates + persists
  - `GET /api/v1/allocations/preview` — calculates only, no DB write
- [ ] Build React `AllocationBuilder` — list of rules with priority order, add/edit/delete
- [ ] Build `BucketManager` — create buckets (investments, allowances, savings)
- [ ] Build `AllocationPreview` panel — live calculation as you adjust rules

### Deliverable
You can define rules like "20% → Investments, R$500 each → Personal allowance, remainder → Emergency fund" and see a live preview of how this month's surplus gets split.

---

## Week 6 — Dashboard & Monthly Report

### Tasks
- [ ] Build React `Dashboard` page with:
  - This month's income total
  - This month's expenses total
  - Surplus (income − expenses)
  - Allocation breakdown (progress rings per bucket)
- [ ] Implement `GET /api/v1/reports/monthly/:year/:month` — full report JSON
- [ ] Build React `MonthlyReport` page with two tabs:
  - **Summary** — income vs. expenses bar chart, surplus number
  - **Allocation** — table showing how surplus was distributed
- [ ] Add PDF export button (generate from HTML using a Go library or Chromium)
- [ ] Final polish: loading states, error messages, empty states for new users

### Deliverable
A complete, usable MVP: both users can log in, record income and expenses, run the allocation engine, and view + export a monthly report.

---

## Definition of Done (Phase 1)

- [ ] Both users can log in simultaneously without conflicts
- [ ] Transactions can be created, edited, and deleted by either user
- [ ] Income sources are defined per user with monthly entry history
- [ ] Allocation engine produces correct results for all rule types (unit tested)
- [ ] Monthly report shows correct totals and allocation breakdown
- [ ] All API endpoints return appropriate errors for invalid input
- [ ] The app runs with a single `docker compose up` command on a fresh machine
- [ ] No secrets (passwords, JWT keys) are committed to the repository

---

## E2E Testing — Playwright (set up after Week 3)

End-to-end tests open a real browser, click through the app, and verify everything works from the user's perspective. To be set up once Week 3 (transactions) is done so there are enough screens to test meaningfully.

### Setup tasks
- [ ] Install Playwright: `npm init playwright@latest` inside `frontend/`
- [ ] Write test: login flow (fill form → submit → lands on dashboard)
- [ ] Write test: create a transaction (fill form → appears in list)
- [ ] Write test: edit a transaction (change amount → list reflects update)
- [ ] Write test: delete a transaction (confirm dialog → removed from list)
- [ ] Write test: logout (click sign out → redirected to login)
- [ ] Add Playwright to GitHub Actions so E2E runs on every push

### How to run
```bash
# From frontend/ on Windows
npx playwright test

# Run with visible browser (useful for debugging)
npx playwright test --headed

# Record a new test by clicking through the app manually
npx playwright codegen http://localhost:5173
```

---

## Key Files to Create First

```
financiallife/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── api/
│   ├── go.mod
│   ├── cmd/server/main.go
│   └── db/migrations/
│       ├── 001_initial.up.sql
│       ├── 002_auth.up.sql
│       ├── 003_transactions.up.sql
│       ├── 004_income.up.sql
│       └── 005_allocations.up.sql
└── frontend/
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        └── features/
            ├── auth/
            ├── dashboard/
            ├── transactions/
            ├── income/
            └── allocations/
```

---

*Next: confirm `docker compose up` starts cleanly, then move on to Week 2 — auth endpoints and JWT middleware.*
