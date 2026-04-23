import { test, expect, type Page } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAccount(page: Page, name: string, type = 'checking', initialBalance = '0') {
  await page.getByTestId('btn-new-account').click();
  await expect(page.getByTestId('account-form')).toBeVisible();
  await page.getByTestId('input-name').fill(name);
  await page.getByTestId('select-type').selectOption(type);
  await page.getByTestId('input-initial-balance').fill(initialBalance);
  await page.getByTestId('btn-submit-account').click();
  await expect(page.getByTestId('account-form')).not.toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function createTransaction(page: Page, opts: {
  type: 'income' | 'expense' | 'transfer';
  amount: string;
  description: string;
  date: string;
  accountLabel: string;
  toAccountLabel?: string;
}) {
  await page.goto('/transactions');
  await page.getByRole('button', { name: /new transaction/i }).click();
  await page.getByRole('button', { name: new RegExp(opts.type, 'i') }).click();
  await page.getByLabel(/amount/i).fill(opts.amount);
  await page.getByLabel(/description/i).fill(opts.description);
  await page.getByLabel(/date/i).fill(opts.date);
  await page.getByTestId('select-account').selectOption({ label: opts.accountLabel });
  if (opts.toAccountLabel) {
    await page.getByTestId('select-to-account').selectOption({ label: opts.toAccountLabel });
  }
  await page.getByRole('button', { name: /add transaction/i }).click();
  if (opts.type === 'transfer') {
    // Transfers replace the description with a directional label in the list; just wait for the modal to close
    await expect(page.getByRole('button', { name: /add transaction/i })).not.toBeVisible();
  } else {
    await expect(page.getByText(opts.description)).toBeVisible();
  }
}

// ─── Account filter on the Transactions page ──────────────────────────────────

test.describe.serial('account filter — transactions page', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);

    // Create a second account alongside the seeded Cash account
    await page.goto('/accounts');
    await createAccount(page, 'Savings', 'savings', '0');

    // Add one income per account
    await createTransaction(page, {
      type: 'income', amount: '100', description: 'Cash income',
      date: '2025-06-01', accountLabel: 'Cash',
    });
    await createTransaction(page, {
      type: 'income', amount: '200', description: 'Savings income',
      date: '2025-06-02', accountLabel: 'Savings',
    });
  });

  test('filter by account narrows the list', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByTestId('filter-account')).toBeVisible();

    await page.getByTestId('filter-account').selectOption({ label: 'Savings · Savings' });

    await expect(page.getByText('Savings income')).toBeVisible();
    await expect(page.getByText('Cash income')).not.toBeVisible();
  });

  test('account_id is reflected in the URL', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByTestId('filter-account').selectOption({ label: 'Savings · Savings' });

    await expect(page).toHaveURL(/account_id=/);
  });

  test('filter survives a page refresh', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByTestId('filter-account').selectOption({ label: 'Savings · Savings' });
    await page.reload();

    await expect(page.getByTestId('filter-account')).toHaveValue(/.+/);
    await expect(page.getByText('Savings income')).toBeVisible();
    await expect(page.getByText('Cash income')).not.toBeVisible();
  });

  test('clear filters button restores full list', async ({ page }) => {
    await page.goto('/transactions');
    await page.getByTestId('filter-account').selectOption({ label: 'Savings · Savings' });
    await expect(page.getByTestId('btn-clear-filters')).toBeVisible();

    await page.getByTestId('btn-clear-filters').click();

    await expect(page.getByText('Cash income')).toBeVisible();
    await expect(page.getByText('Savings income')).toBeVisible();
    await expect(page).not.toHaveURL(/account_id=/);
  });

  test('transfer shows directional label when account is filtered', async ({ page }) => {
    await page.goto('/accounts');
    await createAccount(page, 'Checking', 'checking', '500');

    await createTransaction(page, {
      type: 'transfer', amount: '150', description: 'Move funds',
      date: '2025-06-03', accountLabel: 'Cash', toAccountLabel: 'Checking',
    });

    await page.goto('/transactions');
    await page.getByTestId('filter-account').selectOption({ label: 'Cash · Cash' });

    // Source account sees "Transfer out"
    await expect(page.getByText(/Transfer out/i)).toBeVisible();

    await page.getByTestId('filter-account').selectOption({ label: 'Checking · Checking' });

    // Destination account sees "Transfer in"
    await expect(page.getByText(/Transfer in/i)).toBeVisible();
  });
});

// ─── Account inline transactions panel ───────────────────────────────────────

