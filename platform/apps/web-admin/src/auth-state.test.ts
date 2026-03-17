import { describe, expect, it } from "vitest";

import { getAuthViewerState, readAuthViewerStateOverride } from "./auth-state";

describe("web admin auth state", () => {
  it("exposes only minimal anonymous tenant auth state", () => {
    const authState = getAuthViewerState();

    expect(authState).toEqual({
      actorType: null,
      displayName: null,
      isAuthenticated: false,
      sessionScope: "tenant",
      status: "anonymous",
      userId: null
    });
    expect("platformRole" in authState).toBe(false);
  });

  it("accepts a serialized override for Playwright-driven smoke flows", () => {
    const authState = readAuthViewerStateOverride(
      JSON.stringify({
        actorType: "tenant",
        displayName: "Tenant Admin",
        isAuthenticated: true,
        sessionScope: "tenant",
        status: "authenticated",
        userId: "tenant-user-1"
      })
    );

    expect(authState).toEqual({
      actorType: "tenant",
      displayName: "Tenant Admin",
      isAuthenticated: true,
      sessionScope: "tenant",
      status: "authenticated",
      userId: "tenant-user-1"
    });
  });
});