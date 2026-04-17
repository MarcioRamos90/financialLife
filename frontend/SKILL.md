---
name: financiallife-frontend-tests
description: >
  Guide for writing Vitest + Testing Library unit tests inside the
  FinancialLife frontend/ directory.
  Use this whenever adding a new React component, hook, or utility to ensure
  it ships with tests. Trigger this skill when the user asks to "add tests",
  "write tests for", "test the component", or mentions frontend test coverage.
---

# FinancialLife — Frontend Testing Guide

## Quick facts

| Item | Value |
|---|---|
| Test runner | Vitest (configured in `vite.config.ts`) |
| Rendering | `@testing-library/react` |
| DOM matchers | `@testing-library/jest-dom` (imported in `setupTests.ts`) |
| Environment | jsdom (no browser needed) |
| How to run | `npm test -- --run` (from `frontend/` on Windows) |
| Watch mode | `npm test` |

---

## File placement

Test files live next to the code they test:

```
features/
  transactions/
    TransactionForm.tsx
    TransactionForm.test.tsx   ← same folder
    TransactionList.tsx
    TransactionList.test.tsx
    useTransactions.ts
    useTransactions.test.ts
```

---

## How to mock React Query hooks

Every component in this project fetches data via custom hooks (`useTransactions`,
`useCreateTransaction`, etc.). In tests, **never call the real API** — mock the
hook module instead:

```tsx
import * as useTransactionsModule from './useTransactions'

// In beforeEach or at the top of a describe block:
vi.spyOn(useTransactionsModule, 'useTransactions').mockReturnValue({
  data: [/* your fixture data */],
  isLoading: false,
  isError: false,
} as any)

vi.spyOn(useTransactionsModule, 'useCreateTransaction').mockReturnValue({
  mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false,
} as any)
```

Always call `vi.clearAllMocks()` in `beforeEach` so each test starts clean.

---

## How to mock the auth context

Components that call `useAuth()` need the context to be populated.
Use `vi.spyOn` on the context module:

```tsx
import * as AuthContext from '../auth/AuthContext'

vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
  user: { id: 'user-1', display_name: 'Marcio', email: 'marcio@home.local' },
  login: vi.fn(),
  logout: vi.fn(),
} as any)
```

---

## Rendering a component

Most components in this project use `react-router-dom` (for `NavLink` /
`useNavigate`). Wrap renders in `<BrowserRouter>` when needed:

```tsx
import { BrowserRouter } from 'react-router-dom'

render(
  <BrowserRouter>
    <MyComponent />
  </BrowserRouter>
)
```

If a component also uses React Query's `useQueryClient()`, wrap it in a
`QueryClientProvider` too:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

render(
  <QueryClientProvider client={qc}>
    <MyComponent />
  </QueryClientProvider>
)
```

---

## Fixture helpers

Define fixtures at the top of each test file so tests read clearly:

```tsx
const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'tx-1',
  type: 'expense',
  amount: 100,
  currency: 'BRL',
  description: 'Test transaction',
  category: 'Food & Drink',
  is_joint: false,
  payment_method_id: null,
  transaction_date: '2024-01-01',
  // … fill in required fields …
  ...overrides,
})
```

This lets individual tests express only the fields relevant to what they're
testing, keeping assertions focused.

---

## What to test per component type

### Form components (modals, drawers)

- Renders the correct title in create vs. edit mode.
- Pre-fills fields when an existing record is passed.
- Fires the correct mutation (`create` vs. `update`) on submit.
- Shows inline validation errors (client-side) before calling the API.
- Shows a server error message when the mutation rejects.
- Disables the submit button and changes its label while `isPending`.
- Calls `onClose` when Cancel is clicked or after a successful save.

### List / table components

- Shows a loading state while `isLoading` is true.
- Shows an error state when `isError` is true.
- Shows an empty-state message when the data array is empty.
- Renders one row per item and displays key fields.
- Computes aggregate values (totals, surplus) correctly.
- Opens the correct modal when action buttons are clicked.
- Passes the right ID to the delete mutation on confirmation.
- Resets filters when "Clear filters" is clicked.

### Custom hooks (e.g. `useTransactions`)

Test hooks in isolation using `renderHook` from Testing Library:

```tsx
import { renderHook } from '@testing-library/react'

// Mock the api module
vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue([{ id: 'tx-1' }]),
  },
}))

it('returns transactions from the api', async () => {
  const { result } = renderHook(() => useTransactions({}), { wrapper: QueryWrapper })
  await waitFor(() => expect(result.current.data).toHaveLength(1))
})
```

---

## Conventions used in this project

- **`describe` → `it`** — every test lives inside a `describe` named after
  the component, and each `it` reads like a sentence: *"shows a loading
  indicator while fetching"*.
- **Mock at the module boundary** — mock hooks and the `api` module, not
  internal implementation details. This keeps tests resilient to refactors.
- **Prefer `getByRole`** over `getByTestId` — accessible queries match what
  a real user (or assistive technology) sees and are more robust.
- **`waitFor` for async UI** — any assertion about something that happens
  after an `await` (mutation resolved, state updated) must be wrapped in
  `waitFor`.
- **`as any` casts on mocks** — React Query return types are complex; cast
  mock return values to `any` to avoid fighting TypeScript in test files.
  The real type safety lives in production code.
- **No snapshot tests** — snapshots break on trivial UI changes and add
  noise without adding confidence. Write behavioural assertions instead.

---

## Running the tests

```bash
# Run once (CI mode) — from frontend/ on Windows
npm test -- --run

# Watch mode — re-runs on file save
npm test

# Single file
npx vitest run src/features/transactions/TransactionForm.test.tsx

# With coverage
npx vitest run --coverage
```
