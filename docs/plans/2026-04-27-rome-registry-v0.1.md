# rome-registry v0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap `rome-protocol/registry` as a new top-level public GitHub repo with all schemas, tooling, CI, and Marcus seeded as the proving example. v0.1.0 ships a working registry validated against one real chain.

**Architecture:** Standalone public repo (sibling to `rome-protocol/rome-solidity`, `rome-protocol/rome-specs`). JSON-canonical with JSON-Schema validation via Ajv. NPM package `@rome-protocol/registry` auto-published on tag push. jsDelivr CDN serves raw GitHub URLs. CI runs schema + on-chain liveness checks per PR.

**Tech Stack:** TypeScript 5.x, Node 22, Ajv 8 (JSON-Schema validation), `json-schema-to-typescript` (type generation), GitHub Actions (CI + NPM publish), bs58 (Solana address validation), viem (EVM address checksumming).

**Spec:** [`rome-specs/active/technical/2026-04-27-rome-registry-design.md`](../active/technical/2026-04-27-rome-registry-design.md)

**Phase 2+:** Data sweep (v0.2), consumer migrations (Phase 3), discovery sweep (Phase 4) — out of scope for this plan, see spec §Migration plan.

---

## Task 1: Bootstrap repo + this plan

**Files:**
- Create: GitHub repo `rome-protocol/registry`
- Create: `README.md` (placeholder front-page)
- Create: `LICENSE` (MIT)
- Create: `.gitignore`
- Create: `package.json` (skeleton)
- Move: `rome-specs/plans/2026-04-27-rome-registry-v0.1.md` → `registry/docs/plans/2026-04-27-rome-registry-v0.1.md`

- [ ] **Step 1: Create the public repo**

```bash
gh repo create rome-protocol/registry --public \
  --description "Canonical chain, contract, and token metadata for the Rome Protocol ecosystem" \
  --homepage "https://github.com/rome-protocol/registry"
```

Expected: `https://github.com/rome-protocol/registry` exists, empty.

- [ ] **Step 2: Clone + create initial structure**

```bash
git clone git@github.com:rome-protocol/registry.git ~/rome/registry
cd ~/rome/registry
mkdir -p chains assets abis protocols solana/programs schema tools docs/plans .github/workflows
```

- [ ] **Step 3: Add `.gitignore`**

```bash
cat > .gitignore <<'EOF'
node_modules/
dist/
*.tsbuildinfo
.DS_Store
*.log
.env
.env.local
EOF
```

- [ ] **Step 4: Add `LICENSE` (MIT)**

```bash
curl -s https://raw.githubusercontent.com/licenses/license-templates/master/templates/mit.txt | \
  sed -e "s/{{ year }}/2026/" -e "s/{{ organization }}/Rome Protocol/" > LICENSE
```

- [ ] **Step 5: Add minimal `README.md`**

```markdown
# rome-registry

Canonical chain, contract, and token metadata for the Rome Protocol ecosystem.

**Status:** v0.1.0 (under bootstrap)

## What lives here

- `chains/<chain-id>-<slug>/` — per-chain metadata (chain.json, contracts.json, tokens.json, bridge.json, oracle.json, endpoints.json, operationalLimits.json, NOTES.md)
- `assets/` — cross-chain logical asset catalog (USDC, ETH, SOL — symbol, decimals, logoURI)
- `abis/` — contract ABIs, one file per `<name>@<version>.json`
- `protocols/` — bridge-protocol constants (CCTP domain ids, Wormhole chain ids)
- `solana/programs/` — Solana program IDs (mainnet, devnet)
- `schema/` — JSON-Schemas for every file shape
- `tools/` — CLI scaffolder + drift-check library

## How to consume

**Browser / runtime fetch (jsDelivr):**
\`\`\`js
const tokens = await fetch(
  "https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/chains/121226-marcus/tokens.json"
).then(r => r.json());
\`\`\`

**TypeScript / Node (NPM):**
\`\`\`ts
import { getChain, listTokens } from "@rome-protocol/registry";
const marcus = getChain(121226);
\`\`\`

## Spec

Design at [`rome-specs/active/technical/2026-04-27-rome-registry-design.md`](https://github.com/rome-protocol/rome-specs/blob/main/active/technical/2026-04-27-rome-registry-design.md).
```

- [ ] **Step 6: Skeleton `package.json`**

```json
{
  "name": "@rome-protocol/registry",
  "version": "0.1.0-pre",
  "description": "Canonical chain, contract, and token metadata for the Rome Protocol ecosystem",
  "license": "MIT",
  "repository": "github:rome-protocol/registry",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "chains", "assets", "abis", "protocols", "solana", "schema"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "validate": "node tools/validate.js",
    "drift-check": "node tools/drift-check.js",
    "add-chain": "node tools/add-chain.js"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "ajv": "^8.17.0",
    "ajv-formats": "^3.0.0",
    "bs58": "^6.0.0",
    "json-schema-to-typescript": "^15.0.0",
    "typescript": "^5.6.0",
    "viem": "^2.27.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 7: Move this plan into the new repo**

```bash
mv ~/rome/.worktrees/plan-rome-registry/rome-specs/plans/2026-04-27-rome-registry-v0.1.md \
   docs/plans/2026-04-27-rome-registry-v0.1.md
