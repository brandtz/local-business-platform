// ---------------------------------------------------------------------------
// E9-S2-T2: Upload intake service — artifact upload, validation, scan, job creation
// E9-S2-T3: Worker job dispatch — import job lifecycle and dispatch
// ---------------------------------------------------------------------------

import { Injectable } from "@nestjs/common";
import type {
	ImportArtifactRecord,
	ImportJobRecord,
	CreateImportArtifactInput,
	CreateImportJobInput,
	ImportJobStatus,
	ImportJobPayload,
	ImportJobDispatchResult,
	ImportJobRetryResult,
	UploadArtifactResponse,
	ImportJobPaginatedResult,
	ImportArtifactListFilter,
	ImportJobListFilter,
	ImportJobStagedOutput,
} from "@platform/types";
import {
	validateCreateImportArtifactInput,
	validateCreateImportJobInput,
	sanitizeFilename,
	generateArtifactStoragePath,
	isValidImportJobTransition,
	IMPORT_JOB_QUEUE_NAME,
	DEFAULT_IMPORT_JOB_RETRY_CONFIG,
	computeRetryDelay,
} from "@platform/types";
import { ImportArtifactRepository } from "./import-artifact.repository";
import { ImportJobRepository } from "./import-job.repository";
import { resolveMalwareScanner } from "./malware-scanner";
import type { MalwareScanner } from "./malware-scanner";

// ─── Error classes ──────────────────────────────────────────────────────

export class ImportArtifactNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportArtifactNotFoundError";
	}
}

export class ImportArtifactValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportArtifactValidationError";
	}
}

export class ImportJobNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportJobNotFoundError";
	}
}

export class ImportJobValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportJobValidationError";
	}
}

export class ImportJobTransitionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ImportJobTransitionError";
	}
}

// ─── Job dispatch queue interface ───────────────────────────────────────

/**
 * Interface for job dispatch — pluggable queue backend.
 * In production, this would be backed by BullMQ.
 */
export interface ImportJobQueue {
	enqueue(payload: ImportJobPayload): Promise<ImportJobDispatchResult>;
	getQueueName(): string;
}

/**
 * In-memory job queue for development/testing.
 */
export class InMemoryImportJobQueue implements ImportJobQueue {
	private queue: ImportJobPayload[] = [];

	async enqueue(payload: ImportJobPayload): Promise<ImportJobDispatchResult> {
		this.queue.push(payload);
		return {
			dispatched: true,
			jobId: payload.jobId,
			queueName: this.getQueueName(),
		};
	}

	getQueueName(): string {
		return IMPORT_JOB_QUEUE_NAME;
	}

	/** Test helper: returns dispatched payloads */
	getDispatched(): readonly ImportJobPayload[] {
		return [...this.queue];
	}

	/** Test helper: clears queue */
	clear(): void {
		this.queue.length = 0;
	}
}

// ─── ID generation ──────────────────────────────────────────────────────

let idCounter = 0;

function generateId(prefix: string): string {
	idCounter += 1;
	return `${prefix}-${Date.now()}-${idCounter}`;
}

/** Reset ID counter (for tests). */
export function resetIdCounter(): void {
	idCounter = 0;
}

// ─── Service ────────────────────────────────────────────────────────────

@Injectable()
export class ImportService {
	private readonly scanner: MalwareScanner;

	constructor(
		private readonly artifactRepo: ImportArtifactRepository = new ImportArtifactRepository(),
		private readonly jobRepo: ImportJobRepository = new ImportJobRepository(),
		private readonly jobQueue: ImportJobQueue = new InMemoryImportJobQueue(),
		scanner?: MalwareScanner,
	) {
		this.scanner = resolveMalwareScanner(scanner);
	}

	// ── E9-S2-T2: Upload intake ─────────────────────────────────────

