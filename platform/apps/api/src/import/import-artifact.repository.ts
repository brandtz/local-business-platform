// ---------------------------------------------------------------------------
// E9-S2-T1: Import artifact repository — in-memory store for import artifacts
// ---------------------------------------------------------------------------

import type { ImportArtifactRecord, ArtifactUploadStatus } from "@platform/types";

export class ImportArtifactRepository {
	private artifacts: ImportArtifactRecord[] = [];

	create(artifact: ImportArtifactRecord): ImportArtifactRecord {
		this.artifacts.push({ ...artifact });
		return { ...artifact };
	}

	findById(id: string): ImportArtifactRecord | null {
		return this.artifacts.find((a) => a.id === id) ?? null;
	}

	findByIdAndTenant(id: string, tenantId: string): ImportArtifactRecord | null {
		return (
			this.artifacts.find((a) => a.id === id && a.tenantId === tenantId) ??
			null
		);
	}

	listByTenant(
		tenantId: string,
		options?: {
			artifactType?: string;
			uploadStatus?: ArtifactUploadStatus;
			page?: number;
			pageSize?: number;
		},
	): { items: ImportArtifactRecord[]; total: number } {
		let filtered = this.artifacts.filter((a) => a.tenantId === tenantId);

		if (options?.artifactType) {
			filtered = filtered.filter(
				(a) => a.artifactType === options.artifactType,
			);
		}
		if (options?.uploadStatus) {
			filtered = filtered.filter(
				(a) => a.uploadStatus === options.uploadStatus,
			);
		}

		const total = filtered.length;
		const page = options?.page ?? 1;
		const pageSize = options?.pageSize ?? 20;
		const start = (page - 1) * pageSize;
		const items = filtered.slice(start, start + pageSize);

		return { items: items.map((a) => ({ ...a })), total };
	}

	updateStatus(
		id: string,
		tenantId: string,
		status: ArtifactUploadStatus,
		scanResult?: string,
	): ImportArtifactRecord | null {
		const artifact = this.artifacts.find(
			(a) => a.id === id && a.tenantId === tenantId,
		);
		if (!artifact) return null;

		artifact.uploadStatus = status;
		artifact.updatedAt = new Date().toISOString();
		if (scanResult !== undefined) {
			artifact.scanResult = scanResult;
		}
		return { ...artifact };
	}

	delete(id: string, tenantId: string): boolean {
		const idx = this.artifacts.findIndex(
			(a) => a.id === id && a.tenantId === tenantId,
		);
		if (idx === -1) return false;
		this.artifacts.splice(idx, 1);
		return true;
	}

	countByTenant(tenantId: string): number {
		return this.artifacts.filter((a) => a.tenantId === tenantId).length;
	}
}
