# registry — agent context

This file gives Claude Code (and any other agent) the canonical map of the Rome registry: what's tracked, where it lives, and how to mutate it safely.

**Inherits from `/Users/anilkumar/rome/CLAUDE.md`** — verify-before-proposing, mainnet immutability, shared-resource preservation, and the Ethereum-equivalent design principle apply here too.

## What this repo is

The Rome registry is the **canonical source of truth** for:

- **Chains** — per-chain identity (chainId, RPC URL, contracts, tokens, gas pricing, oracle adapters, bridge wiring)
- **Programs** — per-rome-evm-program identity (current build, authority, lifecycle, chains hosted)
- **Services** — shared services that span programs/chains (rome-ui-worker, oracle-keeper, monitoring, bridge relayers, frontend apps, block explorers)
- **Solana clusters** — versioned cluster compatibility metadata
- **Cross-cutting**: assets, protocols, schemas

Published as `@rome-protocol/registry` on npm; consumed at runtime by rome-ui, rome-via, oracle-portal, cardo, and any other Rome subproject.

## Three first-class namespaces

```
registry/
  chains/<id>-<slug>/                    # per-chain records
    chain.json                           # identity (chainId, RPC, status, network)
    contracts.json                       # Solidity contracts deployed on this chain
    tokens.json                          # token registry
    bridge.json                          # bridge wiring
    endpoints.json                       # additional RPC/explorer endpoints
    gasPricing.json                      # gas pool config (Meteora etc.)
    operationalLimits.json               # per-chain limits
    oracle.json                          # oracle adapter addresses
    NOTES.md                             # narrative deploy history
  programs/<programId>/                  # per-rome-evm-program records
    program.json                         # identity, role, currentAuthority, current build
    upgrades.json                        # append-only deploy log
    authority.json                       # append-only authority-rotation log
    NOTES.md                             # optional narrative
  programs/index.json                    # cluster→primary pointer + flat program inventory
  services/<service>/                    # shared services (rome-ui-worker, monitoring, etc.)
    service.json                         # identity, scope, servesPrograms[], secretRefs[]
  solana/                                # cluster versions
    clusters.json
  schema/                                # JSON Schema (draft 2020-12) for everything above
    chain.schema.json
    program.schema.json
    programIndex.schema.json
    programUpgrade.schema.json
    programAuthority.schema.json
    service.schema.json
    contracts.schema.json
    tokens.schema.json
    ... (one per artifact)
  assets/, protocols/, tools/, docs/     # cross-cutting
```

Each artifact has a JSON Schema in `schema/`. CI validates every PR against schemas via `ajv`.

## Key conventions

### Vanity prefix for new program IDs

When `/deploy-program` provisions a new rome-evm program, it grinds a vanity prefix via `solana-keygen grind --starts-with`:

| Cluster | Prefix | Example |
|---|---|---|
| `mainnet` | `RomeP` | `RomePxMzQk7vN8pH3wF6gT4cJ…` |
| `devnet` | `RomeD` | `RomeDpHjN9aF4qX5vK2sM8wL6…` |

Lowercase `o` is required (capital `O` is excluded from base58). One-time grind (~2 min on M-series Mac); zero SOL cost. The convention is documented in `programId.description` of `program.schema.json`; it's enforced at deploy time by the skill, not by the schema (legacy/imported programs may not match — CI may warn but won't reject).

### Mainnet immutability — agent boundaries

**No agent / skill / script writes to mainnet for destruction. Ever.**

- `/take-down-chain`, `/close-program`, `/rotate-program-authority`, `/decommission-service` (when drafted) all hard-fail when targeting mainnet.
- `scripts/clean-slate/sweep.sh` includes a `MAINNET_GUARD` that refuses to run if any chain.json has `network: "mainnet"`.
- CI invariant: setting `program.json#status = "retired" | "closed"`, `program.json#decommissionedAt`, or `program.json#closedAt` on a mainnet program requires a human-tagged commit. No automation co-author allowed.

Mainnet teardown / authority rotation / program close = operator-typed at the gcloud / solana CLI by hand.

