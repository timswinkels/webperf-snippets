import { chromium } from "playwright";

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const DEFAULT_NAV_TIMEOUT = 30000;

// Chrome does not expose largest-contentful-paint or layout-shift entries via
// performance.getEntriesByType — they are only delivered through observers.
// The snippets' synchronous return path assumes otherwise (works in
// long-lived consoles where entries leaked into the timeline). To make
// snippets work unmodified in headless, we capture entries via a pre-nav
// observer and shim getEntriesByType to return them.
const WARMUP_SCRIPT = `
(() => {
  window.__wps = { lcp: [], layoutShift: [] };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__wps.lcp.push(e);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__wps.layoutShift.push(e);
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}

  const orig = performance.getEntriesByType.bind(performance);
  performance.getEntriesByType = function (type) {
    if (type === "largest-contentful-paint") return window.__wps.lcp.slice();
    if (type === "layout-shift") return window.__wps.layoutShift.slice();
    return orig(type);
  };
})();
`;

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
  viewport = DEFAULT_VIEWPORT,
  navTimeout = DEFAULT_NAV_TIMEOUT,
}) {
  const browser = await chromium.launch({ headless });
  try {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(WARMUP_SCRIPT);
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
