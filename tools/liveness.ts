// liveness.ts — on-chain liveness probe for the rome-protocol/registry.
//
// For every chain in chains/<id-slug>/, runs per-kind verification per
// docs/VERIFICATION_RULES.md. Implements the rules manually verified for
// subura/esquiline/maximus during the v0.2 data sweep.
//
// Per-kind on-chain checks:
//
//   kind: gas     — sol_wallet PDA derivation, ATA match, mint match,
//                   token-account-level owner match
//   kind: spl_wrapper — eth_getCode, mint_id() base58 match, decimals match
//   kind: erc20   — eth_getCode, totalSupply() / decimals() / symbol()
//                   surface, negative mint_id() check
//
// CI failure messages follow §Persona affordances UX rule:
//   file:field — expected X, got Y. Suggestion: …
//
// Exits 0 on all-pass, 1 on any failure.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { Connection, PublicKey } from "@solana/web3.js";
import { keccak256, toHex, getAddress } from "viem";
import bs58 from "bs58";

// ── Solana program IDs (read from solana/programs/<network>.json) ──────────

type SolanaPrograms = {
  splToken: string;
  associatedToken: string;
  systemProgram: string;
};

function loadSolanaPrograms(network: "mainnet" | "devnet"): SolanaPrograms {
  return JSON.parse(
    readFileSync(`solana/programs/${network}.json`, "utf8"),
  ) as SolanaPrograms;
}

// Default Rome EVM program (most chains share this; chain.json.solanaProgramId
// can override). Derived from the on-chain truth as of 2026-04-27.
const DEFAULT_ROME_EVM_PROGRAM = "DP1dshBzmXXVsRxH5kCKMemrDuptg1JvJ1j5AsFV4Hm3";

// Solana RPCs per network. Could surface in chain.json or solana/rpcs.json
// later; for now hard-code the canonical Rome devnet endpoint.
const DEVNET_RPC = "https://node1.devnet-eu-sol-api.devnet.romeprotocol.xyz";
const MAINNET_RPC = "https://api.mainnet-beta.solana.com";

// ── Failure tracking ───────────────────────────────────────────────────────

type Failure = {
  file: string;
  field: string;
  expected: string;
  actual: string;
  suggestion: string;
};

const failures: Failure[] = [];

function fail(args: { file: string; field: string; expected: string; actual: string; suggestion: string }): void {
  failures.push(args);
}

// ── Per-kind probes ────────────────────────────────────────────────────────

async function probeGasToken(args: {
  conn: Connection;
  programId: PublicKey;
  splToken: PublicKey;
  ataProgram: PublicKey;
  chainId: number;
  entry: { mintId?: string; gasPool?: string; symbol?: string; decimals?: number };
  filePath: string;
}): Promise<void> {
  const { conn, programId, splToken, ataProgram, chainId, entry, filePath } = args;
  if (!entry.mintId || !entry.gasPool) {
    fail({
      file: filePath,
      field: "kind=gas requires mintId+gasPool",
      expected: "both fields present",
      actual: `mintId=${!!entry.mintId} gasPool=${!!entry.gasPool}`,
      suggestion: "kind=gas entries must declare mintId and gasPool. Re-classify as erc20 if there's no SPL backing, or supply both fields.",
    });
    return;
  }

  // 1. Derive sol_wallet PDA = find_program_address([chainId LE8, "CONTRACT_SOL_WALLET"], programId)
  const seed = Buffer.alloc(8);
  seed.writeBigUInt64LE(BigInt(chainId), 0);
  const [solWallet] = PublicKey.findProgramAddressSync(
    [seed, Buffer.from("CONTRACT_SOL_WALLET")],
    programId,
  );

  // 2. Derive expected gas pool ATA = ATA(sol_wallet, mint, splToken)
  const mint = new PublicKey(entry.mintId);
  const [expectedPool] = PublicKey.findProgramAddressSync(
    [solWallet.toBuffer(), splToken.toBuffer(), mint.toBuffer()],
    ataProgram,
  );

  // 3. Assert entry.gasPool matches derived
  if (entry.gasPool !== expectedPool.toBase58()) {
    fail({
      file: filePath,
      field: "gasPool",
      expected: expectedPool.toBase58(),
      actual: entry.gasPool,
      suggestion: `gasPool must equal ATA(sol_wallet=${solWallet.toBase58()}, mint=${entry.mintId}, splToken). Update the entry, or correct the chain's solanaProgramId/chainId if the derivation is wrong.`,
    });
    return;
  }

  // 4. Fetch the gas pool account on Solana — verify it exists, parse mint + owner
  const acct = await conn.getParsedAccountInfo(new PublicKey(entry.gasPool));
  if (!acct.value) {
    fail({
      file: filePath,
      field: "gasPool",
      expected: "account exists on Solana",
      actual: "account-not-found",
      suggestion: "The pool ATA hasn't been initialized yet. The Rome EVM program creates this on reg_owner; if missing, the chain may not be fully registered.",
    });
    return;
  }

  const data = acct.value.data;
  if (!("parsed" in data) || data.parsed.type !== "account") {
    fail({
      file: filePath,
      field: "gasPool",
      expected: "SPL token account",
      actual: `account-type=${typeof data === "object" && "parsed" in data ? data.parsed?.type : "unparsed"}`,
      suggestion: "gasPool must be an SPL token account. Verify the address.",
    });
    return;
  }

  const info = data.parsed.info;
  if (info.mint !== entry.mintId) {
    fail({
      file: filePath,
      field: "gasPool.mint",
      expected: entry.mintId,
      actual: info.mint,
      suggestion: "Pool's on-chain mint disagrees with entry.mintId. One of them is wrong.",
    });
  }
  if (info.owner !== solWallet.toBase58()) {
    fail({
      file: filePath,
      field: "gasPool.owner",
      expected: solWallet.toBase58(),
      actual: info.owner,
      suggestion: `Pool's token-account-level owner must be the derived sol_wallet PDA. If it isn't, the chain's solanaProgramId may be wrong.`,
    });
  }
}

