import { expect, type Page } from '@playwright/test';

let counter = 0;

export function makeEmail(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now()}-${counter}@example.test`;
}

export async function signup(page: Page, email: string, password = 'super-secret-password') {
  await page.goto('/signup');
  await page.getByLabel(/Your name/).fill(email.split('@')[0]!);
  await page.getByLabel(/Email/).fill(email);
  await page.getByLabel(/Password/).fill(password);
  await page.getByRole('button', { name: /Sign up/ }).click();
  await page.waitForURL(/\/signin\?signedUp=1/);
}

export async function signin(page: Page, email: string, password = 'super-secret-password') {
  await page.goto('/signin');
  // The password section's email field is the first one.
  await page.locator('section').filter({ hasText: 'Email + password' }).getByLabel('Email').fill(email);
  await page.locator('section').filter({ hasText: 'Email + password' }).getByLabel('Password').fill(password);
  await page.locator('section').filter({ hasText: 'Email + password' }).getByRole('button', { name: /Sign in/ }).click();
  await page.waitForURL('/');
  await expect(page.getByRole('heading', { name: 'AURA' })).toBeVisible();
}
