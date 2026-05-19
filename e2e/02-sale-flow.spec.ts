import { expect, test } from '@playwright/test';
import { makeEmail, signin, signup } from './helpers';

test('add buyer + channel → record sale → piece flips to sold, buyer history populates', async ({ page }) => {
  const email = makeEmail('e2e-2');
  await signup(page, email);
  await signin(page, email);

  // Add a channel.
  await page.goto('/channels');
  await page.getByLabel('Name').fill('Test Channel');
  await page.getByLabel('Commission %').fill('10');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByText('Test Channel')).toBeVisible();

  // Add a buyer.
  await page.goto('/buyers');
  await page.getByLabel('Name').fill('Test Buyer');
  await page.getByLabel('Email').fill('buyer@example.test');
  await page.getByRole('button', { name: 'Add' }).click();
  await expect(page.getByRole('link', { name: 'Test Buyer' })).toBeVisible();

  // Add a piece (no materials needed for this flow).
  await page.goto('/pieces/new');
  await page.getByLabel('Title').fill('Sale piece');
  await page.getByRole('button', { name: 'Create piece' }).click();
  // Move to in_studio (sellable).
  await page.getByRole('button', { name: '→ in_studio' }).click();
  await expect(page.getByText(/Status: in_studio/)).toBeVisible();

  // Record the sale.
  await page.getByLabel('Sale price').fill('250');
  await page.getByRole('button', { name: 'Record sale' }).click();
  await expect(page.getByText(/Status: sold/)).toBeVisible();

  // Buyer detail shows the purchase.
  await page.goto('/buyers');
  await page.getByRole('link', { name: 'Test Buyer' }).click();
  await expect(page.getByRole('heading', { name: 'Purchases' })).toBeVisible();
  await expect(page.getByText('Sale piece')).toBeVisible();
  await expect(page.getByText('active', { exact: true })).toBeVisible();
});