```

- [ ] **Step 8: Initial commit + push**

```bash
cd ~/rome/registry
git add -A
git commit -m "chore: bootstrap rome-registry v0.1.0-pre — README, LICENSE, plan"
git push -u origin main
```

Expected: empty repo now has 1 commit with README + LICENSE + plan + skeleton structure.

---

## Task 2: Governance files (CODEOWNERS, CHANGELOG, PR template, NOTES.md template)

**Files:**
- Create: `CODEOWNERS`
- Create: `CHANGELOG.md`
- Create: `.github/pull_request_template.md`
- Create: `docs/NOTES_TEMPLATE.md`

- [ ] **Step 1: `CODEOWNERS`**

```bash
cat > CODEOWNERS <<'EOF'
# CODEOWNERS — see spec §Permissions for rationale.
# Production-chain chain.json edits require two ops-team approvals.

chains/*/chain.json              @rome-protocol/ops-team
chains/*/contracts.json          @rome-protocol/protocol-team
chains/*/tokens.json             @rome-protocol/protocol-team @rome-protocol/community-leads
chains/*/bridge.json             @rome-protocol/protocol-team
chains/*/oracle.json             @rome-protocol/protocol-team
chains/*/endpoints.json          @rome-protocol/ops-team
chains/*/operationalLimits.json  @rome-protocol/ops-team
chains/*/NOTES.md                @rome-protocol/ops-team @rome-protocol/protocol-team
abis/                            @rome-protocol/protocol-team
assets/                          @rome-protocol/protocol-team @rome-protocol/community-leads
protocols/                       @rome-protocol/protocol-team
solana/                          @rome-protocol/protocol-team
schema/                          @rome-protocol/protocol-team @rome-protocol/ops-team
tools/                           @rome-protocol/protocol-team
docs/                            @rome-protocol/ops-team @rome-protocol/protocol-team
*                                @rome-protocol/protocol-team
EOF
```

- [ ] **Step 2: `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to the rome-registry project documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project follows [Semantic Versioning](https://semver.org/) per the spec's schema-evolution policy.

## [Unreleased]

## [0.1.0] — 2026-04-27

### Added
- Initial repo scaffold + JSON-Schemas + tooling.
- Marcus (chain id 121226) seeded as the proving example end-to-end.
- NPM package `@rome-protocol/registry@0.1.0`.
- jsDelivr distribution at `https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/`.
```

- [ ] **Step 3: PR template** — `/Users/anilkumar/rome/registry/.github/pull_request_template.md`

```markdown
## What this PR changes

<!-- 1-2 sentences. Why does this PR exist? -->

## Files touched (tick what applies)

- [ ] `chains/<id>/chain.json` — adding a chain or changing core identity
- [ ] `chains/<id>/contracts.json` — contract addition / version bump
- [ ] `chains/<id>/tokens.json` — token addition / address rotation
- [ ] `chains/<id>/bridge.json` — bridge wiring change
- [ ] `chains/<id>/oracle.json` — feed addition / removal
- [ ] `chains/<id>/endpoints.json` — off-chain endpoint change
- [ ] `chains/<id>/operationalLimits.json` — gas / CPI hint change
- [ ] `chains/<id>/NOTES.md` — context update
- [ ] `abis/<name>@<ver>.json` — new contract version
- [ ] `assets/<symbol>.json` — new logical asset
- [ ] `protocols/<name>.json` — bridge protocol constant
- [ ] `solana/programs/<network>.json` — Solana program ID change
- [ ] `schema/*.schema.json` — schema change (requires CHANGELOG entry + minor/major version bump)

## Pre-merge checks

- [ ] On-chain liveness verified for any new addresses
- [ ] `npm run validate` passes locally
- [ ] CHANGELOG.md updated if this changes published behavior
```

- [ ] **Step 4: NOTES.md template** — `/Users/anilkumar/rome/registry/docs/NOTES_TEMPLATE.md`

```markdown
# <Chain name> — <chain id>

## Deploy history
- <YYYY-MM-DD> — <event> (<commit / PR>)

## Why this exists
<1-3 sentences on what this chain is for and who runs it>

## Known caveats
- <gotcha 1>

## Contacts
- Ops: <team / channel>
- Protocol: <team / channel>
```

- [ ] **Step 5: Commit**

```bash
git add CODEOWNERS CHANGELOG.md .github/pull_request_template.md docs/NOTES_TEMPLATE.md
git commit -m "chore: governance — CODEOWNERS, CHANGELOG, PR template, NOTES template"
git push
```

---

## Task 3: TypeScript + dev tooling setup

**Files:**
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `tools/types.ts` (placeholder; populated in Task 7)

- [ ] **Step 1: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist",
    "resolveJsonModule": true,
    "lib": ["ES2022"]
  },
  "include": ["tools/**/*", "schema/**/*"]
}
```

- [ ] **Step 2: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tools/**/*.test.ts"],
    globals: false,
  },
});
```

- [ ] **Step 3: Install deps**

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` generated.

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json vitest.config.ts package-lock.json
git commit -m "chore: TypeScript + Vitest setup"
git push
```

---

## Task 4: JSON-Schemas — write all 10, with one fixture + one test each

The 10 schemas are isomorphic in structure (each has a JSON-Schema definition + a happy-path fixture + a vitest test that asserts the fixture passes Ajv validation). Write them in a single task with a step per schema; the pattern is repeated.

**Files:**
- Create: `schema/chain.schema.json`
- Create: `schema/contracts.schema.json`
- Create: `schema/tokens.schema.json`
- Create: `schema/asset.schema.json`
- Create: `schema/bridge.schema.json`
- Create: `schema/oracle.schema.json`
- Create: `schema/endpoints.schema.json`
- Create: `schema/operationalLimits.schema.json`
- Create: `schema/protocol.schema.json`
- Create: `schema/programs.schema.json`
- Create: `tools/schemas.test.ts`
- Create: `tools/fixtures/<schema>.fixture.json` × 10

- [ ] **Step 1: Failing test scaffold first**

`tools/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMAS = [
  "chain", "contracts", "tokens", "asset", "bridge",
  "oracle", "endpoints", "operationalLimits", "protocol", "programs",
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

describe("JSON-Schema validation", () => {
  for (const name of SCHEMAS) {
    it(`${name}: fixture passes its schema`, () => {
      const schema = JSON.parse(readFileSync(path.join("schema", `${name}.schema.json`), "utf8"));
      const fixture = JSON.parse(readFileSync(path.join("tools/fixtures", `${name}.fixture.json`), "utf8"));
      const validate = ajv.compile(schema);
      const ok = validate(fixture);
      if (!ok) console.error(name, "errors:", validate.errors);
      expect(ok).toBe(true);
    });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: 10 failing tests with "Cannot find file schema/chain.schema.json" or similar.

- [ ] **Step 3: Write `schema/chain.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/chain.schema.json",
  "title": "Rome chain — core identity",
  "type": "object",
  "required": ["chainId", "name", "network", "rpcUrl", "nativeCurrency", "status"],
  "additionalProperties": false,
  "properties": {
    "chainId":     { "type": "integer", "minimum": 1 },
    "name":        { "type": "string", "minLength": 1 },
    "network":     { "enum": ["mainnet", "testnet", "devnet", "local"] },
    "rpcUrl":      { "type": "string", "format": "uri" },
    "explorerUrl": { "type": "string", "format": "uri" },
    "nativeCurrency": {
      "type": "object",
      "required": ["name", "symbol", "decimals"],
      "additionalProperties": false,
      "properties": {
        "name":     { "type": "string" },
        "symbol":   { "type": "string" },
        "decimals": { "type": "integer", "minimum": 0, "maximum": 18 }
      }
    },
    "status": { "enum": ["live", "preparing", "retired"] }
  }
}
```

And the matching fixture `tools/fixtures/chain.fixture.json`:

```json
{
  "chainId": 121226,
  "name": "Rome Marcus",
  "network": "testnet",
  "rpcUrl": "https://marcus.devnet.romeprotocol.xyz/",
  "explorerUrl": "https://romescout-marcus.devnet.romeprotocol.xyz/",
  "nativeCurrency": { "name": "Rome Marcus", "symbol": "USDC", "decimals": 18 },
  "status": "live"
}
```

- [ ] **Step 4: Write `schema/contracts.schema.json` + fixture**

`schema/contracts.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/contracts.schema.json",
  "title": "Per-chain Solidity contract registry",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name", "versions"],
    "additionalProperties": false,
    "properties": {
      "name": { "type": "string" },
      "versions": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "object",
          "required": ["address", "version", "status", "deployedAt"],
          "additionalProperties": false,
          "properties": {
            "address":      { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "version":      { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
            "status":       { "enum": ["live", "deprecated", "retired"] },
            "deployedAt":   { "type": "string", "format": "date-time" },
            "deployTx":     { "type": "string" },
            "deprecatedAt": { "type": "string", "format": "date-time" },
            "replacedBy":   { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
            "abiPath":      { "type": "string", "pattern": "^abis/.+\\.json$" }
          }
        }
      }
    }
  }
}
```

`tools/fixtures/contracts.fixture.json`:

```json
[
  {
    "name": "RomeBridgePaymaster",
    "versions": [
      {
        "address": "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef",
        "version": "1.0.0",
        "status": "live",
        "deployedAt": "2026-03-13T00:00:00Z",
        "abiPath": "abis/RomeBridgePaymaster@1.0.0.json"
      }
    ]
  }
]
```

- [ ] **Step 5: Write `schema/tokens.schema.json` + fixture**

`schema/tokens.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/tokens.schema.json",
  "title": "Per-chain canonical token list",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["address", "symbol", "name", "decimals", "kind"],
    "additionalProperties": false,
    "properties": {
      "address":   { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
      "mintId":    { "type": "string" },
      "symbol":    { "type": "string" },
      "name":      { "type": "string" },
      "decimals":  { "type": "integer", "minimum": 0, "maximum": 18 },
      "kind":      { "enum": ["spl_wrapper", "gas", "erc20", "wormhole_wrapped"] },
      "assetRef":  { "type": "string" },
      "logoURI":   { "type": "string", "format": "uri" },
      "underlying": {
        "type": "object",
        "additionalProperties": false,
        "properties": {
          "chain": { "type": "string" },
          "asset": { "type": "string" }
        }
      },
      "factory":    { "type": "string" },
      "deployedAt": { "type": "string", "format": "date-time" },
      "deployTx":   { "type": "string" }
    }
  }
}
```

`tools/fixtures/tokens.fixture.json`:

```json
[
  {
    "address": "0x1f7dfaf9444d46fc10b4b4736d906da5caf46195",
    "mintId":  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "symbol":  "wUSDC",
    "name":    "Rome USDC",
    "decimals": 6,
    "kind":    "spl_wrapper",
    "assetRef": "usdc",
    "underlying": { "chain": "solana-devnet", "asset": "USDC" },
    "factory": "ERC20SPLFactory"
  }
]
```

- [ ] **Step 6: Write `schema/asset.schema.json` + fixture**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/asset.schema.json",
  "title": "Logical asset catalog entry",
  "type": "object",
  "required": ["symbol", "name", "decimals"],
  "additionalProperties": false,
  "properties": {
    "symbol":      { "type": "string" },
    "name":        { "type": "string" },
    "issuer":      { "type": "string" },
    "decimals":    { "type": "integer", "minimum": 0, "maximum": 18 },
    "logoURI":     { "type": "string", "format": "uri" },
    "description": { "type": "string" },
    "homepage":    { "type": "string", "format": "uri" },
    "tags":        { "type": "array", "items": { "type": "string" } }
  }
}
```

Fixture `tools/fixtures/asset.fixture.json`:

```json
{
  "symbol": "USDC",
  "name": "USD Coin",
  "issuer": "Circle",
  "decimals": 6,
  "logoURI": "https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/assets/usdc.svg",
  "description": "USD Coin issued by Circle, redeemable 1:1 against US dollars.",
  "homepage": "https://www.circle.com/usdc",
  "tags": ["stablecoin", "fiat-backed"]
}
```

- [ ] **Step 7: Write `schema/bridge.schema.json` + fixture**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/bridge.schema.json",
  "title": "Per-chain bridge wiring",
  "type": "object",
  "required": ["sourceEvm", "solana"],
  "additionalProperties": false,
  "properties": {
    "sourceEvm": {
      "type": "object",
      "required": ["chainId", "name", "usdc"],
      "additionalProperties": false,
      "properties": {
        "chainId":              { "type": "integer" },
        "name":                 { "type": "string" },
        "usdc":                 { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
        "cctpTokenMessenger":   { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
        "cctpMessageTransmitter": { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
        "wormholeTokenBridge":  { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" }
      }
    },
    "solana": {
      "type": "object",
      "required": ["usdcMint"],
      "additionalProperties": false,
      "properties": {
        "usdcMint":    { "type": "string" },
        "wethMint":    { "type": "string" },
        "wormholeChainIdRef": { "type": "string" },
        "cctpDomainRef":      { "type": "string" }
      }
    }
  }
}
```

Fixture matches Marcus's current bridge block.

- [ ] **Step 8: Write `schema/oracle.schema.json` + fixture**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/oracle.schema.json",
  "title": "Per-chain oracle gateway config",
  "type": "object",
  "required": ["factory", "feeds"],
  "additionalProperties": false,
  "properties": {
    "factory":             { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
    "defaultMaxStaleness": { "type": "integer", "minimum": 1, "maximum": 86400 },
    "feeds": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["address", "source"],
        "properties": {
          "address":  { "type": "string", "pattern": "^0x[a-fA-F0-9]{40}$" },
          "source":   { "enum": ["pyth", "switchboard"] },
          "underlyingAccount": { "type": "string" }
        }
      }
    }
  }
}
```

- [ ] **Step 9: Write `schema/endpoints.schema.json` + fixture**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/endpoints.schema.json",
  "title": "Per-chain off-chain endpoints",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "cctpIrisApiBase":     { "type": "string", "format": "uri" },
    "wormholeSpyEndpoint": { "type": "string", "format": "uri" },
    "wormholeRpc":         { "type": "string", "format": "uri" },
    "relayers": {
      "type": "object",
      "additionalProperties": { "type": "string", "format": "uri" }
    }
  }
}
```

- [ ] **Step 10: Write `schema/operationalLimits.schema.json` + fixture**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/operationalLimits.schema.json",
  "title": "Per-chain operational limits and known incidents",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "maxComputeUnitsPerTx":  { "type": "integer", "minimum": 1 },
    "maxCpiPerAtomicTx":     { "type": "integer", "minimum": 1 },
    "recommendedGasBudgets": {
      "type": "object",
      "additionalProperties": { "type": "integer", "minimum": 1 }
    },
    "knownIncidents": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "summary"],
        "properties": {
          "title":   { "type": "string" },
          "summary": { "type": "string" },
          "fixedAt": { "type": "string", "format": "date-time" },
          "link":    { "type": "string", "format": "uri" }
        }
      }
    }
  }
}
```

- [ ] **Step 11: Write `schema/protocol.schema.json` + `schema/programs.schema.json` + fixtures**

`schema/protocol.schema.json` (CCTP / Wormhole):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/protocol.schema.json",
  "title": "Cross-chain bridge protocol constants",
  "type": "object",
  "required": ["protocol", "domains"],
  "additionalProperties": false,
  "properties": {
    "protocol": { "enum": ["cctp", "wormhole"] },
    "domains": {
      "type": "object",
      "description": "Map of source chain identifier (e.g. 'sepolia', 'solana-devnet', 'eth-mainnet') to integer domain or chain id used by this protocol.",
      "additionalProperties": { "type": "integer" }
    }
  }
}
```

