import { describe, expect, it } from "vitest";

import { createRoutes } from "./routes";
import { resolveRuntimeConfig } from "./runtime-config";

describe("web customer routes", () => {
  it("defines the shell routes", () => {
    const routes = createRoutes(resolveRuntimeConfig({}));

    expect(routes.map((route) => route.path)).toEqual(["/", "/status"]);
  });
});
