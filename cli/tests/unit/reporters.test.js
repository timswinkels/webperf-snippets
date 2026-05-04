import { describe, it, expect } from "vitest";
import { reportJson } from "../../src/reporters/json.js";
import { reportHuman } from "../../src/reporters/human.js";

const samplePayload = {
  url: "https://web.dev",
  navMs: 850,
  results: [
    { id: "LCP", status: "ok", metric: "LCP", value: 1200, unit: "ms", rating: "good" },
    { id: "CLS", status: "ok", metric: "CLS", value: 0, unit: "score", rating: "good" },
  ],
  pageErrors: [],
};

describe("reportJson", () => {
  it("returns valid JSON", () => {
    const output = reportJson(samplePayload);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("includes url, navMs, and results", () => {
    const parsed = JSON.parse(reportJson(samplePayload));
    expect(parsed.url).toBe("https://web.dev");
    expect(parsed.navMs).toBe(850);
    expect(parsed.results).toHaveLength(2);
  });

  it("preserves result fields", () => {
    const parsed = JSON.parse(reportJson(samplePayload));
    expect(parsed.results[0]).toMatchObject({
      id: "LCP",
      status: "ok",
      metric: "LCP",
      value: 1200,
      unit: "ms",
      rating: "good",
    });
  });
});

describe("reportHuman", () => {
  it("includes the URL in the output", () => {
    const output = reportHuman(samplePayload);
    expect(output).toContain("https://web.dev");
  });

  it("includes metric IDs", () => {
    const output = reportHuman(samplePayload);
    expect(output).toContain("LCP");
    expect(output).toContain("CLS");
  });

  it("reports error results", () => {
    const payload = {
      ...samplePayload,
      results: [{ id: "LCP", status: "error", error: "No LCP entries buffered" }],
    };
    const output = reportHuman(payload);
    expect(output).toContain("No LCP entries buffered");
  });

  it("reports page errors section when present", () => {
    const payload = { ...samplePayload, pageErrors: ["TypeError: x is not defined"] };
    const output = reportHuman(payload);
    expect(output).toContain("TypeError: x is not defined");
  });

  it("renders fonts snippet result with counts and issues", () => {
    const payload = {
      url: "https://web.dev",
      navMs: 500,
      results: [
        {
          id: "fonts",
          script: "Fonts-Preloaded-Loaded-and-used-above-the-fold",
          status: "ok",
          count: 2,
          details: { preloadedCount: 1, loadedCount: 2, usedAboveFoldCount: 2, preloadedNotUsedCount: 1, usedNotPreloadedCount: 0 },
          items: [],
          issues: [{ severity: "warning", message: "Preloaded but not used above fold: font.woff2" }],
        },
      ],
      pageErrors: [],
    };
    const output = reportHuman(payload);
    expect(output).toContain("preloaded: 1");
    expect(output).toContain("loaded: 2");
    expect(output).toContain("Preloaded but not used above fold: font.woff2");
  });

  it("renders fonts snippet result with no issues as optimized", () => {
    const payload = {
      url: "https://web.dev",
      navMs: 500,
      results: [
        {
          id: "Fonts-Preloaded-Loaded-and-used-above-the-fold",
          script: "Fonts-Preloaded-Loaded-and-used-above-the-fold",
          status: "ok",
          count: 1,
          details: { preloadedCount: 1, loadedCount: 1, usedAboveFoldCount: 1, preloadedNotUsedCount: 0, usedNotPreloadedCount: 0 },
          items: [],
          issues: [],
        },
      ],
      pageErrors: [],
    };
    const output = reportHuman(payload);
    expect(output).toContain("Font loading looks optimized");
  });

  it("renders audit result with no issues as passing", () => {
    const payload = {
      url: "https://web.dev",
      navMs: 500,
      results: [
        {
          id: "render-blocking",
          script: "Find-render-blocking-resources",
          status: "ok",
          count: 0,
          details: { totalBlockingUntilMs: 0, totalSizeBytes: 0, byType: {} },
          items: [],
          issues: [],
        },
      ],
      pageErrors: [],
    };
    const output = reportHuman(payload);
    expect(output).toContain("render-blocking");
    expect(output).toContain("No issues");
  });

  it("renders audit result with error issues showing the message", () => {
    const payload = {
      url: "https://web.dev",
      navMs: 500,
      results: [
        {
          id: "lazy-conflict",
          script: "Find-Images-With-Lazy-and-Fetchpriority",
          status: "ok",
          count: 2,
          items: [],
          issues: [{ severity: "error", message: "2 element(s) have conflicting loading=\"lazy\" and fetchpriority=\"high\"" }],
        },
      ],
      pageErrors: [],
    };
    const output = reportHuman(payload);
    expect(output).toContain("lazy-conflict");
    expect(output).toContain("2 element(s) have conflicting");
  });

  it("renders audit result with warning issues", () => {
    const payload = {
      url: "https://web.dev",
      navMs: 500,
      results: [
        {
          id: "eager-below-fold",
          script: "Find-non-Lazy-Loaded-Images-outside-of-the-viewport",
          status: "ok",
          count: 5,
          items: [],
          issues: [{ severity: "warning", message: "5 image(s) outside the viewport are missing loading=\"lazy\"" }],
        },
      ],
      pageErrors: [],
    };
    const output = reportHuman(payload);
    expect(output).toContain("eager-below-fold");
    expect(output).toContain("5 image(s) outside the viewport");
  });
});
