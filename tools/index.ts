// index.ts — public NPM API for @rome-protocol/registry.
//
// Consumers do:
//   import { getChain, listTokens, getAsset } from "@rome-protocol/registry";
//
// Reads JSON files from the package's own root at runtime. The package ships
// the chains/, assets/, abis/, protocols/, solana/ directories alongside dist/
// (see package.json `files`), so resolution works once installed via npm.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  RomeChainCoreIdentity,
  PerChainSolidityContractRegistry,
  PerChainCanonicalTokenList,
  LogicalAssetCatalogEntry,
  PerChainBridgeWiring,
  PerChainOracleGatewayConfig,
  PerChainOffChainEndpoints,
  PerChainOperationalLimitsAndKnownIncidents,
  CrossChainBridgeProtocolConstants,
  SolanaProgramIDsPerNetwork,
  SolanaLiquidStakingTokenMintsPerNetwork,
} from "./types.js";

// Resolve the package root. When installed via NPM, dist/index.js sits one
// directory below the package root; the registry data lives at the package root.
const PKG_ROOT = (() => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/index.js → ../  ;  tools/index.ts (dev mode) → ../  — same heuristic.
  return path.resolve(here, "..");
})();

let _registryRoot = PKG_ROOT;

/** Override the registry root (test only). */
export function _setRegistryRoot(root: string): void {
  _registryRoot = root;
}

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(_registryRoot, rel), "utf8")) as T;
}

function chainSlug(chainId: number): string | undefined {
  const dir = path.join(_registryRoot, "chains");
  if (!existsSync(dir)) return undefined;
  const found = readdirSync(dir).find((d) => d.startsWith(`${chainId}-`));
  return found;
}

// ── Chain ────────────────────────────────────────────────────────────────────

export function getChain(chainId: number): RomeChainCoreIdentity | undefined {
  const slug = chainSlug(chainId);
  if (!slug) return undefined;
  return readJson<RomeChainCoreIdentity>(`chains/${slug}/chain.json`);
}

export function listChains(): RomeChainCoreIdentity[] {
  const dir = path.join(_registryRoot, "chains");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => /^\d+-/.test(d))
    .map((d) => readJson<RomeChainCoreIdentity>(`chains/${d}/chain.json`));
}

// ── Contracts ────────────────────────────────────────────────────────────────

type ContractEntry = PerChainSolidityContractRegistry extends Array<infer T> ? T : never;
type ContractVersion = ContractEntry extends { versions: Array<infer V> } ? V : never;

export function listContracts(chainId: number): ContractEntry[] {
  const slug = chainSlug(chainId);
  if (!slug) return [];
  return readJson<ContractEntry[]>(`chains/${slug}/contracts.json`);
}

/** Returns the live version of a named contract on the given chain. */
export function getContract(chainId: number, name: string): ContractVersion | undefined {
  const entry = listContracts(chainId).find((c: any) => c.name === name);
  if (!entry) return undefined;
  const live = (entry as any).versions.find((v: any) => v.status === "live");
  return live as ContractVersion | undefined;
}

// ── Tokens ───────────────────────────────────────────────────────────────────

type TokenEntry = PerChainCanonicalTokenList extends Array<infer T> ? T : never;

export function listTokens(chainId: number): TokenEntry[] {
  const slug = chainSlug(chainId);
  if (!slug) return [];
  return readJson<TokenEntry[]>(`chains/${slug}/tokens.json`);
}

// ── Assets (cross-chain catalog) ────────────────────────────────────────────

export function getAsset(symbol: string): LogicalAssetCatalogEntry | undefined {
  const p = `assets/${symbol.toLowerCase()}.json`;
  if (!existsSync(path.join(_registryRoot, p))) return undefined;
  return readJson<LogicalAssetCatalogEntry>(p);
}

export function listAssets(): LogicalAssetCatalogEntry[] {
  const dir = path.join(_registryRoot, "assets");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<LogicalAssetCatalogEntry>(`assets/${f}`));
}

// ── Bridge / oracle / endpoints / operationalLimits ─────────────────────────

export function getBridge(chainId: number): PerChainBridgeWiring | undefined {
  const slug = chainSlug(chainId);
  if (!slug) return undefined;
  return readJson<PerChainBridgeWiring>(`chains/${slug}/bridge.json`);
}

export function getOracle(chainId: number): PerChainOracleGatewayConfig | undefined {
  const slug = chainSlug(chainId);
  if (!slug) return undefined;
  return readJson<PerChainOracleGatewayConfig>(`chains/${slug}/oracle.json`);
}

export function getEndpoints(chainId: number): PerChainOffChainEndpoints | undefined {
  const slug = chainSlug(chainId);
  if (!slug) return undefined;
  return readJson<PerChainOffChainEndpoints>(`chains/${slug}/endpoints.json`);
}

export function getOperationalLimits(chainId: number): PerChainOperationalLimitsAndKnownIncidents | undefined {
  const slug = chainSlug(chainId);
  if (!slug) return undefined;
  return readJson<PerChainOperationalLimitsAndKnownIncidents>(`chains/${slug}/operationalLimits.json`);
}

// ── Protocols + Solana programs (cross-cutting) ─────────────────────────────

export function getProtocol(name: "cctp" | "wormhole"): CrossChainBridgeProtocolConstants {
  return readJson<CrossChainBridgeProtocolConstants>(`protocols/${name}.json`);
}

export function getSolanaPrograms(network: "mainnet" | "devnet"): SolanaProgramIDsPerNetwork {
  return readJson<SolanaProgramIDsPerNetwork>(`solana/programs/${network}.json`);
}

/// Solana liquid-staking-token mints, keyed by symbol (JitoSOL / bSOL /
/// mSOL / JupSOL / etc.). Cardo's stake intent ranks across these.
/// Adding a new LST here surfaces it in /orchestrator's stake routes.
///
/// Devnet doesn't have most LSTs deployed; the file may be absent there
/// (returns undefined).
export function getSolanaLstMints(
  network: "mainnet" | "devnet",
): SolanaLiquidStakingTokenMintsPerNetwork | undefined {
  const p = `solana/lst-mints/${network}.json`;
  if (!existsSync(path.join(_registryRoot, p))) return undefined;
  return readJson<SolanaLiquidStakingTokenMintsPerNetwork>(p);
}