	/**
	 * Processes an artifact upload: validates, scans, stores, creates import job.
	 * Returns both the artifact record and the created import job.
	 */
	async uploadArtifact(
		input: CreateImportArtifactInput,
	): Promise<UploadArtifactResponse> {
		// Validate input
		const validation = validateCreateImportArtifactInput(input);
		if (!validation.valid) {
			throw new ImportArtifactValidationError(
				`Invalid artifact input: ${validation.errors.join("; ")}`,
			);
		}

		// Sanitize filename
		const safeName = sanitizeFilename(input.originalFilename);

		// Generate IDs
		const artifactId = generateId("art");

		// Generate tenant-scoped storage path
		const storagePath = generateArtifactStoragePath(
			input.tenantId,
			artifactId,
			safeName,
		);

		// Create artifact record (pending status)
		const artifact: ImportArtifactRecord = {
			id: artifactId,
			tenantId: input.tenantId,
			artifactType: input.artifactType,
			originalFilename: input.originalFilename,
			sanitizedFilename: safeName,
			storagePath,
			mimeType: input.mimeType as ImportArtifactRecord["mimeType"],
			fileSizeBytes: input.fileSizeBytes,
			uploadStatus: "pending",
			scanResult: null,
			uploadedBy: input.uploadedBy,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		this.artifactRepo.create(artifact);

		// Run malware scan hook
		const scanResult = await this.scanner.scan(storagePath, input.mimeType);

		if (scanResult.status === "infected") {
			this.artifactRepo.updateStatus(
				artifactId,
				input.tenantId,
				"rejected",
				scanResult.details ?? "Malware detected",
			);
			throw new ImportArtifactValidationError(
				"File rejected: malware detected during scan",
			);
		}

		if (scanResult.status === "scan-error") {
			// Fail-safe: reject on scan error
			this.artifactRepo.updateStatus(
				artifactId,
				input.tenantId,
				"scan-failed",
				scanResult.details ?? "Scan error",
			);
			throw new ImportArtifactValidationError(
				"File rejected: malware scan failed — cannot proceed without clear scan",
			);
		}

		// Mark as stored (scan passed or skipped)
		this.artifactRepo.updateStatus(
			artifactId,
			input.tenantId,
			"stored",
			scanResult.details ?? undefined,
		);

		// Create import job
		const job = this.createImportJob({
			tenantId: input.tenantId,
			artifactId,
			createdBy: input.uploadedBy,
		});

		// Dispatch to processing queue
		await this.dispatchJob(job, artifact);

		// Return fresh copies
		const updatedArtifact = this.artifactRepo.findById(artifactId)!;
		return { artifact: updatedArtifact, job };
	}

	// ── E9-S2-T2: Import job creation ───────────────────────────────

	createImportJob(input: CreateImportJobInput): ImportJobRecord {
		const validation = validateCreateImportJobInput(input);
		if (!validation.valid) {
			throw new ImportJobValidationError(
				`Invalid job input: ${validation.reason}`,
			);
		}

		// Check for existing non-terminal job for same artifact
		const existing = this.jobRepo.findByArtifactId(
			input.artifactId,
			input.tenantId,
		);
		if (
			existing &&
			existing.status !== "completed" &&
			existing.status !== "failed"
		) {
			throw new ImportJobValidationError(
				`Active import job already exists for artifact ${input.artifactId}: job ${existing.id} (${existing.status})`,
			);
		}

		const jobId = generateId("job");
		const now = new Date().toISOString();

		const job: ImportJobRecord = {
			id: jobId,
			tenantId: input.tenantId,
			artifactId: input.artifactId,
			status: "pending",
			retryCount: 0,
			maxRetries: DEFAULT_IMPORT_JOB_RETRY_CONFIG.maxRetries,
			failureReason: null,
			stagedOutput: null,
			createdBy: input.createdBy,
			createdAt: now,
			updatedAt: now,
			startedAt: null,
			completedAt: null,
		};

		return this.jobRepo.create(job);
	}

	// ── E9-S2-T3: Job dispatch ──────────────────────────────────────

	/**
	 * Dispatches an import job to the processing queue.
	 */
	async dispatchJob(
		job: ImportJobRecord,
		artifact: ImportArtifactRecord,
	): Promise<ImportJobDispatchResult> {
		const payload: ImportJobPayload = {
			jobId: job.id,
			tenantId: job.tenantId,
			artifactId: job.artifactId,
			artifactType: artifact.artifactType,
			storagePath: artifact.storagePath,
			retryAttempt: job.retryCount,
		};

		return this.jobQueue.enqueue(payload);
	}

	// ── E9-S2-T2: Job state transitions ─────────────────────────────

	transitionJobStatus(
		jobId: string,
		tenantId: string,
		newStatus: ImportJobStatus,
		updates?: { failureReason?: string },
	): ImportJobRecord {
		const job = this.jobRepo.findByIdAndTenant(jobId, tenantId);
		if (!job) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}

		if (!isValidImportJobTransition(job.status, newStatus)) {
			throw new ImportJobTransitionError(
				`Cannot transition job ${jobId} from '${job.status}' to '${newStatus}'`,
			);
		}

		const now = new Date().toISOString();
		const updateFields: Parameters<typeof this.jobRepo.updateStatus>[3] = {};

		if (newStatus === "processing") {
			updateFields.startedAt = now;
		}
		if (newStatus === "completed") {
			updateFields.completedAt = now;
		}
		if (newStatus === "failed" && updates?.failureReason) {
			updateFields.failureReason = updates.failureReason;
		}

		const updated = this.jobRepo.updateStatus(
			jobId,
			tenantId,
			newStatus,
			updateFields,
		);
		if (!updated) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}
		return updated;
	}

	/**
	 * Sets staged output on a job. Ensures idempotency — if staged output
	 * already exists and matches the same artifact, it is overwritten (not duplicated).
	 */
	setStagedOutput(
		jobId: string,
		tenantId: string,
		stagedOutput: ImportJobStagedOutput,
	): ImportJobRecord {
		const job = this.jobRepo.findByIdAndTenant(jobId, tenantId);
		if (!job) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}
		if (job.status !== "processing" && job.status !== "staged") {
			throw new ImportJobTransitionError(
				`Cannot set staged output on job ${jobId} in status '${job.status}'`,
			);
		}

		const updated = this.jobRepo.setStagedOutput(jobId, tenantId, stagedOutput);
		if (!updated) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}

		// Transition to staged if currently processing
		if (updated.status === "processing") {
			return this.transitionJobStatus(jobId, tenantId, "staged");
		}
		return updated;
	}

	// ── E9-S2-T3: Retry with backoff ────────────────────────────────

	/**
	 * Retries a failed import job. Resets to pending and re-dispatches.
	 * Respects max retry limit.
	 */
	async retryJob(
		jobId: string,
		tenantId: string,
	): Promise<ImportJobRetryResult> {
		const job = this.jobRepo.findByIdAndTenant(jobId, tenantId);
		if (!job) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}

		if (job.status !== "failed") {
			return {
				success: false,
				jobId,
				newStatus: job.status,
				reason: `Job is in status '${job.status}', not 'failed'`,
			};
		}

		if (job.retryCount >= job.maxRetries) {
			return {
				success: false,
				jobId,
				newStatus: job.status,
				reason: `Maximum retries (${job.maxRetries}) exceeded`,
			};
		}

		// Increment retry count and reset to pending
		const newRetryCount = job.retryCount + 1;
		this.jobRepo.updateStatus(jobId, tenantId, "pending", {
			retryCount: newRetryCount,
			failureReason: null,
		});

		// Fetch artifact for dispatch
		const artifact = this.artifactRepo.findByIdAndTenant(
			job.artifactId,
			tenantId,
		);
		if (!artifact) {
			throw new ImportArtifactNotFoundError(
				`Artifact ${job.artifactId} not found for tenant ${tenantId}`,
			);
		}

		// Dispatch with updated retry count
		const updatedJob = this.jobRepo.findByIdAndTenant(jobId, tenantId)!;
		await this.dispatchJob(updatedJob, artifact);

		return {
			success: true,
			jobId,
			newStatus: "pending",
		};
	}

	/**
	 * Computes backoff delay for a job's current retry attempt.
	 */
	getRetryDelay(jobId: string, tenantId: string): number {
		const job = this.jobRepo.findByIdAndTenant(jobId, tenantId);
		if (!job) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}
		return computeRetryDelay(job.retryCount);
	}

	// ── E9-S2-T3: Resumability ──────────────────────────────────────

	/**
	 * Lists jobs that were in-progress before a worker restart.
	 * These should be re-dispatched to continue processing.
	 */
	listResumableJobs(): ImportJobRecord[] {
		return this.jobRepo.listByStatus("processing");
	}

	// ── E9-S2-T4: Admin queries ─────────────────────────────────────

	getArtifact(
		artifactId: string,
		tenantId: string,
	): ImportArtifactRecord {
		const artifact = this.artifactRepo.findByIdAndTenant(artifactId, tenantId);
		if (!artifact) {
			throw new ImportArtifactNotFoundError(
				`Artifact ${artifactId} not found for tenant ${tenantId}`,
			);
		}
		return artifact;
	}

	getJob(jobId: string, tenantId: string): ImportJobRecord {
		const job = this.jobRepo.findByIdAndTenant(jobId, tenantId);
		if (!job) {
			throw new ImportJobNotFoundError(
				`Import job ${jobId} not found for tenant ${tenantId}`,
			);
		}
		return job;
	}

	listArtifacts(
		filter: ImportArtifactListFilter,
	): ImportJobPaginatedResult<ImportArtifactRecord> {
		const page = filter.page ?? 1;
		const pageSize = filter.pageSize ?? 20;
		const { items, total } = this.artifactRepo.listByTenant(filter.tenantId, {
			artifactType: filter.artifactType,
			uploadStatus: filter.uploadStatus,
			page,
			pageSize,
		});
		return {
			items,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	listJobs(
		filter: ImportJobListFilter,
	): ImportJobPaginatedResult<ImportJobRecord> {
		const page = filter.page ?? 1;
		const pageSize = filter.pageSize ?? 20;
		const { items, total } = this.jobRepo.listByTenant(filter.tenantId, {
			status: filter.status,
			page,
			pageSize,
		});
		return {
			items,
			total,
			page,
			pageSize,
			totalPages: Math.ceil(total / pageSize),
		};
	}

	deleteArtifact(artifactId: string, tenantId: string): boolean {
		// Check that no active job references this artifact
		const job = this.jobRepo.findByArtifactId(artifactId, tenantId);
		if (job && job.status !== "completed" && job.status !== "failed") {
			throw new ImportArtifactValidationError(
				`Cannot delete artifact ${artifactId}: active job ${job.id} (${job.status})`,
			);
		}
		return this.artifactRepo.delete(artifactId, tenantId);
	}
}
