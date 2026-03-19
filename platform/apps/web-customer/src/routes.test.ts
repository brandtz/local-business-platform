import { describe, expect, it } from "vitest";

import { createRoutes } from "./routes";
import { resolveRuntimeConfig } from "./runtime-config";
import type { TenantFrontendContext } from "./tenant-bootstrap";

const runtimeConfig = resolveRuntimeConfig({});

describe("web customer routes", () => {
  it("defines the shell routes without tenant context", () => {
    const routes = createRoutes(runtimeConfig);

    expect(routes.map((route) => route.path)).toEqual(["/", "/status"]);
  });

  it("defines the shell routes with tenant context", () => {
    const tenantContext: TenantFrontendContext = {
      tenantId: "t-001",
      displayName: "Joe's Diner",
      slug: "joes-diner",
      status: "active",
      previewSubdomain: "joes-diner",
      templateKey: "restaurant-core",
      enabledModules: ["catalog", "ordering"]
    };

    const routes = createRoutes(runtimeConfig, tenantContext);

    expect(routes.map((route) => route.path)).toEqual(["/", "/status"]);
  });
});
