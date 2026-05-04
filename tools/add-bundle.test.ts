import { describe, it, expect } from "vitest";
import { addBundle } from "./add-bundle.js";
import {
  writeFileSync, mkdtempSync, mkdirSync, readFileSync, existsSync, copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function tmpRegistry(): string {
  // Real registry repos have CHANGELOG.md + package.json + schema/ + tools/ at
  // the root. We seed a minimal version so addBundle's CHANGELOG patch and
  // package.json bump have something to chew on.
  const root = mkdtempSync(path.join(tmpdir(), "registry-bundle-"));
  writeFileSync(
    path.join(root, "CHANGELOG.md"),
    "# Changelog\n\n## [Unreleased]\n\n## [0.4.0] — 2026-04-28\n\n",
  );
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "@rome-protocol/registry", version: "0.4.0" }, null, 2) + "\n",
  );
  return root;
}

function fixtureManifest(overrides: Record<string, any> = {}): any {
  // Minimal bring-up manifest mirroring the cassius-test shape captured by
  // /bring-up-chain Phase 6 (rome-solidity + rome-uniswap-v2 contracts plus
  // a gas-token + gas_pool block from Phase 3).
  return {
    schema_version: "1",
    chain: {
      id: 121299,
      slug: "atrium-test",
      network: "devnet",
      registration_slot: 100000000,
      registered_at_tx: "",
    },
    components: {
      "rome-evm-private": {
        git_sha: "a0035d0d5a58c5e8caa7a02e075eaa32189a2d48",
      },
      "gas-token": {
        mint: "7fnNSJvmmwyVpdM2yvxW6PYQxwRhuTt32zvUjMX7K9Uw",
        decimals: 6,
        symbol: "USDC",
      },
      "rome-solidity": {
        git_sha: "5e2f9ada197f09554c95121d7b05702129f1fdff",
        solc_version: "0.8.28",
        contracts: [
          {
            name: "ERC20SPLFactory",
            version: "1.0.0",
            address: "0x60ab3dce24acc3bab0d858edecbdecc721b71114",
            bytecodeSha256: "6744409b96fdf2758f74a5083cba735ba57b1b895d15dd54bad3cfd7b573fbba",
            compilerVersion: "0.8.28+commit.7893614a",
            deployedAt: "2026-04-29T19:11:00Z",
          },
          {
            name: "SPL_ERC20_USDC",
            version: "1.0.0",
            address: "0x6ceb05a8c61357054f9a0c93c1bf8e18a3cbb7fc",
            bytecodeSha256: "a5eb97de650ab75bf6362a7311121f8e76ea62f331f89a79c28cdf78ae9dffe9",
            compilerVersion: "0.8.28+commit.7893614a",
            deployedAt: "2026-04-29T19:11:00Z",
          },
          {
            name: "RomeBridgePaymaster",
            version: "1.0.0",
            address: "0xb38917e19427ec80ffe39736dbb79ad6a63ed0f6",
            bytecodeSha256: "eb4e5cb4e04018a66a5f7f41f39a6cbb9505ef253a3dcd58f7cd009095f38600",
            compilerVersion: "0.8.28+commit.7893614a",
            deployedAt: "2026-04-29T19:11:00Z",
          },
        ],
      },
      "rome-uniswap-v2": {
        git_sha: "86d4cad4be8dedfc8464d7a91b04e0f7a3257834",
        solc_version: "0.8.20",
        contracts: [
          {
            name: "UniswapV2Factory",
            version: "1.0.0",
            address: "0x6d37904425681202B73baac08c4140bf15f4FFf6",
            bytecodeSha256: "73d820e9b38b12aa058df65dcc4e8ce8d5424b61120bdef821b042b1bad6f4fb",
            compilerVersion: "0.5.16",
            deployedAt: "2026-04-29T19:11:00Z",
          },
        ],
      },
    },
    program_id: "FfHDMdFLXCLfJhpVM6tQhLZFTk5Q3REd17t1aPoSHnG1",
    rpc: { url: "https://atrium-test.devnet.romeprotocol.xyz/", chain_id_hex: "0x1d9d3" },
    gas_pool: { address: "DZHQs2UPh4AmJ74ei36WVSiLEPmh22Q4tGmcftvk7Njr", type: "meteora_damm_v1_pool" },
    wrappers: {
      WUSDC: {
        address: "0x6ceb05a8c61357054f9a0c93c1bf8e18a3cbb7fc",
        underlying_mint: "7fnNSJvmmwyVpdM2yvxW6PYQxwRhuTt32zvUjMX7K9Uw",
        underlying_chain: "solana-devnet",
        underlying_asset: "USDC",
        decimals: 6,
      },
    },
    solana: {
      cluster: "devnet",
      tested: { version: "4.0.0-beta.7", verifiedAt: "2026-04-29" },
    },
    ...overrides,
  };
}

