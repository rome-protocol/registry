# Token verification rules

Every entry in `chains/<id>/tokens.json` is classified by `kind`. Each kind has an on-chain *verification surface* — a deterministic set of checks the CI liveness probe (`tools/liveness.ts`) runs before accepting the entry. **Without these checks passing, a token registration must be rejected.**

This document is the canonical source for what makes each kind of token verifiable. The schema (`schema/tokens.schema.json`) enforces the static shape; the rules here define the on-chain checks.

## Why this matters

Asset classification has been a recurring source of confusion (gas vs wrapper vs ERC-20) and bugs (decimals mismatches, missing pools, bad wrappers). The kind enum captures the structural distinction; the verification rules ensure the chain actually agrees.

---

## kind: gas

**What it is.** An SPL token deposited into a Rome-EVM-program-owned **gas pool**. The pool is one Solana account, chain-wide (single ATA, not per-user). Users acquire balances on the EVM side as ERC-20-like ledger entries; the underlying SPL never leaves the pool. This is the chain's gas-accounting unit.

**Schema requirements.** kind=gas requires `mintId` AND `gasPool`. `gasPool` must be base58 (Solana account address, 32–44 chars). The EVM `address` field is the sentinel `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` — there is no EVM contract; gas balances live in the chain's native state, not in a deployed contract.

**Verification surface (on-chain checks):**

