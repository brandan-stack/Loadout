const { chromium, devices, request } = require("playwright");

async function run() {
  const baseURL = "http://127.0.0.1:3000";
  const email = "responsive.qa.fixed2@example.com";
  const password = "TestPass1";

  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-forwarded-for": "198.51.100.12",
    },
  });

  const login = await api.post("/api/auth/login", {
    data: { email, password },
  });
  console.log("login status", login.status());

  const storageState = await api.storageState();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL,
    storageState,
    ...devices["iPhone SE"],
  });
  const page = await context.newPage();

  await page.goto("/jobs", { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForLoadState("networkidle").catch(() => {});

  const before = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="mobile-nav-more-menu"]');
    const menu = document.querySelector("#mobile-nav-more-menu");
    return {
      hasTrigger: Boolean(trigger),
      expanded: trigger?.getAttribute("aria-expanded") ?? null,
      hasMenu: Boolean(menu),
      triggerText: trigger?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    };
  });
  console.log("before", JSON.stringify(before, null, 2));

  const trigger = page.locator('button[aria-controls="mobile-nav-more-menu"]');
  await trigger.click({ force: true });
  await page.waitForTimeout(750);

  const after = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="mobile-nav-more-menu"]');
    const menu = document.querySelector("#mobile-nav-more-menu");
    const rect = menu ? menu.getBoundingClientRect() : null;
    return {
      expanded: trigger?.getAttribute("aria-expanded") ?? null,
      hasMenu: Boolean(menu),
      menuDisplay: menu ? getComputedStyle(menu).display : null,
      menuVisibility: menu ? getComputedStyle(menu).visibility : null,
      menuOpacity: menu ? getComputedStyle(menu).opacity : null,
      rect,
      menuText: menu?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    };
  });
  console.log("after", JSON.stringify(after, null, 2));

  await page.screenshot({ path: ".tmp/responsive-qa-output/debug-more-menu.png", fullPage: true });
  await browser.close();
  await api.dispose();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});