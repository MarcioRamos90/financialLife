import { test, expect } from '@playwright/test';
import { loginAs, resetDB, TEST_USERS } from '../fixtures/auth';

test.beforeEach(async ({ page }) => {
  await resetDB(page);
});

test('redirects unauthenticated users to /login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('shows login form', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
});

test('logs in with valid credentials and lands on dashboard', async ({ page }) => {
  await loginAs(page, 'admin');
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText(/marcio/i)).toBeVisible();
});

test('shows error for wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_USERS.admin.email);
  await page.getByLabel(/password/i).fill('wrongpassword');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await expect(page.getByText(/invalid|incorrect|wrong|error/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('shows error for unknown email', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('nobody@example.com');
  await page.getByLabel(/password/i).fill('password');
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await expect(page.getByText(/invalid|incorrect|wrong|error/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
