import { Page } from '@playwright/test';

export const TEST_USERS = {
  admin: {
    email: process.env.TEST_USER_EMAIL ?? 'marcio@home.local',
    password: process.env.TEST_USER_PASSWORD ?? 'password',
  },
  member: {
    email: process.env.TEST_USER2_EMAIL ?? 'wife@home.local',
    password: process.env.TEST_USER2_PASSWORD ?? 'password',
  },
};

export async function loginAs(page: Page, user: keyof typeof TEST_USERS = 'admin') {
  const { email, password } = TEST_USERS[user];
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));
}

export async function resetDB(page: Page) {
  const apiBase = process.env.API_URL ?? 'http://localhost:8080';
  const res = await page.request.post(`${apiBase}/api/v1/test/reset`);
  if (!res.ok()) {
    throw new Error(`DB reset failed: ${res.status()} ${await res.text()}`);
  }
}
