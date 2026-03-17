export type ApiRuntimeConfig = {
  host: string;
  port: number;
};

export type ApiRuntimeEnvironment = {
  API_HOST?: string;
  API_PORT?: string;
  PORT?: string;
};

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(rawPort);

  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    throw new Error(`Invalid API port: ${rawPort}`);
  }

  return parsedPort;
}

function readHost(rawHost: string | undefined): string {
  return rawHost?.trim() || DEFAULT_HOST;
}

export function resolveApiRuntimeConfig(
  env: ApiRuntimeEnvironment
): ApiRuntimeConfig {
  return {
    host: readHost(env.API_HOST),
    port: parsePort(env.API_PORT || env.PORT)
  };
}

export function getApiRuntimeConfig(): ApiRuntimeConfig {
  return resolveApiRuntimeConfig(process.env);
}
