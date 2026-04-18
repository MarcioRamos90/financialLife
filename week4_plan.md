# Week 4 — Income Sources

## Goal

Each user can define their own income streams, record what they actually received each month, and move money between their personal pool and the joint pool.

### Money model context

The household has three pools:

| Pool | Owned by |
|------|----------|
| Personal — Marcio | Marcio only |
| Personal — Wife | Wife only |
| Joint | Both users |

Income sources belong to a specific user but can be flagged as **joint** — meaning the money goes into the shared joint pool instead of the user's personal pool. Transfer transactions (already supported in Week 3) are how money moves between a personal pool and the joint pool in either direction.

This week wires up income sources and entries. The transfer flow already exists in the transaction form but should be made clearly usable for personal ↔ joint movements.

---

## Tasks (from project_phase1.md)

- [ ] Write migration `004_income.up.sql` — `income_sources` and `income_entries` tables
- [ ] Implement API endpoints:
  - `GET /api/v1/income-sources`
  - `POST /api/v1/income-sources`
  - `PUT /api/v1/income-sources/:id`
  - `DELETE /api/v1/income-sources/:id`
  - `POST /api/v1/income-sources/:id/entries` — record a specific month's receipt
  - `GET /api/v1/income-sources/:id/history`
- [ ] Build React `IncomeSourceList` page — card per source, YTD vs. expected, split by personal vs. joint
- [ ] Build `IncomeSourceForm` — name, category, default amount, recurrence day, is_joint flag
- [ ] Build `RecordEntryDrawer` — quick form to log this month's actual amount received
- [ ] Ensure `TransactionForm` clearly supports transfer type for personal ↔ joint pool movements

---

## Implementation Plan

### Backend (Go)

**1. Models** — `api/internal/model/income.go`
- `IncomeSource` — `id`, `household_id`, `user_id`, `name`, `category`, `default_amount`, `currency`, `recurrence_day`, `is_joint`, `is_active`, `created_at`, `updated_at`
- `IncomeEntry` — `id`, `income_source_id`, `user_id`, `year`, `month`, `expected_amount`, `received_amount`, `received_on`, `notes`, `created_at`
- Request DTOs: `CreateIncomeSourceRequest`, `UpdateIncomeSourceRequest`, `CreateIncomeEntryRequest` with `Validate()` methods
- Register both in `api/internal/db/connect.go` → `migrate()`

**2. Repository** — `api/internal/repository/income.go`
- `ListSources(ctx, householdID)` — returns all active sources for the household
- `CreateSource`, `UpdateSource`, `DeleteSource` (soft delete via `is_active=false`)
- `CreateEntry(ctx, sourceID, userID, req)` — upsert on `(source_id, year, month)`
- `ListHistory(ctx, sourceID)` — entries ordered by year/month desc

**3. Service** — `api/internal/service/income.go`
- Thin wrapper with validation; verify source belongs to household before update/delete

**4. Handler** — `api/internal/api/handlers/income.go`
- 6 endpoints following the same pattern as `transaction.go`

**5. Routes** — `api/internal/api/router/routes.go`
- Replace the `http.NotFound` stubs with real handler registrations

---

### Frontend (React)

**Feature folder:** `apps/web/src/features/income/`

| File | Purpose |
|------|---------|
| `types.ts` | `IncomeSource`, `IncomeEntry`, form DTOs, `INCOME_SOURCE_CATEGORIES` |
| `useIncomeSources.ts` | React Query hooks — list, create, update, delete, record entry, history |
| `IncomeSourceList.tsx` | Card grid split into Personal and Joint sections — name, category, default amount, YTD received vs expected |
| `IncomeSourceForm.tsx` | Modal — name, category, default amount, recurrence day, currency, is_joint toggle |
| `RecordEntryDrawer.tsx` | Slide-in drawer — month picker, expected amount (pre-filled from source), received amount, notes |

Add "Income" link to the existing nav/sidebar.

**Transfer UX note:** The existing `TransactionForm` already supports `type = transfer`. Verify the form makes it clear that a transfer moves money between personal ↔ joint (e.g. label the description placeholder as "Contribution to joint account" or "Withdrawal from joint account").

---

## Order of Execution

1. Model + register in AutoMigrate → confirm table creation
2. Repository → Service → Handler → Routes (backend complete)
3. `types.ts` + `useIncomeSources.ts` (frontend data layer)
4. `IncomeSourceList` + `IncomeSourceForm` (CRUD UI)
5. `RecordEntryDrawer` (entry logging)
6. Verify transfer UX in `TransactionForm`
7. Wire up navigation

---

## Deliverable

Each user can define their income streams (personal or joint), record what they actually received each month, and move money between their personal pool and the joint pool via transfer transactions.
