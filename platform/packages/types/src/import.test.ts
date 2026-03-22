// ---------------------------------------------------------------------------
// E9-S2-T1: Import type validation tests
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import {
	importArtifactTypes,
	isValidImportArtifactType,
	allowedMimeTypes,
	isAllowedMimeType,
	artifactTypeToMimeTypes,
	artifactTypeSizeLimits,
	GLOBAL_MAX_FILE_SIZE_BYTES,
	validateArtifactMimeType,
	validateArtifactFileSize,
	sanitizeFilename,
	importJobStatuses,
	isValidImportJobStatus,
	importJobTransitions,
	isValidImportJobTransition,
	validateCreateImportJobInput,
	validateCreateImportArtifactInput,
	computeRetryDelay,
	DEFAULT_IMPORT_JOB_RETRY_CONFIG,
	IMPORT_JOB_QUEUE_NAME,
	generateArtifactStoragePath,
} from "./import";

// ─── Artifact type registry ─────────────────────────────────────────────

describe("import artifact types", () => {
	it("defines expected artifact types", () => {
		expect(importArtifactTypes).toContain("menu-pdf");
		expect(importArtifactTypes).toContain("menu-image");
		expect(importArtifactTypes).toContain("service-list-csv");
		expect(importArtifactTypes).toContain("catalog-spreadsheet");
		expect(importArtifactTypes).toContain("brochure-image");
		expect(importArtifactTypes).toContain("price-sheet-pdf");
		expect(importArtifactTypes).toHaveLength(6);
	});

	it("validates known artifact types", () => {
		expect(isValidImportArtifactType("menu-pdf")).toBe(true);
		expect(isValidImportArtifactType("menu-image")).toBe(true);
		expect(isValidImportArtifactType("unknown")).toBe(false);
		expect(isValidImportArtifactType("")).toBe(false);
	});
});

// ─── MIME type validation ───────────────────────────────────────────────

describe("MIME type validation", () => {
	it("defines expected MIME types", () => {
		expect(allowedMimeTypes).toContain("image/jpeg");
		expect(allowedMimeTypes).toContain("image/png");
		expect(allowedMimeTypes).toContain("application/pdf");
		expect(allowedMimeTypes).toContain("text/csv");
	});

	it("validates allowed MIME types", () => {
		expect(isAllowedMimeType("image/jpeg")).toBe(true);
		expect(isAllowedMimeType("image/png")).toBe(true);
		expect(isAllowedMimeType("application/pdf")).toBe(true);
		expect(isAllowedMimeType("text/html")).toBe(false);
		expect(isAllowedMimeType("application/javascript")).toBe(false);
	});

	it("maps artifact types to correct MIME types", () => {
		expect(artifactTypeToMimeTypes["menu-pdf"]).toContain("application/pdf");
		expect(artifactTypeToMimeTypes["menu-image"]).toContain("image/jpeg");
		expect(artifactTypeToMimeTypes["menu-image"]).toContain("image/png");
		expect(artifactTypeToMimeTypes["service-list-csv"]).toContain("text/csv");
	});

	it("validates MIME type for artifact type", () => {
		expect(validateArtifactMimeType("menu-pdf", "application/pdf")).toEqual({ valid: true });
		expect(validateArtifactMimeType("menu-pdf", "image/jpeg").valid).toBe(false);
		expect(validateArtifactMimeType("menu-image", "image/jpeg")).toEqual({ valid: true });
		expect(validateArtifactMimeType("menu-image", "application/pdf").valid).toBe(false);
	});
});

// ─── File size validation ───────────────────────────────────────────────

