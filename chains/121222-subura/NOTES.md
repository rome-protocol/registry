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
