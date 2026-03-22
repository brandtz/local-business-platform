// ---------------------------------------------------------------------------
// E9-S2-T2: Import job repository — in-memory store for import jobs
// ---------------------------------------------------------------------------

import type { ImportJobRecord, ImportJobStatus, ImportJobStagedOutput } from "@platform/types";

export class ImportJobRepository {
	private jobs: ImportJobRecord[] = [];

	create(job: ImportJobRecord): ImportJobRecord {
		this.jobs.push({ ...job });
		return { ...job };
	}

	findById(id: string): ImportJobRecord | null {
		return this.jobs.find((j) => j.id === id) ?? null;
	}

	findByIdAndTenant(id: string, tenantId: string): ImportJobRecord | null {
		return (
			this.jobs.find((j) => j.id === id && j.tenantId === tenantId) ?? null
		);
	}

	findByArtifactId(artifactId: string, tenantId: string): ImportJobRecord | null {
		return (
			this.jobs.find(
				(j) => j.artifactId === artifactId && j.tenantId === tenantId,
			) ?? null
		);
	}

	listByTenant(
		tenantId: string,
		options?: {
			status?: ImportJobStatus;
			page?: number;
			pageSize?: number;
		},
	): { items: ImportJobRecord[]; total: number } {
		let filtered = this.jobs.filter((j) => j.tenantId === tenantId);

		if (options?.status) {
			filtered = filtered.filter((j) => j.status === options.status);
		}

		const total = filtered.length;
		const page = options?.page ?? 1;
		const pageSize = options?.pageSize ?? 20;
		const start = (page - 1) * pageSize;
		const items = filtered.slice(start, start + pageSize);

		return { items: items.map((j) => ({ ...j })), total };
	}

	updateStatus(
		id: string,
		tenantId: string,
		status: ImportJobStatus,
		updates?: Partial<
			Pick<ImportJobRecord, "failureReason" | "startedAt" | "completedAt" | "retryCount">
		>,
	): ImportJobRecord | null {
		const job = this.jobs.find(
			(j) => j.id === id && j.tenantId === tenantId,
		);
		if (!job) return null;

		job.status = status;
		job.updatedAt = new Date().toISOString();
		if (updates?.failureReason !== undefined)
			job.failureReason = updates.failureReason;
		if (updates?.startedAt !== undefined) job.startedAt = updates.startedAt;
		if (updates?.completedAt !== undefined)
			job.completedAt = updates.completedAt;
		if (updates?.retryCount !== undefined)
			job.retryCount = updates.retryCount;
		return { ...job };
	}

	setStagedOutput(
		id: string,
		tenantId: string,
		stagedOutput: ImportJobStagedOutput,
	): ImportJobRecord | null {
		const job = this.jobs.find(
			(j) => j.id === id && j.tenantId === tenantId,
		);
		if (!job) return null;

		job.stagedOutput = stagedOutput;
		job.updatedAt = new Date().toISOString();
		return { ...job };
	}

	countByTenant(tenantId: string): number {
		return this.jobs.filter((j) => j.tenantId === tenantId).length;
	}

	/**
	 * Lists jobs in a given status, used for worker resumability.
	 */
	listByStatus(status: ImportJobStatus): ImportJobRecord[] {
		return this.jobs
			.filter((j) => j.status === status)
			.map((j) => ({ ...j }));
	}
}