`schema/programs.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://rome-protocol.github.io/registry/schema/programs.schema.json",
  "title": "Solana program IDs (per-network)",
  "type": "object",
  "required": ["splToken", "associatedToken", "systemProgram"],
  "additionalProperties": false,
  "properties": {
    "splToken":        { "type": "string" },
    "associatedToken": { "type": "string" },
    "systemProgram":   { "type": "string" },
    "wormholeCore":        { "type": "string" },
    "wormholeTokenBridge": { "type": "string" },
    "cctpMessageTransmitter": { "type": "string" },
    "cctpTokenMessenger":     { "type": "string" }
  }
}
```

- [ ] **Step 12: Run all tests — they should pass now**

```bash
npm test
```

Expected: 10 passing tests. If any fail, fix the schema or fixture and re-run.

- [ ] **Step 13: Commit**

```bash
git add schema/ tools/schemas.test.ts tools/fixtures/
git commit -m "feat: JSON-Schemas + fixtures for all 10 file shapes"
git push
```

---

## Task 5: `tools/drift-check.ts` — consumer-side guardrail library

**Files:**
- Create: `tools/drift-check.ts`
- Create: `tools/drift-check.test.ts`

The library exports a function `driftCheck(manifestPath, registryRoot)` that reads a consumer's `registry-consumed.yaml`, fetches the referenced registry values, and asserts every claim matches. CI calls it.

