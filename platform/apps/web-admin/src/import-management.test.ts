// ---------------------------------------------------------------------------
// E9-S2-T4: Import management view tests
// ---------------------------------------------------------------------------
import { describe, it, expect } from "vitest";
import type { ImportArtifactRecord, ImportJobRecord } from "@platform/types";
import {
	validateUploadForm,
	createInitialUploadProgress,
	getJobStatusBadgeVariant,
	getJobStatusLabel,
	getUploadStatusBadgeVariant,
	formatFileSize,
	toArtifactListItem,
	toJobListItem,
	artifactTypeOptions,
	getArtifactTypeOption,
	importRoutes,
	jobStatusLabels,
} from "./import-management";

// ─── Upload form validation ─────────────────────────────────────────────

describe("validateUploadForm", () => {
	it("accepts valid form data", () => {
		const result = validateUploadForm({
			artifactType: "menu-pdf",
			file: { name: "menu.pdf", size: 1024, mimeType: "application/pdf" },
		});
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects when no file selected", () => {
		const result = validateUploadForm({
			artifactType: "menu-pdf",
			file: null,
		});
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Please select a file to upload");
	});

	it("rejects empty file", () => {
		const result = validateUploadForm({
			artifactType: "menu-pdf",
			file: { name: "menu.pdf", size: 0, mimeType: "application/pdf" },
		});
		expect(result.valid).toBe(false);
	});
});

// ─── Upload progress ────────────────────────────────────────────────────

describe("createInitialUploadProgress", () => {
	it("creates progress with correct initial values", () => {
		const progress = createInitialUploadProgress(1024);
		expect(progress.percent).toBe(0);
		expect(progress.bytesUploaded).toBe(0);
		expect(progress.bytesTotal).toBe(1024);
		expect(progress.phase).toBe("uploading");
	});
});

// ─── Job status display ─────────────────────────────────────────────────

describe("getJobStatusBadgeVariant", () => {
	it("returns info for pending", () => {
		expect(getJobStatusBadgeVariant("pending")).toBe("info");
	});

	it("returns warning for processing", () => {
		expect(getJobStatusBadgeVariant("processing")).toBe("warning");
	});

	it("returns success for completed", () => {
		expect(getJobStatusBadgeVariant("completed")).toBe("success");
	});

	it("returns error for failed", () => {
		expect(getJobStatusBadgeVariant("failed")).toBe("error");
	});
});

describe("getJobStatusLabel", () => {
	it("returns label for known status", () => {
		const label = getJobStatusLabel("pending");
		expect(label.label).toBe("Pending");
		expect(label.description).toBeTruthy();
	});

	it("has labels for all statuses", () => {
		expect(jobStatusLabels).toHaveLength(5);
	});
});

// ─── Upload status display ──────────────────────────────────────────────

describe("getUploadStatusBadgeVariant", () => {
	it("returns success for stored", () => {
		expect(getUploadStatusBadgeVariant("stored")).toBe("success");
	});

	it("returns error for rejected", () => {
		expect(getUploadStatusBadgeVariant("rejected")).toBe("error");
	});

	it("returns error for scan-failed", () => {
		expect(getUploadStatusBadgeVariant("scan-failed")).toBe("error");
	});
});

// ─── File size formatting ───────────────────────────────────────────────

describe("formatFileSize", () => {
	it("formats bytes", () => {
		expect(formatFileSize(500)).toBe("500 B");
	});

	it("formats kilobytes", () => {
		expect(formatFileSize(1024)).toBe("1.0 KB");
		expect(formatFileSize(2048)).toBe("2.0 KB");
	});

	it("formats megabytes", () => {
		expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
		expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
	});
});

// ─── Artifact list item mapping ─────────────────────────────────────────

