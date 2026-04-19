import { test, expect, type Page } from '@playwright/test';
import { loginAs, resetDB } from '../fixtures/auth';

test.describe.serial('income sources', () => {
  test.beforeEach(async ({ page }) => {
    await resetDB(page);
    await loginAs(page);
    await page.goto('/income');
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Opens the "New Income Source" modal and waits for it to be visible. */
  async function openNewForm(page: Page) {
    await page.getByRole('button', { name: /new source/i }).click();
    await expect(page.getByTestId('income-source-form')).toBeVisible();
  }

  /** Fills the income source form fields. */
  async function fillSourceForm(page: Page, opts: {
    name: string;
    category?: string;
    amount?: string;
    isJoint?: boolean;
  }) {
    await page.getByLabel('Name').fill(opts.name);
    if (opts.category) {
      await page.getByLabel('Category').selectOption(opts.category);
    }
    if (opts.amount) {
      await page.getByLabel(/expected monthly amount/i).fill(opts.amount);
    }
    if (opts.isJoint) {
      await page.getByLabel(/goes to joint account/i).check();
    }
  }

  /**
   * Clicks the submit button and waits for the form to close.
   * Uses the dedicated btn-submit-source testid to avoid ambiguity.
   */
  async function submitSourceForm(page: Page) {
    await page.getByTestId('btn-submit-source').click();
    await expect(page.getByTestId('income-source-form')).not.toBeVisible();
  }

  /** Shorthand: open form, fill, submit. */
  async function createSource(page: Page, opts: {
    name: string;
    category?: string;
    amount?: string;
    isJoint?: boolean;
  }) {
    await openNewForm(page);
    await fillSourceForm(page, opts);
    await submitSourceForm(page);
  }

  /**
   * Returns the source card for the given name.
   * Cards have data-testid="source-card"; we use .nth(index) when a name
   * appears more than once so callers can be explicit about which card.
   */
  function getSourceCard(page: Page, name: string, index = 0) {
    return page
      .getByTestId('source-card')
      .filter({ hasText: name })
      .nth(index);
  }

  // ── Tests ──────────────────────────────────────────────────────────────────

  test('creates a personal income source and it appears in the list', async ({ page }) => {
    await createSource(page, { name: 'Monthly Salary', category: 'Salary', amount: '5000' });

    const card = getSourceCard(page, 'Monthly Salary');
    await expect(card).toBeVisible();
    await expect(card.getByText(/5\.000/)).toBeVisible();
  });

  test('two sources with the same name appear as separate cards', async ({ page }) => {
    await createSource(page, { name: 'Bonus', amount: '1000' });
    await createSource(page, { name: 'Bonus', amount: '2000' });

    await expect(page.getByTestId('source-card').filter({ hasText: 'Bonus' })).toHaveCount(2);
    await expect(getSourceCard(page, 'Bonus', 0).getByText(/1\.000/)).toBeVisible();
    await expect(getSourceCard(page, 'Bonus', 1).getByText(/2\.000/)).toBeVisible();
  });

  test('creates a joint income source and it appears in the joint section', async ({ page }) => {
    await createSource(page, { name: 'Rental Income', category: 'Rental', amount: '2000', isJoint: true });

    await expect(page.getByTestId('section-joint').getByText('Rental Income')).toBeVisible();
    await expect(page.getByTestId('section-personal').filter({ hasText: 'Rental Income' })).toHaveCount(0);
  });

  test('personal source does not appear in the joint section', async ({ page }) => {
    await createSource(page, { name: 'My Salary', amount: '3000', isJoint: false });

    await expect(page.getByTestId('section-personal').getByText('My Salary')).toBeVisible();
    await expect(page.getByTestId('section-joint')).toHaveCount(0);
  });

  test('edits an income source and the list reflects the update', async ({ page }) => {
    await createSource(page, { name: 'Freelance', amount: '1000' });
    await expect(getSourceCard(page, 'Freelance')).toBeVisible();

    await getSourceCard(page, 'Freelance').getByTestId('btn-edit-source').click();
    await expect(page.getByTestId('income-source-form')).toBeVisible();

    await page.getByLabel('Name').fill('Freelance Design');
    await page.getByLabel(/expected monthly amount/i).fill('1500');
    await submitSourceForm(page);

    const updatedCard = getSourceCard(page, 'Freelance Design');
    await expect(updatedCard).toBeVisible();
    await expect(updatedCard.getByText(/1\.500/)).toBeVisible();
    await expect(page.getByTestId('source-card').filter({ hasText: 'Freelance' }).filter({ hasText: /1\.000/ })).toHaveCount(0);
  });

  test('deletes an income source after confirmation', async ({ page }) => {
    await createSource(page, { name: 'Side Project' });
    await expect(getSourceCard(page, 'Side Project')).toBeVisible();

    await getSourceCard(page, 'Side Project').getByTestId('btn-delete-source').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /delete/i }).click();

    await expect(page.getByTestId('source-card').filter({ hasText: 'Side Project' })).toHaveCount(0);
  });

  test('records a monthly entry via the drawer', async ({ page }) => {
    await createSource(page, { name: 'Salary', amount: '4000' });

    await getSourceCard(page, 'Salary').getByTestId('btn-record-entry').click();
    await expect(page.getByTestId('record-entry-drawer')).toBeVisible();

    await page.getByLabel(/received amount/i).fill('3800');
    await page.getByLabel(/date received/i).fill('2025-01-28');
    await page.getByTestId('btn-submit-entry').click();

    await expect(page.getByTestId('record-entry-drawer')).not.toBeVisible();
  });

  test('re-opening entry drawer pre-fills previously recorded values', async ({ page }) => {
    await createSource(page, { name: 'Consulting', amount: '3000' });

    // Record first entry
    await getSourceCard(page, 'Consulting').getByTestId('btn-record-entry').click();
    await expect(page.getByTestId('record-entry-drawer')).toBeVisible();
    await page.getByLabel(/received amount/i).fill('2900');
    await page.getByLabel(/notes/i).fill('Partial payment');
    await page.getByTestId('btn-submit-entry').click();
    await expect(page.getByTestId('record-entry-drawer')).not.toBeVisible();

    // Re-open same month — values should be pre-filled from the upsert
    await getSourceCard(page, 'Consulting').getByTestId('btn-record-entry').click();
    await expect(page.getByTestId('record-entry-drawer')).toBeVisible();
    await expect(page.getByLabel(/received amount/i)).toHaveValue('2900');
    await expect(page.getByLabel(/notes/i)).toHaveValue('Partial payment');
  });

  test('personal and joint sources appear in separate sections', async ({ page }) => {
    await createSource(page, { name: 'My Salary', isJoint: false });
    await createSource(page, { name: 'Shared Rent', isJoint: true });

    await expect(page.getByTestId('section-personal').getByText('My Salary')).toBeVisible();
    await expect(page.getByTestId('section-joint').getByText('Shared Rent')).toBeVisible();

    // Cross-check: each name appears only in its own section
    await expect(page.getByTestId('section-personal').filter({ hasText: 'Shared Rent' })).toHaveCount(0);
    await expect(page.getByTestId('section-joint').filter({ hasText: 'My Salary' })).toHaveCount(0);
  });
});
