// add-bundle.ts — bundled chain bring-up scaffolder.
//
// Lands a complete chain bring-up (chain seed + N contracts + wrappers) into
// the registry as a single PR, instead of the legacy 1-chain + N-contract PR
// pattern (~18 PRs per Cassius-style bring-up). Reads a bring-up manifest
// (`~/rome/rome-ops/ansible/deployments/manifests/<chain-name>/current.json`)
// and writes the full `chains/<id>-<slug>/` tree in one shot.
//
// Usage:
//   npx tsx tools/add-bundle.ts \
//     --manifest ~/rome/rome-ops/ansible/deployments/manifests/<chain>/current.json \
//     [--registry-root <path>]
//
// The CLI is a wrapper that does the file-writing; the actual git commit +
// push + PR creation is handled by the rome.git `/publish-registry-pr` skill.
//
// Idempotent: re-running with the same manifest is a no-op on contracts (it
// won't duplicate `versions[]` entries). Token entries are recomputed in full
// from the manifest each run — re-running with a different wrapper set
// replaces the existing list. Run `git diff` afterwards to inspect.

import {
  readFileSync, writeFileSync, existsSync,
} from "node:fs";
import path from "node:path";
import { addChainFresh } from "./add-chain.js";

// ── Manifest types (subset; we only read what we need) ─────────────────────

type ManifestContract = {
  name: string;
  version: string;
  address: string;
  bytecodeSha256?: string;
  compilerVersion?: string;
  deployedAt: string;
};

type ManifestComponentSrc = {
  git_sha?: string;
  solc_version?: string;
  contracts?: ManifestContract[];
};

type Manifest = {
  schema_version: string;
  chain: {
    id: number;
    slug: string;
    network: "mainnet" | "testnet" | "devnet" | "local";
  };
  components: {
    "rome-evm-private"?: { git_sha?: string };
    "gas-token"?: {
      mint: string;
      decimals: number;
      symbol: string;
    };
    "rome-solidity"?: ManifestComponentSrc;
    "rome-uniswap-v2"?: ManifestComponentSrc;
    [k: string]: unknown;
  };
  program_id: string;
  rpc: { url: string; chain_id_hex?: string };
  gas_pool?: { address: string; type: string };
  // Optional explicit wrappers block — preferred when present. Each entry maps
  // a wrapper symbol to its underlying SPL mint and underlying-chain refs.
  wrappers?: Record<string, {
    address?: string;
    underlying_mint?: string;
    underlying_chain?: string;
    underlying_asset?: string;
    decimals?: number;
  }>;
  solana?: {
    cluster?: "mainnet" | "devnet";
    tested?: { version: string; verifiedAt: string; notes?: string };
  };
};

// ── Public API ─────────────────────────────────────────────────────────────

export type BundleArgs = {
  registryRoot: string;
  manifestPath: string;
};

export type BundleResult = {
  chainDir: string;
  chainId: number;
  slug: string;
  contractCount: number;
  wrapperCount: number;
  newPackageVersion: string;
};

export function addBundle(args: BundleArgs): BundleResult {
  const manifest = readManifest(args.manifestPath);
  const { id: chainId, slug, network } = manifest.chain;
  validateSlug(slug);

  const name = humanizeName(slug);
  const explorerUrl = explorerUrlFor(slug, network);
  const nativeCurrency = deriveNativeCurrency(manifest, name);

  // Step 1: Scaffold via addChainFresh (writes chain.json, contracts.json:[],
  // tokens.json:[], bridge/oracle/endpoints/operationalLimits/NOTES.md).
  const chainDir = addChainFresh({
    registryRoot: args.registryRoot,
    chainId,
    slug,
    name,
    network,
    rpcUrl: manifest.rpc.url,
    explorerUrl,
    nativeCurrency,
  });

  // Step 2: Patch chain.json with romeEvmProgramId + solana block.
  patchChainJson(chainDir, manifest);

  // Step 3: Write contracts.json from manifest contracts[] arrays.
  const contractCount = writeContractsJson(chainDir, manifest);

  // Step 4: Write tokens.json (gas-token + spl_wrapper entries).
  const wrapperCount = writeTokensJson(chainDir, manifest);

  // Step 5: Update CHANGELOG.md.
  updateChangelog(args.registryRoot, chainId, slug, name);

  // Step 6: Bump package.json version (patch — pure data add).
  const newPackageVersion = bumpPackageVersion(args.registryRoot);

  return {
    chainDir,
    chainId,
    slug,
    contractCount,
    wrapperCount,
    newPackageVersion,
  };
}

