# rome-registry

Canonical chain, contract, and token metadata for the Rome Protocol ecosystem.

[![Validate](https://github.com/rome-protocol/registry/actions/workflows/validate.yml/badge.svg)](https://github.com/rome-protocol/registry/actions/workflows/validate.yml)

> **Status:** POC. The registry currently has no live chains. New chains are added by the `/bring-up-chain` skill once a rome-evm program is deployed and a chain is brought up against it.

## How to consume

**Browser / runtime fetch (jsDelivr CDN):**

```js
// Replace <chain-slug> with a slug from chains/ once a chain is registered.
const tokens = await fetch(
  "https://cdn.jsdelivr.net/gh/rome-protocol/registry@latest/chains/<chain-slug>/tokens.json"
).then(r => r.json());

const usdcAsset = await fetch(
  "https://cdn.jsdelivr.net/gh/rome-protocol/registry@latest/assets/usdc.json"
).then(r => r.json());
```

**TypeScript / Node (NPM):**

```ts
import {
  getChain, listChains, listContracts, getContract, listTokens,
  getAsset, listAssets, getBridge, getOracle, getEndpoints,
  getOperationalLimits, getProtocol, getSolanaPrograms,
} from "@rome-protocol/registry";

const chain = getChain(<chainId>);
const tokens = listTokens(<chainId>);
const usdcAsset = getAsset("USDC");
```

## Layout

| Path | What lives here |
|---|---|
| `chains/<id>-<slug>/` | Per-chain metadata: chain.json, contracts.json, tokens.json, bridge.json, oracle.json, endpoints.json, operationalLimits.json, NOTES.md |
| `programs/<programId>/` | Per-rome-evm-program: program.json, upgrades.json, authority.json |
| `services/<service>/` | Shared services (oracle-keeper, monitoring, etc.): service.json |
| `assets/` | Cross-chain logical asset catalog (USDC, ETH, SOL, BTC, USDT) |
| `abis/` | Contract ABIs, one file per `<name>@<version>.json` |
| `protocols/` | Bridge-protocol constants — CCTP domain ids, Wormhole chain ids |
| `solana/programs/` | Solana program IDs (mainnet, devnet) — SPL Token, ATA, Wormhole, CCTP |
| `solana/clusters.json` | Versioned Solana cluster compatibility |
| `schema/` | JSON-Schemas (draft-2020-12) for every file shape |
| `tools/` | CLI scaffolder, drift-check, validation, type generation |
| `docs/` | Contributing, schema-versioning, registration architecture, verification rules |

## Token kinds

Three structural kinds, distinguished by ownership semantics:

| Kind | Underlying SPL location | Required schema fields |
|---|---|---|
| `gas` | Rome-EVM-owned gas pool (chain-wide; Rome EVM program owns the pool) | `mintId` + `gasPool` (Solana base58 of pool) |
| `spl_wrapper` | User's own PDA (per-user) | `mintId` |
| `erc20` | None (native EVM-deployed) | (no `mintId` allowed) |

The CI on-chain liveness probe verifies the gas-pool's owner is the Rome EVM program before any gas-kind entry is accepted.

## Contributing

See [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md). Two registration paths:

- **Path A — manual PR.** Fork, add files, open PR. CI validates schemas + on-chain liveness.
- **Path B — CLI scaffolder.** `npx @rome-protocol/registry add-chain --deployments-from <path>` for fresh chains, or `--copy-from <slug>` for chain rotations.

## License

MIT.
