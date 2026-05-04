import { describe, it, expect, beforeEach } from "vitest";
import { _setRegistryRoot, getChain, listChains, listTokens, getAsset, getContract, getProtocol } from "./index.js";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let root: string;

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "registry-idx-"));
  _setRegistryRoot(root);

  const chainDir = path.join(root, "chains/999999-fixture");
  mkdirSync(chainDir, { recursive: true });
  writeFileSync(path.join(chainDir, "chain.json"), JSON.stringify({
    chainId: 999999, name: "Rome Fixture", network: "testnet",
    rpcUrl: "https://fixture.devnet.romeprotocol.xyz/",
    nativeCurrency: { name: "Rome Fixture", symbol: "USDC", decimals: 18 },
    status: "live",
  }));
  writeFileSync(path.join(chainDir, "contracts.json"), JSON.stringify([
    {
      name: "RomeBridgePaymaster",
      versions: [{
        address: "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef",
        version: "1.0.0", status: "live", deployedAt: "2026-03-13T00:00:00Z",
      }],
    },
  ]));
  writeFileSync(path.join(chainDir, "tokens.json"), JSON.stringify([
    { address: "0xabc", symbol: "wUSDC", name: "Rome USDC", decimals: 6, kind: "spl_wrapper", assetRef: "usdc" },
  ]));

  mkdirSync(path.join(root, "assets"));
  writeFileSync(path.join(root, "assets/usdc.json"), JSON.stringify({
    symbol: "USDC", name: "USD Coin", decimals: 6,
  }));

  mkdirSync(path.join(root, "protocols"));
  writeFileSync(path.join(root, "protocols/cctp.json"), JSON.stringify({
    protocol: "cctp", domains: { sepolia: 0, "solana-devnet": 5 },
  }));
});

describe("public NPM API", () => {
  it("getChain returns the seeded Marcus entry", () => {
    const m = getChain(999999);
    expect(m?.chainId).toBe(999999);
    expect(m?.name).toBe("Rome Fixture");
  });

  it("getChain returns undefined for unknown chain", () => {
    expect(getChain(99999)).toBeUndefined();
  });

  it("listChains returns Marcus", () => {
    const all = listChains();
    expect(all).toHaveLength(1);
    expect(all[0].chainId).toBe(999999);
  });

  it("listTokens returns the token list", () => {
    const tokens = listTokens(999999);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].symbol).toBe("wUSDC");
  });

  it("getContract returns the live version", () => {
    const c = getContract(999999, "RomeBridgePaymaster");
    expect((c as any)?.address).toBe("0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef");
    expect((c as any)?.status).toBe("live");
  });

  it("getAsset returns the catalog entry", () => {
    const a = getAsset("USDC");
    expect(a?.name).toBe("USD Coin");
  });

  it("getProtocol returns CCTP domains", () => {
    const p = getProtocol("cctp");
    expect(p.protocol).toBe("cctp");
    expect((p.domains as any).sepolia).toBe(0);
  });
});
