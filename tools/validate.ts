// validate.ts — walks the entire registry and validates every JSON file
// against its schema. Exits 1 with human-readable errors if anything fails.

import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemas = {
  chain: load("schema/chain.schema.json"),
  contracts: load("schema/contracts.schema.json"),
  tokens: load("schema/tokens.schema.json"),
  asset: load("schema/asset.schema.json"),
  bridge: load("schema/bridge.schema.json"),
  oracle: load("schema/oracle.schema.json"),
  endpoints: load("schema/endpoints.schema.json"),
  operationalLimits: load("schema/operationalLimits.schema.json"),
  protocol: load("schema/protocol.schema.json"),
  programs: load("schema/programs.schema.json"),
};

type Failure = { file: string; errors: string };
const failures: Failure[] = [];
let passed = 0;

// chains/<id-slug>/<file>.json
if (existsSync("chains")) {
  for (const slug of readdirSync("chains")) {
    const dir = path.join("chains", slug);
    if (!statSync(dir).isDirectory()) continue;
    for (const [filename, schemaKey] of [
      ["chain.json",             "chain"],
      ["contracts.json",         "contracts"],
      ["tokens.json",            "tokens"],
      ["bridge.json",            "bridge"],
      ["oracle.json",            "oracle"],
      ["endpoints.json",         "endpoints"],
      ["operationalLimits.json", "operationalLimits"],
    ] as const) {
      const fp = path.join(dir, filename);
      if (existsSync(fp)) check(fp, schemas[schemaKey]);
    }
  }
}

// assets/<symbol>.json
if (existsSync("assets")) {
  for (const f of readdirSync("assets")) {
    if (f.endsWith(".json")) check(path.join("assets", f), schemas.asset);
  }
}

// protocols/{cctp,wormhole}.json
if (existsSync("protocols")) {
  for (const f of readdirSync("protocols")) {
    if (f.endsWith(".json")) check(path.join("protocols", f), schemas.protocol);
  }
}

// solana/programs/{mainnet,devnet}.json
if (existsSync("solana/programs")) {
  for (const f of readdirSync("solana/programs")) {
    if (f.endsWith(".json")) check(path.join("solana/programs", f), schemas.programs);
  }
}

if (failures.length > 0) {
  console.error(`\n✗ Validation failed (${failures.length} file${failures.length === 1 ? "" : "s"}):\n`);
  for (const f of failures) {
    console.error(`  ${f.file}`);
    console.error(`    ${f.errors}\n`);
  }
  process.exit(1);
}
console.log(`✓ Validation passed (${passed} file${passed === 1 ? "" : "s"})`);

// ─────────────────────────────────────────────────────────────────────────────

function load(p: string): object {
  return JSON.parse(readFileSync(p, "utf8"));
}

function check(filePath: string, schema: object): void {
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  const validate = ajv.compile(schema);
  const ok = validate(data);
  if (!ok) {
    const msg = (validate.errors ?? []).map((e) => {
      const where = e.instancePath || "(root)";
      return `${where}: ${e.message}${e.params ? " " + JSON.stringify(e.params) : ""}`;
    }).join("\n    ");
    failures.push({ file: filePath, errors: msg || "(no Ajv error detail)" });
  } else {
    passed++;
  }
}
