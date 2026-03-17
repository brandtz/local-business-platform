import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtime-config";

describe("web customer runtime config", () => {
  it("uses a stable default title", () => {
    expect(resolveRuntimeConfig({})).toEqual({
      appId: "web-customer",
      appTitle: "Customer Portal"
    });
  });

  it("trims configured title values", () => {
    expect(
      resolveRuntimeConfig({
        VITE_APP_TITLE: " Customer Ordering Experience "
      })
    ).toEqual({
      appId: "web-customer",
      appTitle: "Customer Ordering Experience"
    });
  });
});