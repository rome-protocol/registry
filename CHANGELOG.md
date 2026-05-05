# Changelog

All notable changes to the rome-registry project documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project follows [Semantic Versioning](https://semver.org/) per the spec's schema-evolution policy.

## [Unreleased]

### Changed — Marcus bridge redeploy: ensure_user auto-fund restored (rome-solidity #105)
- **`chains/121301-marcus/contracts.json`** — bumped `RomeBridgePaymaster` v1.6.0 (`0xfcfdd18d…`), `ERC20Users` v1.2.0 (`0x0531433f…`), `SPL_ERC20_USDC` v1.6.0 (`0x2240e989…`), `SPL_ERC20_WETH` v1.5.0 (`0x9a8950c7…`), `RomeBridgeWithdraw` v1.5.0 (`0x980f1f5d…`). Predecessors marked `deprecated`. Source: rome-solidity@11c8cbd.
- **`chains/121301-marcus/tokens.json`** — `WUSDC` → `0x2240e989…`; `WETH` → `0x9a8950c7…`.

#### Why
- rome-solidity #105 restores `RomeEVMAccount.create_payer` inside `ERC20Users.ensure_user` — silently dropped in commit 0751b75 ("change token ownership model"). Bridge contracts' comments document the auto-fund as the expected contract; the regression had been live since that refactor.
- All wrapper mutation entry points (`transfer`, `approve`, `transferFrom`, `mint_to`, `bridgeOutToSolana`, `ensureRecipientAta`, `ensure_token_account`) now use `_users.ensure_user(...)` instead of `_users.get_user(...)` — first ERC20 mutation auto-registers + funds PAYER_PDA. No Activate click needed.
- `ERC20Users` was redeployed (the fix is in `ensure_user` itself); all wrappers point at the new instance.

#### Known remaining limitation (separate from this PR)
- Users with balance from `wrap_gas_to_spl` or Wormhole `complete_transfer_wrapped` have tokens at `AUTHORITY_PDA(user)`'s ATA (post-#82 read path used by `balanceOf`). Wrapper mutation paths still operate on `_accounts[user]` (legacy mapping populated by `ensure_token_account`). For these users, `transfer` / `approve` / `transferFrom` / `bridgeOutToSolana` reverts with "Token account does not exist" or `Custom(1)`. Separate write-path migration needed; closed-PR-102 attempted but introduced regressions.

### Changed — Marcus bridge redeploy: revert to well-tested SPL_ERC20 baseline
- **`chains/121301-marcus/contracts.json`** — bumped `RomeBridgePaymaster` v1.5.0 (`0xf9aa1d09…`), `ERC20Users` v1.1.0 (`0x305646ad…`), `SPL_ERC20_USDC` v1.5.0 (`0xd804b352…`), `SPL_ERC20_WETH` v1.4.0 (`0x8eb46e73…`), `RomeBridgeWithdraw` v1.4.0 (`0xa55a17ef…`). Predecessors marked `deprecated`. Source: rome-solidity@826edc8 (rome-solidity #104 — revert to baseline).
- **`chains/121301-marcus/tokens.json`** — `WUSDC` → `0xd804b352…`; `WETH` → `0x8eb46e73…`.

#### Why
- rome-solidity #99 / #101 / #102 / #103 layered changes onto `SPL_ERC20` over a single session, none individually validated end-to-end. A/B sims showed `transferFrom` failed on every wrapper version, including the post-#103 v1.5.0. The post-#102 / #103 changes added new failure modes (Custom(1) → NonEvmCallError) on top of the original gap.
- rome-solidity #104 reverts the wrapper to its byte-for-byte state at commit `7a538da` — the well-tested baseline that worked on prior Marcus 121226. This redeploy puts the baseline contracts on Marcus 121301.
- Side note: `ERC20Users` was redeployed alongside the wrappers (the local `deployments/marcus.json` was cleaned in the same operation). New users will register fresh against `0x305646ad…` via `factory.create_user` or first wrapper interaction.

#### Known limitations of baseline
- `getAta` returns `_accounts[user]` — `bytes32(0)` for any user not yet registered through a wrapper interaction. Outbound CCTP via `RomeBridgeWithdraw.burnUSDC` reads this to populate the burn account; users must first call something like `factory.create_user` (or have a wrapper interaction populate `_accounts`) before bridging out via CCTP.
- `transferFrom` requires both spender and owner to be registered in `ERC20Users` (else "User does not exist"). DEX router pool creation needs the router to be registered too — not automatic today; resolved in a future focused PR.

### Changed — Marcus bridge redeploy: SPL_ERC20 write path on AUTHORITY_PDA's ATA
- **`chains/121301-marcus/contracts.json`** — bumped `RomeBridgePaymaster` v1.4.0 (`0xb7778b74…`), `SPL_ERC20_USDC` v1.4.0 (`0x7e233892…`), `SPL_ERC20_WETH` v1.3.0 (`0x828bb1ab…`), `RomeBridgeWithdraw` v1.3.0 (`0x17c42fe8…`). Predecessors marked `deprecated`. Source: rome-solidity@dec454e (rome-solidity #102).
- **`chains/121301-marcus/tokens.json`** — `WUSDC` → `0x7e233892…`; `WETH` → `0x828bb1ab…`.

#### Why
- Pre-redeploy `SPL_ERC20.{_transfer,approve,transferFrom,mint_to}` operated on `_accounts[user]` (PAYER_PDA-owned ATA); `balanceOf` / `getAta` already read AUTHORITY_PDA's ATA (post-#82). Bridged-in users saw a non-zero balance but `approve` / `transferFrom` failed with `mollusk error: Failure(Custom(1))` (SPL Token InsufficientFunds — source ATA was empty). Romeswap pool creation failed at the second sign for any user funded via Wormhole / CCTP / wrap_gas_to_spl.
- New wrappers route every mutation path through `UserPda.ataForKey(AUTHORITY_PDA(user), mint)` — the canonical ATA where balances actually live. Authority semantics: direct path signs as AUTHORITY_PDA (empty seeds), `transferFrom` signs as PAYER_PDA(spender) with `[payer_salt]` (delegate). `_ensureAuthorityAta` early-returns when the ATA already exists, keeping the common recipient-already-exists case on a single-CPI fast path. (rome-solidity #102.)

#### Operator note (post-mortem)
- Initial v1.4.0 deploy attempts failed with `mollusk error: Failure(Custom(1))` even though the new wrappers were not yet on-chain. Root cause was unrelated — Marcus's three `proxy_key_*` Solana keypairs (in `devnet-marcus` Secret Manager) had drained to ~0.003 SOL each from sustained sim load. mollusk surfaces SystemProgram `ResultWithNegativeLamports` and SPL Token `InsufficientFunds` both as `Custom(1)` — generic enough that the symptom looked like a wrapper bug. Topped each proxy to 10 SOL from `devnet-registration-authority` (60.5 → 30.5 SOL); next run deployed cleanly. **Followup**: alert on proxy-key SOL ≤ 1 SOL per chain. The bridge relayer monitoring already covers Solana relayer keys (per `rome-ui/deploy/RELAYER_SETUP.md`); proxy keys need parity coverage.

### Changed — Marcus bridge redeploy: ERC20 auto-register on first mutation
- **`chains/121301-marcus/contracts.json`** — bumped `RomeBridgePaymaster` to v1.3.0 (`0x987dc72a…`), `SPL_ERC20_USDC` to v1.3.0 (`0x8bbe731c…`), `SPL_ERC20_WETH` to v1.2.0 (`0x75f3e0f1…`), `RomeBridgeWithdraw` to v1.2.0 (`0x5b981e2a…`). Predecessors marked `deprecated` with `replacedBy` set to the new live address. Source: rome-solidity@4030cbb (rome-solidity #101).
- **`chains/121301-marcus/tokens.json`** — `WUSDC` address bumped to `0x8bbe731c…`; `WETH` address bumped to `0x75f3e0f1…`. Decimals + names + assetRefs unchanged.

#### Why
- Pre-redeploy `SPL_ERC20.{transfer,transferFrom,approve,mint_to,ensure_token_account,bridgeOutToSolana,ensureRecipientAta}` called `_users.get_user(msg.sender)` — which reverts with "User does not exist" for any address that never explicitly called `ERC20SPLFactory.create_user`. Bridged-in users (canonical Wormhole / CCTP wrappers, never deployed via factory) hit this on every wrapper interaction — the first `approve` for pool creation, swap, or LP deposit reverted before doing anything. The work-around was a manual "Activate" button click on the rome-ui Portfolio page.
- New wrappers call `_users.ensure_user(...)` on every mutation entry point, idempotent — first call self-registers in `ERC20Users`, repeat callers see the existing PDA returned. Same self-bootstrap UX as Phantom and every other Solana wallet. The Activate button can be removed in a follow-up. (rome-solidity #101.)

### Changed — Marcus bridge redeploy: getAta + Wormhole targetChain fixes
- **`chains/121301-marcus/contracts.json`** — bumped `RomeBridgePaymaster` to v1.2.0 (`0x069bcaf0…`), `SPL_ERC20_USDC` to v1.2.0 (`0x043581b6…`), `SPL_ERC20_WETH` to v1.1.0 (`0xb52660b6…`), `RomeBridgeWithdraw` to v1.1.0 (`0xcaa44d93…`). Predecessors marked `deprecated` with `replacedBy` set to the new live address. Earlier paymaster + USDC entries that pointed `replacedBy` at themselves (a self-reference left by the prior redeploy) are now repointed at the current live address. Source: rome-solidity@cbcbe8a (rome-solidity #99 + #100).
- **`chains/121301-marcus/tokens.json`** — `WUSDC` address bumped to `0x043581b6…`; `WETH` address bumped to `0xb52660b6…`. Decimals + names + assetRefs unchanged.

#### Why
- Pre-redeploy `SPL_ERC20.getAta(user)` returned `_accounts[user]` — `bytes32(0)` for any user that had never registered. rome-ui's outbound CCTP / SPL bridge hook treats `bytes32(0)` as "no recipient ATA" and routed the burn ix into rome-evm with an unallocated source ATA, hitting `mollusk error: Failure(Custom(3007))`. The new wrappers return the canonical AUTHORITY_PDA-derived ATA via `UserPda.ata(user, mint_id)`, matching `balanceOf`'s post-#82 read path. (rome-solidity #99.)
- Pre-redeploy `RomeBridgeWithdraw.wormholeTargetChain` constant was `2` (Ethereum mainnet) because PR #97's marcus-sweep had replaced the deploy script's `networkName === "marcus"` check with a stale `"<chain>"` placeholder. `burnETH` therefore encoded VAAs with `target_chain: 2`, which guardians attested but Sepolia couldn't redeem. New constant is `10002` (Sepolia). (rome-solidity #100.)

### Added — Marcus: RomeBridgeWithdraw + Wormhole-bridged WETH wrapper + Oracle Gateway V2 feeds
- **`chains/121301-marcus/contracts.json`** — added `RomeBridgeWithdraw` (`0x911ea410…`) + `SPL_ERC20_WETH` (`0x002d299b…`). Bumped `SPL_ERC20_USDC` (`0x4ab59bbd…`) and `RomeBridgePaymaster` (`0xa4475caf…`) to v1.1.0; prior 1.0.0 entries marked deprecated/replacedBy. The new wrapper set is the one wired into Withdraw's constructor; the prior wrappers point to the same SPL ATAs (functionally equivalent for balance reads, but `burnUSDC` calls only go through the new contracts).
- **`chains/121301-marcus/bridge.json`** — added `solana.wethMint = 6F5YWWrUMNpee8C6BDUc6DmRvYRMDDTgJHwKhbXuifWs` (canonical Wormhole-wrapped Sepolia WETH on Solana devnet, derived via `tools/lib/canonical-mint.ts`). Earlier session attempted to use a typo'd address (`6F5YWWrUBg62…`) which doesn't exist on-chain → SPL_ERC20 constructor's `load_mint` CPI reverted with `0x524de5b3` → blocked the whole RomeBridgeWithdraw deploy.
- **`chains/121301-marcus/tokens.json`** — `WUSDC` address bumped to `0x4ab59bbd…`; new `WETH` entry at `0x002d299b…` (decimals 8 — Wormhole truncates at 8 to fit `u64` SPL token amounts).
- **`chains/121301-marcus/oracle.json`** — populated `factory: 0x80a971f2…` + 6 feeds (5 Pyth: SOL/BTC/ETH/USDC/USDT, 1 Switchboard: SOL). Adapters were deployed via `scripts/oracle/deploy-seed-feeds.ts` on 2026-05-04; the `add-bundle.ts` scaffold left `oracle.json` as a placeholder (factory: 0x000…, feeds: {}).

### Changed — `tools/add-bundle.ts` populates `bridge.json` from manifest + defaults
- **`tools/add-bundle.ts`** — new `writeBridgeJson` step. The bundled bring-up scaffold previously left `bridge.json` as the empty placeholder (`sourceEvm.chainId: 0`, `solana.usdcMint: ""`); rome-ui's `normalizeBridge` rejected that as malformed and dropped the bridge block entirely, silently breaking SPL/EVM balance reads. Now `add-bundle.ts` resolves `sourceEvm` from a `SOURCE_EVM_CONSTANTS` table (Sepolia / Ethereum mainnet, with full `cctpTokenMessenger` / `cctpMessageTransmitter` / `wormholeTokenBridge` addresses) and `solana.usdcMint` from `USDC_MINT_BY_CLUSTER`. Defaults are driven by `chain.network` (devnet/testnet → Sepolia; mainnet → Ethereum) and `solana.cluster` (devnet → Solana-devnet USDC; mainnet → Solana-mainnet USDC). Operators can override either side via an optional `manifest.bridge` block.

### Changed — Marcus bridge.json: complete sourceEvm Sepolia addresses
- **`chains/121301-marcus/bridge.json`** — added the Sepolia program addresses (`cctpTokenMessenger`, `cctpMessageTransmitter`, `wormholeTokenBridge`) + `rpcUrl` to `sourceEvm`. The rome-ui frontend's `normalizeBridge` (`src/lib/config/chains.ts:24`) drops the entire bridge block when any of these are missing — Solana SPL balance reads + Sepolia balance reads silently fall to 0 even though every Solana-side field was already resolved. Canonical addresses from Circle (CCTP V1) + Wormhole Sepolia docs.

## [0.4.21] - 2026-05-04

### Added — New chain: Rome Marcus (121301)
- **`chains/121301-marcus/`** — bundled bring-up: `chain.json` (with `romeEvmProgramId` + `solana` block), `contracts.json` (full deploy set from rome-solidity + rome-uniswap-v2), `tokens.json` (gas-token + SPL wrappers), plus `bridge.json` / `oracle.json` / `endpoints.json` / `operationalLimits.json` / `NOTES.md` scaffolds. Status: `preparing` — flip to `live` via a separate `bump-status` PR after the chain proves out via smoke.

### Added — Romeswap deploy on marcus (121301)
- **`chains/121301-marcus/contracts.json`** — 5 new entries: `WETH9` (`0x8430cd93…`), `Multicall3` (`0x00328ea9…`), `UniswapV2Factory` (`0x3572c04f…`), `UniswapV2Router` (`0x4772531a…`), `ERC20Factory` (`0x684c6f40…`). Source: rome-uniswap-v2@`da93c6b0`. The original bring-up bundle deferred Romeswap — a stale-`node_modules` issue in rome-uniswap-v2 was blocking; clean reinstall (`rm -rf node_modules && yarn install --frozen-lockfile`) unblocked the deploy. With these entries landed, the rome-ui backend's registry-load path now passes shape validation (was failing on the missing `ERC20Factory` field, falling back to the resilience yaml and serving raw `cctpDomainRef` / `wormholeChainIdRef` instead of resolved program ids).

### Changed — Marcus bridge.json populated
- **`chains/121301-marcus/bridge.json`** — the bring-up bundle left `bridge.json` as an empty placeholder (`sourceEvm.chainId: 0`, `solana.usdcMint: ""`). Filled in: `sourceEvm = { chainId: 11155111, name: "Sepolia", usdc: "0x1c7D…" }` and `solana.usdcMint = "4zMMC9srt5Ri…"` (canonical Solana-devnet USDC). The rome-ui frontend's `useSolanaBalance` hook short-circuits when `usdcMint` is undefined — without the populated bridge.json the Solana devnet balance row never queries (showing 0 even when the user holds USDC).

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