describe("toArtifactListItem", () => {
	const artifact: ImportArtifactRecord = {
		id: "art-1",
		tenantId: "tenant-1",
		artifactType: "menu-pdf",
		originalFilename: "lunch-menu.pdf",
		sanitizedFilename: "lunch-menu.pdf",
		storagePath: "tenant-1/imports/art-1/lunch-menu.pdf",
		mimeType: "application/pdf",
		fileSizeBytes: 2 * 1024 * 1024,
		uploadStatus: "stored",
		scanResult: null,
		uploadedBy: "user-1",
		createdAt: "2026-03-01T00:00:00Z",
		updatedAt: "2026-03-01T00:00:00Z",
	};

	it("maps artifact to list item", () => {
		const item = toArtifactListItem(artifact, false);
		expect(item.id).toBe("art-1");
		expect(item.filename).toBe("lunch-menu.pdf");
		expect(item.artifactType).toBe("menu-pdf");
		expect(item.fileSizeDisplay).toBe("2.0 MB");
		expect(item.canDelete).toBe(true);
	});

	it("disables delete when active job exists", () => {
		const item = toArtifactListItem(artifact, true);
		expect(item.canDelete).toBe(false);
	});
});

// ─── Job list item mapping ──────────────────────────────────────────────

describe("toJobListItem", () => {
	it("maps pending job to list item", () => {
		const job: ImportJobRecord = {
			id: "job-1",
			tenantId: "tenant-1",
			artifactId: "art-1",
			status: "pending",
			retryCount: 0,
			maxRetries: 3,
			failureReason: null,
			stagedOutput: null,
			createdBy: "user-1",
			createdAt: "2026-03-01T00:00:00Z",
			updatedAt: "2026-03-01T00:00:00Z",
			startedAt: null,
			completedAt: null,
		};
		const item = toJobListItem(job);
		expect(item.status).toBe("pending");
		expect(item.statusLabel).toBe("Pending");
		expect(item.canRetry).toBe(false); // not failed
	});

	it("maps failed job with retry available", () => {
		const job: ImportJobRecord = {
			id: "job-2",
			tenantId: "tenant-1",
			artifactId: "art-1",
			status: "failed",
			retryCount: 1,
			maxRetries: 3,
			failureReason: "OCR timeout",
			stagedOutput: null,
			createdBy: "user-1",
			createdAt: "2026-03-01T00:00:00Z",
			updatedAt: "2026-03-01T00:00:00Z",
			startedAt: "2026-03-01T00:01:00Z",
			completedAt: null,
		};
		const item = toJobListItem(job);
		expect(item.status).toBe("failed");
		expect(item.statusVariant).toBe("error");
		expect(item.canRetry).toBe(true);
		expect(item.failureReason).toBe("OCR timeout");
	});

	it("disables retry when max retries reached", () => {
		const job: ImportJobRecord = {
			id: "job-3",
			tenantId: "tenant-1",
			artifactId: "art-1",
			status: "failed",
			retryCount: 3,
			maxRetries: 3,
			failureReason: "Max retries reached",
			stagedOutput: null,
			createdBy: "user-1",
			createdAt: "2026-03-01T00:00:00Z",
			updatedAt: "2026-03-01T00:00:00Z",
			startedAt: null,
			completedAt: null,
		};
		const item = toJobListItem(job);
		expect(item.canRetry).toBe(false);
	});
});

// ─── Artifact type options ──────────────────────────────────────────────

describe("artifactTypeOptions", () => {
	it("defines options for all artifact types", () => {
		expect(artifactTypeOptions).toHaveLength(6);
	});

	it("each option has required fields", () => {
		for (const option of artifactTypeOptions) {
			expect(option.value).toBeTruthy();
			expect(option.label).toBeTruthy();
			expect(option.description).toBeTruthy();
			expect(option.acceptedExtensions).toBeTruthy();
		}
	});

	it("looks up option by type", () => {
		const option = getArtifactTypeOption("menu-pdf");
		expect(option).toBeDefined();
		expect(option!.label).toBe("Menu (PDF)");
		expect(option!.acceptedExtensions).toBe(".pdf");
	});
});

// ─── Import routes ──────────────────────────────────────────────────────

describe("importRoutes", () => {
	it("defines import navigation routes", () => {
		expect(importRoutes).toHaveLength(3);
		expect(importRoutes[0].path).toBe("/imports");
		expect(importRoutes[1].path).toBe("/imports/upload");
		expect(importRoutes[2].path).toBe("/imports/jobs");
	});
});
