import { test, expect, type Page } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';

test.describe.serial('accounts', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);
    await page.goto('/accounts');
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async function openNewAccountForm(page: Page) {
    await page.getByTestId('btn-new-account').click();
    await expect(page.getByTestId('account-form')).toBeVisible();
  }

  async function fillAccountForm(page: Page, opts: {
    name: string;
    type?: string;
    initialBalance?: string;
  }) {
    await page.getByTestId('input-name').fill(opts.name);
    if (opts.type) {
      await page.getByTestId('select-type').selectOption(opts.type);
    }
    if (opts.initialBalance !== undefined) {
      await page.getByTestId('input-initial-balance').fill(opts.initialBalance);
    }
  }

  // ─── Tests ────────────────────────────────────────────────────────────────

  test('default "Cash" account exists after DB reset', async ({ page }) => {
    // The seed creates a default Cash account for every household
    await expect(page.getByTestId('account-card')).toBeVisible();
    await expect(page.getByText('Cash', { exact: true })).toBeVisible();
  });

  test('creates a new account and it appears in the list', async ({ page }) => {
    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'Savings', type: 'savings', initialBalance: '5000' });
    await page.getByTestId('btn-submit-account').click();

    await expect(page.getByTestId('account-form')).not.toBeVisible();
    await expect(page.getByText('Savings', { exact: true })).toBeVisible();
  });

  test('shows validation error when name is empty', async ({ page }) => {
    await openNewAccountForm(page);
    await page.getByTestId('input-name').fill('');
    await page.getByTestId('btn-submit-account').click();

    await expect(page.getByText(/account name is required/i)).toBeVisible();
  });

  test('cancels form without creating an account', async ({ page }) => {
    const initialCards = await page.getByTestId('account-card').count();

    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'Temp Account' });
    await page.getByTestId('btn-cancel-account').click();

    await expect(page.getByTestId('account-form')).not.toBeVisible();
    await expect(page.getByTestId('account-card')).toHaveCount(initialCards);
  });

  test('edits an account and the list reflects the update', async ({ page }) => {
    // Create an account to edit
    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'Old Name', type: 'checking' });
    await page.getByTestId('btn-submit-account').click();
    await expect(page.getByText('Old Name')).toBeVisible();

    // Find the new card's edit button by locating the card that contains "Old Name"
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Old Name' });
    await card.getByTestId(/btn-edit-account-/).click();

    await expect(page.getByTestId('account-form')).toBeVisible();
    await expect(page.getByText('Edit Account')).toBeVisible();

    await page.getByTestId('input-name').fill('New Name');
    await page.getByTestId('btn-submit-account').click();

    await expect(page.getByText('New Name')).toBeVisible();
    await expect(page.getByText('Old Name')).not.toBeVisible();
  });

  test('shows archive confirmation dialog when archive button is clicked', async ({ page }) => {
    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'To Archive' });
    await page.getByTestId('btn-submit-account').click();
    await expect(page.getByText('To Archive')).toBeVisible();

    const card = page.locator('[data-testid="account-card"]', { hasText: 'To Archive' });
    await card.getByTestId(/btn-archive-account-/).click();

    await expect(page.getByTestId('btn-confirm-archive')).toBeVisible();
  });

  test('archives an account after confirmation and it disappears from list', async ({ page }) => {
    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'Archivable' });
    await page.getByTestId('btn-submit-account').click();
    await expect(page.getByText('Archivable')).toBeVisible();

    const card = page.locator('[data-testid="account-card"]', { hasText: 'Archivable' });
    await card.getByTestId(/btn-archive-account-/).click();
    await page.getByTestId('btn-confirm-archive').click();

    await expect(page.locator('[data-testid="account-list"]').getByText('Archivable')).not.toBeVisible();
  });

  test('account balance updates after transactions are added', async ({ page }) => {
    // Create a dedicated account for balance testing
    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'Balance Test', type: 'checking', initialBalance: '1000' });
    await page.getByTestId('btn-submit-account').click();
    await expect(page.getByText('Balance Test')).toBeVisible();

    // Navigate to transactions, add an income transaction for this account
    await page.goto('/transactions');
    await page.getByRole('button', { name: /new transaction/i }).click();
    await expect(page.getByRole('heading', { name: /new transaction/i })).toBeVisible();

    await page.getByRole('button', { name: /income/i }).click();
    await page.getByLabel(/amount/i).fill('500');
    await page.getByLabel(/description/i).fill('Test income');
    await page.getByLabel(/date/i).fill('2025-01-15');

    // Select the Balance Test account in the account picker
    await page.getByTestId('select-account').selectOption({ label: 'Balance Test' });
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByText('Test income')).toBeVisible();

    // Go back to accounts and verify the balance
    await page.goto('/accounts');
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Balance Test' });
    // Initial 1000 + 500 income = 1500
    await expect(card.getByText(/1[\.,]500/)).toBeVisible();
  });

  test('creates a transfer transaction between two accounts', async ({ page }) => {
    // Create a second account (first "Cash" account already exists from seed)
    await openNewAccountForm(page);
    await fillAccountForm(page, { name: 'Destination', type: 'savings', initialBalance: '0' });
    await page.getByTestId('btn-submit-account').click();
    await expect(page.getByText('Destination')).toBeVisible();

    // Create a transfer
    await page.goto('/transactions');
    await page.getByRole('button', { name: /new transaction/i }).click();
    await page.getByRole('button', { name: /transfer/i }).click();
    await page.getByLabel(/amount/i).fill('300');
    await page.getByLabel(/description/i).fill('Savings transfer');
    await page.getByLabel(/date/i).fill('2025-01-15');

    await page.getByTestId('select-account').selectOption({ label: 'Cash' });
    await page.getByTestId('select-to-account').selectOption({ label: 'Destination' });
    await page.getByRole('button', { name: /add transaction/i }).click();

    await expect(page.getByText('Savings transfer')).toBeVisible();
  });

  test('empty state shown when all accounts are archived', async ({ page }) => {
    // Archive the default Cash account that comes from seed
    const card = page.locator('[data-testid="account-card"]', { hasText: 'Cash' });
    await card.getByTestId(/btn-archive-account-/).click();
    await page.getByTestId('btn-confirm-archive').click();

    await expect(page.getByTestId('empty-state')).toBeVisible();
  });
});
