# Changelog

All notable changes to the rome-registry project documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project follows [Semantic Versioning](https://semver.org/) per the spec's schema-evolution policy.

## [Unreleased]

### Added
- **New chain: Cassius Test (121298)** — devnet rehearsal slot for the Cassius bring-up runbook (`rome-specs/active/technical/2026-04-28-rome-chain-bring-up-runbook-plan.md` Chapter 10). Status: `preparing`. Per-chain rome-evm program `FfHDMdFLXCLfJhpVM6tQhLZFTk5Q3REd17t1aPoSHnG1` (fresh deploy, not the shared devnet `DP1d…`). Throwaway — will be flipped to `retired` and the directory dropped after the dry-run captures lessons (Chapter 10.4) and the contract surface is exercised on real Cassius (121227).
- **`schema/programs.schema.json`** — extended to cover Cardo's full Solana protocol stack. New optional fields: `splToken2022`, `memo`, `stakePool`, `marinade`, `raydiumAmmV4`, `raydiumCpmm`, `raydiumClmm`, `meteoraDlmm`, `meteoraDammV1`, `meteoraDammV2`, `orcaWhirlpool`, `phoenix`, `pumpFun`, `pumpSwap`, `kaminoLend`, `kaminoFarms`, `mangoV4`, `driftV2`, `marginfiV2`, `streamflow`, `sns`, `squadsV4`, `splGovernance`, `jupiterV6`. Each documented with a one-line description. Required core (`splToken`, `associatedToken`, `systemProgram`) unchanged. Schema-evolution: minor bump (additive — all new fields optional).
- **`solana/programs/mainnet.json` + `devnet.json`** — populated with verified-on-chain program IDs for every protocol Cardo's adapters or orchestrator touches. Mainnet/devnet variance documented inline (Marinade, Raydium AMM v4 / CPMM / CLMM, Streamflow have devnet redeploys distinct from mainnet; Phoenix / DLMM / Squads / Realms / Drift / Mango / Pump.fun / PumpSwap deploy identically across networks).
- **`schema/lstMints.schema.json` + `solana/lst-mints/mainnet.json`** — canonical Liquid-Staking-Token mint addresses (JitoSOL / bSOL / mSOL / JupSOL), with stake-pool back-references where applicable. Cardo's `/orchestrator` stake intent ranks across this list — adding a new entry surfaces it in routing without code change.
- **`tools/index.ts`** — new public API: `getSolanaLstMints(network)` returns the LST registry as a typed map.
- **`tools/validate.ts`** — also walks `solana/lst-mints/` and validates against the new schema.

### Why
Cardo's adapter library (15+ Solana protocols) has been hardcoding program IDs and pinned addresses in `lib/<proto>-program.ts` files. Centralising them here removes:
- duplicate-source drift (the Raydium AMM v4 devnet redeploy at `HWy1jot…` was rediscovered three times across PRs);
- per-PR security-scanner false positives (GitGuardian flags any base58 string as a "Generic High Entropy Secret"; consolidating to a canonical list lets that be allowlisted in one place);
- per-network branching scattered across files (every adapter that has a different devnet ID was open-coding a `network === 'mainnet' ? a : b` style check).

Cardo's follow-up PR (`feat-cardo-registry-imports`) replaces the inline literals with `getSolanaPrograms()` / `getSolanaLstMints()` calls.

## [0.4.0] — 2026-04-28

### Added
- **`schema/chain.schema.json`** — new optional `romeEvmProgramId` field. Same semantics as the v0.3.x `solanaProgramId` (Rome EVM program ID, Solana base58, defaults to the canonical shared program when absent), with an unambiguous name. Schema-evolution: minor bump (additive — both names accepted).
- **`schema/contracts.schema.json`** — three new optional fields on every `versions[]` entry, captured by the `contract-deploys` workflows when they land an artifact:
  - `bytecodeSha256` — SHA-256 of deployed runtime bytecode (lowercase 64-hex).
  - `sourceGitSha` — full Git SHA-1 of the source-repo commit (lowercase 40-hex; never short).
  - `compilerVersion` — Solidity compiler version that produced the bytecode (e.g. `0.8.28+commit.7893614a`).
  Together these form a deterministic provenance triple: source → compiler → bytecode → on-chain address. Schema-evolution: minor bump (additive).

### Changed
- **All 4 chains backfilled** (marcus / subura / esquiline / maximus) — `solanaProgramId` replaced by `romeEvmProgramId`. Same values; the schema continues to accept the legacy name during the deprecation window.
- **`tools/liveness.ts`** — reads `chain.romeEvmProgramId ?? chain.solanaProgramId ?? DEFAULT_ROME_EVM_PROGRAM`, prefers the new name. Suggestion strings in failure messages updated to reference `romeEvmProgramId`.
- **`tools/types.ts`** — regenerated via `npm run codegen`.
- **`tools/fixtures/{chain,contracts}.fixture.json`** — extended to cover the new fields so `schemas.test.ts` exercises them.
- **`chains/121215-maximus/NOTES.md`** — wording updated to reference `romeEvmProgramId`.

### Deprecated
- **`schema/chain.schema.json#solanaProgramId`** — retained as an optional alias for one minor cycle so external consumers can migrate. Will be **removed in v1.0.0**, triggering the 3-month deprecation window per `docs/SCHEMA_VERSIONING.md`. New chain entries should use `romeEvmProgramId` only; consumers should prefer `romeEvmProgramId` when both are present.

### Why
- **Naming hygiene.** "Solana program ID" is ambiguous — Rome chains touch many Solana programs (SPL Token, ATA, Meteora AMM, Token-2022 Transfer Hooks). The chain-level field specifically names the Rome EVM program, not a generic Solana program. `romeEvmProgramId` says exactly that, no decoder ring required.
- **Provenance for contracts.** As `contract-deploys` becomes the gated path for landing Solidity contracts on every chain, the registry needs to capture *what* code was deployed (bytecodeSha256), *from where* (sourceGitSha), and *with which compiler* (compilerVersion). Without these, the registry is an address ledger; with them, it's a provenance ledger that consumers can verify against on-chain `eth_getCode` and against the source repo.

### Verification
- `npm test`: 24 tests, 4 files passed (chain + contracts fixtures exercise new fields).
- `npm run validate`: 42 files passed (schemas accept both legacy `solanaProgramId` and new `romeEvmProgramId`; new contract provenance fields validated against fixture).
- Backward-compat: any external consumer still sending `solanaProgramId` continues to validate; any consumer reading via `tools/liveness.ts` prefers `romeEvmProgramId` and falls through.

### Migration
- Consumers reading `chain.solanaProgramId` should switch to `chain.romeEvmProgramId ?? chain.solanaProgramId` until v1.0.0. After v1.0.0, the alias is removed.
- New chain submissions (`tools/add-chain.ts` Path B) should write `romeEvmProgramId` only.

## [0.3.0] — 2026-04-27

### Added — Solana cluster + per-chain compatibility schema (closes task #167)
- **`schema/clusters.schema.json`** — new schema. Tracks the upstream Solana version on each cluster Rome targets (mainnet, devnet) plus an optional `romeNodeVersion` and `featureSet`. Captures the principle that Rome explicitly does NOT target Solana testnet — Rome's testnet rollups settle to Solana devnet.
- **`solana/clusters.json`** — new data file. Initial snapshot 2026-04-27: mainnet at solana-core 3.1.13, devnet at 4.0.0-beta.6 (Rome's own RPC running ahead at 4.0.0-beta.7 testing the next devnet release). Verified directly by querying `https://api.mainnet-beta.solana.com` and `https://api.devnet.solana.com`'s `getVersion`.
- **`schema/chain.schema.json`** — added optional `solana` block per chain: `cluster` (mainnet | devnet — no testnet), optional `tested.{version, verifiedAt, notes}`, optional `romeRpcUrl`, optional `romeNodeVersion`. Schema-evolution: minor bump (additive).
- **All 4 existing chains backfilled.** marcus / subura / esquiline / maximus — each declares `solana.cluster: "devnet"` and `solana.tested.version: "4.0.0-beta.6"` (verified 2026-04-27). All four chains run against Rome's `4.0.0-beta.7` node.

### Why
The Rome stack rolls out coordinated upgrades across off-chain services (proxy, hercules, rhea, op-geth) and the Solana node software they depend on. When Solana ships a mainnet upgrade, Rome's services need to be **already tested compatible** before users feel it. The cluster registry plus per-chain `tested` block gives:
- A single canonical reference for what version each chain has been verified against.
- A drift-detection input: CI can compare a chain's `tested.version` to `solana/clusters.json`'s `romeNodeVersion` and warn when Rome's node is moving faster than chain verifications.
- Documentation for partners (self-hosted operators) about which Solana version their stack should target before a Rome image upgrade.

### Verification (this PR)
- All 4 chains' `solana.cluster: "devnet"` matches reality: each `rpcUrl` points at `*.devnet.romeprotocol.xyz/`, and the bridge contracts in `bridge.json` reference Solana devnet program IDs.
- Upstream Solana versions verified directly via `getVersion` against both public clusters at the time of snapshot.
- `npm test`: 24 tests, 4 files passed (clusters schema fixture verified).
- `npm run validate`: 42 files passed (4 chains × 8 files + assets + protocols + 2 program files + clusters.json + new fixture).

### Released — 0.2.x track

### Added — On-chain liveness probe (closes task #160)
- `tools/liveness.ts` replaces the v0.1 stub. For every chain in `chains/<id-slug>/`, runs per-kind verification per `docs/VERIFICATION_RULES.md`:
  - **kind: gas** — re-derives `sol_wallet` PDA + ATA, verifies on-chain pool's mint and token-account-level owner.
  - **kind: spl_wrapper** — `eth_getCode`, `mint_id()` base58 match, `decimals()` match.
  - **kind: erc20** — standard ERC-20 surface + negative `mint_id()` check (catches misclassified wrappers).
- Reads each chain's Rome EVM program ID from `chain.json.solanaProgramId` (added in v0.2.0); falls back to the canonical shared program when absent. Loads SPL Token + ATA program IDs from `solana/programs/<network>.json`.
- CI failure messages follow §Persona affordances UX rule: file:field — expected X, got Y. Suggestion: …
- `npm run liveness` runs locally; `.github/workflows/liveness.yml` triggers on every PR that touches `chains/**/{contracts,tokens,oracle,chain}.json`.
- Adds `@solana/web3.js` to devDependencies.
- Verified all 4 current chains pass (subura/esquiline/maximus/marcus).


## [0.2.0] — 2026-04-27

### Added
- **Three new chains seeded** by the v0.2 data sweep, all verified directly from the on-chain `OwnerInfo` PDA:
  - `chains/121215-maximus/` — meta-hook E2E test rollup. Custom Rome EVM program (`CX3vRq…`), no SPL gas (SOL-native), no Oracle Gateway deployed.
  - `chains/121222-subura/` — devnet rollup, internal use. Gas mint `Hpur18Q…` (Rome-issued 9-decimal test token, **not in `assets/` catalog** by design — internal). Oracle Gateway V2 deployed. Pre-reset chainId 121211 noted in NOTES.md as retired.
  - `chains/121225-esquiline/` — first containerized L2. USDC gas (same mint as Marcus). Oracle Gateway V2 deployed. Pool balance verified at 90.99 USDC.

### Changed
- **`schema/chain.schema.json`** — added optional `solanaProgramId` field. Captures the Rome EVM program ID a chain is registered under. Most chains share `DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3`; meta-hook test branches and partner forks use their own. Schema-evolution: minor bump (additive). All existing chain entries (Marcus) backfilled.
- **`README.md`** front-page table extended to all 4 chains with gas / mode / notes columns.

### Verification
On-chain truth captured per `docs/VERIFICATION_RULES.md` for every kind=gas entry: `OwnerInfo` PDA fetched + parsed, `sol_wallet` PDA derived, gas pool ATA derived + verified (mint matches, owner matches derived sol_wallet PDA, account exists with non-zero balance).

### Out of scope (deferred)
- ABI files under `abis/<contract>@<version>.json` — still empty. Extract from `rome-solidity/artifacts/` lands as v0.2.1.
- Liveness probe in `tools/liveness.ts` — still a v0.1 stub. Real implementation tracked as task #160.
- monti_spl, testrollup, ephemeral test chains (101010, 121220-24, 141414-16, 284672) — intentionally skipped.



## [0.1.0] — 2026-04-27

### Added
- Initial repo scaffold + JSON-Schemas + tooling.
- Marcus (chain id 121226) seeded as the proving example end-to-end.
- NPM package `@rome-protocol/registry@0.1.0`.
- jsDelivr distribution at `https://cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/`.
