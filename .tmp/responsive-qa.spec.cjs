const fs = require("node:fs");
const path = require("node:path");
const { chromium, devices, request } = require("playwright");

const baseURL = "http://127.0.0.1:3000";
const outputDir = path.join(process.cwd(), ".tmp", "responsive-qa-output");
const screenshotsDir = path.join(outputDir, "screenshots");

const viewports = [
  {
    name: "iphone-se",
    use: {
      ...devices["iPhone SE"],
    },
  },
  {
    name: "galaxy-s8-plus",
    use: {
      ...devices["Galaxy S8+"],
    },
  },
  {
    name: "iphone-14",
    use: {
      ...devices["iPhone 14"],
    },
  },
  {
    name: "pixel-7",
    use: {
      ...devices["Pixel 7"],
    },
  },
  {
    name: "ipad-mini",
    use: {
      ...devices["iPad Mini"],
    },
  },
  {
    name: "desktop-1366",
    use: {
      viewport: { width: 1366, height: 768 },
      screen: { width: 1366, height: 768 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
];

const routes = [
  { path: "/", slug: "home" },
  { path: "/jobs", slug: "jobs" },
  { path: "/items", slug: "items" },
  { path: "/reports", slug: "reports" },
  { path: "/suppliers", slug: "suppliers" },
  { path: "/reorder", slug: "reorder" },
  { path: "/settings", slug: "settings" },
  { path: "/admin/users", slug: "admin-users" },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  fs.mkdirSync(screenshotsDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const email = `responsive.qa.${Date.now()}@example.com`;
  const password = "TestPass1";
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      "x-forwarded-for": "198.51.100.10",
    },
  });

  const registerResponse = await api.post("/api/auth/register", {
    data: {
      organizationName: "Responsive QA Org",
      name: "Responsive QA",
      email,
      password,
    },
  });
  assert(registerResponse.ok(), `Register failed with status ${registerResponse.status()}`);

  const loginResponse = await api.post("/api/auth/login", {
    data: { email, password },
  });
  assert(loginResponse.ok(), `Login failed with status ${loginResponse.status()}`);

  const storageState = await api.storageState();
  const summary = {
    generatedAt: new Date().toISOString(),
    baseURL,
    email,
    routes,
    viewports: [],
  };

  for (const viewport of viewports) {
    const context = await browser.newContext({
      baseURL,
      storageState,
      ...viewport.use,
    });
    const page = await context.newPage();
    const viewportResult = {
      device: viewport.name,
      viewport: page.viewportSize(),
      mobile: Boolean(viewport.use.isMobile),
      routes: [],
    };

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const diagnostics = await page.evaluate(() => {
        const mobileNav = document.querySelector(".mobile-bottom-nav");
        const desktopNav = document.querySelector('nav[aria-label="Main navigation"]');
        const body = document.body;
        const doc = document.documentElement;
        const mobileLabels = Array.from(document.querySelectorAll(".mobile-bottom-nav-label"));
        const wrappedLabels = mobileLabels.filter((label) => {
          const element = label;
          return element.scrollWidth - element.clientWidth > 1 || element.clientHeight > 14;
        }).length;

        return {
          pathname: window.location.pathname,
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: doc.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
          horizontalOverflow: Math.max(doc.scrollWidth - window.innerWidth, body.scrollWidth - window.innerWidth, 0),
          mobileNavVisible: mobileNav ? getComputedStyle(mobileNav).display !== "none" : false,
          desktopNavVisible: desktopNav ? getComputedStyle(desktopNav).display !== "none" : false,
          wrappedLabels,
        };
      });

      const screenshotPath = path.join(screenshotsDir, `${viewport.name}-${route.slug}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });

      viewportResult.routes.push({
        route: route.path,
        screenshot: path.relative(outputDir, screenshotPath),
        ...diagnostics,
      });
    }

    const moreTrigger = page.locator('button[aria-controls="mobile-nav-more-menu"]');
    const hasMobileMoreMenu = await moreTrigger.isVisible().catch(() => false);

    if (hasMobileMoreMenu) {
      await page.goto("/jobs", { waitUntil: "domcontentloaded" });
      await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
      await page.waitForLoadState("networkidle").catch(() => {});

      const jobsMoreTrigger = page.locator('button[aria-controls="mobile-nav-more-menu"]');
      let expanded = await jobsMoreTrigger.getAttribute("aria-expanded");
      for (let attempt = 0; attempt < 6 && expanded !== "true"; attempt += 1) {
        await jobsMoreTrigger.click({ force: true });
        await page.waitForTimeout(250);
        expanded = await jobsMoreTrigger.getAttribute("aria-expanded");
      }
      assert(expanded === "true", `More menu did not open for ${viewport.name}`);

      const moreMenu = await page.evaluate(() => {
        const menu = document.querySelector("#mobile-nav-more-menu");
        const texts = menu
          ? Array.from(menu.querySelectorAll("a")).map((link) => link.textContent?.replace(/\s+/g, " ").trim())
          : [];
        return {
          visible: Boolean(menu),
          items: texts,
        };
      });
      assert(moreMenu.visible, `More menu DOM did not render for ${viewport.name}`);

      const menuScreenshotPath = path.join(screenshotsDir, `${viewport.name}-more-menu.png`);
      await page.screenshot({ path: menuScreenshotPath, fullPage: true });
      viewportResult.moreMenu = {
        ...moreMenu,
        screenshot: path.relative(outputDir, menuScreenshotPath),
      };
    } else {
      viewportResult.moreMenu = {
        visible: false,
        items: [],
        skippedReason: "Desktop header rendered for this viewport",
      };
    }

    summary.viewports.push(viewportResult);
    await context.close();
  }

  fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
  await api.dispose();
  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});