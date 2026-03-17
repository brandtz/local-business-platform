import { describe, expect, it } from "vitest";

import { createUiShellDescriptor, packageName } from "./index";

describe("ui package public entrypoint", () => {
  it("creates a shell descriptor from the public api", () => {
    expect(packageName).toBe("@platform/ui");
    expect(createUiShellDescriptor("web-admin", "Business Admin Portal")).toEqual({
      appId: "web-admin",
      title: "Business Admin Portal"
    });
  });
});