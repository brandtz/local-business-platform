import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("eslint boundary config", () => {
  it("blocks private workspace source imports", () => {
    const configModulePath = path.resolve(__dirname, "..", "eslint.config.mjs");
    const configContents = readFileSync(configModulePath, "utf8");

    expect(configContents).toContain('"no-restricted-imports"');
    expect(configContents).toContain('"@platform/*/src/*"');
    expect(configContents).toContain('"**/packages/*/src/*"');
    expect(configContents).toContain('"**/apps/*/src/*"');
    expect(configContents).toContain(
      "Import from workspace public entrypoints only. Do not reach into another workspace's src directory."
    );
  });
});