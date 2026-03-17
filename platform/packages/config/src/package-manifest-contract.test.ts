import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type PackageManifest = {
  exports?: Record<string, string>;
  main?: string;
  name?: string;
  types?: string;
};

function readPackageManifest(packageDirectoryName: string): PackageManifest {
  const manifestPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "packages",
    packageDirectoryName,
    "package.json"
  );

  return JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
}

describe("shared package manifest contract", () => {
  it("publishes a root export for every shared package", () => {
    expect(readPackageManifest("config")).toMatchObject({
      name: "@platform/config",
      main: "src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": "./src/index.ts"
      }
    });
    expect(readPackageManifest("types")).toMatchObject({
      name: "@platform/types",
      main: "src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": "./src/index.ts"
      }
    });
    expect(readPackageManifest("ui")).toMatchObject({
      name: "@platform/ui",
      main: "src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": "./src/index.ts"
      }
    });
    expect(readPackageManifest("utils")).toMatchObject({
      name: "@platform/utils",
      main: "src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": "./src/index.ts"
      }
    });
    expect(readPackageManifest("sdk")).toMatchObject({
      name: "@platform/sdk",
      main: "src/index.ts",
      types: "./src/index.ts",
      exports: {
        ".": "./src/index.ts"
      }
    });
  });
});