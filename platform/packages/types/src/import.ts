// ---------------------------------------------------------------------------
// E9-S2: Import Artifact Intake and Job Orchestration
// ---------------------------------------------------------------------------
// Domain types for artifact upload, import job lifecycle, worker dispatch,
// and admin API contracts. Artifacts are tenant-scoped; import jobs track
// processing through staged output for downstream OCR/extraction (E9-S3).
// ---------------------------------------------------------------------------

// ─── E9-S2-T1: Artifact types and format registry ──────────────────────

export const importArtifactTypes = [
	"menu-pdf",
	"menu-image",
	"service-list-csv",
	"catalog-spreadsheet",
	"brochure-image",
	"price-sheet-pdf",
] as const;
export type ImportArtifactType = (typeof importArtifactTypes)[number];

export function isValidImportArtifactType(
	value: string,
): value is ImportArtifactType {
	return (importArtifactTypes as readonly string[]).includes(value);
}

/** MIME types accepted for upload. */
export const allowedMimeTypes = [
	"image/jpeg",
	"image/png",
	"application/pdf",
	"text/csv",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;
export type AllowedMimeType = (typeof allowedMimeTypes)[number];

export function isAllowedMimeType(
	value: string,
): value is AllowedMimeType {
	return (allowedMimeTypes as readonly string[]).includes(value);
}

/** Maps artifact types to their accepted MIME types. */
export const artifactTypeToMimeTypes: Record<
	ImportArtifactType,
	readonly AllowedMimeType[]
> = {
	"menu-pdf": ["application/pdf"],
	"menu-image": ["image/jpeg", "image/png"],
	"service-list-csv": ["text/csv"],
	"catalog-spreadsheet": [
		"text/csv",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	],
	"brochure-image": ["image/jpeg", "image/png"],
	"price-sheet-pdf": ["application/pdf"],
};

/** Maximum file size in bytes per artifact type. */
export const artifactTypeSizeLimits: Record<ImportArtifactType, number> = {
	"menu-pdf": 20 * 1024 * 1024, // 20 MB
	"menu-image": 10 * 1024 * 1024, // 10 MB
	"service-list-csv": 5 * 1024 * 1024, // 5 MB
	"catalog-spreadsheet": 10 * 1024 * 1024, // 10 MB
	"brochure-image": 10 * 1024 * 1024, // 10 MB
	"price-sheet-pdf": 20 * 1024 * 1024, // 20 MB
};

/** Global maximum file size across all types (20 MB). */
export const GLOBAL_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// ─── Artifact upload status ─────────────────────────────────────────────

export const artifactUploadStatuses = [
	"pending",
	"scanning",
	"stored",
	"scan-failed",
	"rejected",
] as const;
export type ArtifactUploadStatus = (typeof artifactUploadStatuses)[number];

// ─── E9-S2-T1: Import artifact record ──────────────────────────────────

export type ImportArtifactRecord = {
	id: string;
	tenantId: string;
	artifactType: ImportArtifactType;
	originalFilename: string;
	sanitizedFilename: string;
	storagePath: string;
	mimeType: AllowedMimeType;
	fileSizeBytes: number;
	uploadStatus: ArtifactUploadStatus;
	scanResult: string | null;
	uploadedBy: string;
	createdAt: string;
	updatedAt: string;
};

// ─── E9-S2-T1: Format validation ───────────────────────────────────────

export type FormatValidationResult = {
	valid: boolean;
	reason?: string;
};

/**
 * Validates that a file's MIME type is accepted for the given artifact type.
 */
export function validateArtifactMimeType(
	artifactType: ImportArtifactType,
	mimeType: string,
): FormatValidationResult {
	const accepted = artifactTypeToMimeTypes[artifactType];
	if (!accepted) {
		return { valid: false, reason: `Unknown artifact type: ${artifactType}` };
	}
	if (!(accepted as readonly string[]).includes(mimeType)) {
		return {
			valid: false,
			reason: `MIME type '${mimeType}' is not accepted for artifact type '${artifactType}'. Accepted: ${accepted.join(", ")}`,
		};
	}
	return { valid: true };
}

/**
 * Validates that a file does not exceed the size limit for the given artifact type.
 */
export function validateArtifactFileSize(
	artifactType: ImportArtifactType,
	fileSizeBytes: number,
): FormatValidationResult {
	if (fileSizeBytes <= 0) {
		return { valid: false, reason: "File size must be positive" };
	}
	const limit = artifactTypeSizeLimits[artifactType];
	if (fileSizeBytes > limit) {
		const limitMb = (limit / (1024 * 1024)).toFixed(0);
		return {
			valid: false,
			reason: `File size ${fileSizeBytes} bytes exceeds ${limitMb} MB limit for '${artifactType}'`,
		};
	}
	return { valid: true };
}

/**
 * Sanitizes a filename to prevent path traversal and encoding attacks.
 */
export function sanitizeFilename(filename: string): string {
	// Remove path separators and null bytes
	let sanitized = filename
		.replace(/\\/g, "/")
		.split("/")
		.pop() ?? "unnamed";
	// Remove null bytes
	sanitized = sanitized.replace(/\0/g, "");
	// Replace sequences of dots that could be path traversal
	sanitized = sanitized.replace(/\.{2,}/g, ".");
	// Keep only safe characters: alphanumeric, dash, underscore, dot, space
	sanitized = sanitized.replace(/[^a-zA-Z0-9\-_. ]/g, "_");
	// Trim and collapse whitespace
	sanitized = sanitized.trim().replace(/\s+/g, " ");
	// Fallback if empty
	if (!sanitized || sanitized === ".") {
		sanitized = "unnamed";
	}
	return sanitized;
}

// ─── E9-S2-T2: Import job states ───────────────────────────────────────

export const importJobStatuses = [
	"pending",
	"processing",
	"staged",
	"failed",
	"completed",
] as const;
export type ImportJobStatus = (typeof importJobStatuses)[number];

export function isValidImportJobStatus(
	value: string,
): value is ImportJobStatus {
	return (importJobStatuses as readonly string[]).includes(value);
}

/** Valid status transitions for import jobs. */
export const importJobTransitions: Record<
	ImportJobStatus,
	readonly ImportJobStatus[]
> = {
	pending: ["processing", "failed"],
	processing: ["staged", "failed"],
	staged: ["completed", "failed"],
	failed: ["pending"], // retry → back to pending
	completed: [],
};

export function isValidImportJobTransition(
	from: ImportJobStatus,
	to: ImportJobStatus,
): boolean {
	return (importJobTransitions[from] as readonly string[]).includes(to);
}

// ─── E9-S2-T2: Import job record ───────────────────────────────────────

export type ImportJobRecord = {
	id: string;
	tenantId: string;
	artifactId: string;
	status: ImportJobStatus;
	retryCount: number;
	maxRetries: number;
	failureReason: string | null;
	stagedOutput: ImportJobStagedOutput | null;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	startedAt: string | null;
	completedAt: string | null;
};

/**
 * Staged output produced by the import pipeline for downstream consumers
 * (E9-S3 OCR extraction, E9-S4 review).
 */
export type ImportJobStagedOutput = {
	/** Version tag for staged output format. */
	version: string;
	/** Artifact ID this output was generated from. */
	artifactId: string;
	/** Tenant context. */
	tenantId: string;
	/** Extraction results placeholder — populated by E9-S3. */
	extractedItems: unknown[];
	/** Processing metadata. */
	processedAt: string;
	/** Processing duration in milliseconds. */
	processingDurationMs: number;
};

// ─── E9-S2-T2: Import job creation input ────────────────────────────────

export type CreateImportJobInput = {
	tenantId: string;
	artifactId: string;
	createdBy: string;
};

export type ImportJobValidationResult = {
	valid: boolean;
	reason?: string;
};

export function validateCreateImportJobInput(
	input: CreateImportJobInput,
): ImportJobValidationResult {
	if (!input.tenantId?.trim()) {
		return { valid: false, reason: "tenantId is required" };
	}
	if (!input.artifactId?.trim()) {
		return { valid: false, reason: "artifactId is required" };
	}
	if (!input.createdBy?.trim()) {
		return { valid: false, reason: "createdBy is required" };
	}
	return { valid: true };
}

// ─── E9-S2-T2: Artifact creation input ─────────────────────────────────

export type CreateImportArtifactInput = {
	tenantId: string;
	artifactType: ImportArtifactType;
	originalFilename: string;
	mimeType: string;
	fileSizeBytes: number;
	uploadedBy: string;
};

export type ArtifactValidationResult = {
	valid: boolean;
	errors: string[];
};

export function validateCreateImportArtifactInput(
	input: CreateImportArtifactInput,
): ArtifactValidationResult {
	const errors: string[] = [];

	if (!input.tenantId?.trim()) {
		errors.push("tenantId is required");
	}
	if (!isValidImportArtifactType(input.artifactType)) {
		errors.push(`Invalid artifact type: ${input.artifactType}`);
	}
	if (!input.originalFilename?.trim()) {
		errors.push("originalFilename is required");
	}
	if (!input.uploadedBy?.trim()) {
		errors.push("uploadedBy is required");
	}

	// MIME validation
	if (input.artifactType && isValidImportArtifactType(input.artifactType)) {
		const mimeResult = validateArtifactMimeType(input.artifactType, input.mimeType);
		if (!mimeResult.valid) {
			errors.push(mimeResult.reason!);
		}
	}

	// Size validation
	if (input.artifactType && isValidImportArtifactType(input.artifactType)) {
		const sizeResult = validateArtifactFileSize(input.artifactType, input.fileSizeBytes);
		if (!sizeResult.valid) {
			errors.push(sizeResult.reason!);
		}
	}

	return { valid: errors.length === 0, errors };
}

// ─── E9-S2-T3: Worker job dispatch types ────────────────────────────────

export const IMPORT_JOB_QUEUE_NAME = "import-processing";

export type ImportJobPayload = {
	jobId: string;
	tenantId: string;
	artifactId: string;
	artifactType: ImportArtifactType;
	storagePath: string;
	retryAttempt: number;
};

/** Retry configuration for import job processing. */
export type ImportJobRetryConfig = {
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
};

export const DEFAULT_IMPORT_JOB_RETRY_CONFIG: ImportJobRetryConfig = {
	maxRetries: 3,
	baseDelayMs: 5_000,
	maxDelayMs: 60_000,
};

/**
 * Computes exponential backoff delay for a given attempt.
 */
export function computeRetryDelay(
	attempt: number,
	config: ImportJobRetryConfig = DEFAULT_IMPORT_JOB_RETRY_CONFIG,
): number {
	const delay = config.baseDelayMs * Math.pow(2, attempt);
	return Math.min(delay, config.maxDelayMs);
}

// ─── E9-S2-T2: Malware scan types ──────────────────────────────────────

export const malwareScanStatuses = [
	"pending",
	"clean",
	"infected",
	"scan-error",
	"skipped",
] as const;
export type MalwareScanStatus = (typeof malwareScanStatuses)[number];

/**
 * Result returned by the malware scanning hook.
 */
export type MalwareScanResult = {
	status: MalwareScanStatus;
	details: string | null;
	scannedAt: string;
};

// ─── E9-S2-T3: Worker job dispatch result ───────────────────────────────

export type ImportJobDispatchResult = {
	dispatched: boolean;
	jobId: string;
	queueName: string;
	reason?: string;
};

// ─── E9-S2-T4: Admin API request/response types ────────────────────────

export type ImportJobListFilter = {
	tenantId: string;
	status?: ImportJobStatus;
	page?: number;
	pageSize?: number;
};

export type ImportArtifactListFilter = {
	tenantId: string;
	artifactType?: ImportArtifactType;
	uploadStatus?: ArtifactUploadStatus;
	page?: number;
	pageSize?: number;
};

export type ImportJobPaginatedResult<T> = {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
};

export type ImportJobRetryResult = {
	success: boolean;
	jobId: string;
	newStatus: ImportJobStatus;
	reason?: string;
};

// ─── E9-S2-T4: Admin upload response ───────────────────────────────────

export type UploadArtifactResponse = {
	artifact: ImportArtifactRecord;
	job: ImportJobRecord;
};

// ─── E9-S2-T1: Storage path generation ─────────────────────────────────

/**
 * Generates a tenant-scoped storage path for an artifact.
 * Format: {tenantId}/imports/{artifactId}/{sanitizedFilename}
 */
export function generateArtifactStoragePath(
	tenantId: string,
	artifactId: string,
	sanitizedFilename: string,
): string {
	return `${tenantId}/imports/${artifactId}/${sanitizedFilename}`;
}
