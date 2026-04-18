# FinancialLife

A household finance app for tracking income, expenses, and running an allocation engine to split surplus across savings buckets.

**Stack:** React 18 + TypeScript · Go 1.25 · PostgreSQL 16 · Docker Compose

---

## Getting started

```bash
# 1. Copy env file and fill in your values
cp .env.example .env

# 2. Start everything
docker compose up --build

# 3. Verify the API is up
curl http://localhost:8080/health

# 4. Open the app
# http://localhost:5173
```

**Dev users (seeded automatically):**
| Email | Password | Role |
|---|---|---|
| marcio@home.local | password | admin |
| wife@home.local | password | admin |

---

## Project structure

```
financiallife/
├── apps/
│   └── web/          # React frontend (Vite + TypeScript + Tailwind)
├── api/              # Go backend (Chi + GORM + PostgreSQL)
├── e2e/              # Playwright end-to-end tests
└── docker-compose.yml
```

---

## Running tests

**Backend unit + integration tests** (uses in-memory SQLite, no Docker needed):
```bash
cd api && go test ./...
```

**Frontend unit tests:**
```bash
cd apps/web && npm test
```

**E2E tests** (requires the full stack running via `docker compose up`):
```bash
cd e2e && npx playwright test

# With visible browser
cd e2e && npx playwright test --headed

# Record a new test by clicking through the app
cd e2e && npx playwright codegen http://localhost:5173
```

---

## CI

GitHub Actions runs E2E tests on every push and pull request to `main`. The Playwright HTML report is uploaded as an artifact on failure.

---

## Phase 1 roadmap

| Week | Feature | Status |
|---|---|---|
| 1 | Project scaffold | ✅ Done |
| 2 | Authentication (JWT + refresh tokens) | ✅ Done |
| 3 | Transaction CRUD | ✅ Done |
| 4 | Income sources | 🔜 Next |
| 5 | Allocation engine | 🔜 Planned |
| 6 | Dashboard & monthly report | 🔜 Planned |
