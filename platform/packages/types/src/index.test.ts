import { describe, expect, it } from "vitest";

import { appShellIds, packageName, sharedPackageNames } from "./index";

describe("types package public entrypoint", () => {
  it("exposes the shared package contract values", () => {
    expect(packageName).toBe("@platform/types");
    expect(appShellIds).toContain("web-platform-admin");
    expect(sharedPackageNames).toContain("@platform/sdk");
  });
});