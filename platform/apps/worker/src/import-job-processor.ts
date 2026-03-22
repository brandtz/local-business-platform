// ---------------------------------------------------------------------------
// E9-S2-T3: Import job processor — worker dispatch and processing definitions
// ---------------------------------------------------------------------------
// Defines the import job processor interface and dispatch patterns for the
// worker infrastructure. Jobs are dispatched via a queue (BullMQ in prod)
// and processed by registered handlers.
//
// This module defines the contract. The actual BullMQ wiring will be added
// when the worker infrastructure is fully connected with Redis.

import type {
	ImportJobPayload,
	ImportJobRetryConfig,
} from "@platform/types";
import {
	IMPORT_JOB_QUEUE_NAME,
	computeRetryDelay,
} from "@platform/types";
import type { WorkerRuntimeConfig } from "./runtime";

// ─── Job processor interface ────────────────────────────────────────────

/**
 * Interface for import job processors. Downstream stories (E9-S3 OCR, etc.)
 * implement this interface to handle specific processing stages.
 */
export interface ImportJobProcessor {
	/**
	 * Process an import job payload. Should be idempotent on retry.
	 * @throws Error on transient failure (triggers retry)
	 * @returns Processing result
	 */
	process(payload: ImportJobPayload): Promise<ImportJobProcessingResult>;

	/**
	 * Unique identifier for this processor.
	 */
	readonly processorId: string;
}

export type ImportJobProcessingResult = {
	success: boolean;
	jobId: string;
	processorId: string;
	durationMs: number;
	error?: string;
};

// ─── Job dispatch configuration ─────────────────────────────────────────

export type ImportJobDispatchConfig = {
	queueName: string;
	retryConfig: ImportJobRetryConfig;
	concurrency: number;
};

/**
 * Creates default dispatch config from worker runtime config.
 */
export function createImportJobDispatchConfig(
	workerConfig: WorkerRuntimeConfig,
	retryConfig?: ImportJobRetryConfig,
): ImportJobDispatchConfig {
	return {
		queueName: IMPORT_JOB_QUEUE_NAME,
		retryConfig: retryConfig ?? {
			maxRetries: 3,
			baseDelayMs: 5_000,
			maxDelayMs: 60_000,
		},
		concurrency: workerConfig.concurrency,
	};
}

// ─── Processor registry ─────────────────────────────────────────────────

/**
 * Registry for import job processors. Each processor handles a specific
 * stage of the import pipeline.
 */
export class ImportProcessorRegistry {
	private processors: Map<string, ImportJobProcessor> = new Map();

	register(processor: ImportJobProcessor): void {
		if (this.processors.has(processor.processorId)) {
			throw new Error(
				`Processor '${processor.processorId}' is already registered`,
			);
		}
		this.processors.set(processor.processorId, processor);
	}

	get(processorId: string): ImportJobProcessor | undefined {
		return this.processors.get(processorId);
	}

	getAll(): ImportJobProcessor[] {
		return Array.from(this.processors.values());
	}

	has(processorId: string): boolean {
		return this.processors.has(processorId);
	}

	clear(): void {
		this.processors.clear();
	}
}

// ─── Job dispatch helper ────────────────────────────────────────────────

/**
 * Determines whether a failed job should be retried based on retry config
 * and current attempt count.
 */
export function shouldRetryJob(
	currentAttempt: number,
	maxRetries: number,
): boolean {
	return currentAttempt < maxRetries;
}

/**
 * Computes the next retry delay for a given attempt.
 */
export function getNextRetryDelay(
	currentAttempt: number,
	config?: ImportJobRetryConfig,
): number {
	return computeRetryDelay(currentAttempt, config);
}

/**
 * Returns the queue name for import job processing.
 */
export function getImportQueueName(): string {
	return IMPORT_JOB_QUEUE_NAME;
}
