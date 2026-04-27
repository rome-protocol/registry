import { describe, it, expect } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMAS = [
  "chain", "contracts", "tokens", "asset", "bridge",
  "oracle", "endpoints", "operationalLimits", "protocol", "programs",
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
