import { describe, it, expect } from "vitest";
import { addChainFresh, rotateChain } from "./add-chain.js";
import { writeFileSync, mkdtempSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function tmpRegistry(): string {
  return mkdtempSync(path.join(tmpdir(), "registry-add-"));
}

function seedMarcus(root: string): void {
  const dir = path.join(root, "chains/121226-marcus");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "chain.json"), JSON.stringify({
    chainId: 121226,
    name: "Rome Marcus",
    network: "testnet",
    rpcUrl: "https://marcus.devnet.romeprotocol.xyz/",
    nativeCurrency: { name: "Rome Marcus", symbol: "USDC", decimals: 18 },
    status: "live",
  }, null, 2));
  writeFileSync(path.join(dir, "contracts.json"), JSON.stringify([
    {
      name: "RomeBridgePaymaster",
      versions: [{
        address: "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef",
        version: "1.0.0",
        status: "live",
        deployedAt: "2026-03-13T00:00:00Z",
        abiPath: "abis/RomeBridgePaymaster@1.0.0.json",
      }],
    },
  ], null, 2));
  writeFileSync(path.join(dir, "tokens.json"), JSON.stringify([
    {
      address: "0x1f7dfaf9444d46fc10b4b4736d906da5caf46195",
      mintId: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      symbol: "wUSDC", name: "Rome USDC", decimals: 6, kind: "spl_wrapper",
      assetRef: "usdc",
      underlying: { chain: "solana-devnet", asset: "USDC" },
    },
  ], null, 2));
  writeFileSync(path.join(dir, "bridge.json"), JSON.stringify({
    sourceEvm: {
      chainId: 11155111, name: "Sepolia",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
    solana: {
      usdcMint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      wormholeChainIdRef: "sepolia",
      cctpDomainRef: "sepolia",
    },
  }, null, 2));
  writeFileSync(path.join(dir, "oracle.json"), JSON.stringify({
    factory: "0x98d2a1eeafd4595b9df1ad791625d0fb16b081b5",
    defaultMaxStaleness: 300,
    feeds: { "ETH/USD": { address: "0xd61796eFF9e6D044C182aDa82049DC2930B58962", source: "pyth" } },
  }, null, 2));
  writeFileSync(path.join(dir, "endpoints.json"), JSON.stringify({
    cctpIrisApiBase: "https://iris-api-sandbox.circle.com",
  }, null, 2));
  writeFileSync(path.join(dir, "operationalLimits.json"), JSON.stringify({
    maxComputeUnitsPerTx: 1400000,
    maxCpiPerAtomicTx: 1,
    recommendedGasBudgets: { wrap_gas_to_spl: 27000000 },
  }, null, 2));
  writeFileSync(path.join(dir, "NOTES.md"), "# Rome Marcus — 121226\n\nOriginal Marcus.\n");
}

describe("add-chain fresh mode", () => {
  it("scaffolds a new chain folder with required files", () => {
    const root = tmpRegistry();
    addChainFresh({
      registryRoot: root,
      chainId: 121300,
      slug: "rome-foo",
      name: "Rome Foo",
      network: "testnet",
      rpcUrl: "https://foo.devnet.romeprotocol.xyz/",
      nativeCurrency: { name: "Rome Foo", symbol: "USDC", decimals: 18 },
    });

    const dir = path.join(root, "chains/121300-rome-foo");
    expect(existsSync(path.join(dir, "chain.json"))).toBe(true);
    expect(existsSync(path.join(dir, "contracts.json"))).toBe(true);
    expect(existsSync(path.join(dir, "tokens.json"))).toBe(true);
    expect(existsSync(path.join(dir, "bridge.json"))).toBe(true);
    expect(existsSync(path.join(dir, "oracle.json"))).toBe(true);
    expect(existsSync(path.join(dir, "endpoints.json"))).toBe(true);
    expect(existsSync(path.join(dir, "operationalLimits.json"))).toBe(true);
    expect(existsSync(path.join(dir, "NOTES.md"))).toBe(true);

    const chain = JSON.parse(readFileSync(path.join(dir, "chain.json"), "utf8"));
    expect(chain.chainId).toBe(121300);
    expect(chain.name).toBe("Rome Foo");
  });
});

describe("add-chain rotation mode", () => {
  it("clones marcus → marcus2; preserves mintId, source-chain, endpoints, operationalLimits; wipes addresses", () => {
    const root = tmpRegistry();
    seedMarcus(root);

    rotateChain({
      registryRoot: root,
      copyFromSlug: "121226-marcus",
      newChainId: 121227,
      newSlug: "marcus-2",
      newName: "Rome Marcus 2",
      newRpcUrl: "https://marcus2.devnet.romeprotocol.xyz/",
    });

    const oldDir = path.join(root, "chains/121226-marcus");
    const newDir = path.join(root, "chains/121227-marcus-2");

    // old chain marked retired
    const oldChain = JSON.parse(readFileSync(path.join(oldDir, "chain.json"), "utf8"));
    expect(oldChain.status).toBe("retired");

    // new chain has new id + previousChainId back-link
    const newChain = JSON.parse(readFileSync(path.join(newDir, "chain.json"), "utf8"));
    expect(newChain.chainId).toBe(121227);
    expect(newChain.name).toBe("Rome Marcus 2");
    expect(newChain.rpcUrl).toBe("https://marcus2.devnet.romeprotocol.xyz/");
    expect(newChain.previousChainId).toBe(121226);
    expect(newChain.status).toBe("preparing");

    // contract addresses wiped to empty placeholder
    const newContracts = JSON.parse(readFileSync(path.join(newDir, "contracts.json"), "utf8"));
    expect(newContracts[0].name).toBe("RomeBridgePaymaster");
    expect(newContracts[0].versions[0].address).toBe("0x0000000000000000000000000000000000000000");
    expect(newContracts[0].versions[0].version).toBe("1.0.0"); // preserved
    expect(newContracts[0].versions[0].abiPath).toBe("abis/RomeBridgePaymaster@1.0.0.json"); // preserved

    // token address wiped, mintId + assetRef preserved
    const newTokens = JSON.parse(readFileSync(path.join(newDir, "tokens.json"), "utf8"));
    expect(newTokens[0].address).toBe("0x0000000000000000000000000000000000000000");
    expect(newTokens[0].mintId).toBe("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // preserved
    expect(newTokens[0].assetRef).toBe("usdc");

    // bridge sourceEvm + solana mints preserved
    const newBridge = JSON.parse(readFileSync(path.join(newDir, "bridge.json"), "utf8"));
    expect(newBridge.sourceEvm.usdc).toBe("0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
    expect(newBridge.solana.usdcMint).toBe("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

    // oracle factory + feed addresses wiped
    const newOracle = JSON.parse(readFileSync(path.join(newDir, "oracle.json"), "utf8"));
    expect(newOracle.factory).toBe("0x0000000000000000000000000000000000000000");
    expect(newOracle.feeds["ETH/USD"].address).toBe("0x0000000000000000000000000000000000000000");
    expect(newOracle.feeds["ETH/USD"].source).toBe("pyth"); // preserved

    // endpoints + operationalLimits byte-identical
    expect(readFileSync(path.join(oldDir, "endpoints.json"), "utf8"))
      .toBe(readFileSync(path.join(newDir, "endpoints.json"), "utf8"));
    expect(readFileSync(path.join(oldDir, "operationalLimits.json"), "utf8"))
      .toBe(readFileSync(path.join(newDir, "operationalLimits.json"), "utf8"));
  });
});
