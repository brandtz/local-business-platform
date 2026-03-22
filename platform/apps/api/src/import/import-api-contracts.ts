// ---------------------------------------------------------------------------
// E9-S2-T4: Import admin API contracts — request/response shapes
// ---------------------------------------------------------------------------
// Defines the API surface for tenant-admin import management.
// Consumed by web-admin import views and downstream pipeline stages.

import type {
	ImportArtifactType,
	ImportJobStatus,
	ArtifactUploadStatus,
	ImportArtifactRecord,
	ImportJobRecord,
	ImportJobPaginatedResult,
} from "@platform/types";

// ─── Upload artifact request ────────────────────────────────────────────

export type UploadArtifactRequest = {
	artifactType: ImportArtifactType;
	originalFilename: string;
	mimeType: string;
	fileSizeBytes: number;
};

// ─── Upload artifact response ───────────────────────────────────────────

export type UploadArtifactApiResponse = {
	success: boolean;
	artifact: ImportArtifactRecord;
	job: ImportJobRecord;
};

// ─── List artifacts request ─────────────────────────────────────────────

export type ListArtifactsRequest = {
	artifactType?: ImportArtifactType;
	uploadStatus?: ArtifactUploadStatus;
	page?: number;
	pageSize?: number;
};

// ─── List artifacts response ────────────────────────────────────────────

export type ListArtifactsApiResponse = ImportJobPaginatedResult<ImportArtifactRecord>;

// ─── Get artifact response ──────────────────────────────────────────────

export type GetArtifactApiResponse = {
	artifact: ImportArtifactRecord;
};

// ─── Delete artifact response ───────────────────────────────────────────

export type DeleteArtifactApiResponse = {
	deleted: boolean;
	artifactId: string;
};

// ─── List jobs request ──────────────────────────────────────────────────

export type ListJobsRequest = {
	status?: ImportJobStatus;
	page?: number;
	pageSize?: number;
};

// ─── List jobs response ─────────────────────────────────────────────────

export type ListJobsApiResponse = ImportJobPaginatedResult<ImportJobRecord>;

// ─── Get job response ───────────────────────────────────────────────────

export type GetJobApiResponse = {
	job: ImportJobRecord;
};

// ─── Retry job response ─────────────────────────────────────────────────

export type RetryJobApiResponse = {
	success: boolean;
	jobId: string;
	newStatus: ImportJobStatus;
	reason?: string;
};

// ─── Admin API endpoint definitions ─────────────────────────────────────

/**
 * Defines the admin API routes for import management.
 * These are implemented as controller methods in the import module.
 */
export const importAdminApiEndpoints = {
	/** Upload a new artifact and create an import job. */
	uploadArtifact: {
		method: "POST" as const,
		path: "/api/admin/tenants/:tenantId/imports/artifacts",
		description: "Upload a new import artifact",
	},
	/** List artifacts for a tenant. */
	listArtifacts: {
		method: "GET" as const,
		path: "/api/admin/tenants/:tenantId/imports/artifacts",
		description: "List import artifacts for tenant",
	},
	/** Get a specific artifact. */
	getArtifact: {
		method: "GET" as const,
		path: "/api/admin/tenants/:tenantId/imports/artifacts/:artifactId",
		description: "Get import artifact details",
	},
	/** Delete an artifact (if no active job). */
	deleteArtifact: {
		method: "DELETE" as const,
		path: "/api/admin/tenants/:tenantId/imports/artifacts/:artifactId",
		description: "Delete an import artifact",
	},
	/** List import jobs for a tenant. */
	listJobs: {
		method: "GET" as const,
		path: "/api/admin/tenants/:tenantId/imports/jobs",
		description: "List import jobs for tenant",
	},
	/** Get a specific import job. */
	getJob: {
		method: "GET" as const,
		path: "/api/admin/tenants/:tenantId/imports/jobs/:jobId",
		description: "Get import job details",
	},
	/** Retry a failed import job. */
	retryJob: {
		method: "POST" as const,
		path: "/api/admin/tenants/:tenantId/imports/jobs/:jobId/retry",
		description: "Retry a failed import job",
	},
} as const;

// ─── API route type guard helpers ───────────────────────────────────────

export type ImportAdminApiEndpoint =
	keyof typeof importAdminApiEndpoints;

export function getImportAdminEndpoint(
	name: ImportAdminApiEndpoint,
): (typeof importAdminApiEndpoints)[ImportAdminApiEndpoint] {
	return importAdminApiEndpoints[name];
}
