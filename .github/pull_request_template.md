<!-- See spec §Persona affordances for the rationale behind this template. -->

## What this PR changes

<!-- 1-2 sentences. Why does this PR exist? -->

## Files touched (tick what applies)

- [ ] `chains/<id>/chain.json` — adding a chain or changing core identity
- [ ] `chains/<id>/contracts.json` — contract addition / version bump
- [ ] `chains/<id>/tokens.json` — token addition / address rotation
- [ ] `chains/<id>/bridge.json` — bridge wiring change
- [ ] `chains/<id>/oracle.json` — feed addition / removal
- [ ] `chains/<id>/endpoints.json` — off-chain endpoint change
- [ ] `chains/<id>/operationalLimits.json` — gas / CPI hint change
- [ ] `chains/<id>/NOTES.md` — context update
- [ ] `abis/<name>@<ver>.json` — new contract version
- [ ] `assets/<symbol>.json` — new logical asset
- [ ] `protocols/<name>.json` — bridge protocol constant
- [ ] `solana/programs/<network>.json` — Solana program ID change
- [ ] `schema/*.schema.json` — schema change (requires CHANGELOG entry + minor/major version bump)

## Pre-merge checks

- [ ] On-chain liveness verified for any new addresses
- [ ] `npm run validate` passes locally
- [ ] CHANGELOG.md updated if this changes published behavior