test.describe.serial('account inline transactions panel', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);

    // Add a transaction to the default Cash account
    await createTransaction(page, {
      type: 'income', amount: '500', description: 'Panel test income',
      date: '2025-06-01', accountLabel: 'Cash',
    });

    await page.goto('/accounts');
  });

  test('View transactions button opens the panel', async ({ page }) => {
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await card.getByTestId('btn-view-transactions').click();

    await expect(page.getByTestId('account-transactions-panel')).toBeVisible();
  });

  test('panel shows the summary bar with balance, income and expense', async ({ page }) => {
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await card.getByTestId('btn-view-transactions').click();

    await expect(page.getByTestId('account-summary-income')).toBeVisible();
    await expect(page.getByTestId('account-summary-expense')).toBeVisible();
    await expect(page.getByTestId('account-summary-balance')).toBeVisible();
    // R$500 income should appear in the income summary
    await expect(page.getByTestId('account-summary-income')).toContainText('500');
  });

  test('panel lists only transactions for that account', async ({ page }) => {
    // Create a second account with its own transaction
    await page.goto('/accounts');
    await createAccount(page, 'Other', 'savings', '0');
    await createTransaction(page, {
      type: 'expense', amount: '99', description: 'Other account expense',
      date: '2025-06-02', accountLabel: 'Other',
    });

    await page.goto('/accounts');
    const cashCard = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await cashCard.getByTestId('btn-view-transactions').click();

    await expect(page.getByTestId('account-transactions-list')).toBeVisible();
    await expect(page.getByText('Panel test income')).toBeVisible();
    await expect(page.getByText('Other account expense')).not.toBeVisible();
  });

  test('clicking View transactions again collapses the panel', async ({ page }) => {
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await card.getByTestId('btn-view-transactions').click();
    await expect(page.getByTestId('account-transactions-panel')).toBeVisible();

    await card.getByTestId('btn-view-transactions').click();
    await expect(page.getByTestId('account-transactions-panel')).not.toBeVisible();
  });

  test('transfer in the panel shows directional label', async ({ page }) => {
    await page.goto('/accounts');
    await createAccount(page, 'Savings', 'savings', '0');

    await createTransaction(page, {
      type: 'transfer', amount: '200', description: 'Move to savings',
      date: '2025-06-03', accountLabel: 'Cash', toAccountLabel: 'Savings',
    });

    await page.goto('/accounts');

    // Cash is the source — should show "Transfer out"
    const cashCard = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await cashCard.getByTestId('btn-view-transactions').click();
    await expect(page.getByTestId('account-transactions-list').getByText(/Transfer out/i)).toBeVisible();
    await cashCard.getByTestId('btn-view-transactions').click();

    // Savings is the destination — should show "Transfer in"
    const savingsCard = page.locator('[data-testid="account-card"]', { hasText: 'Savings' });
    await savingsCard.getByTestId('btn-view-transactions').click();
    await expect(page.getByTestId('account-transactions-list').getByText(/Transfer in/i)).toBeVisible();
  });

  test('panel hides the account picker (filter-account not present)', async ({ page }) => {
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await card.getByTestId('btn-view-transactions').click();

    await expect(page.getByTestId('account-transactions-panel')).toBeVisible();
    // The embedded TransactionList must not render the account dropdown
    await expect(page.getByTestId('account-transactions-panel').getByTestId('filter-account')).not.toBeVisible();
  });

  test('panel shows zero totals when account has no transactions', async ({ page }) => {
    // Create a fresh account with no transactions
    await createAccount(page, 'Empty Account', 'savings', '0');
    await page.goto('/accounts');

    const card = page.locator('[data-testid="account-card"]', { hasText: 'Empty Account' });
    await card.getByTestId('btn-view-transactions').click();

    await expect(page.getByTestId('account-summary-income')).toContainText('0');
    await expect(page.getByTestId('account-summary-expense')).toContainText('0');
  });

  test('panel date range filter updates both summary and transaction list', async ({ page }) => {
    // Add a second transaction outside the date range we will filter to
    await createTransaction(page, {
      type: 'income', amount: '300', description: 'Old income',
      date: '2025-01-15', accountLabel: 'Cash',
    });

    await page.goto('/accounts');
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await card.getByTestId('btn-view-transactions').click();

    const panel = page.getByTestId('account-transactions-panel');
    await expect(panel).toBeVisible();

    // Apply a date range that only covers the beforeEach transaction (2025-06-01)
    await panel.locator('input[type="date"]').first().fill('2025-06-01');
    await panel.locator('input[type="date"]').last().fill('2025-06-30');

    // Only "Panel test income" (R$500) should be visible; "Old income" (R$300) should not
    await expect(page.getByTestId('account-transactions-list').getByText('Panel test income')).toBeVisible();
    await expect(page.getByTestId('account-transactions-list').getByText('Old income')).not.toBeVisible();

    // Summary income should reflect only the filtered period (500, not 800)
    await expect(page.getByTestId('account-summary-income')).toContainText('500');
    await expect(page.getByTestId('account-summary-income')).not.toContainText('800');
  });
});
