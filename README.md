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

```js
const tokens = await fetch(
  "https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/chains/121226-marcus/tokens.json"
).then(r => r.json());
```

**TypeScript / Node (NPM):**

```ts
import { getChain, listTokens } from "@rome-protocol/registry";
const marcus = getChain(121226);
```

## Spec

Design at [`rome-specs/active/technical/2026-04-27-rome-registry-design.md`](https://github.com/rome-protocol/rome-specs/blob/main/active/technical/2026-04-27-rome-registry-design.md).

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) (added in Task 11). Two registration paths: manual PR, or CLI scaffolder (`npx @rome-protocol/registry add-chain`).