describe("file size validation", () => {
	it("defines size limits per artifact type", () => {
		expect(artifactTypeSizeLimits["menu-pdf"]).toBe(20 * 1024 * 1024);
		expect(artifactTypeSizeLimits["menu-image"]).toBe(10 * 1024 * 1024);
		expect(artifactTypeSizeLimits["service-list-csv"]).toBe(5 * 1024 * 1024);
	});

	it("defines a global max file size", () => {
		expect(GLOBAL_MAX_FILE_SIZE_BYTES).toBe(20 * 1024 * 1024);
	});

	it("accepts files within size limits", () => {
		expect(validateArtifactFileSize("menu-pdf", 1024)).toEqual({ valid: true });
		expect(validateArtifactFileSize("menu-image", 5 * 1024 * 1024)).toEqual({ valid: true });
	});

	it("rejects files exceeding size limits", () => {
		const result = validateArtifactFileSize("service-list-csv", 6 * 1024 * 1024);
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("exceeds");
	});

	it("rejects zero or negative file sizes", () => {
		expect(validateArtifactFileSize("menu-pdf", 0).valid).toBe(false);
		expect(validateArtifactFileSize("menu-pdf", -1).valid).toBe(false);
	});
});

// ─── Filename sanitization ──────────────────────────────────────────────

describe("sanitizeFilename", () => {
	it("preserves safe filenames", () => {
		expect(sanitizeFilename("menu.pdf")).toBe("menu.pdf");
		expect(sanitizeFilename("Photo_001.jpg")).toBe("Photo_001.jpg");
	});

	it("strips path separators", () => {
		expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
		expect(sanitizeFilename("path\\to\\file.pdf")).toBe("file.pdf");
	});

	it("removes null bytes", () => {
		expect(sanitizeFilename("file\x00.pdf")).toBe("file.pdf");
	});

	it("collapses double dots", () => {
		expect(sanitizeFilename("file..pdf")).toBe("file.pdf");
	});

	it("replaces unsafe characters", () => {
		expect(sanitizeFilename("file<script>.pdf")).toBe("file_script_.pdf");
	});

	it("returns unnamed for empty input", () => {
		expect(sanitizeFilename("")).toBe("unnamed");
		expect(sanitizeFilename("...")).toBe("unnamed");
	});
});

// ─── Import job states ──────────────────────────────────────────────────

describe("import job states", () => {
	it("defines expected job statuses", () => {
		expect(importJobStatuses).toContain("pending");
		expect(importJobStatuses).toContain("processing");
		expect(importJobStatuses).toContain("staged");
		expect(importJobStatuses).toContain("failed");
		expect(importJobStatuses).toContain("completed");
		expect(importJobStatuses).toHaveLength(5);
	});

	it("validates known job statuses", () => {
		expect(isValidImportJobStatus("pending")).toBe(true);
		expect(isValidImportJobStatus("completed")).toBe(true);
		expect(isValidImportJobStatus("unknown")).toBe(false);
	});

	it("defines valid transitions", () => {
		expect(importJobTransitions.pending).toContain("processing");
		expect(importJobTransitions.pending).toContain("failed");
		expect(importJobTransitions.processing).toContain("staged");
		expect(importJobTransitions.processing).toContain("failed");
		expect(importJobTransitions.staged).toContain("completed");
		expect(importJobTransitions.failed).toContain("pending");
		expect(importJobTransitions.completed).toHaveLength(0);
	});

	it("validates transitions correctly", () => {
		expect(isValidImportJobTransition("pending", "processing")).toBe(true);
		expect(isValidImportJobTransition("pending", "completed")).toBe(false);
		expect(isValidImportJobTransition("failed", "pending")).toBe(true);
		expect(isValidImportJobTransition("completed", "pending")).toBe(false);
	});
});

// ─── Import job input validation ────────────────────────────────────────

