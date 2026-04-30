import { describe, it, expect } from "vitest";
import { nextSteps } from "../../src/decision-tree.js";

describe("nextSteps", () => {
  it("returns empty array when no rules match", () => {
    const results = [{ id: "LCP", status: "ok", value: 1200 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("appends LCP-Subparts when LCP > 2500ms", () => {
    const results = [{ id: "LCP", status: "ok", value: 3000 }];
    const steps = nextSteps(results);
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe("LCP-Subparts");
    expect(steps[0].path).toBe("CoreWebVitals/LCP-Subparts");
    expect(steps[0].reason).toMatch(/LCP > 2\.5s/);
  });

  it("does not append LCP-Subparts when LCP === 2500ms (boundary)", () => {
    const results = [{ id: "LCP", status: "ok", value: 2500 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("does not append LCP-Subparts when LCP status is error", () => {
    const results = [{ id: "LCP", status: "error", value: 3000 }];
    expect(nextSteps(results)).toEqual([]);
  });

  it("handles empty results", () => {
    expect(nextSteps([])).toEqual([]);
  });
});
