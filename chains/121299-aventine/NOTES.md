# Rome Aventine — operational notes

**Status**: live (registered 2026-04-29)
**Spec**: [`rome-specs/active/technical/2026-04-28-eth-gas-chain.md`](https://github.com/rome-protocol/rome-specs/blob/main/active/technical/2026-04-28-eth-gas-chain.md)
**Tracking issue**: [`rome-protocol/rome#91`](https://github.com/rome-protocol/rome/issues/91)

## What's distinctive

- **First Rome chain with ETH as native gas.** Marcus, Subura, Maximus all use USDC or other gas mints; Aventine uses Wormhole-wrapped Sepolia-WETH SPL (`6F5YWWrUMNpee8C6BDUc6DmRvYRMDDTgJHwKhbXuifWs`, 8 decimals).
- **EVM presentation is 18-decimal** (matches Arbitrum/Optimism). Gas math conversion (8 underlying → 18 EVM) handled per-chain in `rome-evm-private`'s `settle_inbound_bridge` via `10^(18 - decimals)`.
- **No on-chain protocol code change needed.** Verified during the rollout's Phase -1 audit that `settle_inbound_bridge` and `reg_owner` are gas-mint-agnostic (read mint from per-chain `OwnerInfo` PDA, decimals from the SPL mint account).

## On-chain registration

| Field | Value |
|---|---|
| OwnerInfo PDA | `8pfNAVUDxJpDHFjdXWJWirNp6XpJAMacVyE99prxtZPv` |
| Registration slot | 458759373 |
| Registration authority | `RTRxXgJDFccQNxy976KWhrHr1UzF1gYBqeJnH1dvdNQ` (testnet feature) |
| Gas mint | `6F5YWWrUMNpee8C6BDUc6DmRvYRMDDTgJHwKhbXuifWs` (Wormhole-wrapped Sepolia-WETH SPL on Solana devnet) |
| sol_wallet PDA | `367LCmD5dJwXhmun646HZRLHkNR5G3GN7pc2TsPq562b` |
| gasPool ATA | `2ypdYWLzohr5HJEso3JqYrX4VqCDvDzTokooymjFQdyd` |

## Bridge configuration

- **Sepolia → Aventine inbound** uses Wormhole TokenBridge (CCTP not available — Aventine's gas mint isn't USDC). User calls `wrapAndTransferETH` on Sepolia → Wormhole VAA → worker calls `complete_transfer_wrapped` on Solana → `settle_inbound_bridge` converts the WETH SPL into native ETH gas on Aventine.
- **Aventine → Sepolia outbound** uses `RomeBridgeWithdraw.approveBurnETH` + `burnETH` (two-tx by CU constraint, same as Marcus). Contracts not yet deployed on Aventine — Phase 2 follow-up.
- `bridge.json:solana.usdcMint` is intentionally absent — Aventine has no CCTP wiring.

## Pricing & contracts (deferred)

- `contracts.json` is empty — Romeswap, Oracle Gateway V2, RomeBridgeWithdraw, ERC20-SPL wrappers haven't been deployed on Aventine yet.
- `oracle.json` is empty — no Oracle Gateway V2 yet.
- `gasPricing.type` is `default` (~10 gwei). Upgrade to a Meteora WETH/WSOL pool once seeded on Solana devnet.

These are phase-2 follow-ups; the chain works as a Wormhole-only deployment immediately.

## Operator notes

- VM: `devnet-aventine` @ `35.228.3.137` (europe-north1-a, n2-standard-4)
- Domain: `aventine.devnet.romeprotocol.xyz` (TLS via the wildcard `*.devnet.romeprotocol.xyz` cert)
- DB: `aventine` schema on the shared `devnet-postgres` instance
- 6 operator wallets (proxy_key_1..3, rhea_key_1..3) in GCP Secret Manager `devnet-aventine`
- 3 EVM fee recipients (`fee_recipient_1..3_address`) in the same secret

## Test coverage

E2E bridge test from Sepolia → Aventine pending Phase 6 (rome-ui chains.yaml entry).