- [ ] **Step 1: Test first**

```ts
// tools/drift-check.test.ts
import { describe, it, expect } from "vitest";
import { driftCheck } from "./drift-check.js";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("drift-check", () => {
  it("passes when manifest claim matches registry value", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "registry-"));
    mkdirSync(path.join(root, "chains/121226-marcus"), { recursive: true });
    writeFileSync(path.join(root, "chains/121226-marcus/contracts.json"), JSON.stringify([
      { name: "RomeBridgePaymaster", versions: [{ address: "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef", version: "1.0.0", status: "live", deployedAt: "2026-03-13T00:00:00Z" }] },
    ]));

    const manifest = path.join(root, "manifest.yaml");
    writeFileSync(manifest, `
checks:
  - registryPath: chains/121226-marcus/contracts.json#RomeBridgePaymaster.versions[?status=='live'].address
    expected: "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef"
`);

    const result = await driftCheck({ manifestPath: manifest, registryRoot: root });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it("reports mismatch with file:line + expected/actual + suggestion", async () => {
    // ... similar setup, manifest claims wrong address
    // assert result.ok === false, result.mismatches[0].message contains "expected", "got", and suggestion
  });
});
```

- [ ] **Step 2: Run — fails (no drift-check yet)**

- [ ] **Step 3: Implement `tools/drift-check.ts`**

