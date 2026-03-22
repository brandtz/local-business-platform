// ---------------------------------------------------------------------------
// E9-S2-T4: Import management views — tenant-admin upload form, job list, status
// ---------------------------------------------------------------------------
// Defines the import management UI components for the tenant admin portal.
// Handles artifact upload, job status display, and retry actions.

import type {
	ImportArtifactType,
	ImportJobStatus,
	ArtifactUploadStatus,
	ImportArtifactRecord,
	ImportJobRecord,
} from "@platform/types";

import type { AdminNavigationSectionId } from "./admin-route-map";

// ─── Import navigation routes ───────────────────────────────────────────

export const importRoutes = [
	{
		path: "/imports",
		label: "Imports",
		section: "catalog" as AdminNavigationSectionId,
		description: "Upload and manage business data imports",
	},
	{
		path: "/imports/upload",
		label: "Upload Artifact",
		section: "catalog" as AdminNavigationSectionId,
		description: "Upload a new file for import processing",
	},
	{
		path: "/imports/jobs",
		label: "Import Jobs",
		section: "catalog" as AdminNavigationSectionId,
		description: "View and manage import processing jobs",
	},
] as const;

// ─── Upload form types ──────────────────────────────────────────────────

export type UploadFormState = "idle" | "validating" | "uploading" | "success" | "error";

export type UploadFormData = {
	artifactType: ImportArtifactType;
	file: {
		name: string;
		size: number;
		mimeType: string;
	} | null;
};

export type UploadFormValidation = {
	valid: boolean;
	errors: string[];
};

/**
 * Validates the upload form before submission.
 */
export function validateUploadForm(data: UploadFormData): UploadFormValidation {
	const errors: string[] = [];

	if (!data.file) {
		errors.push("Please select a file to upload");
		return { valid: false, errors };
	}

	if (!data.artifactType) {
		errors.push("Please select an artifact type");
	}

	if (data.file.size <= 0) {
		errors.push("Selected file is empty");
	}

	return { valid: errors.length === 0, errors };
}

// ─── Upload progress ────────────────────────────────────────────────────

export type UploadProgress = {
	/** Percentage completed (0-100). */
	percent: number;
	/** Bytes uploaded so far. */
	bytesUploaded: number;
	/** Total bytes. */
	bytesTotal: number;
	/** Current phase. */
	phase: "uploading" | "scanning" | "processing" | "complete" | "error";
};

export function createInitialUploadProgress(totalBytes: number): UploadProgress {
	return {
		percent: 0,
		bytesUploaded: 0,
		bytesTotal: totalBytes,
		phase: "uploading",
	};
}

// ─── Job status display ─────────────────────────────────────────────────

export type JobStatusBadgeVariant = "info" | "warning" | "success" | "error" | "neutral";

const statusBadgeMap: Record<ImportJobStatus, JobStatusBadgeVariant> = {
	pending: "info",
	processing: "warning",
	staged: "info",
	failed: "error",
	completed: "success",
};

export function getJobStatusBadgeVariant(status: ImportJobStatus): JobStatusBadgeVariant {
	return statusBadgeMap[status] ?? "neutral";
}

export type JobStatusLabel = {
	status: ImportJobStatus;
	label: string;
	description: string;
};

export const jobStatusLabels: readonly JobStatusLabel[] = [
	{ status: "pending", label: "Pending", description: "Waiting to be processed" },
	{ status: "processing", label: "Processing", description: "Currently being processed" },
	{ status: "staged", label: "Staged", description: "Output ready for review" },
	{ status: "failed", label: "Failed", description: "Processing failed — retry available" },
	{ status: "completed", label: "Completed", description: "Processing completed successfully" },
];

export function getJobStatusLabel(status: ImportJobStatus): JobStatusLabel {
	return jobStatusLabels.find((l) => l.status === status) ?? {
		status,
		label: status,
		description: "Unknown status",
	};
}

