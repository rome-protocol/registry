// liveness.ts — on-chain liveness probe.
//
// v0.1 ships a no-op stub. v0.2's data sweep will populate the chain folders
// with real addresses; at that point this script will:
//   - For each EVM address in contracts.json / tokens.json / oracle.json,
//     call eth_getCode against chain.json's rpcUrl. Fail if empty.
//   - For each Solana mintId / underlyingAccount in tokens.json / bridge.json,
//     call getAccountInfo against the appropriate Solana RPC. Fail if missing.
//   - For every kind=gas entry in tokens.json, verify the gasPool account
//     exists on Solana AND is owned by the Rome EVM program. This is the
//     critical sanity check per spec §Gas token registration — without it
//     a gas-kind registration must be rejected, since the gas-pool semantic
//     (chain-wide, Rome-EVM-owned) is what distinguishes gas from
//     spl_wrapper (per-user PDA).
//
// Tracked separately as a v0.2 task (#157 data sweep). Until then this
// script exits 0 so the workflow is stable.

console.log("liveness.ts: v0.1 stub — real probe lands with v0.2 data sweep (task #157).");
process.exit(0);
