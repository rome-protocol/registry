# Rome Marcus — 121226

## Deploy history
- 2026-03-13 — initial deploy of bridge stack (RomeBridgePaymaster, RomeBridgeWithdraw, ERC20Users, SPL_ERC20 USDC + WETH wrappers)
- 2026-04-19 — bridge bring-up fixes (split outbound Wormhole into approveBurnETH + burnETH; canonical wrapped-ETH mint correction)
- 2026-04-21 — Oracle Gateway V2 deployed (PythPullAdapter, SwitchboardV3Adapter, OracleAdapterFactory, BatchReader, 5 Pyth feeds + 1 Switchboard feed)
- 2026-04-26 — SPL_ERC20 wrappers redeployed with auto-ATA fix (rome-solidity #63). New live addresses: ERC20Users `0x6a71c3dc…`, WUSDC `0x1f7dfaf9…`, WETH `0x3d81cb32…`, RomeBridgeWithdraw `0x325d62dc…`. Previous wrappers (`0x6ed29…`, `0x3e52c…`) carry pre-fix bytecode and are not in service.

## Why this exists
Marcus is the active devnet target for Rome bridge + Oracle + DEX work. Successor to MontiSPL (retired). Used by rome-ui, cardo, partner integrations during testnet bring-up.

## Symbol convention
- `USDC` (no W prefix) — native gas token. Marcus's gas-accounting unit, 18 decimals on the EVM side. Listed in `tokens.json` with kind `gas` and the conventional sentinel address `0xeeee…eeee`.
- `WUSDC` (capital W prefix) — wrapped SPL form of the Solana USDC mint. 6 decimals. kind `spl_wrapper`. The ERC20 wrapper that contracts and pools transact in.
- `WETH` (capital W prefix) — wrapped Wormhole-bridged ETH. 18 decimals. kind `spl_wrapper`.

The on-chain `SPL_ERC20.symbol()` for the live WUSDC wrapper at `0x1f7dfaf9…` currently reports lowercase `wUSDC` (compiled into bytecode). Registry uses the canonical `WUSDC` for display. The next wrapper redeploy should align the bytecode-level symbol.

## Known caveats
- Marcus is throwaway and a chain-id rotation is planned. Use the rotation flow in `tools/add-chain.ts --copy-from` when the new chain id is known.
- The pre-fix wrappers at `0x6ed2944b…` (USDC) and `0x3e52cfb3…` (WETH) carry pre-PR-#63 bytecode that reverts on transfer to fresh recipients. **They are not the canonical entries here and should not be used by integrators.** Tracked but not surfaced in `contracts.json`.

## Contacts
- Ops: @rome-protocol/ops-team
- Protocol: @rome-protocol/protocol-team
