import { describe, expect, it } from "vitest";

import { createSdkClientDescriptor, packageName } from "./index";

describe("sdk package public entrypoint", () => {
  it("exposes a starter sdk descriptor", () => {
    expect(packageName).toBe("@platform/sdk");
    expect(createSdkClientDescriptor("platform-admin")).toEqual({
      name: "platform-admin",
      transport: "http"
    });
  });
});