```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

type ManifestCheck = { registryPath: string; expected: string };
type Mismatch = { check: ManifestCheck; actual: unknown; message: string };
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
    const actual = resolveJsonPath(data, jsonPath);

    if (actual !== check.expected) {
      mismatches.push({
        check, actual,
        message:
          `${check.registryPath} — expected ${JSON.stringify(check.expected)}, ` +
          `got ${JSON.stringify(actual)}. Suggestion: update the local hardcoded value, ` +
          `sync the registry, or mark the call site \`registry-exempt: <reason>\`.`,
      });
    }
  }

  return { ok: mismatches.length === 0, mismatches };
}

function resolveJsonPath(data: unknown, expr: string): unknown {
  // minimal subset: dot path + array filter [?status=='live']
  // (full impl in actual file)
}
```

- [ ] **Step 4: Run — passes**

- [ ] **Step 5: Commit**

```bash
git add tools/drift-check.ts tools/drift-check.test.ts package.json package-lock.json
git commit -m "feat(tools): drift-check library for consumer CI guardrail"
git push
```

---

## Task 6: `tools/add-chain.ts` — CLI scaffolder (registration Path B)

**Files:**
- Create: `tools/add-chain.ts`
- Create: `tools/add-chain.test.ts`

Two modes:
- **Fresh mode** (`--deployments-from <path>`): reads a rome-solidity `deployments/<network>.json` and scaffolds a brand-new chain entry from scratch.
- **Rotation mode** (`--copy-from <prev-slug>`): clones an existing chain folder for a new chainId, wipes the addresses that change at rotation, preserves the parts that don't, marks the old chain `retired`, and back-links via `previousChainId`. Solves the Marcus-rotation case where 70-80% of `chains/<id>/` content is identical to the previous Marcus.

**Rotation-mode logic — what carries vs what wipes:**

| Field | Action |
|---|---|
| `chain.json` chainId / name / rpcUrl | wipe → set from CLI flags |
| `chain.json` network / nativeCurrency | preserve |
| `contracts.json` `versions[].address`, `deployedAt`, `deployTx` | wipe → read from `--deployments-from` |
| `contracts.json` `versions[].version`, `abiPath` | preserve (contract version often same) |
| `tokens.json` `address` | wipe → read from `--deployments-from` |
| `tokens.json` `mintId`, `symbol`, `name`, `decimals`, `kind`, `assetRef`, `underlying` | preserve (Solana mints don't rotate) |
| `bridge.json` `sourceEvm` block | preserve (Sepolia / Eth-mainnet didn't change) |
| `bridge.json` `solana.usdcMint`, `wethMint`, `wormholeChainIdRef`, `cctpDomainRef` | preserve |
| `oracle.json` `factory`, `feeds[].address` | wipe → read from `--deployments-from` |
| `oracle.json` `defaultMaxStaleness`, `feeds[].source`, `feeds[].underlyingAccount` | preserve |
| `endpoints.json` | preserve verbatim (Circle IRIS, Wormhole RPCs are stable) |
| `operationalLimits.json` | preserve verbatim (Rome-EVM-wide invariants) |
| `NOTES.md` | reset to template; old NOTES preserved at the retired chain |
| Old chain's `chain.json` `status` | flip to `retired` |
| New chain's `chain.json` | new field `previousChainId: <old-id>` for traceability |

- [ ] **Step 1: Test fresh mode** — mock a `deployments/marcus.json`-shaped input, run scaffolder with `--deployments-from`, assert it created `chains/<id>-<slug>/{chain,contracts,tokens,bridge,oracle,endpoints,operationalLimits,NOTES.md}` with extracted values + reasonable defaults.

- [ ] **Step 2: Test rotation mode** — seed a fake `chains/121226-marcus/` in a tmp registry root; run scaffolder with `--copy-from 121226-marcus --new-id 121227 --new-name "Rome Marcus 2" --new-rpc https://... --deployments-from <new artifact>`. Assert: new folder exists, `chain.json` has new id/name/rpc, `contracts.json` addresses replaced, `tokens.json` addresses replaced but `mintId`/`assetRef` preserved, `bridge.json` source-chain block + Solana mints unchanged, `endpoints.json` + `operationalLimits.json` byte-identical, old chain's `chain.json` flipped to `status: retired`, new chain has `previousChainId: 121226`.

