# Rome Cassius — 121228

## Deploy history
- 2026-04-29 — initial deploy

## Why this exists
<1-3 sentences on what this chain is for and who runs it>

## Known caveats
- <gotcha 1>

## Contacts
- Ops: <team / channel>
- Protocol: <team / channel>

## Retirement

**Date:** 2026-05-01
**Reason:** Decommissioned via `/take-down-chain`. Cassius served as the validation chain for several multi-chain refactors that landed during its lifetime: the multi-chain `rome-oracle-portal` (PR #18, marcus + cassius alongside), the chain-agnostic Rome Via UI + 4-service stack (rome-via PR #37, rome-ops PRs #105–#120), the `--new-program` bring-up path (cassius runs its own dedicated `rome-evm-private` program separate from the canonical devnet program), and the multi-chain rome-ui chains.yaml schema. With those patterns proven and merged, the running cassius chain is no longer load-bearing — it served its bring-up validation purpose. Active devnet set is contracting around Subura + Marcus following the Maximus + Esquiline + Aventine take-downs earlier today.

**Post-retirement:**
- Chain directory preserved per registry policy.
- On-chain liveness probe skips retired chains (`tools/liveness.ts:336`).
- rome-evm program registration row at chain id 121228 remains permanent on Solana (no `DeregRollup` instruction).
- Cassius's dedicated rome-evm program at `5uBA85gDpaRE3Btd3SiPCsFts5H1QQJbrwwW5zmvcaSH` is upgradeable and still holds rent SOL — operator can recover that SOL separately via `solana program close` (out of scope here, requires cold-ledger access).
- Future chain bring-ups requiring multi-chain validation will use a fresh chain id; cassius's id is reserved for historical lookup only.
