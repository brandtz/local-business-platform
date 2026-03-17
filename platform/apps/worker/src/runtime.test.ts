import { describe, expect, it } from "vitest";

import {
  createWorkerHealthSnapshot,
  getWorkerRuntimeConfig,
  resolveWorkerRuntimeConfig
} from "./runtime";

describe("worker runtime", () => {
  it("returns a ready health snapshot", () => {
    expect(
      createWorkerHealthSnapshot({
        concurrency: 2,
        queueName: "jobs"
      })
    ).toEqual({
      concurrency: 2,
      queueName: "jobs",
      status: "ready"
    });
  });

  it("uses defaults when env vars are not provided", () => {
    delete process.env.WORKER_CONCURRENCY;
    delete process.env.WORKER_QUEUE_NAME;

    expect(getWorkerRuntimeConfig()).toEqual({
      concurrency: 1,
      queueName: "platform-default"
    });
  });

  it("resolves trimmed environment values", () => {
    expect(
      resolveWorkerRuntimeConfig({
        WORKER_CONCURRENCY: "3",
        WORKER_QUEUE_NAME: " jobs "
      })
    ).toEqual({
      concurrency: 3,
      queueName: "jobs"
    });
  });

  it("rejects invalid concurrency values", () => {
    expect(() =>
      resolveWorkerRuntimeConfig({
        WORKER_CONCURRENCY: "0"
      })
    ).toThrow("Invalid worker concurrency: 0");
  });
});
