// codegen.ts — generates tools/types.ts from the JSON-Schemas in schema/.
//
// Run via `npm run codegen`. Output is committed; consumers depending on the
// types don't run codegen themselves. Re-run when a schema changes.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compile } from "json-schema-to-typescript";

async function main() {
  const schemaDir = "schema";
  const out: string[] = [
    "// AUTO-GENERATED from schema/*.schema.json — do not edit by hand.",
    "// Regenerate via `npm run codegen`.",
    "",
  ];

  const files = readdirSync(schemaDir).filter((f) => f.endsWith(".schema.json")).sort();
  for (const file of files) {
    const schema = JSON.parse(readFileSync(path.join(schemaDir, file), "utf8"));
    const typeName = pascal(file.replace(".schema.json", ""));
    const ts = await compile(schema, typeName, {
      bannerComment: "",
      additionalProperties: false,
      strictIndexSignatures: true,
    });
    out.push(ts.trim());
    out.push("");
  }

  writeFileSync("tools/types.ts", out.join("\n"));
  console.log(`codegen: wrote tools/types.ts (${files.length} schemas)`);
}

function pascal(s: string): string {
  return s.replace(/(^|[-_])(.)/g, (_m, _, ch) => ch.toUpperCase());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