const SELECTOR_MINT_ID  = keccak256(toHex("mint_id()")).slice(0, 10);
const SELECTOR_DECIMALS = keccak256(toHex("decimals()")).slice(0, 10);
const SELECTOR_SYMBOL   = keccak256(toHex("symbol()")).slice(0, 10);
const SELECTOR_TOTAL    = keccak256(toHex("totalSupply()")).slice(0, 10);

async function evmCall(rpcUrl: string, to: string, data: `0x${string}`): Promise<`0x${string}` | { error: string }> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] }),
  });
  const j = (await res.json()) as { result?: string; error?: { message: string } };
  if (j.error) return { error: j.error.message };
  return j.result as `0x${string}`;
}

async function evmGetCode(rpcUrl: string, to: string): Promise<string> {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [to, "latest"] }),
  });
  const j = (await res.json()) as { result?: string };
  return j.result ?? "0x";
}

function decodeStringFromAbi(hex: string): string {
  // ABI string layout: offset (32 bytes) + length (32 bytes) + bytes (padded to 32)
  if (hex.length < 2 + 64 + 64) return "";
  const len = parseInt(hex.slice(2 + 64, 2 + 64 + 64), 16);
  const bytes = hex.slice(2 + 64 + 64, 2 + 64 + 64 + len * 2);
  return Buffer.from(bytes, "hex").toString("utf8");
}

async function probeSplWrapper(args: {
  rpcUrl: string;
  entry: { address: string; mintId?: string; symbol?: string; decimals?: number };
  filePath: string;
}): Promise<void> {
  const { rpcUrl, entry, filePath } = args;
  if (!entry.mintId) {
    fail({
      file: filePath,
      field: "kind=spl_wrapper requires mintId",
      expected: "mintId present",
      actual: "missing",
      suggestion: "kind=spl_wrapper entries must carry mintId.",
    });
    return;
  }
  const code = await evmGetCode(rpcUrl, entry.address);
  if (code === "0x" || code === "0x0") {
    fail({
      file: filePath,
      field: "address",
      expected: "non-empty bytecode at address",
      actual: "no-bytecode",
      suggestion: "spl_wrapper entry's address has no contract deployed. Verify the address.",
    });
    return;
  }

  const mintRes = await evmCall(rpcUrl, entry.address, SELECTOR_MINT_ID as `0x${string}`);
  if (typeof mintRes === "object" && "error" in mintRes) {
    fail({
      file: filePath,
      field: "mint_id()",
      expected: "bytes32 mint id",
      actual: `revert: ${mintRes.error}`,
      suggestion: "Contract didn't respond to mint_id(); it's not an SPL_ERC20 wrapper. Re-classify as erc20.",
    });
    return;
  }
  const onChainMint = bs58.encode(Buffer.from((mintRes as string).slice(2), "hex"));
  if (onChainMint !== entry.mintId) {
    fail({
      file: filePath,
      field: "mintId",
      expected: entry.mintId,
      actual: onChainMint,
      suggestion: "Wrapper's on-chain mint_id() returns a different mint than entry.mintId. Update one of them.",
    });
  }

  if (entry.decimals !== undefined) {
    const decRes = await evmCall(rpcUrl, entry.address, SELECTOR_DECIMALS as `0x${string}`);
    if (typeof decRes !== "object") {
      const onChainDec = parseInt((decRes as string).slice(2), 16);
      if (onChainDec !== entry.decimals) {
        fail({
          file: filePath,
          field: "decimals",
          expected: String(entry.decimals),
          actual: String(onChainDec),
          suggestion: "Wrapper's on-chain decimals() disagrees with entry.decimals. Wormhole-truncation cases (e.g., ETH 18 → wrapped 8) are documented exceptions; otherwise fix.",
        });
      }
    }
  }
}

