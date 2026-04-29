// add-chain.ts — registration Path B scaffolder.
//
// Two modes:
//   --deployments-from <path>  — fresh chain from a rome-solidity deployments artifact
//   --copy-from <slug>         — rotation: clone an existing chain, wipe what changes
//
// Per spec §Persona affordances, the rotation flow preserves the parts of
// a chain that don't rotate (Solana mints, source-chain bridge wiring,
// endpoints, operational limits, asset refs, ABI paths) and wipes the
// addresses that do (contracts, token wrappers, oracle factory + feeds).

import {
  readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync,
} from "node:fs";
import path from "node:path";

const ZERO = "0x0000000000000000000000000000000000000000";

const NOTES_TEMPLATE = `# {{name}} — {{chainId}}

## Deploy history
- {{date}} — initial deploy

## Why this exists
<1-3 sentences on what this chain is for and who runs it>

## Known caveats
- <gotcha 1>

## Contacts
- Ops: <team / channel>
- Protocol: <team / channel>
`;

export type FreshArgs = {
  registryRoot: string;
  chainId: number;
  slug: string;
  name: string;
  network: "mainnet" | "testnet" | "devnet" | "local";
  rpcUrl: string;
  explorerUrl?: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
};

export function addChainFresh(args: FreshArgs): string {
  const dir = path.join(args.registryRoot, "chains", `${args.chainId}-${args.slug}`);
  mkdirSync(dir, { recursive: true });

  writeJson(path.join(dir, "chain.json"), {
    chainId: args.chainId,
    name: args.name,
    network: args.network,
    rpcUrl: args.rpcUrl,
    explorerUrl: args.explorerUrl,
    nativeCurrency: args.nativeCurrency,
    status: "preparing",
  });
  writeJson(path.join(dir, "contracts.json"), []);
  writeJson(path.join(dir, "tokens.json"), []);
  writeJson(path.join(dir, "bridge.json"), {
    sourceEvm: { chainId: 0, name: "TBD", usdc: ZERO },
    solana: { usdcMint: "" },
  });
  writeJson(path.join(dir, "oracle.json"), { factory: ZERO, feeds: {} });
  writeJson(path.join(dir, "endpoints.json"), {});
  writeJson(path.join(dir, "operationalLimits.json"), {});
  writeFileSync(
    path.join(dir, "NOTES.md"),
    NOTES_TEMPLATE.replaceAll("{{name}}", args.name)
                  .replaceAll("{{chainId}}", String(args.chainId))
                  .replaceAll("{{date}}", new Date().toISOString().slice(0, 10)),
  );
  return dir;
}

export type RotateArgs = {
  registryRoot: string;
  copyFromSlug: string;          // e.g. "121226-marcus"
  newChainId: number;
  newSlug: string;               // e.g. "marcus-2"
  newName: string;
  newRpcUrl: string;
};

export function rotateChain(args: RotateArgs): string {
  const oldDir = path.join(args.registryRoot, "chains", args.copyFromSlug);
  if (!existsSync(oldDir)) {
    throw new Error(`add-chain: source chain folder not found: ${oldDir}`);
  }
  const newDir = path.join(args.registryRoot, "chains", `${args.newChainId}-${args.newSlug}`);
  mkdirSync(newDir, { recursive: true });

  const oldChain = readJson(path.join(oldDir, "chain.json"));
  const oldChainId = oldChain.chainId;

  // chain.json — wipe id/name/rpc, preserve network + nativeCurrency, add previousChainId
  writeJson(path.join(newDir, "chain.json"), {
    chainId: args.newChainId,
    name: args.newName,
    network: oldChain.network,
    rpcUrl: args.newRpcUrl,
    explorerUrl: undefined,
    nativeCurrency: oldChain.nativeCurrency,
    status: "preparing",
    previousChainId: oldChainId,
  });

  // contracts.json — wipe addresses, preserve names/versions/abiPaths
  const oldContracts = readJson(path.join(oldDir, "contracts.json")) as Array<{
    name: string;
    versions: Array<{ address: string; version: string; status: string; deployedAt: string; abiPath?: string }>;
  }>;
  const newContracts = oldContracts.map((c) => ({
    name: c.name,
    versions: c.versions.map((v) => ({
      address: ZERO,
      version: v.version,
      status: "live" as const,
      deployedAt: new Date().toISOString(),
      ...(v.abiPath ? { abiPath: v.abiPath } : {}),
    })),
  }));
  writeJson(path.join(newDir, "contracts.json"), newContracts);

  // tokens.json — wipe address, preserve mintId/symbol/name/decimals/kind/assetRef/underlying
  const oldTokens = readJson(path.join(oldDir, "tokens.json")) as Array<Record<string, unknown>>;
  const newTokens = oldTokens.map((t) => ({
    ...t,
    address: ZERO,
    deployedAt: undefined,
    deployTx: undefined,
  }));
  writeJson(path.join(newDir, "tokens.json"), newTokens);

  // bridge.json — preserve verbatim except wormhole/cctp ref strings stay
  copyFileSync(path.join(oldDir, "bridge.json"), path.join(newDir, "bridge.json"));

  // oracle.json — wipe factory + feed addresses, preserve source + underlyingAccount
  const oldOracle = readJson(path.join(oldDir, "oracle.json")) as {
    factory: string; defaultMaxStaleness?: number;
    feeds: Record<string, { address: string; source: string; underlyingAccount?: string }>;
  };
  const newOracle = {
    factory: ZERO,
    defaultMaxStaleness: oldOracle.defaultMaxStaleness,
    feeds: Object.fromEntries(
      Object.entries(oldOracle.feeds).map(([k, v]) => [k, { ...v, address: ZERO }]),
    ),
  };
  writeJson(path.join(newDir, "oracle.json"), newOracle);

  // endpoints + operationalLimits — byte-identical copy
  copyFileSync(path.join(oldDir, "endpoints.json"), path.join(newDir, "endpoints.json"));
  copyFileSync(path.join(oldDir, "operationalLimits.json"), path.join(newDir, "operationalLimits.json"));

  // NOTES.md — fresh template, old NOTES preserved at the retired chain
  writeFileSync(
    path.join(newDir, "NOTES.md"),
    NOTES_TEMPLATE.replaceAll("{{name}}", args.newName)
                  .replaceAll("{{chainId}}", String(args.newChainId))
                  .replaceAll("{{date}}", new Date().toISOString().slice(0, 10)),
  );

  // Mark old chain as retired
  oldChain.status = "retired";
  writeJson(path.join(oldDir, "chain.json"), oldChain);

  return newDir;
}