function writeManifest(root: string, manifest: any): string {
  const p = path.join(root, "manifest.json");
  writeFileSync(p, JSON.stringify(manifest, null, 2));
  return p;
}

describe("add-bundle", () => {
  it("scaffolds a new chain dir with chain/contracts/tokens fully populated from the manifest", () => {
    const root = tmpRegistry();
    const manifest = fixtureManifest();
    const manifestPath = writeManifest(root, manifest);

    const result = addBundle({ registryRoot: root, manifestPath });

    expect(result.chainId).toBe(121299);
    expect(result.slug).toBe("atrium-test");
    expect(result.contractCount).toBe(4); // 3 rome-solidity + 1 rome-uniswap-v2
    expect(result.wrapperCount).toBe(1); // 1 SPL wrapper (WUSDC) — gas-token excluded
    expect(result.newPackageVersion).toBe("0.4.1");

    const dir = path.join(root, "chains/121299-atrium-test");
    for (const f of [
      "chain.json", "contracts.json", "tokens.json", "bridge.json",
      "oracle.json", "endpoints.json", "operationalLimits.json", "NOTES.md",
    ]) {
      expect(existsSync(path.join(dir, f))).toBe(true);
    }

    // chain.json carries program_id + solana block from the manifest.
    const chain = JSON.parse(readFileSync(path.join(dir, "chain.json"), "utf8"));
    expect(chain.chainId).toBe(121299);
    expect(chain.name).toBe("Rome Atrium Test");
    expect(chain.network).toBe("devnet");
    expect(chain.rpcUrl).toBe("https://atrium-test.devnet.romeprotocol.xyz/");
    expect(chain.romeEvmProgramId).toBe("FfHDMdFLXCLfJhpVM6tQhLZFTk5Q3REd17t1aPoSHnG1");
    expect(chain.nativeCurrency).toEqual({ name: "Rome Atrium Test", symbol: "USDC", decimals: 18 });
    expect(chain.solana).toEqual({
      cluster: "devnet",
      tested: { version: "4.0.0-beta.7", verifiedAt: "2026-04-29" },
    });
    expect(chain.status).toBe("preparing");

    // contracts.json has every contract with address + provenance triple.
    const contracts = JSON.parse(readFileSync(path.join(dir, "contracts.json"), "utf8"));
    expect(contracts).toHaveLength(4);
    const usdcWrapper = contracts.find((c: any) => c.name === "SPL_ERC20_USDC");
    expect(usdcWrapper.versions).toHaveLength(1);
    expect(usdcWrapper.versions[0].status).toBe("live");
    expect(usdcWrapper.versions[0].sourceGitSha).toBe("5e2f9ada197f09554c95121d7b05702129f1fdff");
    expect(usdcWrapper.versions[0].bytecodeSha256).toBe(
      "a5eb97de650ab75bf6362a7311121f8e76ea62f331f89a79c28cdf78ae9dffe9",
    );

    // rome-uniswap-v2 contracts get THEIR repo's git_sha, not rome-solidity's.
    const v2Factory = contracts.find((c: any) => c.name === "UniswapV2Factory");
    expect(v2Factory.versions[0].sourceGitSha).toBe("86d4cad4be8dedfc8464d7a91b04e0f7a3257834");

    // tokens.json: gas first, then wrappers.
    const tokens = JSON.parse(readFileSync(path.join(dir, "tokens.json"), "utf8"));
    expect(tokens[0].kind).toBe("gas");
    expect(tokens[0].mintId).toBe("7fnNSJvmmwyVpdM2yvxW6PYQxwRhuTt32zvUjMX7K9Uw");
    expect(tokens[0].gasPool).toBe("DZHQs2UPh4AmJ74ei36WVSiLEPmh22Q4tGmcftvk7Njr");
    expect(tokens[0].address).toBe("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
    expect(tokens[0].decimals).toBe(18);
    expect(tokens[1].kind).toBe("spl_wrapper");
    expect(tokens[1].symbol).toBe("WUSDC");
    expect(tokens[1].mintId).toBe("7fnNSJvmmwyVpdM2yvxW6PYQxwRhuTt32zvUjMX7K9Uw");
    expect(tokens[1].underlying).toEqual({ chain: "solana-devnet", asset: "USDC" });
  });

  it("populates bridge.json with sourceEvm + solana.usdcMint (default: devnet → sepolia + solana-devnet USDC)", () => {
    const root = tmpRegistry();
    addBundle({ registryRoot: root, manifestPath: writeManifest(root, fixtureManifest()) });

    const bridge = JSON.parse(
      readFileSync(path.join(root, "chains/121299-atrium-test/bridge.json"), "utf8"),
    );

    // sourceEvm — full Sepolia constants (rome-ui's normalizeBridge requires
    // every cctp / wormhole address non-empty).
    expect(bridge.sourceEvm).toEqual({
      chainId: 11155111,
      name: "Sepolia",
      rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      cctpTokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
      cctpMessageTransmitter: "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD",
      wormholeTokenBridge: "0xDB5492265f6038831E89f495670FF909aDe94bd9",
    });

    // solana.usdcMint — defaults to canonical Solana-devnet USDC for a
    // devnet manifest. Operator can override via manifest.bridge.solana.usdcMint.
    expect(bridge.solana.usdcMint).toBe("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  });

  it("CHANGELOG and package.json are updated", () => {
    const root = tmpRegistry();
    addBundle({ registryRoot: root, manifestPath: writeManifest(root, fixtureManifest()) });

    const cl = readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
    expect(cl).toMatch(/## \[Unreleased\]/);
    expect(cl).toMatch(/Added — New chain: Rome Atrium Test \(121299\)/);

    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkg.version).toBe("0.4.1");
  });

  it("re-running with the same manifest is idempotent (no duplicate versions[])", () => {
    const root = tmpRegistry();
    const manifestPath = writeManifest(root, fixtureManifest());

    addBundle({ registryRoot: root, manifestPath });
    const after1 = readFileSync(
      path.join(root, "chains/121299-atrium-test/contracts.json"), "utf8",
    );

    // Re-running should NOT append another version entry. The bundle action
    // is fundamentally a "scaffold-this-chain" operation; if you want to
    // append a new version on a live chain, use /publish-registry-pr
    // add-contract instead.
    addBundle({ registryRoot: root, manifestPath });
    const after2 = readFileSync(
      path.join(root, "chains/121299-atrium-test/contracts.json"), "utf8",
    );

    const c2 = JSON.parse(after2);
    expect(c2).toHaveLength(4);
    for (const entry of c2) {
      expect(entry.versions).toHaveLength(1);
    }
    // contracts.json itself is byte-identical (manifest is unchanged).
    expect(after1).toBe(after2);
  });

  it("rejects a manifest with an SPL wrapper contract but no manifest.wrappers entry", () => {
    const root = tmpRegistry();
    const m = fixtureManifest();
    delete m.wrappers; // remove the WUSDC wrapper entry but leave SPL_ERC20_USDC contract
    expect(() => addBundle({ registryRoot: root, manifestPath: writeManifest(root, m) }))
      .toThrowError(/SPL wrapper contract.*lack a manifest.wrappers entry/);
  });

  it("rejects a manifest with a malformed slug", () => {
    const root = tmpRegistry();
    const m = fixtureManifest();
    m.chain.slug = "Bad/Slug"; // contains slash → invalid
    expect(() => addBundle({ registryRoot: root, manifestPath: writeManifest(root, m) }))
      .toThrowError(/chain.slug must match/);
  });

  it("rejects a manifest with an invalid sourceGitSha (short SHA)", () => {
    const root = tmpRegistry();
    const m = fixtureManifest();
    m.components["rome-solidity"].git_sha = "5e2f9ad"; // 7-char short SHA
    expect(() => addBundle({ registryRoot: root, manifestPath: writeManifest(root, m) }))
      .toThrowError(/sourceGitSha must be 40 lowercase hex chars/);
  });

  it("rejects a manifest with a non-hex bytecodeSha256", () => {
    const root = tmpRegistry();
    const m = fixtureManifest();
    m.components["rome-solidity"].contracts[0].bytecodeSha256 = "ZZZZZ_not_hex";
    expect(() => addBundle({ registryRoot: root, manifestPath: writeManifest(root, m) }))
      .toThrowError(/bytecodeSha256 must be 64 lowercase hex chars/);
  });

  it("rejects a manifest with a contract name colliding across rome-solidity and rome-uniswap-v2", () => {
    const root = tmpRegistry();
    const m = fixtureManifest();
    // Add UniswapV2Factory under rome-solidity to collide with the rome-uniswap-v2 entry.
    m.components["rome-solidity"].contracts.push({
      name: "UniswapV2Factory",
      version: "1.0.0",
      address: "0x0000000000000000000000000000000000001234",
      bytecodeSha256: "0".repeat(64),
      compilerVersion: "0.8.28",
      deployedAt: "2026-04-29T19:11:00Z",
    });
    expect(() => addBundle({ registryRoot: root, manifestPath: writeManifest(root, m) }))
      .toThrowError(/contract name 'UniswapV2Factory' appears in both/);
  });

  it("output validates against the registry's contracts.json + tokens.json schemas", async () => {
    // Copy the real schemas + fixtures into a tmp registry, run the bundle,
    // then re-validate the produced files using the actual Ajv setup.
    const root = tmpRegistry();
    // Mirror schema/ from the real repo (the tests run from the repo root).
    const repoRoot = process.cwd();
    mkdirSync(path.join(root, "schema"), { recursive: true });
    for (const f of ["chain", "contracts", "tokens", "bridge", "oracle", "endpoints", "operationalLimits"]) {
      copyFileSync(
        path.join(repoRoot, `schema/${f}.schema.json`),
        path.join(root, `schema/${f}.schema.json`),
      );
    }

    addBundle({ registryRoot: root, manifestPath: writeManifest(root, fixtureManifest()) });

    const Ajv = (await import("ajv/dist/2020")).default;
    const addFormats = (await import("ajv-formats")).default;
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);

    for (const f of ["chain", "contracts", "tokens", "bridge", "oracle", "endpoints", "operationalLimits"]) {
      const schema = JSON.parse(readFileSync(path.join(root, `schema/${f}.schema.json`), "utf8"));
      const data = JSON.parse(readFileSync(path.join(root, `chains/121299-atrium-test/${f}.json`), "utf8"));
      const validate = ajv.compile(schema);
      const ok = validate(data);
      if (!ok) console.error(`${f}.json validation errors:`, validate.errors);
      expect(ok, `${f}.json should validate`).toBe(true);
    }
  });
});
