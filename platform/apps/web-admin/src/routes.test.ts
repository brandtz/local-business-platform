import { describe, expect, it } from "vitest";

import {
  attachImpersonationToAuthViewerState,
	createAnonymousAuthViewerState,
	createAuthenticatedAuthViewerState
} from "@platform/types";

import { createRoutes } from "./routes";
import { resolveRuntimeConfig } from "./runtime-config";

describe("web admin routes", () => {
  it("defines the shell routes", () => {
    const routes = createRoutes(resolveRuntimeConfig({}));

    expect(routes.map((route) => route.path)).toEqual([
      "/",
      "/status",
      "/auth-required",
      "/access-denied"
    ]);
  });

  it("redirects anonymous viewers to authentication-required state", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAnonymousAuthViewerState("tenant")
    );

    expect(routes[0]).toMatchObject({
      path: "/",
      redirect: "/auth-required"
    });
  });

  it("redirects wrong-scope viewers to access denied", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAuthenticatedAuthViewerState(
        {
          actorType: "platform",
          displayName: "Operator",
          id: "platform-user-1"
        },
        "platform"
      )
    );

    expect(routes[0]).toMatchObject({
      path: "/",
      redirect: "/access-denied"
    });
  });

  it("allows tenant-admin viewers into the protected root route", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      createAuthenticatedAuthViewerState(
        {
          actorType: "tenant",
          displayName: "Tenant Admin",
          id: "tenant-user-1"
        },
        "tenant"
      )
    );

    expect(routes[0]).toMatchObject({ path: "/" });
    expect("redirect" in routes[0]).toBe(false);
  });

  it("exposes a visible impersonation indicator when a tenant-admin session is impersonated", () => {
    const routes = createRoutes(
      resolveRuntimeConfig({}),
      attachImpersonationToAuthViewerState(
        createAuthenticatedAuthViewerState(
          {
            actorType: "tenant",
            displayName: "Tenant Admin",
            id: "tenant-user-1"
          },
          "tenant"
        ),
        {
          expiresAt: "2026-03-16T21:30:00.000Z",
          impersonatorUserId: "platform-user-1",
          platformRole: "support",
          sessionId: "impersonation-1",
          startedAt: "2026-03-16T21:00:00.000Z",
          targetTenantId: "tenant-1",
          targetTenantName: "Alpha Fitness"
        }
      )
    );

    expect(routes[0]).toMatchObject({
      meta: {
        securityBanner: "Impersonation active for Alpha Fitness until 2026-03-16T21:30:00.000Z."
      },
      path: "/"
    });
  });
});