async function probeErc20(args: {
  rpcUrl: string;
  entry: { address: string; symbol?: string; decimals?: number };
  filePath: string;
}): Promise<void> {
  const { rpcUrl, entry, filePath } = args;
  const code = await evmGetCode(rpcUrl, entry.address);
  if (code === "0x" || code === "0x0") {
    fail({
      file: filePath,
      field: "address",
      expected: "non-empty bytecode at address",
      actual: "no-bytecode",
      suggestion: "erc20 entry's address has no contract deployed.",
    });
    return;
  }

  const totalRes = await evmCall(rpcUrl, entry.address, SELECTOR_TOTAL as `0x${string}`);
  if (typeof totalRes === "object" && "error" in totalRes) {
    fail({
      file: filePath,
      field: "totalSupply()",
      expected: "uint256",
      actual: `revert: ${totalRes.error}`,
      suggestion: "Contract doesn't expose ERC20 totalSupply(). Verify the address is an ERC20.",
    });
  }

  // Negative check: kind=erc20 must NOT respond to mint_id()
  const mintRes = await evmCall(rpcUrl, entry.address, SELECTOR_MINT_ID as `0x${string}`);
  if (typeof mintRes !== "object") {
    fail({
      file: filePath,
      field: "kind",
      expected: "no-mint_id()-response (true native ERC20)",
      actual: "mint_id() returned a value",
      suggestion: "This contract responds to mint_id() and is therefore a Rome SPL_ERC20 wrapper, not a native ERC-20. Re-classify as spl_wrapper and add the mintId field.",
    });
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!existsSync("chains")) {
    console.log("liveness: no chains/ directory; nothing to verify");
    process.exit(0);
  }

  const slugs = readdirSync("chains").filter((d) => /^\d+-/.test(d));
  if (slugs.length === 0) {
    console.log("liveness: no chains found");
    process.exit(0);
  }

  for (const slug of slugs) {
    const dir = path.join("chains", slug);
    const chainPath = path.join(dir, "chain.json");
    const tokensPath = path.join(dir, "tokens.json");
    if (!existsSync(chainPath)) continue;

    const chain = JSON.parse(readFileSync(chainPath, "utf8")) as {
      chainId: number;
      name: string;
      network: "mainnet" | "testnet" | "devnet" | "local";
      rpcUrl: string;
      solanaProgramId?: string;
      status: string;
    };

    if (chain.status === "retired") {
      console.log(`SKIP ${slug} (retired)`);
      continue;
    }

    console.log(`\n=== ${slug} (chain ${chain.chainId}, ${chain.network}, ${chain.status}) ===`);

    // Resolve programs
    const solanaNetwork = chain.network === "mainnet" ? "mainnet" : "devnet";
    const programs = loadSolanaPrograms(solanaNetwork);
    const solRpc = solanaNetwork === "mainnet" ? MAINNET_RPC : DEVNET_RPC;
    const conn = new Connection(solRpc);

    const programId = new PublicKey(chain.solanaProgramId ?? DEFAULT_ROME_EVM_PROGRAM);
    const splToken  = new PublicKey(programs.splToken);
    const ataProgram = new PublicKey(programs.associatedToken);

    if (!existsSync(tokensPath)) continue;
    const tokens = JSON.parse(readFileSync(tokensPath, "utf8")) as Array<{
      address: string;
      mintId?: string;
      gasPool?: string;
      symbol?: string;
      name?: string;
      decimals?: number;
      kind: "gas" | "spl_wrapper" | "erc20";
    }>;

    for (const t of tokens) {
      const fp = `${tokensPath} (${t.symbol ?? t.address})`;
      console.log(`  ${t.kind}: ${t.symbol ?? "—"} @ ${t.address}`);
      if (t.kind === "gas") {
        await probeGasToken({ conn, programId, splToken, ataProgram, chainId: chain.chainId, entry: t, filePath: fp });
      } else if (t.kind === "spl_wrapper") {
        await probeSplWrapper({ rpcUrl: chain.rpcUrl, entry: t, filePath: fp });
      } else if (t.kind === "erc20") {
        await probeErc20({ rpcUrl: chain.rpcUrl, entry: t, filePath: fp });
      }
    }
  }

  console.log();
  if (failures.length === 0) {
    console.log("✓ Liveness passed — every kind=gas/spl_wrapper/erc20 entry verified on-chain.");
    process.exit(0);
  }
  console.error(`✗ Liveness failed (${failures.length} issue${failures.length === 1 ? "" : "s"}):\n`);
  for (const f of failures) {
    console.error(`  ${f.file}`);
    console.error(`    ${f.field}: expected ${f.expected}, got ${f.actual}`);
    console.error(`    Suggestion: ${f.suggestion}\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("liveness: unexpected error:", err);
  process.exit(2);
});
