import { describe, expect, it } from "vitest";

import { getAuthViewerState, readAuthViewerStateOverride } from "./auth-state";

describe("web platform admin auth state", () => {
  it("exposes only minimal anonymous platform auth state", () => {
    const authState = getAuthViewerState();

    expect(authState).toEqual({
      actorType: null,
      displayName: null,
      isAuthenticated: false,
      sessionScope: "platform",
      status: "anonymous",
      userId: null
    });
    expect("platformRole" in authState).toBe(false);
  });

  it("accepts a serialized override for Playwright-driven smoke flows", () => {
    const authState = readAuthViewerStateOverride(
      JSON.stringify({
        actorType: "platform",
        displayName: "Operator",
        isAuthenticated: true,
        sessionScope: "platform",
        status: "authenticated",
        userId: "platform-user-1"
      })
    );

    expect(authState).toEqual({
      actorType: "platform",
      displayName: "Operator",
      isAuthenticated: true,
      sessionScope: "platform",
      status: "authenticated",
      userId: "platform-user-1"
    });
  });
});