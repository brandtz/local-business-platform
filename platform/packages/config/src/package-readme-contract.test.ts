import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readReadme(packageDirectoryName: string): string {
  return readFileSync(
    path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "packages",
      packageDirectoryName,
      "README.md"
    ),
    "utf8"
  );
}

describe("shared package README contract", () => {
  it("documents public entrypoints and dependency guidance for every shared package", () => {
    for (const packageDirectoryName of ["config", "types", "ui", "utils", "sdk"]) {
      const readmeContents = readReadme(packageDirectoryName);

      expect(readmeContents).toContain("Public entrypoint:");
      expect(readmeContents).toContain("Starter exports:");
      expect(readmeContents).toContain("Intended consumers:");
      expect(readmeContents).toContain("Allowed workspace dependencies:");
      expect(readmeContents).toContain("Do not:");
    }
  });
});