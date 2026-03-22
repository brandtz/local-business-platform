// ---------------------------------------------------------------------------
// E9-S2: Import service tests — artifact upload, job lifecycle, dispatch, admin
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from "vitest";
import type {
	CreateImportArtifactInput,
	ImportJobStagedOutput,
} from "@platform/types";
import {
	ImportService,
	ImportArtifactNotFoundError,
	ImportArtifactValidationError,
	ImportJobNotFoundError,
	ImportJobValidationError,
	ImportJobTransitionError,
	InMemoryImportJobQueue,
	resetIdCounter,
} from "./import.service";
import type { MalwareScanner } from "./malware-scanner";
import { ImportArtifactRepository } from "./import-artifact.repository";
import { ImportJobRepository } from "./import-job.repository";

// ─── Test helpers ───────────────────────────────────────────────────────

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function validArtifactInput(
	overrides?: Partial<CreateImportArtifactInput>,
): CreateImportArtifactInput {
	return {
		tenantId: TENANT_A,
		artifactType: "menu-pdf",
		originalFilename: "lunch-menu.pdf",
		mimeType: "application/pdf",
		fileSizeBytes: 1024 * 100, // 100 KB
		uploadedBy: "user-1",
		...overrides,
	};
}

function createCleanScanner(): MalwareScanner {
	return {
		scan: async () => ({
			status: "clean" as const,
			details: "No threats detected",
			scannedAt: new Date().toISOString(),
		}),
		isAvailable: () => true,
	};
}

function createInfectedScanner(): MalwareScanner {
	return {
		scan: async () => ({
			status: "infected" as const,
			details: "Trojan detected",
			scannedAt: new Date().toISOString(),
		}),
		isAvailable: () => true,
	};
}

function createErrorScanner(): MalwareScanner {
	return {
		scan: async () => ({
			status: "scan-error" as const,
			details: "Scanner timeout",
			scannedAt: new Date().toISOString(),
		}),
		isAvailable: () => true,
	};
}

function createService(scanner?: MalwareScanner): {
	service: ImportService;
	artifactRepo: ImportArtifactRepository;
	jobRepo: ImportJobRepository;
	jobQueue: InMemoryImportJobQueue;
} {
	const artifactRepo = new ImportArtifactRepository();
	const jobRepo = new ImportJobRepository();
	const jobQueue = new InMemoryImportJobQueue();
	const service = new ImportService(artifactRepo, jobRepo, jobQueue, scanner);
	return { service, artifactRepo, jobRepo, jobQueue };
}

// ─── Upload intake tests (E9-S2-T2) ────────────────────────────────────

