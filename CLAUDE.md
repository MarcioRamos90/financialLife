# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

### Start everything
```bash
docker compose up --build
```
Frontend → `http://localhost:5173` · API → `http://localhost:8080/health`

### Backend (Go) — run from `api/`
```bash
go build ./...                              # compile check
go test ./...                               # all tests (in-memory SQLite, no Docker needed)
go test -run TestNamePattern ./path/to/pkg  # single test
```

### Frontend — run from `apps/web/`
```bash
npm run dev      # Vite dev server
npm test         # Vitest unit tests (watch mode)
npm run build    # tsc + vite build
npm run lint     # ESLint, zero warnings allowed
```

### E2E — run from `e2e/` (requires full stack running)
```bash
npm test                 # headless Playwright
npm run test:headed      # visible browser
npm run codegen          # record a new test by clicking through the app
```

---

## Architecture

### Monorepo layout
```
api/          Go backend (Chi router, GORM, PostgreSQL)
apps/web/     React 18 + TypeScript frontend (Vite, React Query, Tailwind)
e2e/          Playwright end-to-end tests
```

### Backend layers (api/internal/)

Every feature follows the same four-layer stack, wired together in `api/internal/api/router/routes.go`:

```
Handler  →  Service  →  Repository  →  GORM model
```

- **Model** (`model/`) — GORM struct + request/response DTOs + `Validate() string` method.
- **Repository** (`repository/`) — all DB queries; always filters by `household_id` to isolate data between households.
- **Service** (`service/`) — thin wrapper; calls `Validate()` and delegates to repository.
- **Handler** (`handlers/`) — decodes JSON, extracts JWT claims via `middleware.ClaimsFromCtx(r)`, calls service, responds with `jsonOK(w, data)` or `jsonError(w, msg, status)`.

All API responses are wrapped: `{ "data": ... }` or `{ "error": "..." }` (see `model.Response`).

**Schema** is managed via GORM `AutoMigrate` — no SQL migration files. To add a table, define the model struct and register it in `api/internal/db/connect.go → migrate()`.

**JWT middleware** (HS256) protects all routes except `/auth/login`, `/auth/refresh`, `/auth/logout`. Access token lives 15 min in memory; refresh token lives 30 days in an httpOnly cookie.

### Frontend layers (apps/web/src/)

```
features/<name>/
  types.ts            TypeScript interfaces + constants
  use<Name>.ts        React Query hooks (queries + mutations)
  <Component>.tsx     UI components
```

- API calls go through `src/lib/api.ts` — a thin fetch wrapper that stores the access token in memory, auto-refreshes on 401, and exposes `api.get / post / put / delete`.
- React Query keys are defined per-feature in `use*.ts`; mutations always call `invalidateQueries` on success.
- Route guard: `PrivateRoute` redirects unauthenticated users to `/login`.

### Money model

The household has three pools:

| Pool | How it's set |
|---|---|
| Personal (per user) | `is_joint = false` on transactions / income sources |
| Joint | `is_joint = true` on transactions / income sources |
| Transfer between pools | `type = "transfer"` transaction |

### Testing strategy

- **Go unit tests** — use `testutil.NewDB(t)` which creates an in-memory SQLite DB with schema and seeds (two users: `marcio@home.local` / `wife@home.local`, password `"password"`). No Docker required.
- **React unit tests** — Vitest + Testing Library; hooks are mocked with `vi.spyOn`.
- **E2E tests** — Playwright, single worker (sequential), `test.describe.serial`. Each suite calls `resetDB()` in `beforeEach` via `POST /api/v1/test/reset` (only available when `APP_ENV != "production"`).

### data-testid convention

Every interactive element in React components that may need to be targeted by E2E tests **must** have a `data-testid` attribute. Use descriptive kebab-case names:

- Containers: `data-testid="source-card"`, `data-testid="record-entry-drawer"`, `data-testid="income-source-form"`
- Sections: `data-testid="section-personal"`, `data-testid="section-joint"`
- Buttons: `data-testid="btn-<action>"` e.g. `btn-submit-source`, `btn-record-entry`, `btn-delete-source`

In E2E tests, always prefer `page.getByTestId(...)` over text or role selectors for elements that have a testid.

### Dev credentials
| User | Email | Password | Role |
|---|---|---|---|
| Marcio | `marcio@home.local` | `password` | admin |
| Wife | `wife@home.local` | `password` | admin |

### Environment variables
Copy `.env.example` to `.env`. Key vars:
- `JWT_SECRET` — must be at least 32 characters (HS256)
- `APP_ENV` — set to `development` locally; disables seed data guard and enables `/api/v1/test/reset`
- `VITE_API_BASE_URL` — frontend points to `http://localhost:8080/api/v1` by default; Vite proxies `/api` to the backend so the frontend fetch calls use relative paths
