import { styleText } from "node:util";

const RATING_ICON = {
  good: "🟢",
  "needs-improvement": "🟡",
  poor: "🔴",
};

const RATING_STYLE = {
  good: "green",
  "needs-improvement": "yellow",
  poor: "red",
};

function formatValue(value, unit) {
  if (unit === "ms") {
    return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value}ms`;
  }
  if (unit === "score") return value.toFixed(4);
  return String(value);
}

function paint(rating, text) {
  return styleText(RATING_STYLE[rating] ?? "white", text);
}

function pad(text, len) {
  const visibleLen = text.replace(/\[\d+m/g, "").length;
  return text + " ".repeat(Math.max(0, len - visibleLen));
}

function renderResult(r) {
  if (r.status === "error") {
    return `  ${styleText("red", "✗")} ${pad(r.id, 16)} ${styleText("dim", r.error)}`;
  }

  const icon = RATING_ICON[r.rating] ?? "·";
  const valueText = paint(r.rating, formatValue(r.value, r.unit));
  const ratingText = styleText("dim", r.rating ?? "");
  const detail = r.details?.element ? styleText("dim", r.details.element) : "";

  let out = `  ${icon} ${pad(r.id, 16)} ${pad(valueText, 10)} ${pad(ratingText, 20)} ${detail}`;

  if (r.details?.subParts) {
    const sp = r.details.subParts;
    const rows = [
      ["TTFB", sp.ttfb],
      ["Resource Load Delay", sp.resourceLoadDelay],
      ["Resource Load Time", sp.resourceLoadTime],
      ["Element Render Delay", sp.elementRenderDelay],
    ];
    out += "\n";
    out += rows
      .map(([name, info]) => {
        const status = info.overTarget ? styleText("red", "🔴") : styleText("green", "✓");
        return `       ${status} ${pad(name, 22)} ${pad(`${info.value}ms`, 8)} ${pad(`${info.percent}%`, 6)}`;
      })
      .join("\n");
    if (r.details.slowestPhase) {
      out += `\n       ${styleText("blue", "→ Slowest:")} ${r.details.slowestPhase}`;
    }
  }

  if (r.reason) {
    out += `\n     ${styleText("dim", `↳ ${r.reason}`)}`;
  }

  return out;
}

export function reportHuman({ url, navMs, results, pageErrors }) {
  const lines = [];
  lines.push(styleText(["bold"], `WebPerf Snippets — ${url}`));
  lines.push(styleText("dim", `Navigated in ${navMs}ms`));
  lines.push("");
  for (const r of results) lines.push(renderResult(r));
  if (pageErrors?.length) {
    lines.push("");
    lines.push(styleText("yellow", "Page errors during run:"));
    for (const err of pageErrors) lines.push(`  ${styleText("dim", err)}`);
  }
  return lines.join("\n");
}
