import { chromium } from "playwright";

export const VIEWPORT_PRESETS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

const DEFAULT_NAV_TIMEOUT = 30000;

// Snippets are IIFEs. Playwright evaluates a string as an expression, so we
// trim trailing semicolons to keep the IIFE call as a single expression and
// recover its return value in Node.
function toExpression(source) {
  return source.trim().replace(/;\s*$/, "");
}

export async function runSnippets({
  url,
  items,
  waitMs = 3000,
  headless = true,
  viewport = VIEWPORT_PRESETS.mobile,
  navTimeout = DEFAULT_NAV_TIMEOUT,
}) {
  const browser = await chromium.launch({ headless });
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    const navStart = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: navTimeout });
    if (waitMs > 0) await page.waitForTimeout(waitMs);
    const navMs = Date.now() - navStart;

    const results = [];
    for (const item of items) {
      try {
        const result = await page.evaluate(toExpression(item.source));
        if (result && typeof result === "object") {
          results.push({ id: item.id, ...result });
        } else {
          results.push({
            id: item.id,
            status: "error",
            error: "Snippet did not return an object — check the IIFE return statement",
          });
        }
      } catch (err) {
        results.push({ id: item.id, status: "error", error: err.message });
      }
    }

    return { url, navMs, results, pageErrors };
  } finally {
    await browser.close();
  }
}
