// liveness.ts — on-chain liveness probe.
//
// v0.1 ships a no-op stub. v0.2 (task #160) implements the full per-kind
// verification surface. Canonical rules in docs/VERIFICATION_RULES.md.
//
// Per-kind on-chain checks the real probe must perform:
//
//   kind: gas (chain's gas-accounting unit; SPL deposited in Rome-EVM-owned pool)
//     - Re-derive sol_wallet = find_program_address(
//         [chainId.to_le_bytes(8), "CONTRACT_SOL_WALLET"], romeEvmProgramId)
//     - Re-derive expected_pool = ATA(sol_wallet, mintId, splTokenProgramId)
//     - entry.gasPool === expected_pool
//     - getAccountInfo(gasPool): owner=SPL Token, mint=entry.mintId,
//       token-account-level owner=sol_wallet PDA
//     - getTokenAccountBalance(gasPool) succeeds (initialized)
//
//   kind: spl_wrapper (per-user PDA; SPL_ERC20 wrapper contract on EVM)
//     - eth_getCode(address) non-empty
//     - eth_call(address, mint_id()) → bytes32; base58-encode → matches
//       entry.mintId
//     - eth_call(address, decimals()) === entry.decimals
//     - eth_call(address, symbol()) ≈ entry.symbol (case-insensitive
//       comparison; soft-warn on case diff)
//
//   kind: erc20 (native EVM, no Solana side)
//     - eth_getCode(address) non-empty
//     - eth_call(address, totalSupply()) returns uint256
//     - eth_call(address, decimals()) === entry.decimals
//     - eth_call(address, symbol()) === entry.symbol (strict)
//     - NEGATIVE: eth_call(address, mint_id()) MUST fail/revert. If it
//       succeeds, the contract is actually an SPL_ERC20 wrapper and the
//       entry is misclassified — fail with suggestion to re-classify as
//       spl_wrapper and add the mintId field.
//
// Catalog–per-chain consistency (assetRef rule):
//   - decimals match → silent
//   - decimals diverge AND kind=spl_wrapper of Wormhole underlying → warn
//     (Wormhole truncates to 8 decimals on Solana side; legitimate)
//   - decimals diverge otherwise → fail
//   - symbol case differs → warn
//   - symbol fundamentally different → fail
//
// CI error UX per spec §Persona affordances: every failure reports
// file:line + field + expected/actual + suggestion. No bare stack traces.

console.log("liveness.ts: v0.1 stub — real probe lands with v0.2 data sweep (task #157).");
process.exit(0);