### Shared-resource preservation — surgical destroy

**Chain teardown is surgical. Only chain-owned resources die. Anything shared stays.**

- Chain teardown uses ONLY `terraform destroy -target=module.<chain>` (and `module.rome_via_<chain>` if applicable). NEVER bare `terraform destroy`. NEVER target shared modules (`module.cloudsql_instance`, `module.dns_zone`, `module.gke`, `module.networking`).
- Shared maps in TF code (e.g. `iam.tf devnet_vm_sas`) get **edited** to remove the chain's entry — never destroyed (the Maximus foot-gun).
- Shared workers (rome-ui worker, bridge relayers, oracle keeper, monitoring) — NEVER destroyed by chain teardown. Their **configs are edited** to remove chain references; workers redeployed.
- Shared infrastructure (Solana RPC nodes, Cloud SQL instance, GKE cluster, DNS zone, VPC, monitoring) — NEVER destroyed by chain or program teardown.

### Reference-counted service lifecycle

`service.json#scope` enum: `chain | program | cluster | global`. Bring-up and teardown of chains/programs treat shared services as reference-counted resources:

| Scope | First chain/program in cluster | Subsequent | Last leaves |
|---|---|---|---|
| `chain` | Created with chain | n/a (1:1) | Destroyed with chain |
| `program` | Created if missing | Config edited; reference appended to `servesPrograms[]` | Reference removed; service stays alive; explicit `/decommission-service` (operator-confirmed) required to actually destroy |
| `cluster` | Created if missing on first user | Reference added | Never auto-decommissioned |
| `global` | Independent | Independent | Independent |

`service.json#secretRefs[].preservation`:
- `edit-only` — secret persists for the service's lifetime; only its content (e.g. JSON entries inside) gets added/removed by bring-up/teardown
- `delete-with-service` — secret is owned by the service; cleaned up only when `/decommission-service` runs

### Authority storage kinds (programs/services)

`currentAuthority.kind` enum across `program.schema.json` and `service.schema.json`:

- `cold-ledger` — hardware wallet (Ledger Flex / Stax / Nano X / Nano S+); sibling `ledger.derivationPath` required
- `hot-keypair` — local file on operator machine; sibling `localKeypair.pathHint` required
- `gsm-keypair` — Google Secret Manager (or equivalent); sibling `secretManager.{provider, project, secretId}` required
- `squads-v4-multisig` — on-chain Squads V4 multisig PDA; sibling `multisig.{multisigPda, threshold, members[]}` required
- `frozen` — authority is a non-signing pubkey (no upgrades possible by this path)
- `burned` — authority is `11111111111111111111111111111111` (System Program); program permanently immutable

**Authority key material is NEVER stored in this registry.** Only metadata (pubkey + storage location). GSM is allowed but not required.

## Lifecycle skills (in `rome-protocol/rome/.claude/skills/`)

| Skill | Operates on | Reads | Writes |
|---|---|---|---|
| `/deploy-program` | initial deploy of a new program ID | nothing (creates) | `programs/<id>/{program,upgrades,authority}.json`; `programs/index.json` |
| `/upgrade-program` (with Phase 6 patch) | upgrading existing program | `programs/<id>/program.json#currentAuthority` | append to `programs/<id>/upgrades.json`; replace `programs/<id>/program.json#current` |
| `/close-program` | retired program with `chainsHosted=[]` | `programs/<id>/program.json` (assert `status in (retired, decommissioning)` + `chainsHosted=[]`) | set `status=closed`, `closedAt`, `rentRecipient`; append authority.json `kind: burn` |
| `/rotate-program-authority` | authority change | `programs/<id>/program.json#currentAuthority` | replace `currentAuthority`; append authority.json `kind: rotation/freeze/burn` |
| `/take-down-chain` | chain decommission | `chains/<id>-<slug>/chain.json` (assert not mainnet) | set chain status to retired; remove chain from `programs/<programId>/program.json#chainsHosted`; remove from `services/<service>/service.json#servesPrograms[]` if applicable |
| `/bring-up-chain` / `/prepare-rollup` | chain bring-up | `programs/index.json#primary[<cluster>]` for default program | create `chains/<id>-<slug>/`; append to `programs/<id>/program.json#chainsHosted`; ensure shared services exist (provision if first-time) and add reference |
| `/promote-program` (when drafted) | secondary→primary | `programs/index.json` | flip `primary[<cluster>]`; demote prior primary to secondary; update both programs' `roleHistory` |
| `/decommission-service` (when drafted) | service with `servesPrograms[]=[]` | `services/<service>/service.json` | set `lifecycle.decommissionedAt`; destroy infrastructure |
| `/publish-registry-pr` | any registry change | scattered | edits + opens single-purpose PR per `SCHEMA_VERSIONING.md` |

