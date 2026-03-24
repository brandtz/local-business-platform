import { createAnonymousAuthViewerState, createAuthenticatedAuthViewerState, type AuthViewerState } from "@platform/types";

const AUTH_VIEWER_STATE_OVERRIDE_KEY = "__platform_test_web_platform_admin_auth_viewer__";

export function getAuthViewerState(): AuthViewerState {
  const override = readAuthViewerStateOverride();
  if (override) return override;

  // In dev mode, default to an authenticated platform-admin so the full UI is accessible
  if (import.meta.env.DEV) {
    return createAuthenticatedAuthViewerState(
      { actorType: "platform", displayName: "Dev Platform Admin", id: "dev-platform-001" },
      "platform"
    );
  }

  return createAnonymousAuthViewerState("platform");
}

export function readAuthViewerStateOverride(
  rawValue: string | null = readSessionStorageValue()
): AuthViewerState | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AuthViewerState>;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.isAuthenticated !== "boolean" ||
      typeof parsed.status !== "string" ||
      typeof parsed.sessionScope !== "string"
    ) {
      return null;
    }

    return parsed as AuthViewerState;
  } catch {
    return null;
  }
}

function readSessionStorageValue(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(AUTH_VIEWER_STATE_OVERRIDE_KEY);
}