- [ ] **Step 3: Implement** — argparse via `node:util.parseArgs`; route on presence of `--copy-from` vs `--deployments-from`; for rotation mode, walk the source folder via the carry/wipe table above; print next-step instructions ("Run `git checkout -b rotate-<slug>` and open a PR").

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**

```bash
git add tools/add-chain.ts tools/add-chain.test.ts
git commit -m "feat(tools): add-chain CLI scaffolder — fresh + rotation modes (Path B)"
git push
```

---

## Task 7: NPM package getter API + type generation

**Files:**
- Create: `tools/index.ts` (public API)
- Create: `tools/types.ts` (generated)
- Create: `tools/codegen.ts` (runs json-schema-to-typescript)
- Modify: `package.json` — `"prepare"` script wires codegen + tsc

- [ ] **Step 1: Test first** — `tools/index.test.ts` asserts `getChain(121226)` returns the seeded Marcus entry, `listTokens(121226)` returns the wUSDC + wETH list, `getAsset("usdc")` returns the catalog entry.

- [ ] **Step 2: Implement** — read JSON files from disk (NPM bundle ships them under the package root) and parse. Public API: `getChain`, `listChains`, `getContract`, `listTokens`, `getAsset`, `listAssets`, `getProtocol`, `getSolanaPrograms`.

- [ ] **Step 3: Codegen** — `tools/codegen.ts` invokes `json-schema-to-typescript` for each schema, writes `tools/types.ts` with TS types. Wire into `prepare`.

- [ ] **Step 4: Pass**

- [ ] **Step 5: Commit**

```bash
git add tools/index.ts tools/types.ts tools/codegen.ts tools/index.test.ts package.json package-lock.json
git commit -m "feat(tools): typed NPM getter API + codegen pipeline"
git push
```

---

## Task 8: GitHub Actions — CI workflows

**Files:**
- Create: `.github/workflows/validate.yml`
- Create: `.github/workflows/liveness.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: `validate.yml`** — runs on every PR. Steps: checkout, setup Node 22, `npm ci`, `npm test` (schema + tool tests), `npm run validate` (validates every JSON in `chains/`, `assets/`, `abis/`, `protocols/`, `solana/programs/` against its schema).

```yaml
name: Validate
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
      - run: npm run validate
```

- [ ] **Step 2: `liveness.yml`** — runs on PRs that touch `chains/**/contracts.json` or `chains/**/tokens.json`. For every EVM address, calls `eth_getCode` against the chain's RPC; for every Solana mint, calls `getAccountInfo`. Fails if any address has empty code / does not exist.

- [ ] **Step 3: `release.yml`** — runs on tag push (`v*`). Builds, runs tests, publishes `@rome-protocol/registry` to NPM with `NPM_TOKEN` secret.

```yaml
name: Release
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: "https://registry.npmjs.org/" }
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish --access public
        env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }
```

- [ ] **Step 4: `tools/validate.ts`** — script invoked by `npm run validate`. Walks `chains/`, `assets/`, `abis/`, `protocols/`, `solana/programs/`; for each JSON file, picks the right schema by path and validates with Ajv. Exits 1 with a human-readable error if any fail.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ tools/validate.ts package.json
git commit -m "ci: schema validation, on-chain liveness, NPM release on tag"
git push
```

---

## Task 9: Seed Marcus — proving example end-to-end

**Files:**
- Create: `chains/121226-marcus/chain.json`
- Create: `chains/121226-marcus/contracts.json`
- Create: `chains/121226-marcus/tokens.json`
- Create: `chains/121226-marcus/bridge.json`
- Create: `chains/121226-marcus/oracle.json`
- Create: `chains/121226-marcus/endpoints.json`
- Create: `chains/121226-marcus/operationalLimits.json`
- Create: `chains/121226-marcus/NOTES.md`

Values are extracted from `rome-solidity/deployments/marcus.json` and `rome-ui/deploy/chains.sample.yaml` as they exist on the day of bootstrap. No address rotation handled here — just snapshot the current state.

- [ ] **Step 1: `chain.json`**

```json
{
  "chainId": 121226,
  "name": "Rome Marcus",
  "network": "testnet",
  "rpcUrl": "https://marcus.devnet.romeprotocol.xyz/",
  "explorerUrl": "https://romescout-marcus.devnet.romeprotocol.xyz/",
  "nativeCurrency": { "name": "Rome Marcus", "symbol": "USDC", "decimals": 18 },
  "status": "live"
}
```

- [ ] **Step 2: `contracts.json` — extract from `rome-solidity/deployments/marcus.json`**

