# Rome Maximus — 121215

## Deploy history
- 2026-04-14 — initial deploy. Single-state mode.

## Why this exists
**Meta-Hook E2E testing** rollup. Runs a custom Rome EVM program (`CX3vRqzv1y7EEf3zr7myXz7UnwJMf2GiP1fUZZpVynSs`) for meta-hook integration testing — distinct from the canonical shared program used by Marcus / Subura / Esquiline (`DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3`). Meta-Hook Router on Solana: `H3q3...`.

Internal use only. Not partner-facing.

## Symbol convention
Native gas is **SOL** (no SPL gas mint registered on-chain). The chain has no `wrap_gas_to_spl` capability — there is no per-chain gas pool to wrap into. EVM-side gas accounting unit is the `RSOL` symbol (Rome convention; 18 decimals on the EVM side).

## On-chain verification (2026-04-27)
Per docs/VERIFICATION_RULES.md — verified directly from Maximus's dedicated Rome EVM program OwnerInfo PDA (`G4MjJmCuZ646AAi5Vn7D2SPJuw3Hfk5TBt947nMrj2H8`):

- chain id 121215 ✓
- mint = None (no SPL gas; native SOL)
- single_state = true ✓
- registration slot = 455541477
- Derived sol_wallet PDA = `Ct4JKZoWEiXybeet5sxF2TYGMFg6swLjtbgotfyKNQCG`
- No gas pool to verify (mint=None means no SPL backing)

## Known caveats
- **Different `romeEvmProgramId`** from the shared rome-evm program. The on-chain liveness probe (v0.2+) must use this chain's `romeEvmProgramId` field, not assume the shared one. (`solanaProgramId` was the v0.3.x field name; deprecated in v0.4.0, removed in v1.0.0.)
- **No Oracle Gateway V2 deployed.** `oracle.json` carries placeholder zero-address and empty feeds; Maximus doesn't use the price-feed adapters.
- **No SPL bridged-asset wrappers.** `tokens.json` is empty (only native SOL gas, no `kind: gas` entry possible without a mint).
- **No bridge contracts.** `bridge.json` carries only the source-chain block for forward compatibility; no Phase 1 bridge work on this chain.

## Retirement
- **Date:** 2026-05-01
- **Reason:** Active devnet set is contracting around `cassius` + `marcus`. Maximus served its purpose as the Meta-Hook E2E proving ground (Meta-Hook Router v1 shipped 2026-04-17 via meta-hook#4 / sdk#300 / tests#415); no ongoing test or partner workload depends on it. Retiring frees the per-chain GCE VM, two Cloud SQL DBs, two Secret Manager secrets, and the dedicated Rome EVM program (`CX3vRqzv1y7EEf3zr7myXz7UnwJMf2GiP1fUZZpVynSs`) — the program will be `solana program close`'d separately to recover SOL rent.
- **Decommissioning trigger:** `/take-down-chain` (rome-specs#47, rome#107) — Maximus is the proving rehearsal of the new take-down pipeline.
- **Post-retirement:** chain directory preserved per registry policy (retired chains stay readable for historical lookups). On-chain liveness probe (`tools/liveness.ts:336`) already skips retired chains.

## Contacts
- Ops: @rome-protocol/ops-team
- Protocol: @rome-protocol/protocol-team — meta-hook integration testing
