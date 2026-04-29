// Declarative follow-ups: if a result matches the predicate, append the step.
// Mirrors the WORKFLOWS.md decision trees from the snippet catalogue.
const RULES = [
  {
    when: (r) => r.id === "LCP" && r.status === "ok" && r.value > 2500,
    append: { id: "LCP-Sub-Parts", path: "CoreWebVitals/LCP-Sub-Parts" },
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
