import { expect, Page, test } from "@playwright/test";

async function resetAppData(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
}

async function signInAsAdmin(page: Page) {
  await page.goto("/");

  const adminCard = page.getByRole("button", { name: /Admin/i }).first();
  await adminCard.click();

  await page.getByPlaceholder(/password \/ PIN/i).fill("1234");
  await page.getByRole("button", { name: /Enter Site/i }).click();

  await expect(page.getByPlaceholder(/password \/ PIN/i)).not.toBeVisible();
  await expect(page.getByText("Loadout")).toBeVisible();
}

async function openTab(page: Page, name: "Inventory" | "Parts Used" | "Dashboard" | "Settings") {
  const mobileMenuToggle = page.locator(".appMobileNavToggle").first();
  if (await mobileMenuToggle.isVisible()) {
    if (!(await page.locator("#mobile-main-nav.open").isVisible())) {
      await mobileMenuToggle.click();
    }
    await page.locator("#mobile-main-nav").getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
    return;
  }

  await page.locator(".appDesktopNav").getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
}

async function addInventoryItem(page: Page, input: { name: string; partNo: string; qty: string; unitPrice?: string }) {
  await openTab(page, "Inventory");

  await page.getByRole("button", { name: /Add inventory item/i }).click();
  await page.getByLabel("Name").fill(input.name);
  await page.getByLabel("Part #").fill(input.partNo);
  await page.getByLabel("Initial qty").fill(input.qty);

  if (input.unitPrice !== undefined) {
    await page.getByLabel("Unit price").fill(input.unitPrice);
  }

  await page.getByRole("button", { name: /^Add item$/i }).click();
  await expect(page.getByText(/Item added\./i)).toBeVisible();
}

async function setPartsUsedQuantity(page: Page, itemName: string, qty: string) {
  const fullPickerQtyInput = page.getByPlaceholder(/Quantity for selected part/i);
  if (await fullPickerQtyInput.isVisible()) {
    await fullPickerQtyInput.fill(qty);
    return;
  }

  await page.getByLabel(`Quantity for ${itemName}`).first().fill(qty);
}

test.describe("Loadout critical flows", () => {
  test.beforeEach(async ({ page }) => {
    await resetAppData(page);
    await signInAsAdmin(page);
  });

  test("Parts Used requires job number before final log", async ({ page }) => {
    const itemName = `E2E No Cost ${Date.now()}`;
    const partNo = `E2E-NC-${Date.now()}`;

    await addInventoryItem(page, { name: itemName, partNo, qty: "2" });

    await openTab(page, "Parts Used");
    await page.getByPlaceholder(/Search item/i).fill(partNo);

    await page.locator(`.dashboardItemRow:has-text("${itemName}")`).getByRole("button", { name: /Select Part/i }).click();
    await setPartsUsedQuantity(page, itemName, "1");
    await page.getByRole("button", { name: /Add Selected Part \+ Quantity/i }).click();

    await expect(page.getByText(/Required before final log: Job Number/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Log Parts Used \(Final Step\)/i })).toBeDisabled();

    await page.getByPlaceholder(/Job Number \(required\)/i).fill(`JOB-${Date.now()}`);
    await expect(page.getByText(/All required fields valid\. Ready to log parts\./i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Log Parts Used \(Final Step\)/i })).toBeEnabled();
  });

  test("Mark as read + undo works and billed items appear in Dashboard", async ({ page }) => {
    const stamp = Date.now();
    const itemName = `E2E Bill ${stamp}`;
    const partNo = `E2E-B-${stamp}`;
    const jobNumber = `JOB-${stamp}`;

    await addInventoryItem(page, { name: itemName, partNo, qty: "3", unitPrice: "25" });

    await openTab(page, "Parts Used");
    await page.getByPlaceholder(/Job Number \(required\)/i).fill(jobNumber);
    await page.getByPlaceholder(/Search item/i).fill(partNo);

    await page.locator(`.dashboardItemRow:has-text("${itemName}")`).getByRole("button", { name: /Select Part/i }).click();
    await setPartsUsedQuantity(page, itemName, "2");

    await page.locator('select:has(option:text-is("Admin"))').first().selectOption({ label: "Admin" });

    await page.getByRole("button", { name: /Add Selected Part \+ Quantity/i }).click();
    await expect(page.getByText(/All required fields valid\. Ready to log parts\./i)).toBeVisible();

    await page.getByRole("button", { name: /Log Parts Used \(Final Step\)/i }).click();
    await expect(page.getByText(/Logged 1 part line/i)).toBeVisible();

    const notificationsCard = page.locator(".dashboardCard", { hasText: "My Billing Notifications" });
    await expect(notificationsCard).toBeVisible();

    await notificationsCard.getByRole("button", { name: /Mark as read/i }).first().click();
    await notificationsCard.getByRole("button", { name: /^Undo$/i }).first().click();
    await expect(notificationsCard.getByText("Unread").first()).toBeVisible();

    await notificationsCard.getByRole("button", { name: /Mark as read/i }).first().click();

    await openTab(page, "Dashboard");
    const billingCard = page.locator(".dashboardCard", { hasText: "Billing" });
    await expect(billingCard).toBeVisible();

    await billingCard.getByRole("button", { name: /Billed/i }).click();
    await expect(billingCard.getByText(new RegExp(`Job Number: ${jobNumber}`))).toBeVisible();
    await expect(billingCard.getByText(/Line Cost:\s*\$/i)).toBeVisible();

    await billingCard.getByRole("button", { name: /^Undo$/i }).first().click();
    await billingCard.getByRole("button", { name: /Unread/i }).click();
    await expect(billingCard.getByText(new RegExp(`Job Number: ${jobNumber}`))).toBeVisible();
  });

  test("Mobile sync panel opens and Retry Sync is usable", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This verification is mobile-specific.");

    const syncToggle = page.getByRole("button", { name: /Open sync status details/i }).first();
    await expect(syncToggle).toBeVisible();
    await expect(page.locator(".appMobileNavToggle")).toBeVisible();

    await syncToggle.click();

    const syncPanel = page.locator(".appSyncPanel");
    await expect(syncPanel).toBeVisible();
    await expect(syncPanel.getByText("Sync Status")).toBeVisible();
    await expect(syncPanel.getByText(/State:\s*(Connected|Connecting|Error|Disabled)/i)).toBeVisible();
    await expect(syncPanel.getByRole("button", { name: /Retry Sync/i })).toBeVisible();

    await syncPanel.getByRole("button", { name: /Retry Sync/i }).click();
    await expect(syncPanel).toBeVisible();

    await syncPanel.getByRole("button", { name: /^Close$/i }).click();
    await expect(syncPanel).not.toBeVisible();

    await openTab(page, "Inventory");
    await expect(page.getByRole("button", { name: /Add inventory item/i })).toBeVisible();
  });
});
