// ---------------------------------------------------------------------------
// E9-S2-T3: Import job processor tests — dispatch and registry
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from "vitest";
import type { ImportJobPayload } from "@platform/types";
import { IMPORT_JOB_QUEUE_NAME } from "@platform/types";
import {
	ImportProcessorRegistry,
	createImportJobDispatchConfig,
	shouldRetryJob,
	getNextRetryDelay,
	getImportQueueName,
} from "./import-job-processor";
import type { ImportJobProcessor, ImportJobProcessingResult } from "./import-job-processor";
import { resolveWorkerRuntimeConfig } from "./runtime";

// ─── Test helpers ───────────────────────────────────────────────────────

function createTestProcessor(id: string): ImportJobProcessor {
	return {
		processorId: id,
		async process(payload: ImportJobPayload): Promise<ImportJobProcessingResult> {
			return {
				success: true,
				jobId: payload.jobId,
				processorId: id,
				durationMs: 100,
			};
		},
	};
}

// ─── Processor registry tests ───────────────────────────────────────────

describe("ImportProcessorRegistry", () => {
	let registry: ImportProcessorRegistry;

	beforeEach(() => {
		registry = new ImportProcessorRegistry();
	});

	it("registers and retrieves a processor", () => {
		const proc = createTestProcessor("ocr");
		registry.register(proc);

		expect(registry.has("ocr")).toBe(true);
		expect(registry.get("ocr")).toBe(proc);
	});

	it("lists all registered processors", () => {
		registry.register(createTestProcessor("ocr"));
		registry.register(createTestProcessor("extraction"));

		const all = registry.getAll();
		expect(all).toHaveLength(2);
	});

	it("rejects duplicate registration", () => {
		registry.register(createTestProcessor("ocr"));
		expect(() => registry.register(createTestProcessor("ocr"))).toThrow(
			"already registered",
		);
	});

	it("returns undefined for unknown processor", () => {
		expect(registry.get("unknown")).toBeUndefined();
		expect(registry.has("unknown")).toBe(false);
	});

	it("clears all processors", () => {
		registry.register(createTestProcessor("ocr"));
		registry.clear();
		expect(registry.getAll()).toHaveLength(0);
	});
});

// ─── Dispatch config tests ──────────────────────────────────────────────

describe("createImportJobDispatchConfig", () => {
	it("creates config from worker runtime config", () => {
		const workerConfig = resolveWorkerRuntimeConfig({});
		const config = createImportJobDispatchConfig(workerConfig);

		expect(config.queueName).toBe(IMPORT_JOB_QUEUE_NAME);
		expect(config.concurrency).toBe(1); // default
		expect(config.retryConfig.maxRetries).toBe(3);
		expect(config.retryConfig.baseDelayMs).toBe(5_000);
	});

	it("uses custom retry config when provided", () => {
		const workerConfig = resolveWorkerRuntimeConfig({ WORKER_CONCURRENCY: "4" });
		const config = createImportJobDispatchConfig(workerConfig, {
			maxRetries: 5,
			baseDelayMs: 10_000,
			maxDelayMs: 120_000,
		});

		expect(config.concurrency).toBe(4);
		expect(config.retryConfig.maxRetries).toBe(5);
	});
});

// ─── Retry logic tests ──────────────────────────────────────────────────

describe("shouldRetryJob", () => {
	it("allows retry when under max", () => {
		expect(shouldRetryJob(0, 3)).toBe(true);
		expect(shouldRetryJob(1, 3)).toBe(true);
		expect(shouldRetryJob(2, 3)).toBe(true);
	});

	it("denies retry at max", () => {
		expect(shouldRetryJob(3, 3)).toBe(false);
		expect(shouldRetryJob(4, 3)).toBe(false);
	});
});

describe("getNextRetryDelay", () => {
	it("computes exponential delay", () => {
		expect(getNextRetryDelay(0)).toBe(5_000);
		expect(getNextRetryDelay(1)).toBe(10_000);
		expect(getNextRetryDelay(2)).toBe(20_000);
	});

	it("caps at max delay", () => {
		expect(getNextRetryDelay(10)).toBe(60_000);
	});
});

// ─── Queue name ─────────────────────────────────────────────────────────

describe("getImportQueueName", () => {
	it("returns the import queue name", () => {
		expect(getImportQueueName()).toBe("import-processing");
	});
});

// ─── Processor execution ────────────────────────────────────────────────

describe("processor execution", () => {
	it("processes a job payload successfully", async () => {
		const proc = createTestProcessor("test-processor");
		const payload: ImportJobPayload = {
			jobId: "job-1",
			tenantId: "tenant-1",
			artifactId: "art-1",
			artifactType: "menu-pdf",
			storagePath: "tenant-1/imports/art-1/menu.pdf",
			retryAttempt: 0,
		};

		const result = await proc.process(payload);
		expect(result.success).toBe(true);
		expect(result.jobId).toBe("job-1");
		expect(result.processorId).toBe("test-processor");
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});
});