function readJson(p: string): any {
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeJson(p: string, data: unknown): void {
  // strip undefined values so JSON serialization stays clean
  const cleaned = JSON.parse(JSON.stringify(data, (_k, v) => (v === undefined ? undefined : v)));
  writeFileSync(p, JSON.stringify(cleaned, null, 2) + "\n");
}

const USAGE = `add-chain — scaffold a chains/<chainId>-<slug>/ directory.

Usage (fresh):
  npx tsx tools/add-chain.ts \\
    --chain-id <int> \\
    --slug <slug> \\
    --name "<Display Name>" \\
    --network <mainnet|testnet|devnet|local> \\
    --rpc-url <https://...> \\
    [--explorer-url <https://...>] \\
    --native-name <"Currency Name"> --native-symbol <SYM> --native-decimals <int>

Usage (rotate from existing slug):
  npx tsx tools/add-chain.ts \\
    --copy-from <existing-slug> \\
    --new-chain-id <int> \\
    --new-slug <slug> \\
    --new-name "<Display Name>" \\
    --new-rpc-url <https://...>

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
    process.stderr.write(`add-chain: missing required --${name}\n\n${USAGE}`);
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

  if (args["copy-from"]) {
    const dir = rotateChain({
      registryRoot,
      copyFromSlug: requireArg(args, "copy-from"),
      newChainId: Number(requireArg(args, "new-chain-id")),
      newSlug: requireArg(args, "new-slug"),
      newName: requireArg(args, "new-name"),
      newRpcUrl: requireArg(args, "new-rpc-url"),
    });
    process.stdout.write(`Created (rotation): ${dir}\n`);
    return;
  }

  const network = requireArg(args, "network");
  if (!["mainnet", "testnet", "devnet", "local"].includes(network)) {
    process.stderr.write(
      `add-chain: --network must be one of mainnet|testnet|devnet|local; got '${network}'\n`,
    );
    process.exit(2);
  }
  const decimals = Number(requireArg(args, "native-decimals"));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    process.stderr.write(`add-chain: --native-decimals must be a non-negative integer ≤ 36\n`);
    process.exit(2);
  }
  const dir = addChainFresh({
    registryRoot,
    chainId: Number(requireArg(args, "chain-id")),
    slug: requireArg(args, "slug"),
    name: requireArg(args, "name"),
    network: network as "mainnet" | "testnet" | "devnet" | "local",
    rpcUrl: requireArg(args, "rpc-url"),
    explorerUrl: args["explorer-url"],
    nativeCurrency: {
      name: requireArg(args, "native-name"),
      symbol: requireArg(args, "native-symbol"),
      decimals,
    },
  });
  process.stdout.write(`Created (fresh): ${dir}\n`);
}

// Run as CLI when invoked via `tsx tools/add-chain.ts ...`. Importing the
// module elsewhere (test files, other scripts) does not trigger main().
const invokedAsCli =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedAsCli) {
  main(process.argv.slice(2));
}
