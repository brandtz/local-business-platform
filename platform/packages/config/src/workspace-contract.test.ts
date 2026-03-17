import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type PackageManifest = {
  scripts?: Record<string, string>;
};

function readManifest(...relativePathSegments: string[]): PackageManifest {
  const manifestPath = path.resolve(__dirname, "..", "..", "..", ...relativePathSegments);

  return JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
}

describe("workspace startup contract", () => {
  it("exposes stable root startup and preview scripts", () => {
    const manifest = readManifest("package.json");

    expect(manifest.scripts).toMatchObject({
      dev: "turbo run dev --parallel",
      "dev:customer": "turbo run dev --filter=@platform/web-customer",
      "dev:admin": "turbo run dev --filter=@platform/web-admin",
      "dev:platform": "turbo run dev --filter=@platform/web-platform-admin",
      "dev:api": "turbo run dev --filter=@platform/api",
      "dev:worker": "turbo run dev --filter=@platform/worker",
      "start:api": "pnpm --filter @platform/api start",
      "start:worker": "pnpm --filter @platform/worker start",
      "preview:customer": "pnpm --filter @platform/web-customer preview",
      "preview:admin": "pnpm --filter @platform/web-admin preview",
      "preview:platform": "pnpm --filter @platform/web-platform-admin preview"
    });
  });

  it("ensures each app exposes the expected startup entry points", () => {
    expect(readManifest("apps", "api", "package.json").scripts).toMatchObject({
      dev: "tsx watch src/main.ts",
      start: "node dist/main.js"
    });
    expect(readManifest("apps", "worker", "package.json").scripts).toMatchObject({
      dev: "tsx watch src/main.ts",
      start: "node dist/main.js"
    });
    expect(
      readManifest("apps", "web-customer", "package.json").scripts
    ).toMatchObject({
      dev: "vite",
      preview: "vite preview --host 0.0.0.0"
    });
    expect(readManifest("apps", "web-admin", "package.json").scripts).toMatchObject({
      dev: "vite",
      preview: "vite preview --host 0.0.0.0"
    });
    expect(
      readManifest("apps", "web-platform-admin", "package.json").scripts
    ).toMatchObject({
      dev: "vite",
      preview: "vite preview --host 0.0.0.0"
    });
  });
});