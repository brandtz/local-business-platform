export type WebPlatformAdminRuntimeConfig = {
  appId: string;
  appTitle: string;
};

export type WebPlatformAdminRuntimeEnvironment = {
  VITE_APP_TITLE?: string;
};

const DEFAULT_APP_TITLE = "Platform Admin Portal";

function readAppTitle(rawAppTitle: string | undefined): string {
  return rawAppTitle?.trim() || DEFAULT_APP_TITLE;
}

export function resolveRuntimeConfig(
  env: WebPlatformAdminRuntimeEnvironment
): WebPlatformAdminRuntimeConfig {
  return {
    appId: "web-platform-admin",
    appTitle: readAppTitle(env.VITE_APP_TITLE)
  };
}

export function getRuntimeConfig(): WebPlatformAdminRuntimeConfig {
  return resolveRuntimeConfig({
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE
  });
}