Read the source file, transform into the `versions[]` shape. For Marcus's current state, every contract has one `live` version. Example excerpt:

```json
[
  {
    "name": "RomeBridgePaymaster",
    "versions": [
      {
        "address": "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef",
        "version": "1.0.0",
        "status": "live",
        "deployedAt": "2026-03-13T00:00:00Z",
        "abiPath": "abis/RomeBridgePaymaster@1.0.0.json"
      }
    ]
  },
  {
    "name": "ERC20SPLFactory",
    "versions": [ /* ... */ ]
  },
  {
    "name": "RomeBridgeWithdraw",
    "versions": [ /* ... */ ]
  },
  {
    "name": "OracleAdapterFactory",
    "versions": [ /* ... */ ]
  },
  {
    "name": "MeteoraDAMMv1Factory",
    "versions": [ /* ... */ ]
  }
]
```

(Full transcription happens at execution time using the on-disk values.)

- [ ] **Step 3: `tokens.json`** — wUSDC + wETH entries, with `assetRef` pointing at `assets/usdc` and `assets/eth`.

- [ ] **Step 4: `bridge.json`** — Sepolia source-chain block + Solana mints, with `wormholeChainIdRef: "sepolia"` and `cctpDomainRef: "sepolia"` referencing `protocols/wormhole.json` and `protocols/cctp.json`.

- [ ] **Step 5: `oracle.json`** — OracleAdapterFactory + the 5 Pyth feeds + 1 Switchboard feed currently deployed on Marcus.

- [ ] **Step 6: `endpoints.json`**

```json
{
  "cctpIrisApiBase": "https://iris-api-sandbox.circle.com"
}
```

- [ ] **Step 7: `operationalLimits.json`** — capture Rome's 1.4M-CU budget + the wrap_gas_to_spl 27M-EVM-gas hint as `recommendedGasBudgets`. Add the auto-ATA known-incident summary so partners learn from the wUSDC redeploy without re-discovering it.

```json
{
  "maxComputeUnitsPerTx": 1400000,
  "maxCpiPerAtomicTx": 1,
  "recommendedGasBudgets": {
    "wrap_gas_to_spl": 27000000,
    "transfer_to_fresh_recipient": 1500000
  },
  "knownIncidents": [
    {
      "title": "SPL_ERC20.transfer reverts on fresh recipient (pre-PR #63)",
      "summary": "Wrappers built before rome-solidity PR #63 reverted with 'Token account does not exist' when sending to a fresh wallet. Fix is in master; new wrappers compile clean. If you see this on an old wrapper, the wrapper itself needs replacement.",
      "fixedAt": "2026-04-26T00:00:00Z",
      "link": "https://github.com/rome-protocol/rome-solidity/pull/63"
    }
  ]
}
```

- [ ] **Step 8: `NOTES.md`** — copy `docs/NOTES_TEMPLATE.md` → `chains/121226-marcus/NOTES.md`, fill in deploy history, contacts.

- [ ] **Step 9: `npm run validate` to confirm everything parses + Ajv-passes**

- [ ] **Step 10: Commit**

```bash
git add chains/121226-marcus/
git commit -m "feat(seed): Marcus (chain id 121226) — proving example end-to-end"
git push
```

---

## Task 10: Seed top-level cross-chain files

**Files:**
- Create: `assets/usdc.json`, `assets/eth.json`, `assets/sol.json` (the three Marcus uses)
- Create: `assets/usdc.svg`, `assets/eth.svg`, `assets/sol.svg` (placeholder logos; can be replaced)
- Create: `protocols/cctp.json`
- Create: `protocols/wormhole.json`
- Create: `solana/programs/mainnet.json`
- Create: `solana/programs/devnet.json`
- Create: `abis/<contract>@<version>.json` for every contract listed in Marcus's `contracts.json` (extract from `rome-solidity/artifacts/`)

- [ ] **Step 1: `assets/usdc.json`** — from the spec §Cross-chain commonalities example (full content).

- [ ] **Step 2: `assets/eth.json`, `assets/sol.json`** — analogous shape.

- [ ] **Step 3: `protocols/cctp.json`**

```json
{
  "protocol": "cctp",
  "domains": {
    "eth-mainnet": 0,
    "sepolia": 0,
    "solana-mainnet": 5,
    "solana-devnet": 5
  }
}
```

- [ ] **Step 4: `protocols/wormhole.json`**

```json
{
  "protocol": "wormhole",
  "domains": {
    "eth-mainnet": 2,
    "sepolia": 10002,
    "solana-mainnet": 1,
    "solana-devnet": 1
  }
}
```

- [ ] **Step 5: `solana/programs/mainnet.json` + `devnet.json`** — extract from `rome-solidity/scripts/bridge/constants.ts`'s `SOLANA_PROGRAM_IDS` and `SOLANA_PROGRAM_IDS_DEVNET`.

- [ ] **Step 6: `abis/`** — one file per contract version Marcus's `contracts.json` references. Extract from compiled artifacts:

```bash
for c in RomeBridgePaymaster RomeBridgeWithdraw RomeBridgeInbound ERC20SPLFactory SPL_ERC20 ERC20Users OracleAdapterFactory PythPullAdapter SwitchboardV3Adapter BatchReader MeteoraDAMMv1Factory; do
  jq '.abi' "../rome-solidity/artifacts/contracts/**/${c}.sol/${c}.json" \
    > "abis/${c}@1.0.0.json"
done
```

