# Contributing to rome-registry

This registry is the canonical source of chain, contract, and token metadata for everything that talks to Rome. Edits land via PR and are gated by CODEOWNERS + automated CI.

## Two registration paths

### Path A — manual PR

For one-off additions (a new token, a status flip, a feed addition):

1. Fork `rome-protocol/registry`.
2. Edit / add the relevant JSON file under `chains/<id>-<slug>/` (or `assets/`, `abis/`, etc.).
3. Run `npm install` then `npm run validate` locally to check the schema.
4. Open a PR. The PR template has a file-by-file checkbox; tick what you touched.
5. CI runs schema validation and (when addresses change) on-chain liveness.
6. CODEOWNERS routes review to the right team.

### Path B — CLI scaffolder

For new chains, chain rotations, and bulk imports from a rome-solidity deployment artifact.

**Fresh chain** (first-time bring-up):

```bash
npx @rome-protocol/registry add-chain \
  --deployments-from ../rome-solidity/deployments/<network>.json \
  --id 121300 \
  --slug rome-foo \
  --name "Rome Foo" \
  --network testnet \
  --rpc https://foo.devnet.romeprotocol.xyz/
```

The scaffolder reads the deployment artifact, populates `chains/121300-rome-foo/{chain,contracts,tokens,bridge,oracle,endpoints,operationalLimits}.json` with extracted values, and writes a NOTES.md from template.

**Chain rotation** (new chain id, redeployed contracts — most of the previous chain's content carries over):

```bash
npx @rome-protocol/registry add-chain \
  --copy-from 121226-marcus \
  --new-id 121227 \
  --new-name "Rome Marcus 2" \
  --new-rpc https://marcus2.devnet.romeprotocol.xyz/ \
  --deployments-from ../rome-solidity/deployments/marcus2.json
```

What carries vs what wipes — the scaffolder enforces this so manual editing doesn't drift:

| Field | Action |
|---|---|
| `chain.json` chainId / name / rpcUrl | wipe → set from CLI flags |
| `chain.json` network / nativeCurrency | preserve |
| `contracts.json` `versions[].address`, `deployedAt` | wipe → read from `--deployments-from` |
| `contracts.json` `versions[].version`, `abiPath` | preserve (contract version often same) |
| `tokens.json` `address` | wipe → read from `--deployments-from` |
| `tokens.json` `mintId`, `symbol`, `name`, `decimals`, `kind`, `assetRef` | preserve (Solana mints don't rotate) |
| `bridge.json` `sourceEvm` block | preserve (Sepolia / Eth-mainnet didn't change) |
| `bridge.json` `solana.usdcMint`, `wethMint` | preserve |
| `oracle.json` `factory`, `feeds[].address` | wipe → read from `--deployments-from` |
| `oracle.json` `defaultMaxStaleness`, `feeds[].source` | preserve |
| `endpoints.json` | preserve verbatim |
| `operationalLimits.json` | preserve verbatim |
| `NOTES.md` | reset to template; old NOTES preserved at the retired chain |
| Old chain's `chain.json` `status` | flip to `retired` |
| New chain's `chain.json` | new `previousChainId: <old>` field for traceability |

After the scaffolder runs:
```bash
git checkout -b rotate-marcus-2
git add chains/
git commit -m "rotate: marcus → marcus-2 (chain id 121226 → 121227)"
git push -u origin rotate-marcus-2
gh pr create
```

### Lifecycle convention

- **Never delete a chain entry.** Mark it `status: retired`. The registry is append-only at the chain-folder level so historical references resolve.
- **Old chain's `contracts.json` entries** get `status: retired` on every version. They stay readable for partners doing post-mortem on transactions that landed on the old chain.
- **`previousChainId` cross-link** lets consumers walk the chain rotation history.
- **Top-level catalogs** (`assets/`, `abis/`, `protocols/`, `solana/programs/`) grow monotonically — you only ever ADD; never remove. Logo updates, decimals corrections, etc. go in place via standard PR.

## Adding a token

For a new SPL wrapper or ERC-20 on an existing chain:

1. If the underlying asset isn't in `assets/`, add it first (logo, name, decimals, issuer).
2. Edit `chains/<id>/tokens.json` and add the entry.
3. If the token is gas-kind, the schema requires `mintId` AND `gasPool`. The on-chain liveness probe verifies the gasPool's owner is the Rome EVM program — without that the entry is rejected. See `chains/<id>/NOTES.md` § "Gas token registration" for the rule.
4. Open a PR.

## Adding a contract version

When a contract is redeployed on an existing chain (without a chain rotation):

1. Append a new entry to the contract's `versions[]` array in `chains/<id>/contracts.json`.
2. Bump the version per the [SCHEMA_VERSIONING](SCHEMA_VERSIONING.md) ABI rule (patch / minor / major).
3. Mark the previous version `status: deprecated` and add `replacedBy: <new address>`.
4. Add or update the ABI under `abis/<contract>@<version>.json` if the ABI changed.
5. Open a PR.

## Local development

```bash
npm install
npm test                # vitest — all unit tests
npm run validate        # walks every JSON, schema-checks
npm run codegen         # regenerate tools/types.ts from schemas (run after schema edits)
```

The `prepublishOnly` script runs codegen + tsc before any `npm publish`, so the published NPM package always carries fresh types.
