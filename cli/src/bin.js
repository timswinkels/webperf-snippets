#!/usr/bin/env node
import { parseArgs } from "node:util";
import { loadSnippet } from "./load-snippet.js";
import { runSnippets } from "./runner.js";
import { cwvWorkflow } from "./workflows/cwv.js";
import { nextSteps } from "./decision-tree.js";
import { reportHuman } from "./reporters/human.js";
import { reportJson } from "./reporters/json.js";

const WORKFLOWS = {
  "core-web-vitals": cwvWorkflow,
};

const SNIPPET_ALIASES = {
  LCP: "CoreWebVitals/LCP",
  CLS: "CoreWebVitals/CLS",
  "LCP-Sub-Parts": "CoreWebVitals/LCP-Sub-Parts",
};

const USAGE = `webperf-snippets <url> [options]

Run curated WebPerf Snippets headlessly via Playwright.

Options:
  --workflow <name>     Workflow to run (default: core-web-vitals)
  --snippet <name>      Run a single snippet (e.g. LCP, CLS, or Category/Name)
  --json                Output JSON instead of formatted text
  --wait <ms>           Post-load wait before evaluating (default: 3000)
  --budget-lcp <ms>     Exit 1 if LCP exceeds this value
  --budget-cls <score>  Exit 1 if CLS exceeds this value
  --headed              Show the browser window (debug)
  -h, --help            Show this help

Examples:
  npx webperf-snippets https://web.dev
  npx webperf-snippets https://example.com --json
  npx webperf-snippets https://example.com --snippet LCP-Sub-Parts
  npx webperf-snippets https://example.com --budget-lcp 2500
`;

function fail(message, code = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function resolveSnippetPath(name) {
  return SNIPPET_ALIASES[name] ?? name;
}

function buildItems(values) {
  if (values.snippet) {
    const path = resolveSnippetPath(values.snippet);
    return [{ id: values.snippet, path, source: loadSnippet(path) }];
  }
  const workflowName = values.workflow ?? "core-web-vitals";
  const workflow = WORKFLOWS[workflowName];
  if (!workflow) fail(`Unknown workflow: ${workflowName}`);
  return workflow.steps.map((step) => ({
    id: step.id,
    path: step.path,
    source: loadSnippet(step.path),
  }));
}

function checkBudgets(results, values) {
  const violations = [];
  const lcpBudget = values["budget-lcp"] ? Number(values["budget-lcp"]) : null;
  const clsBudget = values["budget-cls"] ? Number(values["budget-cls"]) : null;

  for (const r of results) {
    if (r.status !== "ok") continue;
    if (r.metric === "LCP" && lcpBudget != null && r.value > lcpBudget) {
      violations.push(`LCP ${r.value}ms exceeds budget ${lcpBudget}ms`);
    }
    if (r.metric === "CLS" && clsBudget != null && r.value > clsBudget) {
      violations.push(`CLS ${r.value} exceeds budget ${clsBudget}`);
    }
  }
  return violations;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      options: {
        workflow: { type: "string" },
        snippet: { type: "string" },
        json: { type: "boolean" },
        wait: { type: "string" },
        "budget-lcp": { type: "string" },
        "budget-cls": { type: "string" },
        headed: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
      allowPositionals: true,
    });
  } catch (err) {
    fail(err.message);
  }

  const { values, positionals } = parsed;

  if (values.help) {
    process.stdout.write(USAGE);
    return;
  }

  const url = positionals[0];
  if (!url) {
    process.stdout.write(USAGE);
    process.exit(2);
  }

  const items = buildItems(values);
  const waitMs = values.wait ? Number(values.wait) : 3000;

  const initial = await runSnippets({
    url,
    items,
    waitMs,
    headless: !values.headed,
  });

  // Apply decision tree to spawn follow-up steps.
  const followUps = nextSteps(initial.results);
  let followUpRun = { results: [], pageErrors: [] };
  if (followUps.length > 0) {
    const followItems = followUps.map((f) => ({
      id: f.id,
      path: f.path,
      source: loadSnippet(f.path),
      reason: f.reason,
    }));
    // v0.1 limitation: follow-ups re-navigate. Acceptable for now; consolidate
    // into a single page session in v0.2 if perf becomes a problem.
    followUpRun = await runSnippets({
      url,
      items: followItems,
      waitMs,
      headless: !values.headed,
    });
    // Carry forward the human-readable reason so reporters can show it.
    followUpRun.results = followUpRun.results.map((r) => {
      const f = followUps.find((x) => x.id === r.id);
      return f ? { ...r, reason: f.reason } : r;
    });
  }

  const payload = {
    url,
    navMs: initial.navMs,
    results: [...initial.results, ...followUpRun.results],
    pageErrors: [...initial.pageErrors, ...(followUpRun.pageErrors ?? [])],
  };

  const output = values.json ? reportJson(payload) : reportHuman(payload);
  process.stdout.write(output + "\n");

  // Exit codes.
  const violations = checkBudgets(payload.results, values);
  if (violations.length > 0) {
    if (!values.json) {
      for (const v of violations) process.stderr.write(`Budget violation: ${v}\n`);
    }
    process.exit(1);
  }

  const anyError = payload.results.some((r) => r.status === "error");
  process.exit(anyError ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`Error: ${err.stack ?? err.message}\n`);
  process.exit(1);
});
