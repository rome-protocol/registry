# Schema versioning policy

The registry follows [Semantic Versioning](https://semver.org/) on its NPM package and git tags. Schema changes are also versioned semantically; the package version reflects the most-impactful schema change since the last release.

## Patch (`v0.1.0` → `v0.1.1`)

Data-only change. No schema edits.

- Adding a new chain.
- Adding a new token to an existing chain.
- Rotating a contract address (via versions[] append).
- Status flip (`live` ↔ `deprecated` ↔ `retired`).
- Adding a known incident or recommended gas budget to operationalLimits.

Consumers don't need to react. NPM patch bump.

## Minor (`v0.1.0` → `v0.2.0`)

Additive schema change — backward-compatible.

- New optional field on an existing schema (consumers on the older shape still parse).
- New schema file (e.g., a hypothetical `analytics.schema.json`).
- New enum value that doesn't break existing values.

Consumers can pick up new fields when ready. Old code keeps working. NPM minor bump.

## Major (`v0.x` → `v1.0`)

Breaking schema change.

- Required-field addition.
- Field removal or rename.
- Enum value removal or semantic shift (e.g., `live` repurposed to `paused`).
- Type change.
- Format-pattern tightening that rejects previously-valid values.

Consumers must migrate. The previous major continues to receive patches for **at least 3 months** as a deprecation window; both shapes ship side-by-side under different tags before the old tag stops receiving updates. NPM major bump.

## ABI version-bump rule

For entries in `chains/<id>/contracts.json`, the `versions[].version` field is the contract's semver, not the registry's. Same deterministic test:

- **Patch** (`1.0.0 → 1.0.1`): bug fix that doesn't change ABI surface (internal logic change, no new selectors, no signature changes).
- **Minor** (`1.0.0 → 1.1.0`): new function added, new event added — backward-compatible at the ABI level.
- **Major** (`1.0.0 → 2.0.0`): function signature changed, function removed, storage layout changed, or any change that would break a consumer pinned to the prior version.

Apply the test deterministically — no judgment calls. If unsure between minor and major, choose major.

## CHANGELOG

Every release is listed in [`CHANGELOG.md`](../CHANGELOG.md) under the version heading with rationale + migration recipe. Schema changes and breaking-change windows are documented there.

## Pinning

Consumers should pin a major version of the NPM package: `"@rome-protocol/registry": "^0.1.0"`. Browser fetches via jsDelivr should pin a tag: `cdn.jsdelivr.net/gh/rome-protocol/registry@v0.1.0/...` (not `@main`). This keeps consumers stable across minor + patch updates.