// ── Implementation ─────────────────────────────────────────────────────────

function readManifest(manifestPath: string): Manifest {
  if (!existsSync(manifestPath)) {
    throw new Error(`add-bundle: manifest not found: ${manifestPath}`);
  }
  const m = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (!m.chain?.id || !m.chain?.slug || !m.chain?.network) {
    throw new Error(
      `add-bundle: manifest.chain must include {id, slug, network}; got ${JSON.stringify(m.chain)}`,
    );
  }
  if (!m.program_id) {
    throw new Error(`add-bundle: manifest.program_id is required (Rome EVM program for this chain).`);
  }
  if (!m.rpc?.url) {
    throw new Error(`add-bundle: manifest.rpc.url is required.`);
  }
  if (!["mainnet", "testnet", "devnet", "local"].includes(m.chain.network)) {
    throw new Error(`add-bundle: manifest.chain.network must be one of mainnet|testnet|devnet|local.`);
  }
  return m;
}

function validateSlug(slug: string): void {
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `add-bundle: chain.slug must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ (lowercase, hyphen-separated). Got '${slug}'.`,
    );
  }
}

function humanizeName(slug: string): string {
  // "marcus" → "Rome Marcus"; "marcus-test" → "Rome Marcus Test"
  return "Rome " + slug.split("-").map(capitalize).join(" ");
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function explorerUrlFor(slug: string, network: string): string {
  // Same pattern marcus uses: https://romescout-<slug>.<network>.romeprotocol.xyz/
  // Devnet/testnet share the *.devnet.romeprotocol.xyz pattern in practice
  // (per rome-ops registry convention); mainnet is .romeprotocol.xyz.
  const subdomain = network === "mainnet" ? "" : `.${network === "local" ? "local" : "devnet"}`;
  return `https://romescout-${slug}${subdomain}.romeprotocol.xyz/`;
}

function deriveNativeCurrency(
  manifest: Manifest,
  chainName: string,
): { name: string; symbol: string; decimals: number } {
  // Native currency `decimals` on EVM is always 18 (Ethereum-equivalent).
  // Symbol mirrors the gas-token symbol (e.g., "USDC" or "SOL"). Name uses
  // the humanized chain name so wallets show "Rome <slug>" as the currency.
  const symbol = manifest.components["gas-token"]?.symbol;
  if (!symbol) {
    throw new Error(`add-bundle: manifest.components.gas-token.symbol is required.`);
  }
  return { name: chainName, symbol, decimals: 18 };
}

function patchChainJson(chainDir: string, manifest: Manifest): void {
  const chainPath = path.join(chainDir, "chain.json");
  const chain = readJson(chainPath);

  chain.romeEvmProgramId = manifest.program_id;

  if (manifest.solana?.cluster) {
    chain.solana = {
      cluster: manifest.solana.cluster,
      ...(manifest.solana.tested ? { tested: manifest.solana.tested } : {}),
    };
  } else {
    // Default: derive cluster from network (testnet/devnet → devnet, mainnet → mainnet,
    // local → omit). Bring-up runbook always sets devnet for L2s.
    if (manifest.chain.network === "mainnet") {
      chain.solana = { cluster: "mainnet" };
    } else if (manifest.chain.network === "devnet" || manifest.chain.network === "testnet") {
      chain.solana = { cluster: "devnet" };
    }
    // local: leave solana absent
  }

  writeJson(chainPath, chain);
}

function writeContractsJson(chainDir: string, manifest: Manifest): number {
  // Combine rome-solidity + rome-uniswap-v2 contracts. Each gets its repo's
  // git_sha + solc_version as the source provenance. Contract names from the
  // two repos do not collide in practice (the bring-up runbook uses
  // ERC20SPLFactory_uv2 to disambiguate the uniswap-v2 SPL factory from the
  // rome-solidity one); on collision, abort.
  const entries: Array<{ name: string; versions: ContractVersion[] }> = [];
  const seenNames = new Set<string>();

  for (const repo of ["rome-solidity", "rome-uniswap-v2"] as const) {
    const comp = manifest.components[repo] as ManifestComponentSrc | undefined;
    if (!comp?.contracts) continue;

    const sourceGitSha = comp.git_sha;
    for (const c of comp.contracts) {
      if (seenNames.has(c.name)) {
        throw new Error(
          `add-bundle: contract name '${c.name}' appears in both rome-solidity and rome-uniswap-v2; rename one (e.g., '_uv2' suffix) before bundling.`,
        );
      }
      seenNames.add(c.name);
      validateContractAddress(c.address, c.name);
      validateBytecodeSha(c.bytecodeSha256, c.name);
      validateGitSha(sourceGitSha, c.name);
      validateCompilerVersion(c.compilerVersion, c.name);

      entries.push({
        name: c.name,
        versions: [{
          address: c.address.toLowerCase(),
          version: c.version,
          status: "live",
          deployedAt: c.deployedAt,
          ...(c.bytecodeSha256 ? { bytecodeSha256: c.bytecodeSha256.toLowerCase() } : {}),
          ...(sourceGitSha ? { sourceGitSha: sourceGitSha.toLowerCase() } : {}),
          ...(c.compilerVersion ? { compilerVersion: c.compilerVersion } : {}),
        }],
      });
    }
  }

  writeJson(path.join(chainDir, "contracts.json"), entries);
  return entries.length;
}

type ContractVersion = {
  address: string;
  version: string;
  status: "live";
  deployedAt: string;
  bytecodeSha256?: string;
  sourceGitSha?: string;
  compilerVersion?: string;
};

const ZERO_GAS_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const SPL_WRAPPER_PREFIX = "SPL_ERC20_";

function writeTokensJson(chainDir: string, manifest: Manifest): number {
  const tokens: TokenEntry[] = [];
  const gasToken = manifest.components["gas-token"];
  const gasPool = manifest.gas_pool;

  if (!gasToken || !gasPool) {
    throw new Error(
      `add-bundle: manifest must include components.gas-token{mint,decimals,symbol} and gas_pool.address (Row 3 of /bring-up-chain populates these).`,
    );
  }

  // Gas-token entry — kind:"gas". Address is the canonical sentinel
  // (0xeee…eee) per existing pattern (matches marcus). Decimals on the
  // EVM side is 18 (Ethereum-equivalent native currency); gas-token mint
  // decimals are tracked separately as the SPL mint's decimals.
  tokens.push({
    address: ZERO_GAS_ADDRESS,
    mintId: gasToken.mint,
    gasPool: gasPool.address,
    symbol: gasToken.symbol,
    name: humanizeName(manifest.chain.slug),
    decimals: 18,
    kind: "gas",
    assetRef: gasToken.symbol.toLowerCase(),
  });

  // SPL wrapper entries. Two ways the manifest can declare them, in
  // priority order:
  //   1. Explicit `wrappers{}` block at the manifest top level — preferred,
  //      because it carries underlying-mint metadata cleanly.
  //   2. Implicit detection: every `rome-solidity` contract whose `name`
  //      starts with `SPL_ERC20_` is a wrapper. The trailing fragment is the
  //      underlying-asset symbol (e.g., `SPL_ERC20_USDC` → `USDC`,
  //      `SPL_ERC20_WSOL` → `WSOL`, `SPL_ERC20_rUSDC` → `rUSDC`). Underlying
  //      mint must come from the explicit `wrappers{}` block — implicit-only
  //      detection cannot infer it.
  const wrappers = manifest.wrappers ?? {};
  const seen = new Set<string>();

  if (Object.keys(wrappers).length > 0) {
    for (const [symbol, w] of Object.entries(wrappers)) {
      if (!w.address || !w.underlying_mint) {
        throw new Error(
          `add-bundle: manifest.wrappers['${symbol}'] requires {address, underlying_mint}; got ${JSON.stringify(w)}`,
        );
      }
      tokens.push(buildWrapperEntry(symbol, w, manifest.chain.network));
      seen.add(symbol);
    }
  }

  // Cross-check against contracts whose name starts with SPL_ERC20_.
  // For every such contract NOT covered by the explicit wrappers{}, abort —
  // we can't safely emit a tokens.json entry without the underlying mint.
  const splContracts = (manifest.components["rome-solidity"]?.contracts ?? [])
    .filter((c) => c.name.startsWith(SPL_WRAPPER_PREFIX));
  const uncovered = splContracts.filter((c) => {
    const sym = c.name.slice(SPL_WRAPPER_PREFIX.length);
    return !seen.has(sym) && !seen.has("W" + sym) && !seen.has(sym.replace(/^[Ww]/, ""));
  });
  if (uncovered.length > 0) {
    throw new Error(
      `add-bundle: SPL wrapper contract(s) lack a manifest.wrappers entry — cannot emit tokens.json without underlying_mint:\n  ${
        uncovered.map((c) => `${c.name} (deployed at ${c.address})`).join("\n  ")
      }\n  Add a manifest.wrappers{} block keyed by wrapper symbol with {address, underlying_mint, underlying_chain, underlying_asset}.`,
    );
  }

  writeJson(path.join(chainDir, "tokens.json"), tokens);
  return tokens.length - 1; // exclude gas-token from wrapper count
}

type TokenEntry = {
  address: string;
  mintId?: string;
  gasPool?: string;
  symbol: string;
  name: string;
  decimals: number;
  kind: "gas" | "spl_wrapper" | "erc20";
  assetRef?: string;
  underlying?: { chain: string; asset: string };
  factory?: string;
  deployedAt?: string;
};

function buildWrapperEntry(
  symbol: string,
  w: NonNullable<Manifest["wrappers"]>[string],
  network: string,
): TokenEntry {
  const underlyingChain = w.underlying_chain ?? (network === "mainnet" ? "solana-mainnet" : "solana-devnet");
  const underlyingAsset = w.underlying_asset ?? symbol.replace(/^[Ww]/, "");
  return {
    address: w.address!.toLowerCase(),
    mintId: w.underlying_mint,
    symbol,
    name: `Rome Wrapped ${underlyingAsset}`,
    decimals: w.decimals ?? 18,
    kind: "spl_wrapper",
    assetRef: underlyingAsset.toLowerCase(),
    underlying: { chain: underlyingChain, asset: underlyingAsset },
    factory: "ERC20SPLFactory",
  };
}

function updateChangelog(registryRoot: string, chainId: number, slug: string, name: string): void {
  const clPath = path.join(registryRoot, "CHANGELOG.md");
  if (!existsSync(clPath)) {
    throw new Error(`add-bundle: CHANGELOG.md not found at ${clPath}`);
  }
  const content = readFileSync(clPath, "utf8");

  const entry = `### Added — New chain: ${name} (${chainId})
- **\`chains/${chainId}-${slug}/\`** — bundled bring-up: \`chain.json\` (with \`romeEvmProgramId\` + \`solana\` block), \`contracts.json\` (full deploy set from rome-solidity + rome-uniswap-v2), \`tokens.json\` (gas-token + SPL wrappers), plus \`bridge.json\` / \`oracle.json\` / \`endpoints.json\` / \`operationalLimits.json\` / \`NOTES.md\` scaffolds. Status: \`preparing\` — flip to \`live\` via a separate \`bump-status\` PR after the chain proves out via smoke.

`;

  const unreleased = "## [Unreleased]";
  const idx = content.indexOf(unreleased);
  if (idx === -1) {
    // No Unreleased section; create one at the top.
    const header = `# Changelog`;
    const headerEnd = content.indexOf("\n", content.indexOf(header)) + 1;
    const insertion = `\n${unreleased}\n\n${entry}`;
    writeFileSync(clPath, content.slice(0, headerEnd) + insertion + content.slice(headerEnd));
    return;
  }

  // Insert after the Unreleased heading; if there are existing items in
  // Unreleased, keep them — append our entry after the heading line.
  const afterUnreleased = idx + unreleased.length;
  const newContent =
    content.slice(0, afterUnreleased) +
    "\n\n" + entry.trimEnd() + "\n" +
    content.slice(afterUnreleased).replace(/^\n+/, "");
  writeFileSync(clPath, newContent);
}

function bumpPackageVersion(registryRoot: string): string {
  const pkgPath = path.join(registryRoot, "package.json");
  const pkg = readJson(pkgPath);
  if (typeof pkg.version !== "string") {
    throw new Error(`add-bundle: package.json#version must be a string; got ${typeof pkg.version}`);
  }
  const parts = pkg.version.split(".").map(Number);
  if (parts.length !== 3 || parts.some((n: number) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`add-bundle: package.json#version must be 'major.minor.patch'; got '${pkg.version}'`);
  }
  parts[2] = parts[2] + 1; // patch
  const newVersion = parts.join(".");
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return newVersion;
}

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeJson(p: string, data: unknown): void {
  const cleaned = JSON.parse(JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v)));
  writeFileSync(p, JSON.stringify(cleaned, null, 2) + "\n");
}

