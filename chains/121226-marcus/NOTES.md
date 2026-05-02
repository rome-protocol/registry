# Rome Marcus — 121226

## Deploy history
- 2026-03-13 — initial deploy of bridge stack (RomeBridgePaymaster, RomeBridgeWithdraw, ERC20Users, SPL_ERC20 USDC + WETH wrappers)
- 2026-04-19 — bridge bring-up fixes (split outbound Wormhole into approveBurnETH + burnETH; canonical wrapped-ETH mint correction)
- 2026-04-21 — Oracle Gateway V2 deployed (PythPullAdapter, SwitchboardV3Adapter, OracleAdapterFactory, BatchReader, 5 Pyth feeds + 1 Switchboard feed)
- 2026-04-26 — SPL_ERC20 wrappers redeployed with auto-ATA fix (rome-solidity #63). New live addresses: ERC20Users `0x6a71c3dc…`, WUSDC `0x1f7dfaf9…`, WETH `0x3d81cb32…`, RomeBridgeWithdraw `0x325d62dc…`. Previous wrappers (`0x6ed29…`, `0x3e52c…`) carry pre-fix bytecode and are not in service.
- 2026-04-27 — Romeswap (UniswapV2 fork) backfilled into registry: Factory `0xE33fea3D…`, Router `0xddbb7D98…`, WETH9 `0xBD0a5918…`, Multicall3 `0x701c4129…`, ERC20Factory `0x4FeceADD…`, ERC20SPLFactory `0x3e2F524B…`. Addresses verified live on Marcus via `eth_getCode`; sourced from rome-ui's `deploy/chains.sample.yaml` (the prior unregistered source-of-truth). Original on-chain deploy date approximated from rome-ui git history (2026-04-21).

## Why this exists
Marcus is the active devnet target for Rome bridge + Oracle + DEX work. Successor to MontiSPL (retired). Used by rome-ui, cardo, partner integrations during testnet bring-up.

## Symbol convention
- `USDC` (no W prefix) — native gas token. Marcus's gas-accounting unit, 18 decimals on the EVM side. Captured in `chain.json` `nativeCurrency`. Currently NOT listed in `tokens.json` — see "Gas token registration" below.
- `WUSDC` (capital W prefix) — wrapped SPL form of the Solana USDC mint. 6 decimals. kind `spl_wrapper`. The ERC20 wrapper that contracts and pools transact in.
- `WETH` (capital W prefix) — wrapped Wormhole-bridged ETH. 18 decimals. kind `spl_wrapper`.

The on-chain `SPL_ERC20.symbol()` for the live WUSDC wrapper at `0x1f7dfaf9…` currently reports lowercase `wUSDC` (compiled into bytecode). Registry uses the canonical `WUSDC` for display. The next wrapper redeploy should align the bytecode-level symbol.

## Gas token registration (verified on-chain)

Marcus's gas token is USDC, deposited into a **Rome-EVM-owned gas pool** — the SPL token account that holds all deposited gas tokens chain-wide. Users acquire balances by depositing SPL into the pool; per-user share is ledgered on the EVM side as an ERC-20-like balance. The underlying SPL never leaves the pool. This is structurally distinct from `spl_wrapper` (where the underlying SPL stays in each user's own PDA).

### Verified values (Marcus, 2026-04-27)

| Field | Value | Source |
|---|---|---|
| Rome EVM program | `DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3` | operator deploy registry |
| Marcus chain id | 121226 | (same) |
| Gas mint (USDC) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | (same) |
| sol_wallet PDA seeds | `[chainId.to_le_bytes(8), "CONTRACT_SOL_WALLET"]` | Rome EVM program's PDA derivation |
| sol_wallet PDA | `GEujTMkvVsytUKpxddXgFLC5CX5MTswjwDFM5oLfHv1Y` (bump 255) | derived + verified on Solana |
| **Gas pool ATA** | **`6LGWm6pm3DREkxCaQnULuAkWMsMTfR2XbHpHocYFarka`** | derived + verified on Solana |
| Pool's mint (on-chain) | `4zMMC9srt5...` matches USDC | Solana RPC `getAccountInfo` |
| Pool's token-level owner | `GEujTMkvVs...` matches sol_wallet PDA | Solana RPC `getAccountInfo` |
| Pool balance at verification | 169.981249 USDC | Solana RPC `getTokenAccountBalance` |

### Verification rule (what every gas-kind entry must satisfy)

