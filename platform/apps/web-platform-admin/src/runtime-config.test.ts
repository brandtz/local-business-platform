import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtime-config";

describe("web platform admin runtime config", () => {
  it("uses a stable default title", () => {
    expect(resolveRuntimeConfig({})).toEqual({
      appId: "web-platform-admin",
      appTitle: "Platform Admin Portal"
    });
  });

  it("trims configured title values", () => {
    expect(
      resolveRuntimeConfig({
        VITE_APP_TITLE: " Platform Control Center "
      })
    ).toEqual({
      appId: "web-platform-admin",
      appTitle: "Platform Control Center"
    });
  });
});