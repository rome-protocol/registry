# Changelog

All notable changes to the rome-registry project documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and the project follows [Semantic Versioning](https://semver.org/) per the spec's schema-evolution policy.

## [Unreleased]

## [0.4.17] - 2026-05-04

### Reset

- **README** — collapsed to a POC stub. Removed retired-chain references and version-pinned example URLs in favour of `@latest`.
- **CHANGELOG** — earlier history collapsed into this single entry. The registry was a moving target through 2026-04 / 2026-05 (chain bring-ups, retirements, schema iterations); none of that history applies to current state. v0.4.x git tags before this point have been removed from GitHub releases — start fresh from v0.4.17.

### State at this point

- 0 chains under `chains/`
- 0 programs under `programs/`
- 1 service under `services/` (`rome-ui-worker`, `lifecycle.decommissionedAt` set)
- Schemas under `schema/` for chain / program / service / contracts / tokens / bridge / oracle / endpoints / operationalLimits / gasPricing / asset / protocol / clusters / programIndex / programUpgrade / programAuthority / lstMints
- Tooling under `tools/`: `add-chain`, `add-bundle`, `validate`, `liveness`, `drift-check`, `codegen`