All lifecycle skills inherit from `/Users/anilkumar/rome/CLAUDE.md`'s **mainnet immutability** rule (Iron Law #6 of `/deploy-program`) and **surgical scope** rule (Iron Law #7).

## Spec & design docs

- **Programs/services namespace + clean-slate teardown design**: [`rome-specs/active/technical/2026-05-02-registry-programs-namespace.md`](https://github.com/rome-protocol/rome-specs/blob/main/active/technical/2026-05-02-registry-programs-namespace.md)
- **Existing registry design** (chains/, contracts, tokens conventions): [`rome-specs/active/technical/2026-04-27-rome-registry-design.md`](https://github.com/rome-protocol/rome-specs/blob/main/active/technical/2026-04-27-rome-registry-design.md)
- **Verification rules / curation policy** (what's tracked here vs on-chain event watcher): [`docs/VERIFICATION_RULES.md`](docs/VERIFICATION_RULES.md)
- **Schema versioning policy**: [`docs/SCHEMA_VERSIONING.md`](docs/SCHEMA_VERSIONING.md)

## Mutating the registry — agent flow

1. **Check schemas** under `schema/`. Every artifact has a JSON Schema.
2. **Validate locally** before commit: `npm run validate` (or whatever the project provides via `package.json`).
3. **Use `/publish-registry-pr`** when possible — it edits the right JSON files, runs validate + tests + liveness, bumps `package.json` per `SCHEMA_VERSIONING.md`, and opens a single-purpose PR. Don't hand-craft registry PRs unless `/publish-registry-pr` doesn't fit the scenario.
4. **Mainnet writes need human-tagged commits.** No automation co-author on mainnet status / closedAt / decommissionedAt changes.
5. **One PR = one logical change.** Don't bundle program upgrade with chain registration in one PR; separate concerns.

## Common Solana program IDs (programs/index.json policy)

- `programs/index.json#primary[<cluster>]` — exactly one primary per cluster (CI invariant)
- New chains via `/prepare-rollup` default to `programs/index.json#primary[<cluster>]` unless `--program-id` overrides
- Promotion (secondary → primary) goes through `/promote-program`, which atomically updates both programs' `roleHistory` AND `index.json#primary[<cluster>]`

## Don'ts

- Don't hand-edit `programs/<id>/upgrades.json` or `authority.json` — those are append-only logs maintained by skills. If you must hand-edit (e.g., backfilling historical data), open a PR with `chore: backfill` and explain why.
- Don't put authority key material in this registry. Ever. Only pubkeys + storage-location metadata.
- Don't add `network: "mainnet"` chains via automation. Mainnet bring-up is operator-driven; agent skills will hard-fail.
- Don't delete `services/*` infrastructure as a side-effect of chain or program teardown. Use `/decommission-service` explicitly when ref-count hits zero AND operator confirms.
- Don't grind a vanity prefix longer than 6 characters — diminishing returns and 7+ takes hours.

## Inheritance

All conventions from `/Users/anilkumar/rome/CLAUDE.md` apply here:
- Verify before proposing — every claim backed by code/doc/runtime evidence
- Ethereum-equivalent design principle (this repo is mostly metadata, but downstream consumers care)
- Mainnet is operator-only

Per-subproject CLAUDE.mds in dependent repos (rome-ui, rome-via, oracle-portal, etc.) inherit from this one for registry-consumer concerns.
