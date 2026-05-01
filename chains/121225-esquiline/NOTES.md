# Rome Esquiline — 121225

## Deploy history
- 2026-04-20 — initial deploy. Containerized L2 rollup, single-state mode. start_slot 456895943.
- 2026-04-21 — Oracle Gateway V2 deployed (PythPullAdapter + SwitchboardV3Adapter + factory + BatchReader; 5 Pyth feeds + 1 Switchboard feed).

## Why this exists
Rome devnet rollup, internal use. Single-state mode. Not partner-facing.

## Symbol convention
Same as Marcus — `USDC` is the native gas token (the chain's gas-accounting unit, 18 decimals on the EVM side, backed by the canonical Solana devnet USDC mint `4zMMC9…`).

## On-chain verification (2026-04-27)
Per docs/VERIFICATION_RULES.md §"kind: gas" — verified directly from Rome EVM program's OwnerInfo PDA (shared with Marcus + Subura, at `8pfNAVUDxJpDHFjdXWJWirNp6XpJAMacVyE99prxtZPv`):

- chain id 121225 ✓
- mint = `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (USDC) ✓
- single_state = true ✓
- registration slot = 456895943
- Derived sol_wallet PDA = `8RqCmfVsqQsjSbwpcLNEtMYnDBXnNSLT98m6mbEVv7pz`
- Derived gas pool ATA = `AemAMiD1sczXVFcLHMp4yk3CTXxBRDDDGmBn8RTw98Tb`
- Pool's on-chain mint matches; pool's token-account-level owner matches the derived sol_wallet PDA
- Pool balance at verification: 90.99998 USDC

## Known caveats
- No bridge contracts deployed on this chain (only Marcus has bridge phase 1). `bridge.json` carries only the source-chain block for forward compatibility.

## Contacts
- Ops: @rome-protocol/ops-team
- Protocol: @rome-protocol/protocol-team

## Retirement

**Date:** 2026-05-01
**Reason:** Decommissioned via `/take-down-chain`. Active devnet set is contracting around Subura + Marcus; Esquiline served its purpose as the first K8s-deployed L2 rollup (GKE Autopilot proving ground for the `rome-l2` Helm chart). Cassius (chain 121228) has now inherited that role as the canonical K8s production chain. No ongoing workload depends on Esquiline.

**Post-retirement:**
- Chain directory preserved per registry policy.
- On-chain liveness probe skips retired chains (`tools/liveness.ts:336`).
- rome-evm program registration row at chain id 121225 remains permanent on Solana (no `DeregRollup` instruction).
