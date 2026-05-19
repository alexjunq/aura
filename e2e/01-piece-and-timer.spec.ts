import { expect, test } from '@playwright/test';
import { makeEmail, signin, signup } from './helpers';

test('signup → create piece → start/stop timer → add material → finish', async ({ page }) => {
  const email = makeEmail('e2e-1');
  await signup(page, email);
  await signin(page, email);

  // First add a material with a price so we can attach it to the piece.
  await page.goto('/materials');
  await page.getByLabel('Name').fill('Sterling silver');
  await page.getByLabel('Unit').fill('g');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('link', { name: 'Sterling silver' })).toBeVisible();

  await page.getByRole('link', { name: 'Sterling silver' }).click();
  await page.getByLabel('Price / unit').fill('1.50');
  await page.getByRole('button', { name: 'Record price' }).click();
  await expect(page.getByText('1.5').first()).toBeVisible();

  // Create a piece.
  await page.goto('/pieces/new');
  await page.getByLabel('Title').fill('Test ring');
  await page.getByRole('button', { name: 'Create piece' }).click();
  await expect(page).toHaveURL(/\/pieces\/.+/);

  // Start the timer, wait a moment, stop it.
  await page.getByRole('button', { name: 'Start timer' }).click();
  await expect(page.getByText(/Timer running on/)).toBeVisible();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Stop timer' }).click();
  await expect(page.getByRole('button', { name: 'Start timer' })).toBeVisible();

  // Add the material.
  await page.getByLabel(/Quantity/).fill('5');
  await page.getByRole('button', { name: 'Add material' }).click();
  await expect(page.getByText('Sterling silver (g)')).toBeVisible();

  // Finish: transition to in_studio.
  await page.getByRole('button', { name: '→ in_studio' }).click();
  await expect(page.getByText(/Status: in_studio/)).toBeVisible();
});
