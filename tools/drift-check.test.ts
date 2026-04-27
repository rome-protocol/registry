import { describe, it, expect } from "vitest";
import { driftCheck } from "./drift-check.js";
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

function tmpRegistry(): string {
  const root = mkdtempSync(path.join(tmpdir(), "registry-"));
  mkdirSync(path.join(root, "chains/121226-marcus"), { recursive: true });
  writeFileSync(
    path.join(root, "chains/121226-marcus/contracts.json"),
    JSON.stringify([
      {
        name: "RomeBridgePaymaster",
        versions: [{
          address: "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef",
          version: "1.0.0",
          status: "live",
          deployedAt: "2026-03-13T00:00:00Z",
        }],
      },
    ]),
  );
  writeFileSync(
    path.join(root, "chains/121226-marcus/chain.json"),
    JSON.stringify({ chainId: 121226, name: "Rome Marcus" }),
  );
  return root;
}

describe("drift-check", () => {
  it("passes when manifest claim matches registry value", async () => {
    const root = tmpRegistry();
    const manifest = path.join(root, "manifest.yaml");
    writeFileSync(
      manifest,
      `checks:
  - registryPath: chains/121226-marcus/contracts.json#[?name=='RomeBridgePaymaster'].versions[?status=='live'].address
    expected: "0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef"
`,
    );
    const result = await driftCheck({ manifestPath: manifest, registryRoot: root });
    expect(result.ok).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it("reports mismatch with expected/actual + suggestion", async () => {
    const root = tmpRegistry();
    const manifest = path.join(root, "manifest.yaml");
    writeFileSync(
      manifest,
      `checks:
  - registryPath: chains/121226-marcus/contracts.json#[?name=='RomeBridgePaymaster'].versions[?status=='live'].address
    expected: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
`,
    );
    const result = await driftCheck({ manifestPath: manifest, registryRoot: root });
    expect(result.ok).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    const m = result.mismatches[0];
    expect(m.message).toContain("expected");
    expect(m.message).toContain("got");
    expect(m.message).toContain("0xcaf1fbcf60c3686d87d0a5111f340a99250ce4ef");
    expect(m.message).toContain("registry-exempt");
  });

  it("resolves a simple dot path on an object", async () => {
    const root = tmpRegistry();
    const manifest = path.join(root, "manifest.yaml");
    writeFileSync(
      manifest,
      `checks:
  - registryPath: chains/121226-marcus/chain.json#chainId
    expected: 121226
`,
    );
    const result = await driftCheck({ manifestPath: manifest, registryRoot: root });
    expect(result.ok).toBe(true);
  });
});
