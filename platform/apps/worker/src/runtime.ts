export type WorkerRuntimeConfig = {
  concurrency: number;
  queueName: string;
};

export type WorkerRuntimeEnvironment = {
  WORKER_CONCURRENCY?: string;
  WORKER_QUEUE_NAME?: string;
};

export type WorkerHealthSnapshot = WorkerRuntimeConfig & {
  status: "ready";
};

const DEFAULT_CONCURRENCY = 1;
const DEFAULT_QUEUE_NAME = "platform-default";

function parseConcurrency(rawConcurrency: string | undefined): number {
  if (!rawConcurrency) {
    return DEFAULT_CONCURRENCY;
  }

  const parsedConcurrency = Number(rawConcurrency);

  if (!Number.isInteger(parsedConcurrency) || parsedConcurrency <= 0) {
    throw new Error(`Invalid worker concurrency: ${rawConcurrency}`);
  }

  return parsedConcurrency;
}

function readQueueName(rawQueueName: string | undefined): string {
  return rawQueueName?.trim() || DEFAULT_QUEUE_NAME;
}

export function resolveWorkerRuntimeConfig(
  env: WorkerRuntimeEnvironment
): WorkerRuntimeConfig {
  return {
    concurrency: parseConcurrency(env.WORKER_CONCURRENCY),
    queueName: readQueueName(env.WORKER_QUEUE_NAME)
  };
}

export function getWorkerRuntimeConfig(): WorkerRuntimeConfig {
  return resolveWorkerRuntimeConfig(process.env);
}

export function createWorkerHealthSnapshot(
  runtimeConfig: WorkerRuntimeConfig
): WorkerHealthSnapshot {
  return {
    ...runtimeConfig,
    status: "ready"
  };
}
