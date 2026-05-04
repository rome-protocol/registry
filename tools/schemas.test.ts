import { describe, it, expect } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMAS = [
  "chain", "contracts", "tokens", "asset", "bridge",
  "oracle", "endpoints", "operationalLimits", "protocol", "programs",
  "gasPricing", "clusters",
];

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

describe("JSON-Schema validation", () => {
  for (const name of SCHEMAS) {
    it(`${name}: fixture passes its schema`, () => {
      const schema = JSON.parse(
        readFileSync(path.join("schema", `${name}.schema.json`), "utf8"),
      );
      const fixture = JSON.parse(
        readFileSync(path.join("tools/fixtures", `${name}.fixture.json`), "utf8"),
      );
      const validate = ajv.compile(schema);
      const ok = validate(fixture);
      if (!ok) console.error(name, "errors:", validate.errors);
      expect(ok).toBe(true);
    });
  }
});

describe("bridge.schema: optional fields (rpcUrl, cctpIrisApiBase, wsolMint)", () => {
  // Use a fresh Ajv instance: the shared `ajv` above already registered the
  // bridge schema under its $id, so reusing it here would throw "schema with
  // key or id ... already exists".
  const localAjv = new Ajv({ allErrors: true, strict: false });
  addFormats(localAjv);
  const schema = JSON.parse(
    readFileSync(path.join("schema", "bridge.schema.json"), "utf8"),
  );
  const validate = localAjv.compile(schema);

  // Minimal bridge config: required fields only — nothing else.
  const minimal = () => ({
    sourceEvm: {
      chainId: 11155111,
      name: "Sepolia",
      usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    },
    solana: {
      usdcMint: "2222222222222222222222222222222222222222222",
    },
  });

  it("accepts a bridge config without any of the new optional fields", () => {
    const ok = validate(minimal());
    if (!ok) console.error("errors:", validate.errors);
    expect(ok).toBe(true);
  });

  it("accepts sourceEvm.rpcUrl when present", () => {
    const data = minimal();
    (data.sourceEvm as Record<string, unknown>).rpcUrl =
      "https://ethereum-sepolia-rpc.publicnode.com";
    const ok = validate(data);
    if (!ok) console.error("errors:", validate.errors);
    expect(ok).toBe(true);
  });

  it("accepts top-level cctpIrisApiBase when present", () => {
    const data = minimal() as Record<string, unknown>;
    data.cctpIrisApiBase = "https://iris-api-sandbox.circle.com";
    const ok = validate(data);
    if (!ok) console.error("errors:", validate.errors);
    expect(ok).toBe(true);
  });

  it("accepts solana.wsolMint when present", () => {
    const data = minimal();
    (data.solana as Record<string, unknown>).wsolMint =
      "So11111111111111111111111111111111111111112";
    const ok = validate(data);
    if (!ok) console.error("errors:", validate.errors);
    expect(ok).toBe(true);
  });

  it("accepts all three new fields populated together", () => {
    const data = minimal() as Record<string, unknown>;
    (data.sourceEvm as Record<string, unknown>).rpcUrl =
      "https://ethereum-sepolia-rpc.publicnode.com";
    data.cctpIrisApiBase = "https://iris-api-sandbox.circle.com";
    (data.solana as Record<string, unknown>).wsolMint =
      "So11111111111111111111111111111111111111112";
    const ok = validate(data);
    if (!ok) console.error("errors:", validate.errors);
    expect(ok).toBe(true);
  });

  it("rejects an unknown top-level field (additionalProperties: false)", () => {
    const data = minimal() as Record<string, unknown>;
    data.somethingElse = "x";
    expect(validate(data)).toBe(false);
  });

  it("rejects an unknown sourceEvm field (additionalProperties: false)", () => {
    const data = minimal();
    (data.sourceEvm as Record<string, unknown>).extraField = "x";
    expect(validate(data)).toBe(false);
  });

  it("rejects an unknown solana field (additionalProperties: false)", () => {
    const data = minimal();
    (data.solana as Record<string, unknown>).extraField = "x";
    expect(validate(data)).toBe(false);
  });

  it("rejects a non-uri rpcUrl", () => {
    const data = minimal();
    (data.sourceEvm as Record<string, unknown>).rpcUrl = "not a url";
    expect(validate(data)).toBe(false);
  });

  it("rejects a non-uri cctpIrisApiBase", () => {
    const data = minimal() as Record<string, unknown>;
    data.cctpIrisApiBase = "not a url";
    expect(validate(data)).toBe(false);
  });
});
