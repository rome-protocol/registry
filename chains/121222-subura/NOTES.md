# Rome Subura — 121222

## Deploy history
- Pre-2026-04-16 — original deploy at chainId 121211 (now retired; that chainId is dead)
- 2026-04-16 — chain reset: new chainId 121222, new start_slot 456000000, new Meteora pool. Full DB + RomeScout data cleaned. RomeScout enabled. Single-state mode.
- 2026-04-21 — Oracle Gateway V2 deployed (PythPullAdapter + SwitchboardV3Adapter + factory + BatchReader; 5 Pyth feeds + 1 Switchboard feed).
- 2026-04-28 — Romeswap (UniswapV2 fork) backfilled into registry: Factory `0x0296597E…`, Router `0xd3480D95…`, WETH9 `0x2EC27c5F…`, Multicall3 `0x24cF86C7…`, ERC20Factory `0x123e003D…`, ERC20SPLFactory `0x0E7471FA…`. Addresses verified live on Subura via `eth_getCode`; sourced from rome-ui's `deploy/chains.sample.yaml`. `deployedAt` set to the chain reset date 2026-04-16; the actual on-chain deploy timestamp is some time between then and 2026-04-21 when the yaml first gained these addresses.

## Why this exists
Rome devnet rollup, internal use. Single-state mode. Currently used for protocol-team development and integration. Not partner-facing.

## Symbol convention
- `RSOL` — native gas token, 18 decimals on the EVM side. The underlying SPL mint (`Hpur18QQ4QBmzBVY6P2XgmpzAfHQGWvogPDqp17mYxoP`) is a Rome-issued test token with 9 Solana-side decimals, mint authority `RSA184S7ZkBRGZpmwZa2htU1ctZVpPb16nz3nJZ2SZB`. Listed in `tokens.json` with kind `gas` + verified `gasPool`.

## On-chain verification (2026-04-27)
Per docs/VERIFICATION_RULES.md §"kind: gas" — verified directly from Rome EVM program's OwnerInfo PDA (`8pfNAVUDxJpDHFjdXWJWirNp6XpJAMacVyE99prxtZPv`):

- chain id 121222 ✓
- mint = `Hpur18QQ4QBmzBVY6P2XgmpzAfHQGWvogPDqp17mYxoP` ✓
- single_state = true ✓
- registration slot = 449822571
- Derived sol_wallet PDA = `2M8FiPDoiQWzrvpJHpAaVsoaZAFGE8aV4a6MUnoS8dah`
- Derived gas pool ATA = `CECWV1yQ1C8bLmjTLgj6fV1LRHLRwkbwM2XqVFMyQv5i`
- Pool's on-chain mint matches; pool's token-account-level owner matches the derived sol_wallet PDA
- Pool balance at verification: 1,000,012,777.5997998 (9-decimal units)

## Known caveats
- The gas mint `Hpur18Q…` is **not in the public assets/ catalog** (it's a Rome-issued test token, not a canonical asset like USDC or ETH). The `tokens.json` gas entry intentionally omits `assetRef`. Per the Curation Policy in VERIFICATION_RULES.md, this is fine for an internal devnet rollup — flag if Subura ever serves external integrators.
- No bridge contracts deployed (no Bridge phase 1 work on this chain). `bridge.json` carries only the source-chain block for forward compatibility.
- No `endpoints.json` entries (no off-chain bridge relayers on this chain).

## Contacts
- Ops: @rome-protocol/ops-team
- Protocol: @rome-protocol/protocol-team

## Retirement

**Date:** 2026-05-01
**Reason:** Decommissioned via `/take-down-chain`. Subura served as the validation chain for several patterns that have since become canonical: the **chain-reset workflow** (the original 121211 deployment was reset to 121222 on 2026-04-16 with a fresh start_slot, fresh Meteora pool, and a full DB/RomeScout data wipe — this proved out the rotate-in-place playbook now formalized by `tools/add-chain.ts`'s `rotateChain` API and used implicitly by `/bring-up-chain` for chain-id rotations), the **single-state mode + RomeScout pairing** that became the dominant devnet topology before K8s adoption, and **Oracle Gateway V2** integration (PythPullAdapter + SwitchboardV3Adapter + factory + BatchReader + 5 Pyth feeds + 1 Switchboard feed deployed 2026-04-21 — these deployments are how the Oracle Gateway V2 schema's `oracle.json` shape was exercised end-to-end before being adopted across all devnet chains). Subura also served alongside Marcus as one of two chains in the rome-ui multi-chain `chains.yaml` schema validation set. With those patterns proven and the active devnet set contracting around Marcus alone after the Maximus + Esquiline + Aventine + Cassius take-downs earlier today, Subura is no longer load-bearing — it served its bring-up + multi-chain-validation purpose.

**Post-retirement:**
- Chain directory preserved per registry policy.
- On-chain liveness probe skips retired chains (`tools/liveness.ts:336`).
- rome-evm program registration row at chain id 121222 remains permanent on Solana (no `DeregRollup` instruction).
- Subura uses the canonical shared rome-evm program at `DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3` (not a `--new-program` chain) — no `solana program close` is applicable. Rent SOL on the per-chain owner-info PDA + balance PDAs stays locked on Solana.
- Original chain id 121211 was retired on 2026-04-16 at the chain reset; that id is dead and never reused. 121222 enters the same state today.
- Future chain bring-ups on devnet will use a fresh chain id; Subura's id is reserved for historical lookup only.
