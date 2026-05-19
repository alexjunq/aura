import { expect, test } from '@playwright/test';
import { makeEmail, signin, signup } from './helpers';

test('reports renders + CSV download serves text/csv', async ({ page }) => {
  const email = makeEmail('e2e-3');
  await signup(page, email);
  await signin(page, email);

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  // With no data, revenue should say "No sales".
  await expect(page.getByText('No sales in this range.')).toBeVisible();

  // Fetch the CSV endpoint directly via the page's fetch (carries the session cookie).
  const res = await page.request.get('/api/v1/reports/revenue?groupBy=month&format=csv');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toMatch(/csv/);
});