describe("validateCreateImportJobInput", () => {
	it("accepts valid input", () => {
		const result = validateCreateImportJobInput({
			tenantId: "tenant-1",
			artifactId: "artifact-1",
			createdBy: "user-1",
		});
		expect(result.valid).toBe(true);
	});

	it("rejects missing tenantId", () => {
		const result = validateCreateImportJobInput({
			tenantId: "",
			artifactId: "artifact-1",
			createdBy: "user-1",
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("tenantId");
	});

	it("rejects missing artifactId", () => {
		const result = validateCreateImportJobInput({
			tenantId: "tenant-1",
			artifactId: "  ",
			createdBy: "user-1",
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("artifactId");
	});

	it("rejects missing createdBy", () => {
		const result = validateCreateImportJobInput({
			tenantId: "tenant-1",
			artifactId: "artifact-1",
			createdBy: "",
		});
		expect(result.valid).toBe(false);
		expect(result.reason).toContain("createdBy");
	});
});

// ─── Artifact input validation ──────────────────────────────────────────

describe("validateCreateImportArtifactInput", () => {
	it("accepts valid input", () => {
		const result = validateCreateImportArtifactInput({
			tenantId: "tenant-1",
			artifactType: "menu-pdf",
			originalFilename: "menu.pdf",
			mimeType: "application/pdf",
			fileSizeBytes: 1024,
			uploadedBy: "user-1",
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects invalid artifact type", () => {
		const result = validateCreateImportArtifactInput({
			tenantId: "tenant-1",
			artifactType: "invalid" as never,
			originalFilename: "file.txt",
			mimeType: "text/plain",
			fileSizeBytes: 1024,
			uploadedBy: "user-1",
		});
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it("rejects mismatched MIME type for artifact type", () => {
		const result = validateCreateImportArtifactInput({
			tenantId: "tenant-1",
			artifactType: "menu-pdf",
			originalFilename: "menu.jpg",
			mimeType: "image/jpeg",
			fileSizeBytes: 1024,
			uploadedBy: "user-1",
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("MIME"))).toBe(true);
	});

	it("rejects oversized files", () => {
		const result = validateCreateImportArtifactInput({
			tenantId: "tenant-1",
			artifactType: "service-list-csv",
			originalFilename: "data.csv",
			mimeType: "text/csv",
			fileSizeBytes: 100 * 1024 * 1024, // 100 MB
			uploadedBy: "user-1",
		});
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes("exceeds"))).toBe(true);
	});

	it("collects multiple errors", () => {
		const result = validateCreateImportArtifactInput({
			tenantId: "",
			artifactType: "unknown" as never,
			originalFilename: "",
			mimeType: "text/html",
			fileSizeBytes: -1,
			uploadedBy: "",
		});
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});
});

// ─── Retry configuration ────────────────────────────────────────────────

describe("retry configuration", () => {
	it("defines default retry config", () => {
		expect(DEFAULT_IMPORT_JOB_RETRY_CONFIG.maxRetries).toBe(3);
		expect(DEFAULT_IMPORT_JOB_RETRY_CONFIG.baseDelayMs).toBe(5_000);
		expect(DEFAULT_IMPORT_JOB_RETRY_CONFIG.maxDelayMs).toBe(60_000);
	});

	it("computes exponential backoff", () => {
		expect(computeRetryDelay(0)).toBe(5_000);
		expect(computeRetryDelay(1)).toBe(10_000);
		expect(computeRetryDelay(2)).toBe(20_000);
		expect(computeRetryDelay(3)).toBe(40_000);
	});

	it("caps delay at maxDelayMs", () => {
		expect(computeRetryDelay(10)).toBe(60_000);
	});

	it("defines queue name constant", () => {
		expect(IMPORT_JOB_QUEUE_NAME).toBe("import-processing");
	});
});

// ─── Storage path generation ────────────────────────────────────────────

describe("generateArtifactStoragePath", () => {
	it("generates tenant-scoped path", () => {
		const path = generateArtifactStoragePath("tenant-1", "artifact-1", "menu.pdf");
		expect(path).toBe("tenant-1/imports/artifact-1/menu.pdf");
	});

	it("includes tenant ID for isolation", () => {
		const pathA = generateArtifactStoragePath("tenant-a", "art-1", "file.pdf");
		const pathB = generateArtifactStoragePath("tenant-b", "art-1", "file.pdf");
		expect(pathA).not.toBe(pathB);
		expect(pathA.startsWith("tenant-a/")).toBe(true);
		expect(pathB.startsWith("tenant-b/")).toBe(true);
	});
});
