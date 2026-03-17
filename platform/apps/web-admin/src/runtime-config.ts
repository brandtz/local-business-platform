export type WebAdminRuntimeConfig = {
  appId: string;
  appTitle: string;
};

export type WebAdminRuntimeEnvironment = {
  VITE_APP_TITLE?: string;
};

const DEFAULT_APP_TITLE = "Business Admin Portal";

function readAppTitle(rawAppTitle: string | undefined): string {
  return rawAppTitle?.trim() || DEFAULT_APP_TITLE;
}

export function resolveRuntimeConfig(
  env: WebAdminRuntimeEnvironment
): WebAdminRuntimeConfig {
  return {
    appId: "web-admin",
    appTitle: readAppTitle(env.VITE_APP_TITLE)
  };
}

export function getRuntimeConfig(): WebAdminRuntimeConfig {
  return resolveRuntimeConfig({
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE
  });
}