// ── Validators (mirror the patterns enforced by /publish-registry-pr add-contract) ──

function validateContractAddress(addr: string, name: string): void {
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`add-bundle: ${name}.address is not a 20-byte hex EVM address: '${addr}'`);
  }
}

function validateBytecodeSha(sha: string | undefined, name: string): void {
  if (sha === undefined) return;
  if (!/^[a-f0-9]{64}$/.test(sha)) {
    throw new Error(`add-bundle: ${name}.bytecodeSha256 must be 64 lowercase hex chars; got '${sha}'`);
  }
}

function validateGitSha(sha: string | undefined, name: string): void {
  if (sha === undefined) return;
  if (!/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error(
      `add-bundle: ${name} sourceGitSha must be 40 lowercase hex chars (full SHA-1, never short); got '${sha}'`,
    );
  }
}

function validateCompilerVersion(v: string | undefined, name: string): void {
  if (v === undefined) return;
  if (!/^0\.[0-9]+\.[0-9]+(\+commit\.[a-f0-9]+)?$/.test(v)) {
    throw new Error(
      `add-bundle: ${name} compilerVersion must match '0.X.Y' or '0.X.Y+commit.<hex>'; got '${v}'`,
    );
  }
}

// ── CLI ────────────────────────────────────────────────────────────────────

