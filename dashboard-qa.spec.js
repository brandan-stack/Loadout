const { test, expect, devices } = require('playwright/test');

function resolveBaseUrl() {
  const explicitBaseUrl = process.env.LOADOUT_QA_BASE_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, '');
  }

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl.replace(/\/$/, '');
  }

  const port = process.env.PORT || process.env.npm_config_port;
  if (port) {
    return `http://127.0.0.1:${port}`;
  }

  return 'http://127.0.0.1:3004';
}

const BASE_URL = resolveBaseUrl();
const EMAIL = process.env.LOADOUT_QA_EMAIL;
const PASSWORD = process.env.LOADOUT_QA_PASSWORD;

test.beforeAll(() => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set LOADOUT_QA_EMAIL and LOADOUT_QA_PASSWORD before running workspace QA.');
  }
});

test.describe.configure({ timeout: 120000 });

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Work Queue' })).toBeVisible();
}

async function getAccess(page) {
  return page.evaluate(async () => {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    return response.json();
  });
}

async function getSettings(page, canViewSettings) {
  if (!canViewSettings) {
    return null;
  }

  return page.evaluate(async () => {
    const response = await fetch('/api/settings', { credentials: 'include' });
    if (!response.ok) {
      return null;
    }
    return response.json();
  });
}

async function gotoWorkspace(page, path, title) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

async function assertOpenPanelFitsViewport(page) {
  const panel = page.locator('aside[aria-hidden="false"]').first();
  await expect(panel).toBeVisible();
  await page.waitForTimeout(350);

  const viewport = page.viewportSize();
  expect(viewport).toBeTruthy();

  await expect
    .poll(async () => {
      const box = await panel.boundingBox();
      if (!box) {
        return null;
      }

      return {
        left: Math.round(box.x),
        top: Math.round(box.y),
        right: Math.round(box.x + box.width),
        bottom: Math.round(box.y + box.height),
      };
    }, { timeout: 2000 })
    .toEqual({
      left: expect.any(Number),
      top: expect.any(Number),
      right: expect.any(Number),
      bottom: expect.any(Number),
    });

  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box ? Math.round(box.x) : -1;
  }, { timeout: 2000 }).toBeGreaterThanOrEqual(0);

  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box ? Math.round(box.y) : -1;
  }, { timeout: 2000 }).toBeGreaterThanOrEqual(0);

  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box ? Math.round(box.x + box.width) : Number.POSITIVE_INFINITY;
  }, { timeout: 2000 }).toBeLessThanOrEqual(viewport.width + 1);

  await expect.poll(async () => {
    const box = await panel.boundingBox();
    return box ? Math.round(box.y + box.height) : Number.POSITIVE_INFINITY;
  }, { timeout: 2000 }).toBeLessThanOrEqual(viewport.height + 1);
}

async function closePanel(page) {
  const closeButton = page.getByRole('button', { name: 'Close panel' });
  if (await closeButton.isVisible()) {
    await closeButton.click();
  }
}

async function takeShot(page, name) {
  await page.screenshot({ path: `test-results/${name}.png`, fullPage: true });
}

async function maybeOpenFirst(page, role, name) {
  const target = page.getByRole(role, { name }).first();
  if (await target.count()) {
    await target.click();
    return true;
  }
  return false;
}

async function runWorkspaceChecks(page, mode) {
  await login(page);
  await takeShot(page, `dashboard-${mode}`);

  const access = await getAccess(page);
  const settings = await getSettings(page, Boolean(access.canViewSettings));

  if (access.canViewJobs) {
    await test.step(`jobs ${mode}`, async () => {
      await gotoWorkspace(page, '/jobs', 'Keep work orders moving');
      await expect(page.getByRole('button', { name: /Open job folder/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Completed job folder/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Invoiced job folder/i })).toBeVisible();

      if (await page.getByRole('button', { name: 'New job' }).isVisible()) {
        await page.getByRole('button', { name: 'New job' }).click();
        await expect(page.getByRole('heading', { level: 2, name: 'Create a new job' })).toBeVisible();
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      if (await maybeOpenFirst(page, 'button', 'View summary')) {
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      await takeShot(page, `jobs-${mode}`);
    });
  }

  if (access.canViewInventory) {
    await test.step(`inventory ${mode}`, async () => {
      await gotoWorkspace(page, '/items', 'Move stock with job context');

      if (await page.getByRole('button', { name: 'Add item' }).isVisible()) {
        await page.getByRole('button', { name: 'Add item' }).click();
        await expect(page.getByRole('heading', { level: 2, name: 'Add inventory item' })).toBeVisible();
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      if (await maybeOpenFirst(page, 'button', 'Open')) {
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      if (await maybeOpenFirst(page, 'button', 'Use on job')) {
        await expect(page.getByRole('heading', { level: 2, name: /Move .*|Inventory movement/ })).toBeVisible();
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      await takeShot(page, `inventory-${mode}`);
    });
  }

  if (access.canViewSuppliers) {
    await test.step(`suppliers ${mode}`, async () => {
      await gotoWorkspace(page, '/suppliers', 'Keep supplier decisions clean and fast');

      await page.getByRole('button', { name: 'Add supplier' }).click();
      await expect(page.getByRole('heading', { level: 2, name: 'Add supplier' })).toBeVisible();
      await assertOpenPanelFitsViewport(page);
      await closePanel(page);

      if (await maybeOpenFirst(page, 'button', 'Edit')) {
        await expect(page.getByRole('heading', { level: 2, name: 'Edit supplier' })).toBeVisible();
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      await takeShot(page, `suppliers-${mode}`);
    });
  }

  if (access.canViewTools && settings?.enableToolsModule) {
    await test.step(`tools ${mode}`, async () => {
      await gotoWorkspace(page, '/tools', 'Track private tools and shared assets separately');

      const addMyTool = page.getByRole('button', { name: 'Add my tool' });
      if (await addMyTool.isVisible()) {
        await addMyTool.click();
        await expect(page.getByRole('heading', { level: 2, name: /Add personal tool|Edit personal tool/ })).toBeVisible();
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      const addCompanyTool = page.getByRole('button', { name: 'Add company tool' });
      if (await addCompanyTool.isVisible()) {
        await addCompanyTool.click();
        await expect(page.getByRole('heading', { level: 2, name: /Add company tool|Edit company tool/ })).toBeVisible();
        await assertOpenPanelFitsViewport(page);
        await closePanel(page);
      }

      await takeShot(page, `tools-${mode}`);
    });
  }

  if (access.canViewSettings) {
    await test.step(`settings ${mode}`, async () => {
      await gotoWorkspace(page, '/settings', 'Tune the platform, not the brand');
      await expect(page.getByText('How To Use Loadout')).toBeVisible();
      await expect(page.getByText('1. Run jobs from the Jobs folder')).toBeVisible();
      await expect(page.getByText('2. Use inventory from Inventory')).toBeVisible();
      await takeShot(page, `settings-${mode}`);
    });
  }
}

test('desktop workspace surfaces', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Desktop Chrome'] });
  const page = await context.newPage();
  await runWorkspaceChecks(page, 'desktop');
  await context.close();
});

test('mobile workspace surfaces', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await runWorkspaceChecks(page, 'mobile');
  await context.close();
});
