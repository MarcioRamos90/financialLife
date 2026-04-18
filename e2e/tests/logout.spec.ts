import { test, expect } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await resetDB(page);
});

test('logs out and redirects to /login', async ({ page }) => {
  await loginAs(page);
  await page.getByRole('button', { name: /sign out|logout|log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('cannot access protected route after logout', async ({ page }) => {
  await loginAs(page);
  await page.getByRole('button', { name: /sign out|logout|log out/i }).click();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});