const USAGE = `add-bundle — land a complete chain bring-up (chain seed + contracts + wrappers) as one PR.

Usage:
  npx tsx tools/add-bundle.ts \\
    --manifest <path-to-bring-up-manifest> \\
    [--registry-root <path>]

Reads a bring-up manifest produced by /bring-up-chain (typically
~/rome/rome-ops/ansible/deployments/manifests/<chain-name>/current.json)
and writes the full chains/<id>-<slug>/ directory: chain.json (with
romeEvmProgramId + solana block), contracts.json (all rome-solidity +
rome-uniswap-v2 contracts), tokens.json (gas-token + SPL wrappers),
plus bridge/oracle/endpoints/operationalLimits.json + NOTES.md scaffolds.
Updates CHANGELOG.md and bumps package.json#version (patch).

The CLI writes files only; the rome.git /publish-registry-pr add-bundle
skill handles the git commit, push, and PR creation.

Common:
  [--registry-root <path>]   Defaults to process.cwd().
`;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "true";
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function requireArg(args: Record<string, string>, name: string): string {
  const v = args[name];
  if (!v) {
    process.stderr.write(`add-bundle: missing required --${name}\n\n${USAGE}`);
    process.exit(2);
  }
  return v;
}

export function main(argv: string[]): void {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return;
  }
  const args = parseArgs(argv);
  const registryRoot = args["registry-root"] ?? process.cwd();
  const manifestPath = requireArg(args, "manifest");

  const result = addBundle({ registryRoot, manifestPath });

  process.stdout.write(
    `Created bundled chain bring-up:\n` +
    `  Path:           ${result.chainDir}\n` +
    `  Chain:          ${result.chainId}-${result.slug}\n` +
    `  Contracts:      ${result.contractCount}\n` +
    `  Wrappers:       ${result.wrapperCount}\n` +
    `  package.json:   ${result.newPackageVersion} (patch bump)\n` +
    `\nNext: run \`npm test\`, \`npm run validate\`, and \`npm run liveness\`,\nthen commit + open the bundled PR via /publish-registry-pr add-bundle.\n`,
  );
}

const invokedAsCli =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedAsCli) {
  main(process.argv.slice(2));
}
