import { test, expect } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';

test.describe.serial('transactions', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);
    await page.goto('/transactions');
  });

  test('creates a transaction and it appears in the list', async ({ page }) => {
    await page.getByRole('button', { name: /new|add|create/i }).click();

    await page.getByLabel(/amount/i).fill('150');
    await page.getByLabel(/description/i).fill('Supermarket');
    await page.getByLabel(/category/i).fill('Food');
    await page.getByLabel(/date/i).fill('2025-01-15');
    await page.getByLabel(/type/i).selectOption('expense');
    await page.getByRole('button', { name: /save|submit|confirm/i }).click();

    await expect(page.getByText('Supermarket')).toBeVisible();
    await expect(page.getByText('150')).toBeVisible();
  });

  test('edits a transaction and the list reflects the update', async ({ page }) => {
    // Create one first
    await page.getByRole('button', { name: /new|add|create/i }).click();
    await page.getByLabel(/amount/i).fill('100');
    await page.getByLabel(/description/i).fill('Coffee');
    await page.getByLabel(/date/i).fill('2025-01-15');
    await page.getByLabel(/type/i).selectOption('expense');
    await page.getByRole('button', { name: /save|submit|confirm/i }).click();
    await expect(page.getByText('Coffee')).toBeVisible();

    // Edit it
    await page.getByRole('row', { name: /coffee/i }).getByRole('button', { name: /edit/i }).click();
    await page.getByLabel(/amount/i).fill('250');
    await page.getByRole('button', { name: /save|submit|confirm/i }).click();

    await expect(page.getByText('250')).toBeVisible();
    await expect(page.getByText('100')).not.toBeVisible();
  });

  test('deletes a transaction after confirmation', async ({ page }) => {
    // Create one first
    await page.getByRole('button', { name: /new|add|create/i }).click();
    await page.getByLabel(/amount/i).fill('75');
    await page.getByLabel(/description/i).fill('Bus pass');
    await page.getByLabel(/date/i).fill('2025-01-15');
    await page.getByLabel(/type/i).selectOption('expense');
    await page.getByRole('button', { name: /save|submit|confirm/i }).click();
    await expect(page.getByText('Bus pass')).toBeVisible();

    // Delete it
    await page.getByRole('row', { name: /bus pass/i }).getByRole('button', { name: /delete/i }).click();
    await page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    await expect(page.getByText('Bus pass')).not.toBeVisible();
  });

  test('filters by type shows only matching transactions', async ({ page }) => {
    // Create an income and an expense
    for (const [desc, type, amount] of [['Salary', 'income', '5000'], ['Rent', 'expense', '1200']]) {
      await page.getByRole('button', { name: /new|add|create/i }).click();
      await page.getByLabel(/amount/i).fill(amount);
      await page.getByLabel(/description/i).fill(desc);
      await page.getByLabel(/date/i).fill('2025-01-15');
      await page.getByLabel(/type/i).selectOption(type);
      await page.getByRole('button', { name: /save|submit|confirm/i }).click();
      await expect(page.getByText(desc)).toBeVisible();
    }

    // Filter to income only
    await page.getByRole('combobox', { name: /type|filter/i }).selectOption('income');

    await expect(page.getByText('Salary')).toBeVisible();
    await expect(page.getByText('Rent')).not.toBeVisible();
  });
});
