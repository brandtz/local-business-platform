import { describe, expect, it } from "vitest";

import { resolveApiRuntimeConfig } from "./runtime-config";

describe("api runtime config", () => {
  it("uses defaults when environment values are missing", () => {
    expect(resolveApiRuntimeConfig({})).toEqual({
      host: "0.0.0.0",
      port: 3000
    });
  });

  it("prefers explicit api port over generic port", () => {
    expect(
      resolveApiRuntimeConfig({
        API_HOST: " 127.0.0.1 ",
        API_PORT: "4100",
        PORT: "4200"
      })
    ).toEqual({
      host: "127.0.0.1",
      port: 4100
    });
  });

  it("rejects invalid port values", () => {
    expect(() =>
      resolveApiRuntimeConfig({
        API_PORT: "70000"
      })
    ).toThrow("Invalid API port: 70000");
  });
});