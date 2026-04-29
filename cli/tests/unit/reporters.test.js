import { describe, it, expect } from "vitest";
import { reportJson } from "../../src/reporters/json.js";
import { reportHuman } from "../../src/reporters/human.js";

const samplePayload = {
  url: "https://example.com",
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
    expect(parsed.url).toBe("https://example.com");
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
    expect(output).toContain("https://example.com");
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
});
