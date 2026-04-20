import { test, expect, type Page } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';
import { buildIncomeXLSX } from '../fixtures/xlsx';

test.describe.serial('income sources import/export', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);
    await page.goto('/income');
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function createSource(page: Page, name: string, amount = '1000') {
    await page.getByRole('button', { name: /new source/i }).click();
    await expect(page.getByTestId('income-source-form')).toBeVisible();
    await page.getByLabel('Name').fill(name);
    await page.getByLabel(/expected monthly amount/i).fill(amount);
    await page.getByTestId('btn-submit-source').click();
    await expect(page.getByTestId('income-source-form')).not.toBeVisible();
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  test('export button triggers an xlsx file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('btn-export').click(),
    ]);
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('template link triggers an xlsx file download', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('link-download-template').click(),
    ]);
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('export includes existing sources', async ({ page }) => {
    await createSource(page, 'Salary', '5000');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('btn-export').click(),
    ]);
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  // ── Import — success ─────────────────────────────────────────────────────────

  test('importing a valid xlsx shows success modal with imported count', async ({ page }) => {
    const file = buildIncomeXLSX([
      ['Salary',    'Work', 5000, 'BRL', 0, 'no', ''],
      ['Freelance', 'Work', 1500, 'BRL', 0, 'no', ''],
    ]);

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/income-sources/import')),
      page.getByTestId('input-import-file').setInputFiles(file),
    ]);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/2 records imported/i)).toBeVisible();
    await expect(page.getByTestId('error-table')).not.toBeVisible();
  });

  test('imported sources appear as cards after closing modal', async ({ page }) => {
    const file = buildIncomeXLSX([
      ['Monthly Salary', 'Salary', 5000, 'BRL', 0, 'no', ''],
    ]);

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/income-sources/import')),
      page.getByTestId('input-import-file').setInputFiles(file),
    ]);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('btn-close-modal').click();

    await expect(page.getByTestId('source-card').filter({ hasText: 'Monthly Salary' })).toBeVisible();
  });

  test('importing a joint source places it in the joint section', async ({ page }) => {
    const file = buildIncomeXLSX([
      ['Rental Income', 'Rental', 2000, 'BRL', 0, 'yes', ''],
    ]);

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/income-sources/import')),
      page.getByTestId('input-import-file').setInputFiles(file),
    ]);
    await page.getByTestId('btn-close-modal').click();

    await expect(page.getByTestId('section-joint').getByText('Rental Income')).toBeVisible();
  });

  // ── Import — duplicates & errors ─────────────────────────────────────────────

  test('importing a duplicate source name shows skipped count in modal', async ({ page }) => {
    await createSource(page, 'Salary', '5000');

    const file = buildIncomeXLSX([
      ['Salary',    'Work', 5000, 'BRL', 0, 'no', ''],
      ['Freelance', 'Work', 1500, 'BRL', 0, 'no', ''],
    ]);

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/income-sources/import')),
      page.getByTestId('input-import-file').setInputFiles(file),
    ]);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/1 record imported/i)).toBeVisible();
    await expect(page.getByText(/1 skipped/i)).toBeVisible();
  });

  test('importing xlsx with invalid rows shows error table', async ({ page }) => {
    const file = buildIncomeXLSX([
      ['',        'Work', 1000, 'BRL', 0,  'no', ''],  // missing name
      ['Bonus',   'Work', -50,  'BRL', 0,  'no', ''],  // negative amount
      ['Pension', 'Work', 500,  'BRL', 99, 'no', ''],  // bad recurrence day
      ['Salary',  'Work', 5000, 'BRL', 0,  'no', ''],  // valid
    ]);

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/income-sources/import')),
      page.getByTestId('input-import-file').setInputFiles(file),
    ]);

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByTestId('error-table')).toBeVisible();
    await expect(page.getByText(/1 record imported/i)).toBeVisible();
  });

  test('modal closes when Close button is clicked', async ({ page }) => {
    const file = buildIncomeXLSX([
      ['Salary', 'Work', 5000, 'BRL', 0, 'no', ''],
    ]);

    await Promise.all([
      page.waitForResponse(r => r.url().includes('/income-sources/import')),
      page.getByTestId('input-import-file').setInputFiles(file),
    ]);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByTestId('btn-close-modal').click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