describe("ImportService", () => {
	beforeEach(() => {
		resetIdCounter();
	});

	describe("uploadArtifact", () => {
		it("creates artifact and job on valid upload", async () => {
			const { service } = createService(createCleanScanner());
			const result = await service.uploadArtifact(validArtifactInput());

			expect(result.artifact).toBeDefined();
			expect(result.artifact.tenantId).toBe(TENANT_A);
			expect(result.artifact.artifactType).toBe("menu-pdf");
			expect(result.artifact.uploadStatus).toBe("stored");
			expect(result.artifact.storagePath).toContain(TENANT_A);
			expect(result.artifact.sanitizedFilename).toBe("lunch-menu.pdf");

			expect(result.job).toBeDefined();
			expect(result.job.tenantId).toBe(TENANT_A);
			expect(result.job.status).toBe("pending");
			expect(result.job.retryCount).toBe(0);
		});

		it("dispatches job to queue after upload", async () => {
			const { service, jobQueue } = createService(createCleanScanner());
			await service.uploadArtifact(validArtifactInput());

			const dispatched = jobQueue.getDispatched();
			expect(dispatched).toHaveLength(1);
			expect(dispatched[0].tenantId).toBe(TENANT_A);
			expect(dispatched[0].artifactType).toBe("menu-pdf");
		});

		it("sanitizes filenames on upload", async () => {
			const { service } = createService(createCleanScanner());
			const result = await service.uploadArtifact(
				validArtifactInput({ originalFilename: "../../etc/menu<script>.pdf" }),
			);
			expect(result.artifact.sanitizedFilename).not.toContain("..");
			expect(result.artifact.sanitizedFilename).not.toContain("<");
		});

		it("rejects invalid MIME type", async () => {
			const { service } = createService(createCleanScanner());
			await expect(
				service.uploadArtifact(
					validArtifactInput({ mimeType: "text/html" }),
				),
			).rejects.toThrow(ImportArtifactValidationError);
		});

		it("rejects oversized files", async () => {
			const { service } = createService(createCleanScanner());
			await expect(
				service.uploadArtifact(
					validArtifactInput({ fileSizeBytes: 100 * 1024 * 1024 }),
				),
			).rejects.toThrow(ImportArtifactValidationError);
		});

		it("rejects empty tenantId", async () => {
			const { service } = createService(createCleanScanner());
			await expect(
				service.uploadArtifact(validArtifactInput({ tenantId: "" })),
			).rejects.toThrow(ImportArtifactValidationError);
		});

		it("rejects infected files", async () => {
			const { service } = createService(createInfectedScanner());
			await expect(
				service.uploadArtifact(validArtifactInput()),
			).rejects.toThrow(ImportArtifactValidationError);
		});

		it("rejects files when scan errors", async () => {
			const { service } = createService(createErrorScanner());
			await expect(
				service.uploadArtifact(validArtifactInput()),
			).rejects.toThrow(ImportArtifactValidationError);
		});

		it("proceeds when no scanner is configured (skips scan)", async () => {
			const { service } = createService(); // no scanner
			const result = await service.uploadArtifact(validArtifactInput());
			expect(result.artifact.uploadStatus).toBe("stored");
		});

		it("handles image artifacts", async () => {
			const { service } = createService(createCleanScanner());
			const result = await service.uploadArtifact(
				validArtifactInput({
					artifactType: "menu-image",
					originalFilename: "photo.jpg",
					mimeType: "image/jpeg",
					fileSizeBytes: 2 * 1024 * 1024,
				}),
			);
			expect(result.artifact.artifactType).toBe("menu-image");
			expect(result.artifact.mimeType).toBe("image/jpeg");
		});

		it("generates unique storage paths per tenant", async () => {
			const { service } = createService(createCleanScanner());
			const resultA = await service.uploadArtifact(validArtifactInput());
			const resultB = await service.uploadArtifact(
				validArtifactInput({ tenantId: TENANT_B }),
			);

			expect(resultA.artifact.storagePath).toContain(TENANT_A);
			expect(resultB.artifact.storagePath).toContain(TENANT_B);
			expect(resultA.artifact.storagePath).not.toBe(
				resultB.artifact.storagePath,
			);
		});
	});

	// ─── Tenant isolation tests ─────────────────────────────────────────

	describe("tenant isolation", () => {
		it("cannot access artifacts from another tenant", async () => {
			const { service } = createService(createCleanScanner());
			const result = await service.uploadArtifact(validArtifactInput());

			expect(() =>
				service.getArtifact(result.artifact.id, TENANT_B),
			).toThrow(ImportArtifactNotFoundError);
		});

		it("cannot access jobs from another tenant", async () => {
			const { service } = createService(createCleanScanner());
			const result = await service.uploadArtifact(validArtifactInput());

			expect(() => service.getJob(result.job.id, TENANT_B)).toThrow(
				ImportJobNotFoundError,
			);
		});

		it("lists only tenant-scoped artifacts", async () => {
			const { service } = createService(createCleanScanner());
			await service.uploadArtifact(validArtifactInput());
			await service.uploadArtifact(
				validArtifactInput({ tenantId: TENANT_B }),
			);

			const listA = service.listArtifacts({ tenantId: TENANT_A });
			const listB = service.listArtifacts({ tenantId: TENANT_B });

			expect(listA.total).toBe(1);
			expect(listB.total).toBe(1);
			expect(listA.items[0].tenantId).toBe(TENANT_A);
			expect(listB.items[0].tenantId).toBe(TENANT_B);
		});

		it("lists only tenant-scoped jobs", async () => {
			const { service } = createService(createCleanScanner());
			await service.uploadArtifact(validArtifactInput());
			await service.uploadArtifact(
				validArtifactInput({ tenantId: TENANT_B }),
			);

			const listA = service.listJobs({ tenantId: TENANT_A });
			const listB = service.listJobs({ tenantId: TENANT_B });

			expect(listA.total).toBe(1);
			expect(listB.total).toBe(1);
		});
	});

	// ─── Job state machine tests (E9-S2-T2) ────────────────────────────

	describe("job state machine", () => {
		it("transitions pending → processing", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			const updated = service.transitionJobStatus(
				job.id,
				TENANT_A,
				"processing",
			);
			expect(updated.status).toBe("processing");
			expect(updated.startedAt).toBeDefined();
		});

		it("transitions processing → staged", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");
			const updated = service.transitionJobStatus(
				job.id,
				TENANT_A,
				"staged",
			);
			expect(updated.status).toBe("staged");
		});

		it("transitions staged → completed", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");
			service.transitionJobStatus(job.id, TENANT_A, "staged");
			const updated = service.transitionJobStatus(
				job.id,
				TENANT_A,
				"completed",
			);
			expect(updated.status).toBe("completed");
			expect(updated.completedAt).toBeDefined();
		});

		it("transitions processing → failed with reason", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");
			const updated = service.transitionJobStatus(
				job.id,
				TENANT_A,
				"failed",
				{ failureReason: "OCR timeout" },
			);
			expect(updated.status).toBe("failed");
			expect(updated.failureReason).toBe("OCR timeout");
		});

		it("rejects invalid transitions", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			expect(() =>
				service.transitionJobStatus(job.id, TENANT_A, "completed"),
			).toThrow(ImportJobTransitionError);
		});

		it("rejects transitions on non-existent job", () => {
			const { service } = createService(createCleanScanner());
			expect(() =>
				service.transitionJobStatus("non-existent", TENANT_A, "processing"),
			).toThrow(ImportJobNotFoundError);
		});
	});

	// ─── Staged output tests (E9-S2-T2) ────────────────────────────────

	describe("staged output", () => {
		it("sets staged output and transitions to staged", async () => {
			const { service } = createService(createCleanScanner());
			const { job, artifact } = await service.uploadArtifact(
				validArtifactInput(),
			);

			service.transitionJobStatus(job.id, TENANT_A, "processing");

			const stagedOutput: ImportJobStagedOutput = {
				version: "1.0",
				artifactId: artifact.id,
				tenantId: TENANT_A,
				extractedItems: [],
				processedAt: new Date().toISOString(),
				processingDurationMs: 1500,
			};

			const updated = service.setStagedOutput(
				job.id,
				TENANT_A,
				stagedOutput,
			);
			expect(updated.status).toBe("staged");
			expect(updated.stagedOutput).toBeDefined();
			expect(updated.stagedOutput?.version).toBe("1.0");
		});

		it("rejects staged output on pending job", async () => {
			const { service } = createService(createCleanScanner());
			const { job, artifact } = await service.uploadArtifact(
				validArtifactInput(),
			);

			expect(() =>
				service.setStagedOutput(job.id, TENANT_A, {
					version: "1.0",
					artifactId: artifact.id,
					tenantId: TENANT_A,
					extractedItems: [],
					processedAt: new Date().toISOString(),
					processingDurationMs: 0,
				}),
			).toThrow(ImportJobTransitionError);
		});

		it("overwrites staged output on retry (no duplication)", async () => {
			const { service } = createService(createCleanScanner());
			const { job, artifact } = await service.uploadArtifact(
				validArtifactInput(),
			);

			service.transitionJobStatus(job.id, TENANT_A, "processing");

			const output1: ImportJobStagedOutput = {
				version: "1.0",
				artifactId: artifact.id,
				tenantId: TENANT_A,
				extractedItems: [{ name: "item1" }],
				processedAt: new Date().toISOString(),
				processingDurationMs: 1000,
			};

			service.setStagedOutput(job.id, TENANT_A, output1);

			// Output is now staged. Set output again (simulating re-process after partial retry)
			const output2: ImportJobStagedOutput = {
				version: "1.1",
				artifactId: artifact.id,
				tenantId: TENANT_A,
				extractedItems: [{ name: "item1" }, { name: "item2" }],
				processedAt: new Date().toISOString(),
				processingDurationMs: 2000,
			};

			const updated = service.setStagedOutput(
				job.id,
				TENANT_A,
				output2,
			);
			expect(updated.stagedOutput?.version).toBe("1.1");
			// Should be one staged output, not two
			expect(updated.stagedOutput?.extractedItems).toHaveLength(2);
		});
	});

	// ─── Retry tests (E9-S2-T3) ────────────────────────────────────────

	describe("retry", () => {
		it("retries a failed job", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");
			service.transitionJobStatus(job.id, TENANT_A, "failed", {
				failureReason: "timeout",
			});

			const result = await service.retryJob(job.id, TENANT_A);
			expect(result.success).toBe(true);
			expect(result.newStatus).toBe("pending");

			// Verify retry count incremented
			const updated = service.getJob(job.id, TENANT_A);
			expect(updated.retryCount).toBe(1);
			expect(updated.failureReason).toBeNull();
		});

		it("refuses retry on non-failed job", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			const result = await service.retryJob(job.id, TENANT_A);
			expect(result.success).toBe(false);
			expect(result.reason).toContain("pending");
		});

		it("refuses retry when max retries exceeded", async () => {
			const { service, jobRepo } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");
			service.transitionJobStatus(job.id, TENANT_A, "failed");

			// Manually set retry count to max
			jobRepo.updateStatus(job.id, TENANT_A, "failed", { retryCount: 3 });

			const result = await service.retryJob(job.id, TENANT_A);
			expect(result.success).toBe(false);
			expect(result.reason).toContain("Maximum retries");
		});

		it("re-dispatches job on retry", async () => {
			const { service, jobQueue } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");
			service.transitionJobStatus(job.id, TENANT_A, "failed");

			jobQueue.clear();
			await service.retryJob(job.id, TENANT_A);

			expect(jobQueue.getDispatched()).toHaveLength(1);
		});

		it("computes retry delay with exponential backoff", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			const delay = service.getRetryDelay(job.id, TENANT_A);
			expect(delay).toBe(5_000); // attempt 0
		});
	});

	// ─── Resumability tests (E9-S2-T3) ──────────────────────────────────

	describe("resumability", () => {
		it("lists processing jobs for resumption", async () => {
			const { service } = createService(createCleanScanner());
			const { job } = await service.uploadArtifact(validArtifactInput());

			service.transitionJobStatus(job.id, TENANT_A, "processing");

			const resumable = service.listResumableJobs();
			expect(resumable).toHaveLength(1);
			expect(resumable[0].id).toBe(job.id);
		});

		it("does not list pending or completed jobs as resumable", async () => {
			const { service } = createService(createCleanScanner());
			await service.uploadArtifact(validArtifactInput()); // pending

			const resumable = service.listResumableJobs();
			expect(resumable).toHaveLength(0);
		});
	});

	// ─── Duplicate job prevention ───────────────────────────────────────

	describe("duplicate prevention", () => {
		it("prevents duplicate active jobs for same artifact", async () => {
			const { service } = createService(createCleanScanner());
			const { artifact } = await service.uploadArtifact(
				validArtifactInput(),
			);

			// Try to create another job for same artifact (already has pending job)
			expect(() =>
				service.createImportJob({
					tenantId: TENANT_A,
					artifactId: artifact.id,
					createdBy: "user-1",
				}),
			).toThrow(ImportJobValidationError);
		});
	});

	// ─── Admin list/query tests (E9-S2-T4) ──────────────────────────────

	describe("admin queries", () => {
		it("lists artifacts with pagination", async () => {
			const { service } = createService(createCleanScanner());

			// Upload 3 artifacts
			await service.uploadArtifact(validArtifactInput());
			await service.uploadArtifact(
				validArtifactInput({
					originalFilename: "dinner-menu.pdf",
				}),
			);
			await service.uploadArtifact(
				validArtifactInput({
					artifactType: "menu-image",
					originalFilename: "photo.jpg",
					mimeType: "image/jpeg",
				}),
			);

			const page1 = service.listArtifacts({
				tenantId: TENANT_A,
				page: 1,
				pageSize: 2,
			});
			expect(page1.items).toHaveLength(2);
			expect(page1.total).toBe(3);
			expect(page1.totalPages).toBe(2);

			const page2 = service.listArtifacts({
				tenantId: TENANT_A,
				page: 2,
				pageSize: 2,
			});
			expect(page2.items).toHaveLength(1);
		});

		it("filters artifacts by type", async () => {
			const { service } = createService(createCleanScanner());

			await service.uploadArtifact(validArtifactInput());
			await service.uploadArtifact(
				validArtifactInput({
					artifactType: "menu-image",
					originalFilename: "photo.jpg",
					mimeType: "image/jpeg",
				}),
			);

			const pdfs = service.listArtifacts({
				tenantId: TENANT_A,
				artifactType: "menu-pdf",
			});
			expect(pdfs.total).toBe(1);

			const images = service.listArtifacts({
				tenantId: TENANT_A,
				artifactType: "menu-image",
			});
			expect(images.total).toBe(1);
		});

		it("lists jobs with status filter", async () => {
			const { service } = createService(createCleanScanner());

			const { job: job1 } = await service.uploadArtifact(
				validArtifactInput(),
			);
			await service.uploadArtifact(
				validArtifactInput({
					originalFilename: "dinner-menu.pdf",
				}),
			);

			service.transitionJobStatus(job1.id, TENANT_A, "processing");

			const pending = service.listJobs({
				tenantId: TENANT_A,
				status: "pending",
			});
			expect(pending.total).toBe(1);

			const processing = service.listJobs({
				tenantId: TENANT_A,
				status: "processing",
			});
			expect(processing.total).toBe(1);
		});

		it("deletes artifact with no active job", async () => {
			const { service } = createService(createCleanScanner());
			const { artifact, job } = await service.uploadArtifact(
				validArtifactInput(),
			);

			// Complete the job first
			service.transitionJobStatus(job.id, TENANT_A, "processing");
			service.transitionJobStatus(job.id, TENANT_A, "staged");
			service.transitionJobStatus(job.id, TENANT_A, "completed");

			const deleted = service.deleteArtifact(artifact.id, TENANT_A);
			expect(deleted).toBe(true);
		});

		it("prevents deletion of artifact with active job", async () => {
			const { service } = createService(createCleanScanner());
			const { artifact } = await service.uploadArtifact(
				validArtifactInput(),
			);

			expect(() =>
				service.deleteArtifact(artifact.id, TENANT_A),
			).toThrow(ImportArtifactValidationError);
		});
	});

	// ─── Job queue dispatch tests (E9-S2-T3) ────────────────────────────

	describe("job dispatch", () => {
		it("dispatches with correct payload", async () => {
			const { service, jobQueue } = createService(createCleanScanner());
			const { job, artifact } = await service.uploadArtifact(
				validArtifactInput(),
			);

			const dispatched = jobQueue.getDispatched();
			expect(dispatched).toHaveLength(1);
			expect(dispatched[0].jobId).toBe(job.id);
			expect(dispatched[0].tenantId).toBe(TENANT_A);
			expect(dispatched[0].artifactId).toBe(artifact.id);
			expect(dispatched[0].artifactType).toBe("menu-pdf");
			expect(dispatched[0].storagePath).toContain(TENANT_A);
			expect(dispatched[0].retryAttempt).toBe(0);
		});

		it("uses correct queue name", () => {
			const queue = new InMemoryImportJobQueue();
			expect(queue.getQueueName()).toBe("import-processing");
		});
	});
});
