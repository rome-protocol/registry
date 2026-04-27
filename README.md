# rome-registry

Canonical chain, contract, and token metadata for the Rome Protocol ecosystem.

[![Validate](https://github.com/rome-protocol/registry/actions/workflows/validate.yml/badge.svg)](https://github.com/rome-protocol/registry/actions/workflows/validate.yml)

## Available chains

| Chain ID | Name | Network | Status | Gas | Mode | Notes |
|---|---|---|---|---|---|---|
| 121215 | [Rome Maximus](chains/121215-maximus/) | devnet | live | SOL (no SPL) | single-state | Custom rome-evm program for meta-hook integration testing |
| 121222 | [Rome Subura](chains/121222-subura/) | devnet | live | RSOL (`Hpur18Q…`) | single-state | Internal devnet; oracle deployed; non-canonical gas mint |
| 121225 | [Rome Esquiline](chains/121225-esquiline/) | devnet | live | USDC (`4zMMC9…`) | single-state | Containerized L2; oracle deployed |
| 121226 | [Rome Marcus](chains/121226-marcus/) | testnet | live | USDC (`4zMMC9…`) | single-state | Bridge Phase 1 + oracle; primary integration target |

## How to consume

**Browser / runtime fetch (jsDelivr CDN):**

```js
const tokens = await fetch(
  "https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/chains/121226-marcus/tokens.json"
).then(r => r.json());

const usdcAsset = await fetch(
  "https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/assets/usdc.json"
).then(r => r.json());
```

**TypeScript / Node (NPM):**

```ts
import {
  getChain, listChains, listContracts, getContract, listTokens,
  getAsset, listAssets, getBridge, getOracle, getEndpoints,
  getOperationalLimits, getProtocol, getSolanaPrograms,
} from "@rome-protocol/registry";

const marcus = getChain(121226);
const wusdc = listTokens(121226).find(t => t.symbol === "WUSDC");
const usdcAsset = getAsset("USDC");
```

## Layout

| Path | What lives here |
|---|---|
| `chains/<id>-<slug>/` | Per-chain metadata: chain.json, contracts.json, tokens.json, bridge.json, oracle.json, endpoints.json, operationalLimits.json, NOTES.md |
| `assets/` | Cross-chain logical asset catalog (USDC, ETH, SOL, BTC, USDT) — symbol/name/issuer/decimals/logoURI |
| `abis/` | Contract ABIs, one file per `<name>@<version>.json`. Populates with v0.2 data sweep. |
| `protocols/` | Bridge-protocol constants — CCTP domain ids, Wormhole chain ids |
| `solana/programs/` | Solana program IDs (mainnet, devnet) — SPL Token, ATA, Wormhole, CCTP |
| `schema/` | JSON-Schemas (draft-2020-12) for every file shape |
| `tools/` | CLI scaffolder, drift-check library, validation, type generation |
| `docs/` | Contributing guide, schema-versioning policy, registration architecture, verification rules |

## Token kinds

Three structural kinds, distinguished by ownership semantics — this matters for any consumer dealing with balances:

| Kind | Underlying SPL location | Required schema fields |
|---|---|---|
| `gas` | Rome-EVM-owned gas pool (chain-wide; Rome EVM program owns the pool) | `mintId` + `gasPool` (Solana base58 of pool) |
| `spl_wrapper` | User's own PDA (per-user) | `mintId` |
| `erc20` | None (native EVM-deployed) | (no `mintId` allowed) |

The CI on-chain liveness probe verifies the gas-pool's owner is the Rome EVM program before any gas-kind entry is accepted.

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md). Two registration paths:

- **Path A — manual PR.** Fork, add files, open PR. CI validates schemas + on-chain liveness.
- **Path B — CLI scaffolder.** `npx @rome-protocol/registry add-chain --deployments-from <path>` for fresh chains, or `--copy-from <slug>` for chain rotations (clones the previous chain folder, wipes addresses, preserves Solana mints / source-chain wiring / endpoints / operationalLimits).

## Spec

- Design: [`rome-specs/active/technical/2026-04-27-rome-registry-design.md`](https://github.com/rome-protocol/rome-specs/blob/main/active/technical/2026-04-27-rome-registry-design.md)
- v0.1 implementation plan (archived): [`rome-specs/archive/technical/rome-registry-v0.1-plan.md`](https://github.com/rome-protocol/rome-specs/blob/main/archive/technical/rome-registry-v0.1-plan.md)

## License

MIT.
