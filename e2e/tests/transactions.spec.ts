import { test, expect, type Page } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';

test.describe.serial('transactions', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);
    await page.goto('/transactions');
  });

  async function openNewForm(page: Page) {
    await page.getByRole('button', { name: /new|add|create/i }).click();
    await expect(page.getByRole('heading', { name: /new transaction/i })).toBeVisible();
  }

  async function fillForm(page: Page, opts: {
    amount: string;
    description: string;
    date: string;
    type?: 'expense' | 'income' | 'transfer';
  }) {
    if (opts.type) {
      await page.getByRole('button', { name: opts.type, exact: true }).click();
    }
    await page.getByLabel('Amount').fill(opts.amount);
    await page.getByLabel('Description').fill(opts.description);
    await page.getByLabel('Date').fill(opts.date);
  }

  test('creates a transaction and it appears in the list', async ({ page }) => {
    await openNewForm(page);
    await fillForm(page, { amount: '150', description: 'Supermarket', date: '2025-01-15', type: 'expense' });
    await page.getByRole('button', { name: /add transaction/i }).click();

    await expect(page.getByRole('row', { name: /supermarket/i })).toBeVisible();
  });

  test('edits a transaction and the list reflects the update', async ({ page }) => {
    await openNewForm(page);
    await fillForm(page, { amount: '100', description: 'Coffee', date: '2025-01-15' });
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByRole('row', { name: /coffee/i })).toBeVisible();

    await page.getByRole('row', { name: /coffee/i }).getByRole('button', { name: /edit/i }).click();
    await page.getByLabel('Amount').fill('250');
    await page.getByRole('button', { name: /save changes/i }).click();

    const row = page.getByRole('row', { name: /coffee/i });
    await expect(row).toBeVisible();
    await expect(row.getByText(/250/)).toBeVisible();
    await expect(row.getByText(/100/)).not.toBeVisible();
  });

  test('deletes a transaction after confirmation', async ({ page }) => {
    await openNewForm(page);
    await fillForm(page, { amount: '75', description: 'Bus pass', date: '2025-01-15' });
    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(page.getByText('Bus pass')).toBeVisible();

    await page.getByRole('row', { name: /bus pass/i }).getByRole('button', { name: /delete/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('cell', { name: 'Bus pass' })).not.toBeVisible();
  });

  test('filters by type shows only matching transactions', async ({ page }) => {
    for (const [desc, type, amount] of [
      ['Salary', 'income', '5000'],
      ['Rent', 'expense', '1200'],
    ] as [string, 'income' | 'expense', string][]) {
      await openNewForm(page);
      await fillForm(page, { amount, description: desc, date: '2025-01-15', type });
      await page.getByRole('button', { name: /add transaction/i }).click();
      await expect(page.getByRole('cell', { name: desc })).toBeVisible();
    }

    await page.getByRole('combobox', { name: /filter by type/i }).selectOption('income');

    await expect(page.getByRole('cell', { name: 'Salary' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rent' })).not.toBeVisible();
  });
});
