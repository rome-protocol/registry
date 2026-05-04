# Changelog

All notable changes to the rome-registry project documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project follows [Semantic Versioning](https://semver.org/) per the spec's schema-evolution policy.

## [Unreleased]

### Added — New chain: Rome Marcus (121301)
- **`chains/121301-marcus/`** — bundled bring-up: `chain.json` (with `romeEvmProgramId` + `solana` block), `contracts.json` (full deploy set from rome-solidity + rome-uniswap-v2), `tokens.json` (gas-token + SPL wrappers), plus `bridge.json` / `oracle.json` / `endpoints.json` / `operationalLimits.json` / `NOTES.md` scaffolds. Status: `preparing` — flip to `live` via a separate `bump-status` PR after the chain proves out via smoke.
## [0.4.19] - 2026-05-04

### Added — `network` field on programs (Rome env, distinct from Solana cluster)

- **`schema/program.schema.json`** — added required `network: enum [devnet, testnet, mainnet]`. Distinct from `cluster: enum [devnet, mainnet]`. The two were conflated when only RomeD existed; adding `RomeT` (Rome testnet on Solana devnet) forces the split. Description on `programId` updated to mention the `RomeT` prefix convention.
- **`schema/programIndex.schema.json`** — added `testnet` to `primary.required` (3 keys now: devnet/testnet/mainnet, all required, all nullable). Added `network` to per-entry shape. Updated description: "primary keyed by Rome environment, not Solana cluster" — since Rome devnet AND Rome testnet both run on Solana devnet but have distinct primary programs (RomeD vs RomeT).

### Changed — backfill existing program entry

- **`programs/RomeDbGQYbqomGVk13h9JkQHKoNWKB84Lw1ij9AtRXT/program.json`** — added `network: "devnet"` (semantically unchanged: Rome devnet program runs on Solana devnet → cluster=devnet, network=devnet).
- **`programs/index.json`** — added `primary.testnet: null` (no testnet program deployed yet); added `programs.RomeDbGQ.../network: "devnet"`. `primary.devnet` unchanged.

### Changed — docs reflecting the split

- **`CLAUDE.md`** — vanity-prefix table now lists three rows (RomeD/RomeT/RomeP) keyed by Rome env, with Solana cluster as a separate column. `programs/index.json#primary[<network>]` documented as keyed by Rome env, not Solana cluster.

### Tooling

- **`tools/types.ts`** — regenerated from the updated schemas via `npm run codegen`.

### Migration impact

- Schema-additive: existing entries that lack `network` would fail validation, but the only existing entry (RomeDbGQ) was backfilled in this PR.
- No public consumers of `programs/index.json` read `primary[<cluster>]` today (the only writer is `/deploy-program`; the only future reader is `/bring-up-chain` which threads `--env <network>`). Both will be updated in the rome.git skills PR pairing this one.

## [0.4.18] - 2026-05-04

### Added — first program in `programs/` namespace

- **`programs/RomeDbGQYbqomGVk13h9JkQHKoNWKB84Lw1ij9AtRXT/program.json`** — initial deploy of the post-clean-slate primary devnet rome-evm program. `status: live`, `role: primary`. Upgrade authority is a Squads multisig PDA (1-of-2; members anil + sattvik). Deploy tx `3G3mmX…NnRJ`, slot 459959730, programDataSha256 `38cd4457…`, binary 1,171,320 bytes.
- **`programs/RomeDbGQYbqomGVk13h9JkQHKoNWKB84Lw1ij9AtRXT/upgrades.json`** — first entry: initial deploy. Hot keypair `9rq5Rp…BxweQ` was used as transient deploy-time authority because the operator's Ledger Solana app threw `invalid header` against `solana-cli 4.0.0-rc.0` at deploy time; authority transferred to the multisig PDA in a follow-up `set-upgrade-authority` tx (see authority.json entries[1]).
- **`programs/RomeDbGQYbqomGVk13h9JkQHKoNWKB84Lw1ij9AtRXT/authority.json`** — two entries: initial-set (hot keypair) + rotation (hot → multisig PDA). Rotation tx `5iPKwT…XKA4`, slot 459959832.
- **`programs/index.json`** — first cluster→primary pointer: `primary.devnet → RomeDbGQYbqomGVk13h9JkQHKoNWKB84Lw1ij9AtRXT`. mainnet still null.

### Note on multisig kind

The on-chain owner program for the multisig PDA is the Squads **Smart Account** program (`SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu`), not the older Squads V4 program (`SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf`). The registry schema's `currentAuthority.kind` enum doesn't yet include a Smart Account variant; `squads-v4-multisig` is the closest existing label and is functionally equivalent for our use (PDA-controlled upgrade authority, member voting via `app.squads.so`). Schema may grow a `squads-smart-account` enum value in a later PR — non-blocking.

### Tooling note

`tools/validate.ts` does not yet scan `programs/`. The four artifacts in this PR were validated manually via `ajv/dist/2020` against the four `program*.schema.json` files. Adding `programs/` traversal to `tools/validate.ts` is a separate small follow-up.

### Versioning

`package.json` / `package-lock.json` — `0.4.17` → `0.4.18` (data-only patch bump per `docs/SCHEMA_VERSIONING.md`).

## [0.4.17] - 2026-05-04

### Reset

- **README** — collapsed to a POC stub. Removed retired-chain references and version-pinned example URLs in favour of `@latest`.
- **CHANGELOG** — earlier history collapsed into this single entry. The registry was a moving target through 2026-04 / 2026-05 (chain bring-ups, retirements, schema iterations); none of that history applies to current state. v0.4.x git tags before this point have been removed from GitHub releases — start fresh from v0.4.17.

### State at this point

- 0 chains under `chains/`
- 0 programs under `programs/`
- 1 service under `services/` (`rome-ui-worker`, `lifecycle.decommissionedAt` set)
- Schemas under `schema/` for chain / program / service / contracts / tokens / bridge / oracle / endpoints / operationalLimits / gasPricing / asset / protocol / clusters / programIndex / programUpgrade / programAuthority / lstMints
- Tooling under `tools/`: `add-chain`, `add-bundle`, `validate`, `liveness`, `drift-check`, `codegen`