- [ ] **Step 7: `npm run validate` — every file passes**

- [ ] **Step 8: `npm run drift-check` is a no-op for v0.1** (no consumer manifests yet).

- [ ] **Step 9: Commit**

```bash
git add assets/ protocols/ solana/ abis/
git commit -m "feat(seed): top-level catalogs — assets, protocols, solana programs, abis"
git push
```

---

## Task 11: README front-page table + contributor docs + tag v0.1.0

**Files:**
- Modify: `README.md` (front-page table)
- Create: `docs/CONTRIBUTING.md`
- Create: `docs/SCHEMA_VERSIONING.md`

- [ ] **Step 1: README front-page chain table**

```markdown
## Available chains (v0.1.0)

| Chain ID | Name | Network | Status | Files |
|---|---|---|---|---|
| 121226 | Rome Marcus | testnet | live | [chain](chains/121226-marcus/chain.json) · [contracts](chains/121226-marcus/contracts.json) · [tokens](chains/121226-marcus/tokens.json) · [bridge](chains/121226-marcus/bridge.json) · [oracle](chains/121226-marcus/oracle.json) · [endpoints](chains/121226-marcus/endpoints.json) · [operationalLimits](chains/121226-marcus/operationalLimits.json) · [NOTES](chains/121226-marcus/NOTES.md) |

More chains land in v0.2 — see [the data sweep plan](docs/plans/2026-04-27-rome-registry-v0.1.md).
```

- [ ] **Step 2: `docs/CONTRIBUTING.md`** — registration paths A (PR) + B (CLI), with end-to-end examples for: adding a new token, adding a new chain (fresh), **rotating a chain (chain id change + redeploy — uses `add-chain --copy-from`)**, and rotating a single contract address (version bump). The rotation runbook explicitly covers the Marcus case: what carries (assets/abis/protocols/Solana mints/operationalLimits/endpoints/bridge.sourceEvm), what wipes (every contract address, every token wrapper address, every oracle adapter address), and the lifecycle (old chain `status: retired`, new chain `previousChainId` back-link, registry never deletes).

- [ ] **Step 3: `docs/SCHEMA_VERSIONING.md`** — semver policy (patch / minor / major), 3-month deprecation window, ABI version-bump rule from spec §Persona affordances.

- [ ] **Step 4: Bump `package.json` version → `0.1.0`**

- [ ] **Step 5: Update CHANGELOG.md `[Unreleased]` → `[0.1.0] — 2026-04-27`**

- [ ] **Step 6: Final `npm run validate` + `npm test` — both clean**

- [ ] **Step 7: Commit + tag + push**

```bash
git add README.md docs/CONTRIBUTING.md docs/SCHEMA_VERSIONING.md package.json CHANGELOG.md
git commit -m "docs: README front-page + contributing guide; bump 0.1.0"
git tag v0.1.0
git push --follow-tags
```

- [ ] **Step 8: Verify NPM publish** — GitHub Actions should fire `release.yml`. After it succeeds:

```bash
npm view @rome-protocol/registry@0.1.0
```

Expected: package metadata shows version 0.1.0, files include `chains`, `assets`, `abis`, `protocols`, `solana`, `schema`, `dist`.

- [ ] **Step 9: Verify jsDelivr** — wait ~10 min for jsDelivr cache, then:

```bash
curl -s https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/chains/121226-marcus/chain.json | jq .
```

Expected: returns the Marcus chain.json content.

- [ ] **Step 10: Mark spec status `review` → `shipped`** in `rome-specs/active/technical/2026-04-27-rome-registry-design.md` and move to `archive/technical/`.

---

## Self-review

Spec coverage check (§ section in spec → task in plan):

- §Repo + format → Task 1 ✓
- §Layout → Task 1 (dirs created), Task 9 (Marcus seed populates), Task 10 (top-level catalogs) ✓
- §Schemas → Task 4 ✓
- §Cross-chain commonalities → Task 10 ✓
- §Distribution → Task 8 (release workflow), Task 11 (verify NPM + jsDelivr) ✓
- §Schema evolution → Task 11 (`docs/SCHEMA_VERSIONING.md`) ✓
- §Permissions → Task 2 (CODEOWNERS) ✓
- §Local-dev policy → covered in `docs/CONTRIBUTING.md` (Task 11) ✓
- §Discovery → out of scope for v0.1 (Phase 4 of migration plan, separate plans) ✓
- §Registration flow Path A — out of scope for v0.1 scaffolding; manual PRs work via standard GitHub flow once repo exists ✓
- §Registration flow Path B → Task 6 ✓
- §Contribution model → covered in `docs/CONTRIBUTING.md` ✓
- §Persona affordances — PR template (Task 2), NOTES template (Task 2), ABI version rule (Task 11), human-friendly CI errors (the drift-check Task 5 + validate.ts Task 8) ✓
- §Migration plan Phase 1 → all tasks above ✓
- §Per-repo discovery sweep — out of scope for v0.1, separate plan ✓
- §Follow-ups (v1.5/v2/v3) — out of scope ✓
- §Parity test — included in spec, no plan task needed ✓

Placeholder scan: no `TBD`, `TODO`, `implement later`, "similar to Task N" without code, or vague "add error handling". Each step has runnable code or an exact command.

Type consistency: schemas + fixtures + getter API use the same field names throughout. `assetRef`, `abiPath`, `versions[]`, `chainId` (camelCase) consistently.

Plan ready for handoff.

---

## Execution handoff

Two execution options for this plan:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
