import { describe, expect, it } from "vitest";

import { getAuthViewerState, readAuthViewerStateOverride } from "./auth-state";

describe("web customer auth state", () => {
  it("exposes only minimal anonymous customer auth state", () => {
    const authState = getAuthViewerState();

    expect(authState).toEqual({
      actorType: null,
      displayName: null,
      isAuthenticated: false,
      sessionScope: "customer",
      status: "anonymous",
      userId: null
    });
    expect("platformRole" in authState).toBe(false);
  });

  it("reads a valid session storage override payload", () => {
    expect(
      readAuthViewerStateOverride(
        JSON.stringify({
          actorType: "customer",
          displayName: "Customer Viewer",
          isAuthenticated: true,
          sessionScope: "customer",
          status: "authenticated",
          userId: "customer-user-1"
        })
      )
    ).toEqual({
      actorType: "customer",
      displayName: "Customer Viewer",
      isAuthenticated: true,
      sessionScope: "customer",
      status: "authenticated",
      userId: "customer-user-1"
    });
  });
});