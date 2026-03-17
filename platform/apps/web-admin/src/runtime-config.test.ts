import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtime-config";

describe("web admin runtime config", () => {
  it("uses a stable default title", () => {
    expect(resolveRuntimeConfig({})).toEqual({
      appId: "web-admin",
      appTitle: "Business Admin Portal"
    });
  });

  it("falls back when the configured title is empty", () => {
    expect(
      resolveRuntimeConfig({
        VITE_APP_TITLE: "   "
      })
    ).toEqual({
      appId: "web-admin",
      appTitle: "Business Admin Portal"
    });
  });
});