// ─── Upload status display ──────────────────────────────────────────────

const uploadStatusBadgeMap: Record<ArtifactUploadStatus, JobStatusBadgeVariant> = {
	pending: "info",
	scanning: "warning",
	stored: "success",
	"scan-failed": "error",
	rejected: "error",
};

export function getUploadStatusBadgeVariant(
	status: ArtifactUploadStatus,
): JobStatusBadgeVariant {
	return uploadStatusBadgeMap[status] ?? "neutral";
}

// ─── Artifact list item ─────────────────────────────────────────────────

export type ArtifactListItem = {
	id: string;
	filename: string;
	artifactType: ImportArtifactType;
	uploadStatus: ArtifactUploadStatus;
	fileSizeDisplay: string;
	uploadedAt: string;
	canDelete: boolean;
};

/**
 * Formats file size for display.
 */
export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Maps an artifact record to a list display item.
 */
export function toArtifactListItem(
	artifact: ImportArtifactRecord,
	hasActiveJob: boolean,
): ArtifactListItem {
	return {
		id: artifact.id,
		filename: artifact.sanitizedFilename,
		artifactType: artifact.artifactType,
		uploadStatus: artifact.uploadStatus,
		fileSizeDisplay: formatFileSize(artifact.fileSizeBytes),
		uploadedAt: artifact.createdAt,
		canDelete: !hasActiveJob,
	};
}

// ─── Job list item ──────────────────────────────────────────────────────

export type JobListItem = {
	id: string;
	artifactId: string;
	status: ImportJobStatus;
	statusLabel: string;
	statusVariant: JobStatusBadgeVariant;
	retryCount: number;
	maxRetries: number;
	canRetry: boolean;
	createdAt: string;
	failureReason: string | null;
};

/**
 * Maps a job record to a list display item.
 */
export function toJobListItem(job: ImportJobRecord): JobListItem {
	const statusLabel = getJobStatusLabel(job.status);
	return {
		id: job.id,
		artifactId: job.artifactId,
		status: job.status,
		statusLabel: statusLabel.label,
		statusVariant: getJobStatusBadgeVariant(job.status),
		retryCount: job.retryCount,
		maxRetries: job.maxRetries,
		canRetry: job.status === "failed" && job.retryCount < job.maxRetries,
		createdAt: job.createdAt,
		failureReason: job.failureReason,
	};
}

// ─── Artifact type labels ───────────────────────────────────────────────

export type ArtifactTypeOption = {
	value: ImportArtifactType;
	label: string;
	description: string;
	acceptedExtensions: string;
};

export const artifactTypeOptions: readonly ArtifactTypeOption[] = [
	{
		value: "menu-pdf",
		label: "Menu (PDF)",
		description: "Restaurant or service menu as PDF",
		acceptedExtensions: ".pdf",
	},
	{
		value: "menu-image",
		label: "Menu (Image)",
		description: "Photographed or scanned menu image",
		acceptedExtensions: ".jpg,.jpeg,.png",
	},
	{
		value: "service-list-csv",
		label: "Service List (CSV)",
		description: "CSV file with service listings",
		acceptedExtensions: ".csv",
	},
	{
		value: "catalog-spreadsheet",
		label: "Catalog Spreadsheet",
		description: "Product catalog spreadsheet",
		acceptedExtensions: ".csv,.xlsx",
	},
	{
		value: "brochure-image",
		label: "Brochure (Image)",
		description: "Business brochure or flyer image",
		acceptedExtensions: ".jpg,.jpeg,.png",
	},
	{
		value: "price-sheet-pdf",
		label: "Price Sheet (PDF)",
		description: "Pricing document as PDF",
		acceptedExtensions: ".pdf",
	},
];

/**
 * Gets the artifact type option for a given type value.
 */
export function getArtifactTypeOption(
	type: ImportArtifactType,
): ArtifactTypeOption | undefined {
	return artifactTypeOptions.find((o) => o.value === type);
}
