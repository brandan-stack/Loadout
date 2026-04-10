const { test, expect, devices } = require('playwright/test');

const BASE_URL = process.env.LOADOUT_QA_BASE_URL || 'http://127.0.0.1:3000';
const EMAIL = process.env.LOADOUT_QA_EMAIL;
const PASSWORD = process.env.LOADOUT_QA_PASSWORD;

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set LOADOUT_QA_EMAIL and LOADOUT_QA_PASSWORD before running dashboard QA.');
  }
});

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Stock pressure is');
  await expect(page.getByText('Priority Queue').first()).toBeVisible();
}

test('desktop dashboard', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const page = await context.newPage();
  await login(page);
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true });
  await context.close();
});

test('mobile dashboard', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await login(page);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
  await context.close();
});
