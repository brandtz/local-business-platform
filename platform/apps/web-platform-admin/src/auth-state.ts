import { createAnonymousAuthViewerState, type AuthViewerState } from "@platform/types";

const AUTH_VIEWER_STATE_OVERRIDE_KEY = "__platform_test_web_platform_admin_auth_viewer__";

export function getAuthViewerState(): AuthViewerState {
  return readAuthViewerStateOverride() || createAnonymousAuthViewerState("platform");
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