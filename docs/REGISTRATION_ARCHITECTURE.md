# Chain registration — four-layer architecture

When a partner registers a new chain on Rome stack, data lands in four distinct stores. Each store has a clear purpose; copies are reconciled by the partner-portal flow rather than mirrored implicitly. This document defines what belongs where so the sovereign portal team (work-in-progress) and downstream consumers (rome-ui, cardo, rome-rewards, partners) have a single contract.

## The four layers

```
┌────────────────────────────────────────────────────────────────┐
│ Layer 1 — On-chain (Solana, immutable)                         │
│   Rome EVM program OwnerInfo PDA + sol_wallet gas-pool ATA     │
│   Source: Rome EVM program — `reg_owner` instruction           │
└────────────────────────────────────────────────────────────────┘
                            ▲ (one-shot, signed by registration_key)
                            │
┌────────────────────────────────────────────────────────────────┐
│ Layer 2 — Operator (automation deploy registry)                   │
│   services, infrastructure, image tags, health, deployment mode│
│   Source: operator-side deploy registry (private)              │
└────────────────────────────────────────────────────────────────┘
                            ▲ (provisioning workflow)
                            │
┌────────────────────────────────────────────────────────────────┐
│ Layer 3 — Sovereign Portal DB (Postgres, partner-private)      │
│   Submission state, audit log, contacts, use case, jurisdictions│
│   Source: Sovereign Portal database schema (private)           │
│   Status: WIP — schema may evolve                              │
└────────────────────────────────────────────────────────────────┘
                            ▲ (partner-driven Wizard)
                            │
┌────────────────────────────────────────────────────────────────┐
│ Layer 4 — Public Registry (rome-protocol/registry)             │
│   Canonical chain/contract/token metadata for external builders│
│   Source: this repo                                            │
└────────────────────────────────────────────────────────────────┘
                            ▲ (curated PR; CI-validated)
                            │
                    External integrators
```

The flow is **top-down at registration time** (partner submits Wizard → admin reviews → ops provisions → on-chain `reg_owner` signs → resulting addresses captured in registry PR), but the four layers stay distinct and source-of-truth for their concern.

## Layer 1 — what lives on-chain

The `OwnerInfo` PDA (a single account, multi-chain, owned by the Rome EVM program) carries one entry per registered chain:

| Field | Type | Notes |
|---|---|---|
| `chain` | `u64` | Chain id; must be unique |
| `mint` | `Option<Pubkey>` | Gas mint. `None` when chain uses SOL as gas; `Some(..)` for SPL gas |
| `slot` | `u64` | Registration slot (auto, from clock) |
| `single_state` | `bool` | Chain mode — `true` = single-state Rome (no op-geth); `false` = dual via op-geth |

When `mint` is set, registration ALSO auto-creates the `sol_wallet`'s gas-pool ATA. That's the entire on-chain state.

The `reg_owner` instruction must be signed by `registration_key::ID` (Rome-controlled). Partners cannot self-register; they go through Layer 3 (the portal).

**This is the only immutable record.** Layers 2–4 can be re-derived or rewritten; Layer 1 cannot without a migration.

## Layer 2 — what lives in automation (operator-side)

Per-chain entry in the operator-side deploy registry (private). Operator-private (cloud credentials, server IPs not for public consumption):

- `chain_id`, `rollup_name`, `environment`
- `mode` — `single_state` or `dual` (matches on-chain `single_state`)
- `program_id`, `solana_rpc`, `domain`
- `services` — `proxy.version`, `proxy.port`, `hercules.version`, `hercules.port`, etc.
- `build` — `docker_image`, branch refs (rome_apps, rome_evm, rome_sdk), feature flag
- `infrastructure` — `cloud`, `project`, `region`, `server_ip`
- `registration` — `owner_info_pda`, `registration_slot`, `registration_tx` (links Layer 2 → Layer 1)
- `gas_pricing` — `meteora_pool`, `type` (operator hint; canonical version surfaces in Layer 4 `gasPricing.json`)
- `deployed_at`, `deployed_by`, `status`, `last_health_check`, `notes`

**Per-entry additions:**
- `deployment_mode` — three values:
  - `internal` — Rome team operates this rollup for our own use (testing, integration, dev). **Not partner-facing.** Internal rollups today (Marcus and the local `testrollup` stack) carry this mode.
  - `full_service` — Rome runs validator + Hercules + proxy on behalf of a partner. Partner submitted via Sovereign Portal.
  - `self_hosted` — Partner runs everything; Rome only stamps the on-chain registration via the Rome-controlled `registration_key`.
- `sovereign_submission_id` — `string | null` back-link to the Layer 3 portal record. `null` for `internal` rollups (no partner).

## Layer 3 — what lives in the Sovereign Portal DB

`Submission.data` is a JSON blob conforming to the portal's wizard schema. Partner-private until approved:

**Always private (never leaves Layer 3):**
- Contact info: `email`, `twitter`, `telegram`, `discord`, `website`
- Auth: `authMethod`, `authWallet`, `authEmail`
- Business: `description`, `useCase`, `useCaseOther`, `txVolume`, `jurisdictions`
- Compliance identity: `issuerMint` (partner's issuer key)
- Submission lifecycle: status, reviewer, audit log, version snapshots, provisioning checklist

**Pass-through to Layer 2 / Layer 4:**
- `chainId`, `env`, `stateMode` → drive Layer 1 (`reg_owner` args) + Layer 2 + Layer 4 `chain.json`
- `gasType`, `gasMint`, `gasPool`, `gasOracle` → drive Layer 1 (`mint` arg) + Layer 4 `tokens.json` + `gasPricing.json`
- `adminAddr` → Layer 2 (operator records the partner's admin key for emergency contact; key itself stays partner-owned)
- `cpiPrograms`, `wrapTokens` → declared at registration; once deployed they surface in Layer 4 `contracts.json` / `tokens.json`
- `addons` (bridge / explorer / via / swap / warp / oracle / metahook) → drive Layer 2 deploy decisions; resulting addresses surface in Layer 4
- `complianceMode`, `complianceAddr` → Layer 4 `contracts.json` (the deployed compliance contract address is public)
- `tokName`, `tokSymbol`, `tokDecimals`, `tokSupply` → Layer 4 `tokens.json` once the mint is created
- `registerMetaHook` → Layer 2 deploys the meta-hook; address surfaces in Layer 4

**Rule of thumb:** anything an external integrator needs to call → Layer 4. Anything Rome ops needs to operate → Layer 2. Anything about the partner's identity, billing, contact, business → Layer 3 only.

## Layer 4 — what lives in this registry

Already specified in the main spec. Repeated here for completeness:

- `chains/<id>/chain.json` — chainId, name, network, rpcUrl, explorerUrl, nativeCurrency, status
- `chains/<id>/contracts.json` — every Rome-deployed Solidity contract relevant to integrators (bridge, factories, oracle, paymaster, partner CPI adapters once deployed, meta-hook, compliance contract if deployed)
- `chains/<id>/tokens.json` — gas + curated wrappers (NOT every ad-hoc factory-deployed token; see VERIFICATION_RULES.md §"Curation policy")
- `chains/<id>/bridge.json` — bridge wiring (only if chain participates in CCTP/Wormhole)
- `chains/<id>/oracle.json` — oracle factory + feeds (if oracle addon deployed)
- `chains/<id>/endpoints.json` — off-chain endpoint URLs (CCTP IRIS, Wormhole spy)
- `chains/<id>/operationalLimits.json` — gas / CPI hints, known incidents
- `chains/<id>/gasPricing.json` — pricing pool reference (`type: default` if no pool yet)
- `chains/<id>/NOTES.md` — narrative

## Worked example — partner full-service flow

1. Partner fills out Wizard in Sovereign Portal.
2. Submission lands in Layer 3 (status: SUBMITTED). Admin reviews.
3. Admin approves. Provisioning kicks off:
   - Ops creates Layer 2 entry (services, infra, deploy mode = full_service).
   - Ops deploys Solana validator (if full-service), Hercules, proxy, op-geth (if dual mode).
   - Ops calls `reg_owner` with (`chainId`, `single_state`, `mint`) signed by registration_key — this writes Layer 1 + auto-creates gas pool.
   - Ops deploys partner-requested Rome contracts per `addons` (bridge / oracle / etc.) on the new chain.
4. Ops opens a registry PR (Layer 4) with `tools/add-chain.ts --deployments-from <partner-deployments.json>`. The PR carries:
   - chain.json
   - contracts.json (whatever was deployed)
   - tokens.json (gas entry + any pre-declared wrapTokens once registered through factory)
   - gasPricing.json (initially `default`, swapped to pool-based when partner opens their pool)
   - bridge.json / oracle.json if those addons were deployed
   - NOTES.md with the partner provenance link
5. CI runs schema validation + on-chain liveness probe (Layer 4 contents are verified against Layer 1).
6. CODEOWNERS routes to ops + protocol; production-chain entries require two ops-team approvals.
7. Partner is now public via Layer 4. External builders can integrate.

## Worked example — partner self-hosted flow

Same as above, except:
- Step 3: ops creates Layer 2 entry with `deployment_mode: self_hosted`. Partner runs their own Solana validator + Hercules + proxy on their own infrastructure. Ops still owns the operator-side metadata (image tags, configs Rome supports).
- Step 3: Partner signs `reg_owner` themselves? No — `reg_owner` is gated by `registration_key::ID` which Rome holds. Partner submits the desired (chainId, mint, single_state) to Rome via the portal; Rome's ops team signs and submits the on-chain registration. Partner runs the chain after registration completes.
- Step 4–7: identical. Layer 4 is the same regardless of who runs the validator.

## Provenance — linking the layers

Each registered chain's Layer 4 `chain.json` should optionally carry a `provenance` block (schema bump for v0.2):

```json
{
  "provenance": {
    "registrationSlot": 458123456,
    "registrationTx": "5abcd…",
    "deploymentMode": "full_service",
    "sovereignSubmissionId": "cl_abc123"
  }
}
```

This makes the layer-to-layer linkage explicit. Tracked as a v0.2 follow-up — see TaskList.

## What this registry is NOT

- Not a partner identity store (Layer 3)
- Not an operator runbook (Layer 2)
- Not the immutable record (Layer 1)
- Not a partner-private channel (everything in Layer 4 is public)

When a Wizard field doesn't fit Layer 4, it stays in Layer 3 (or Layer 2 if operator). The boundary is "would an external integrator need this to talk to the chain?" — yes → Layer 4; no → wherever it actually originates.