1. Re-derive `sol_wallet = find_program_address([chainId.to_le_bytes(8), "CONTRACT_SOL_WALLET"], romeEvmProgramId)`. The chain's Rome EVM program ID comes from `solana/programs/<network>.json` (or a per-chain field in chain.json — TBD).
2. Re-derive `expected_pool = ATA(sol_wallet, mintId, splTokenProgramId)`.
3. Assert `entry.gasPool === expected_pool`.
4. Solana RPC `getAccountInfo(gasPool)`:
   - account-level `owner` = SPL Token program (so it's a token account).
   - parsed `mint` = `entry.mintId`.
   - parsed `owner` (token-account-level) = the derived `sol_wallet` PDA.
5. Solana RPC `getTokenAccountBalance(gasPool)` returns successfully (account is initialized).

If any check fails, the entry is rejected with a human-readable error message naming the failing field + expected/actual + suggestion.

**Not to be confused with kind=erc20.** Both have an EVM ERC-20-like surface, but gas has Solana SPL backing in a chain-wide pool; erc20 has no Solana side at all.

**Marcus example (verified 2026-04-27):**
- `mintId`: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (USDC, Solana devnet)
- `gasPool`: `6LGWm6pm3DREkxCaQnULuAkWMsMTfR2XbHpHocYFarka`
- Derived `sol_wallet`: `GEujTMkvVsytUKpxddXgFLC5CX5MTswjwDFM5oLfHv1Y` (bump 255)
- Pool's on-chain owner field: `GEujTMkvVs…` ✓ matches derived sol_wallet
- Pool's on-chain mint: `4zMMC9srt5…` ✓ matches USDC

---

## kind: spl_wrapper

**What it is.** A user-bringable SPL token. The underlying SPL stays in the user's own PDA-owned ATA (per-user, not pooled). The EVM-side `SPL_ERC20` wrapper contract is a facade that performs SPL Token CPIs against the user's PDA when balanceOf / transfer / approve are invoked.

**Schema requirements.** kind=spl_wrapper requires `mintId`. The EVM `address` is the deployed `SPL_ERC20` contract (must be a valid contract address). Optional `factory` field names which factory deployed it (e.g. `ERC20SPLFactory`).

**Verification surface (on-chain checks):**

1. EVM RPC `eth_getCode(entry.address)` returns non-empty bytecode (it's a real contract).
2. EVM RPC `eth_call(entry.address, mint_id())` returns a 32-byte value. Convert hex → base58. Assert equals `entry.mintId`.
3. EVM RPC `eth_call(entry.address, decimals())` returns `entry.decimals`.
4. EVM RPC `eth_call(entry.address, symbol())` returns a string. Soft-assert equals `entry.symbol` (case-insensitive); record a warning when the on-chain symbol differs from the registry's display convention (e.g., on-chain `wUSDC` vs registry `WUSDC` — see Marcus NOTES.md).
5. EVM RPC `eth_call(entry.address, name())` returns a string. Informational only; not load-bearing.

The wrapper has no chain-wide pool to check — the underlying SPL lives per-user. The check that this contract is in fact a wrapper of THIS mint is what `mint_id()` provides.

**Decimals nuance — wrapper-truncation legitimately diverges from asset catalog:**
For Wormhole-bridged ETH (asset catalog says 18 decimals), the Wormhole-wrapped Solana mint has 8 decimals (Wormhole truncates to fit u64 SPL token amounts). The Rome-side `SPL_ERC20` wrapper inherits the underlying mint's decimals → 8. Registry's `decimals` field captures the per-chain wrapper's decimals (8), not the canonical asset's (18). When `assetRef` is set and the per-chain decimals differ from the catalog, this is a legitimate override — CI should warn but not fail.

**Marcus examples (verified 2026-04-27):**
- WUSDC at `0x1f7dfaf9444d46fc10b4b4736d906da5caf46195` → on-chain `mint_id()` = `4zMMC9srt5…` ✓, `decimals()` = 6 ✓, `symbol()` = `wUSDC` (registry uses `WUSDC`; tracked discrepancy).
- WETH at `0x3d81cb32d32b917a1ba3778832536cbf63c3cc15` → on-chain `mint_id()` = `6F5YWWrU…` ✓, `decimals()` = **8** ✓ (Wormhole truncation; ETH catalog has 18), `symbol()` = `WETH` ✓.

---

## kind: erc20

**What it is.** A native EVM-deployed ERC-20 contract — a project's governance token, a developer-deployed token, etc. **No Solana side at all.** Not a wrapper. Not a gas token. Just standard Solidity ERC-20.

**Schema requirements.** kind=erc20 forbids `mintId` and `gasPool` (the schema's `if/then/else` enforces this). The EVM `address` is the deployed contract.

**Verification surface (on-chain checks):**

1. EVM RPC `eth_getCode(entry.address)` returns non-empty bytecode (it's a real contract).
2. EVM RPC `eth_call(entry.address, totalSupply())` returns a uint256 (proves ERC-20 surface).
3. EVM RPC `eth_call(entry.address, decimals())` returns `entry.decimals`.
4. EVM RPC `eth_call(entry.address, symbol())` returns `entry.symbol` (case-sensitive match for native ERC-20, since there's no convention conflict like the SPL wrapper case).
5. EVM RPC `eth_call(entry.address, name())` returns `entry.name` (informational; useful for spotting copy-paste errors).
6. **Negative check:** EVM RPC `eth_call(entry.address, mint_id())` should fail (function does not exist on a true native ERC-20). If it succeeds, the entry is likely mis-classified — the contract is actually a wrapper. Reject with a suggestion: *"this contract responds to `mint_id()` and is therefore a Rome `SPL_ERC20` wrapper, not a native ERC-20. Re-classify as `spl_wrapper` and add the `mintId` field."*

**Distinguishing erc20 from gas.** Both present an EVM ERC-20-like surface. The erc20 contract has *only* EVM presence — no SPL backing, no pool, no PDA. The negative `mint_id()` check above is the structural test that catches misclassification.

**Marcus example.** None yet. Marcus carries gas + spl_wrapper entries; native ERC-20s are a v0.2+ concern as DeFi protocols deploy on Marcus.

---

## Catalog–per-chain consistency rule

When `assetRef` is set on a tokens.json entry, CI compares the entry against `assets/<assetRef>.json`:

- **Decimals match → silent.** Most cases.
- **Decimals diverge AND the per-chain entry is `kind: spl_wrapper` for a Wormhole-wrapped underlying → soft warning, not failure.** Wormhole's u64 truncation is a legitimate cause.
- **Decimals diverge in any other case → CI fails.** Likely a registry data bug.
- **Symbol case differs → soft warning.** e.g., on-chain `wUSDC` vs registry `WUSDC`.
- **Symbol fundamentally different (e.g., USDC vs DAI) → CI fails.**

The asset catalog is the canonical "what is this asset" record. Per-chain entries reflect what's actually on that chain. Most of the time they agree; structural wrapping conventions are the documented exception.

---

## Gas pricing verification (per-chain `gasPricing.json`)

Every chain has a `chains/<id>/gasPricing.json` capturing how the chain prices gas. Two states:

**`type: "default"`** — chain uses Rome's built-in gas pricing, no external pool. No further on-chain checks; only the schema requirement (must NOT have `poolAddress`). This is Marcus's current state — no Solana devnet pool yet for USDC/SOL.

**Pool-based** — `type: "meteora_damm_v1_pool" | "meteora_damm_v2_pool" | "raydium_amm_v4" | "raydium_clmm" | "raydium_cpmm" | "orca_whirlpool" | "orca_amm_v2" | "phoenix"`. Requires `poolAddress` (Solana base58). Verification:

1. Solana RPC `getAccountInfo(poolAddress)` returns successfully.
2. Account-level `owner` matches the named protocol's program ID (e.g. for `meteora_damm_v1_pool`, the Meteora DAMM v1 program; for `raydium_clmm`, the Raydium CLMM program; etc.).
3. If `pair` is set, parse the pool account's mint addresses from its data layout (per-protocol; the probe needs per-protocol parsers) and assert one side equals the chain's gas mint and the other side equals `pair.quote` (typically a pricing reference like SOL or canonical USDC).

Per-protocol pool parsers ship as part of v0.2 implementation. Adding a new pool protocol means: extend the schema enum + add a parser. Schema enum change is a minor version bump per `SCHEMA_VERSIONING.md`.

## Partner L2 guidance

Partners using Rome stack to launch their own L2 follow this flow when registering:

1. **Mint creation**: partner creates an SPL mint on Solana (mainnet for production, devnet for testing). The mint isn't necessarily Circle-issued USDC — could be a partner-specific token, a wrapped form, etc.

2. **New asset entry**: if the asset is partner-specific (not USDC/ETH/SOL/BTC/USDT — already in the catalog), add `assets/<symbol>.json` with the asset's brand-level metadata. Use a clear partner-prefixed symbol where ambiguity is possible (e.g. `partner-usdc.json` if it's a partner-issued stablecoin distinct from Circle USDC).

3. **Chain entry** via `tools/add-chain.ts`:
   - `chain.json` with the new chainId, RPC, native currency.
   - `tokens.json` gas entry: `kind: "gas"`, `mintId: <partner mint>`, `gasPool: <derived>`, `assetRef: <partner asset>`. The gas-pool derivation rule is the same as Marcus — `find_program_address([chainId.to_le_bytes(8), "CONTRACT_SOL_WALLET"], romeEvmProgram)` then ATA — independent of which mint or which partner.
   - `gasPricing.json` with `type: "default"` initially (no pool yet) or with the partner's pool address once their Meteora/Raydium/Orca pool is live.

4. **Pool registration** (when partner opens a pricing pool):
   - Update `gasPricing.json` to `type: <protocol>` + `poolAddress: <pool>`.
   - The liveness probe verifies the pool exists, is owned by the correct AMM program, and contains the partner's gas mint on one side.

5. **Bridge wiring** in `bridge.json` if the chain participates in CCTP / Wormhole. May not — partners running an isolated rollup might skip the bridge block.

The verification rules in this document apply unchanged to partner chains. No special-casing.

## Curation policy — what belongs in the registry vs what doesn't

The registry holds **canonical / curated** entries:

- All chains the Rome team or a Rome-stack partner runs. New chains are PR-gated and reviewed.
- Gas tokens for those chains. Always.
- Wrapped tokens (`spl_wrapper`) that the Rome team or a partner has deemed canonical for their chain — typically the asset has its own catalog entry (USDC, ETH, SOL, etc.) and is integration-grade.
- Native ERC-20s (`erc20`) of similar significance — partner governance tokens, well-known DeFi tokens.

The registry does NOT hold ad-hoc / ephemeral entries:

- Anyone can call `ERC20SPLFactory.add_spl_token_no_metadata(mint, name, symbol)` on any chain to deploy a wrapper for an arbitrary SPL mint. The on-chain `TokenCreated` event is what the rome-ui backend's token watcher consumes — that's the discovery mechanism for ephemeral tokens.
- High-volume, mostly long-tail / experimental, no curation review.
- Permissionless on-chain; never PR'd to the registry.

Consumers needing the full ephemeral set: subscribe to the chain's factory address (in `chains/<id>/contracts.json` under `name: "ERC20SPLFactory"`). Consumers needing canonical metadata: registry. The two are complementary.

A token can graduate from ephemeral to canonical via PR — someone curates a popular community token, asset catalog gets a new `assets/<symbol>.json`, the per-chain `tokens.json` gets a new entry. Never automatic.

## Implementation status

- v0.1 (current): static schema validation enforces required fields per kind via JSON-Schema `if/then/else`. Rules above are documented + Marcus's gas pool, WUSDC, and WETH have been manually verified once on-chain.
- v0.2 (task #160): `tools/liveness.ts` implements all the on-chain checks above per kind, runs in CI on every PR that touches `chains/**/tokens.json`. CI failure messages follow §Persona affordances UX rule (file:line + field + expected/actual + suggestion).
