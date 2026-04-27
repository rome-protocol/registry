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

## Curation policy — canonical vs ephemeral

The registry is **curated**. Not every wrapped token a user happens to deploy on a Rome chain belongs here.

| Source | Lives here |
|---|---|
| Curated / canonical — gas tokens, partner assets, USDC/ETH/SOL/etc., important community tokens. PR-reviewed. | Registry: `chains/<id>/tokens.json` + `assets/<symbol>.json` |
| Ad-hoc / ephemeral — anyone calls `ERC20SPLFactory.add_spl_token_no_metadata()`. Permissionless. Indexed via the on-chain `TokenCreated` event. | NOT in registry. The factory address (in `chains/<id>/contracts.json` under name `"ERC20SPLFactory"`) is the discovery point for consumers. |

A token can graduate from ephemeral to canonical via PR (someone curates a popular community token; asset catalog gets a new entry; per-chain `tokens.json` gets a new row). Never automatic. See [`VERIFICATION_RULES.md`](VERIFICATION_RULES.md) §"Curation policy".

## Adding a token

For a new SPL wrapper or ERC-20 on an existing chain:

1. If the underlying asset isn't in `assets/`, add it first (logo, name, decimals, issuer).
2. Edit `chains/<id>/tokens.json` and add the entry.
3. If the token is gas-kind, the schema requires `mintId` AND `gasPool`. The on-chain liveness probe verifies the gasPool's owner is the Rome EVM program — without that the entry is rejected. See `chains/<id>/NOTES.md` § "Gas token registration" for the rule.
4. Open a PR.

## Partner L2 — bringing up a new chain on Rome stack

When a partner launches their own L2 with the Rome stack and registers in the registry:

1. **Mint creation** — partner creates an SPL mint on Solana for their gas token. Mainnet for production, devnet for testing. Doesn't need to be Circle USDC; can be any SPL the partner controls.

2. **New asset entry** — if the asset isn't already in `assets/` (USDC, ETH, SOL, BTC, USDT are pre-seeded), add `assets/<symbol>.json` with the brand-level metadata. Use partner-prefixed symbols when there's ambiguity (e.g., `partner-usd.json` for a partner-issued stablecoin distinct from Circle USDC).

3. **Run `add-chain` in fresh mode** with the partner's deployment artifact:
   ```bash
   npx @rome-protocol/registry add-chain \
     --deployments-from <path-to-partner-deployments.json> \
     --id <partner-chain-id> \
     --slug <partner-slug> \
     --name "<Partner Chain>" \
     --network mainnet \
     --rpc <partner-rpc>
   ```

4. **Populate gas entry** in the new `chains/<id>/tokens.json`:
   - `kind: "gas"`, `mintId: <partner mint>`, `gasPool: <derived>`, `assetRef: <partner asset symbol>`.
   - The gas-pool derivation rule is the same for every Rome chain — `find_program_address([chainId.to_le_bytes(8), "CONTRACT_SOL_WALLET"], romeEvmProgram)` then ATA against the partner's mint and the SPL Token program. Liveness probe verifies on-chain.

5. **Populate `gasPricing.json`**:
   - Initially: `{ "type": "default" }` if no pricing pool exists yet. Marcus is in this state today.
   - Once the partner opens a pricing pool (Meteora / Raydium / Orca / Phoenix / etc.): `{ "type": "<protocol>", "poolAddress": "<pool>", "pair": { "base": "<gas mint>", "quote": "<USDC or SOL>" } }`. Liveness verifies the pool exists, is owned by the correct AMM program, and pairs the gas mint correctly.

6. **Bridge wiring** in `bridge.json` only if the partner's chain participates in CCTP / Wormhole. May not — isolated rollups can skip.

7. **Open the PR.** CODEOWNERS routes to ops + protocol; production-chain entries require two ops-team approvals.

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
