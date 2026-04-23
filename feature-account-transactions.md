# Feature: Account Transaction View

Shipped on the `feature/accounts` branch. Extends multi-account support with two ways to view transactions scoped to a single account.

---

## Features

### 1. Account filter on the Transactions page

An account picker in the existing filter bar narrows the transaction list to a single account. Selecting an account also includes transfer legs where that account is the destination (`to_account_id`), so a full picture of money movement is always shown.

**Behaviour**
- Default "All accounts" — no change to existing behaviour.
- Selecting an account applies `account_id = ? OR to_account_id = ?` at the repository level.
- The selected account persists in the URL as `?account_id=<uuid>` — survives refresh and is shareable.
- A "Clear filters" button appears whenever any filter is active and resets all filters at once.
- Transfer rows render a directional label depending on which leg the user is viewing:
  - Source account → `Transfer out → <destination name>`
  - Destination account → `Transfer in ← <source name>`

### 2. Inline transactions panel on the Account page

A "View transactions ▼" toggle on each account card expands an inline panel below the card showing that account's transaction history.

**Behaviour**
- Panel is scoped to the account — the account picker is hidden (implied by context).
- All other filters (type, category, date range) remain functional inside the panel.
- A summary bar at the top of the panel shows **Income**, **Expense**, and **Balance** for the selected date range.
- Balance is always the full lifetime balance (initial balance + all movements, unfiltered).
- Income and Expense totals in the summary track the same date range as the visible transaction list, keeping them in sync.
- Transfers show the same directional labels as Feature 1 (Transfer in / Transfer out).
- Archived accounts do not render the toggle or panel.
- List is capped at the last 100 transactions (MVP).

---

## Backend

### Modified endpoint — `GET /api/v1/transactions`

| Param | Type | Description |
|---|---|---|
| `account_id` | string (UUID), optional | Filter to rows where `account_id = ? OR to_account_id = ?` |
| `start_date` | `YYYY-MM-DD`, optional | Existing filter |
| `end_date` | `YYYY-MM-DD`, optional | Existing filter |
| `type` | string, optional | Existing filter |
| `category` | string, optional | Existing filter |

### New endpoint — `GET /api/v1/accounts/:id/balance`

Returns the current balance plus income/expense totals for a date range.

**Query params**

| Param | Type | Description |
|---|---|---|
| `start_date` | `YYYY-MM-DD`, optional | Scope income/expense totals to this range |
| `end_date` | `YYYY-MM-DD`, optional | Scope income/expense totals to this range |

**Response**

```json
{
  "data": {
    "account_id": "uuid",
    "balance": 1500.00,
    "income":  500.00,
    "expense": 0.00
  }
}
```

`balance` is always the full lifetime balance (`initial_balance + income − expenses − transfers_out + transfers_in`), unaffected by the date range params. `income` and `expense` are scoped to the date range.

**Route registration** — `/accounts/{id}/balance` is registered as a static suffix on the `{id}` param (no conflict with `GET /accounts/{id}`).

### Files changed

| File | Change |
|---|---|
| `api/internal/model/account.go` | Added `AccountBalanceResponse` and `AccountBalanceFilters` types |
| `api/internal/repository/account.go` | Added `Balance()` method |
| `api/internal/repository/transaction.go` | Added `account_id` filter to `List()` |
| `api/internal/service/account.go` | Added `Balance()` delegation |
| `api/internal/api/handlers/account.go` | Added `Balance` handler |
| `api/internal/api/router/routes.go` | Registered `/accounts/{id}/balance` |

---

## Frontend

### New component — `AccountTransactionsPanel`

`apps/web/src/features/accounts/AccountTransactionsPanel.tsx`

Rendered inside `AccountCard` when `isExpanded` is true. Accepts:

| Prop | Type | Description |
|---|---|---|
| `accountId` | `string` | Passed to `useAccountBalance` and `TransactionList` |
| `accountName` | `string` | Displayed as panel title |
| `currency` | `string` | Used for formatting the summary bar |

Internally maintains a `dateRange` state that is passed down to both `useAccountBalance` (for the summary) and `TransactionList` (for the list) via `dateRange` / `onDateRangeChange` props, keeping income/expense totals in sync with the visible rows.

### Modified component — `TransactionList`

`apps/web/src/features/transactions/TransactionList.tsx`

New props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `accountId` | `string` | — | When set, hides `filter-account` and locks filtering to this account |
| `embedded` | `boolean` | `false` | Hides the top bar (title, import/export, new-transaction button) |
| `dateRange` | `{ start?: string; end?: string }` | — | Parent-controlled date state (used by panel to sync summary) |
| `onDateRangeChange` | `(range) => void` | — | Callback to propagate date changes up to the panel |

Transfer label / amount helpers (`transferLabel`, `transferAmount`) use `activeAccountId` (either the fixed `accountId` prop or the URL `?account_id` param) to determine direction.

### Modified hook — `useTransactions`

`apps/web/src/features/transactions/useTransactions.ts`

`TransactionFilters` now includes `account_id?: string`. The query key includes the full filter object, so the list refetches whenever the account changes.

### New hook — `useAccountBalance`

`apps/web/src/features/accounts/useAccounts.ts`

```ts
useAccountBalance(id: string, filters?: { start_date?: string; end_date?: string })
```

Calls `GET /accounts/{id}/balance` with the given date params. Query key: `['accounts', id, 'balance', filters]`. Enabled only when `id` is truthy.

---

## data-testid reference

| Element | `data-testid` |
|---|---|
| Account filter dropdown (Transactions page) | `filter-account` |
| Clear all filters button | `btn-clear-filters` |
| View / hide transactions toggle on account card | `btn-view-transactions` |
| Inline transactions panel | `account-transactions-panel` |
| Income total in panel summary | `account-summary-income` |
| Expense total in panel summary | `account-summary-expense` |
| Balance in panel summary | `account-summary-balance` |
| Transaction list tbody (panel and main page) | `account-transactions-list` |

---

## E2E test coverage

`e2e/tests/account-transactions.spec.ts` — 13 tests, all passing.

**Account filter — transactions page**
1. Filter by account narrows the list
2. `account_id` is reflected in the URL
3. Filter survives a page refresh
4. Clear filters button restores full list
5. Transfer shows directional label when account is filtered

**Inline transactions panel**
1. "View transactions" button opens the panel
2. Panel shows the summary bar with balance, income, and expense
3. Panel lists only transactions for that account
4. Clicking "View transactions" again collapses the panel
5. Transfer in the panel shows directional label
6. Panel hides the account picker (filter-account not present in embedded mode)
7. Panel shows zero totals when account has no transactions
8. Panel date range filter updates both summary and transaction list
