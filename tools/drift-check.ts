// drift-check.ts — consumer-side guardrail library.
//
// Reads a consumer's `registry-consumed.yaml` manifest, fetches the cited
// registry values, and asserts every claim still matches. CI failure
// messages are human-readable per spec §Persona affordances.

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

export type ManifestCheck = { registryPath: string; expected: unknown };
export type Mismatch = { check: ManifestCheck; actual: unknown; message: string };
export type DriftCheckResult = { ok: boolean; mismatches: Mismatch[] };

export async function driftCheck(args: {
  manifestPath: string;
  registryRoot: string;
}): Promise<DriftCheckResult> {
  const manifest = parseYaml(readFileSync(args.manifestPath, "utf8")) as { checks: ManifestCheck[] };
  const mismatches: Mismatch[] = [];

  for (const check of manifest.checks) {
    const [filePart, jsonPath] = check.registryPath.split("#");
    const data = JSON.parse(readFileSync(path.join(args.registryRoot, filePart), "utf8"));
    const actual = resolveJsonPath(data, jsonPath ?? "");

    if (!eq(actual, check.expected)) {
      mismatches.push({
        check,
        actual,
        message:
          `${check.registryPath} — expected ${JSON.stringify(check.expected)}, ` +
          `got ${JSON.stringify(actual)}. Suggestion: update the local hardcoded ` +
          `value, sync the registry, or mark the call site ` +
          `\`registry-exempt: <reason>\`.`,
      });
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}

// Minimal JSONPath subset:
//   foo.bar              — dot path
//   [?key=='value']      — array filter (returns first match)
//   foo[?k=='v'].field   — combined
function resolveJsonPath(data: unknown, expr: string): unknown {
  if (expr === "") return data;
  const tokens = tokenize(expr);
  let cur: unknown = data;
  for (const t of tokens) {
    if (cur == null) return cur;
    if (t.kind === "key") {
      cur = (cur as Record<string, unknown>)[t.name];
    } else {
      if (!Array.isArray(cur)) return undefined;
      const found = cur.find((item) => {
        const v = (item as Record<string, unknown>)[t.field];
        return v === t.value;
      });
      cur = found;
    }
  }
  return cur;
}

type Tok =
  | { kind: "key"; name: string }
  | { kind: "filter"; field: string; value: string };

function tokenize(expr: string): Tok[] {
  const tokens: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    if (expr[i] === ".") { i++; continue; }
    if (expr[i] === "[") {
      const end = expr.indexOf("]", i);
      const inner = expr.slice(i + 1, end);
      const m = /^\?(\w+)=='([^']*)'$/.exec(inner);
      if (!m) throw new Error(`drift-check: unsupported filter syntax: ${inner}`);
      tokens.push({ kind: "filter", field: m[1], value: m[2] });
      i = end + 1;
      continue;
    }
    let j = i;
    while (j < expr.length && expr[j] !== "." && expr[j] !== "[") j++;
    tokens.push({ kind: "key", name: expr.slice(i, j) });
    i = j;
  }
  return tokens;
}

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}