For any `kind: gas` entry in any chain's `tokens.json`:

1. Re-derive `sol_wallet = find_program_address([chainId.to_le_bytes(8), "CONTRACT_SOL_WALLET"], romeEvmProgram)`. Re-derive `expected_pool = ATA(sol_wallet, mintId, SPL_Token_program)`.
2. The entry's `gasPool` field must equal `expected_pool`.
3. On-chain `getAccountInfo(gasPool)` must return:
   - account-level owner = SPL Token program (i.e., it's a token account),
   - parsed `mint` = the entry's `mintId`,
   - parsed `owner` (token-account-level) = the derived sol_wallet PDA.

The `tools/liveness.ts` probe (currently a v0.1 stub) implements this check in v0.2 (task #160). Without all three checks passing, a gas-kind entry must be rejected.

### One subtlety about "Rome-EVM-owned"

The sol_wallet PDA itself (`GEujTMk…`) shows account-level `owner: SystemProgram` on Solana — because Rome EVM never allocates data on it, it's a signer-only PDA carrying only lamports. The semantic Rome-EVM-ownership is via *PDA derivation*: only the program with the matching ID + the right seeds can sign as that PDA. This is standard Solana for SOL-only wallets used as cross-program signers; not a problem.

## Wrapper verification (on-chain, 2026-04-27)

Per spec [`docs/VERIFICATION_RULES.md`](../../docs/VERIFICATION_RULES.md), every token kind has a verification surface. Marcus's two `spl_wrapper` entries verified:

- **WUSDC** at `0x1f7dfaf9444d46fc10b4b4736d906da5caf46195`:
  - `eth_getCode` → contract exists ✓
  - `mint_id()` → `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` ✓ matches USDC
  - `decimals()` → 6 ✓
  - `symbol()` → `wUSDC` (lowercase). Registry uses `WUSDC` per the capital-W convention; on-chain bytecode discrepancy. Next wrapper redeploy should align.
- **WETH** at `0x3d81cb32d32b917a1ba3778832536cbf63c3cc15`:
  - `eth_getCode` → contract exists ✓
  - `mint_id()` → `6F5YWWrUMNpee8C6BDUc6DmRvYRMDDTgJHwKhbXuifWs` ✓ matches Wormhole-wrapped ETH on Solana devnet
  - `decimals()` → **8** ✓ (Wormhole-wrapped tokens truncate to 8 decimals on the Solana side to fit u64; the wrapper inherits. Asset catalog `assets/eth.json` has 18 — this divergence is a Wormhole convention, captured in tokens.json as `decimals: 8`)
  - `symbol()` → `WETH` ✓ matches registry

## Known caveats
- Marcus is throwaway and a chain-id rotation is planned. Use the rotation flow in `tools/add-chain.ts --copy-from` when the new chain id is known.
- The pre-fix wrappers at `0x6ed2944b…` (USDC) and `0x3e52cfb3…` (WETH) carry pre-PR-#63 bytecode that reverts on transfer to fresh recipients. **They are not the canonical entries here and should not be used by integrators.** Tracked but not surfaced in `contracts.json`.
- WUSDC's on-chain `symbol()` returns lowercase `wUSDC`; the registry uses canonical `WUSDC`. Discrepancy is informational; next wrapper redeploy aligns.
- WETH's decimals (8) intentionally diverge from the canonical ETH asset catalog (18) due to Wormhole's u64 truncation. Per `docs/VERIFICATION_RULES.md` §"Catalog–per-chain consistency rule" this is a legitimate override and CI should warn but not fail.

## Retirement

- **Date:** 2026-05-02
- **Reason:** Decommissioning marcus to deploy a new rome-evm program. Last live Rome chain on the legacy DP1d program; chain take-down precedes program close + new RomeD program deployment (clean-slate Phase 1 → Phase 5 per `project_clean_slate_execution_plan.md`).
- **Successor:** None yet. A new chain will be brought up against the new RomeD program once the clean-slate sequence completes.
- **Solana program close:** `DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3` is a shared rome-evm program — `/close-program` runs as a separate operator-driven step after this take-down.
- **Take-down trigger:** `/take-down-chain marcus` (chain take-down skill v1.5).
- **Liveness:** `tools/liveness.ts` already skips retired chains; no probe changes needed.

## Contacts
- Ops: @rome-protocol/ops-team
- Protocol: @rome-protocol/protocol-team
