// Declarative follow-ups: if a result matches the predicate, append the step.
// Mirrors the WORKFLOWS.md decision trees from the snippet catalogue.
export const RULES = [
  {
    when: (r) => r.id === "LCP" && r.status === "ok" && r.value > 2500,
    append: { id: "LCP-Subparts", path: "CoreWebVitals/LCP-Subparts" },
    reason: "LCP > 2.5s — drilling into sub-parts",
  },
];

export function nextSteps(results) {
  const followUps = [];
  for (const result of results) {
    for (const rule of RULES) {
      if (rule.when(result)) followUps.push({ ...rule.append, reason: rule.reason });
    }
  }
  return followUps;
}
