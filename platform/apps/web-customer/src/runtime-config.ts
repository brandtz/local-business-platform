export type WebCustomerRuntimeConfig = {
  appId: string;
  appTitle: string;
};

export type WebCustomerRuntimeEnvironment = {
  VITE_APP_TITLE?: string;
};

const DEFAULT_APP_TITLE = "Customer Portal";

function readAppTitle(rawAppTitle: string | undefined): string {
  return rawAppTitle?.trim() || DEFAULT_APP_TITLE;
}

export function resolveRuntimeConfig(
  env: WebCustomerRuntimeEnvironment
): WebCustomerRuntimeConfig {
  return {
    appId: "web-customer",
    appTitle: readAppTitle(env.VITE_APP_TITLE)
  };
}

export function getRuntimeConfig(): WebCustomerRuntimeConfig {
  return resolveRuntimeConfig({
    VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE
  });
}
