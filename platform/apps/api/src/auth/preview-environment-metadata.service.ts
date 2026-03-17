import { Injectable } from "@nestjs/common";

import type {
	PreviewEnvironmentMetadata,
	PreviewEnvironmentMetadataOptions,
	PreviewSurfaceMetadata,
	TenantStatus
} from "@platform/types";

import {
	buildPreviewEnvironmentMetadata,
	canTenantAccessLifecycleMode
} from "@platform/types";

export type PreviewEnvironmentMetadataRequest = {
	previewSubdomain: string;
	tenantId: string;
	tenantStatus: TenantStatus;
};

@Injectable()
export class PreviewEnvironmentMetadataService {
	constructor(
		private readonly domainConfig: PreviewEnvironmentMetadataOptions = {}
	) {}

	derive(request: PreviewEnvironmentMetadataRequest): PreviewEnvironmentMetadata {
		const base = buildPreviewEnvironmentMetadata(
			request.tenantId,
			request.previewSubdomain,
			this.domainConfig
		);

		const tenantAccessible = canTenantAccessLifecycleMode(
			request.tenantStatus,
			"preview-routing"
		);

		if (tenantAccessible) {
			return base;
		}

		const surfaces: PreviewSurfaceMetadata[] = base.surfaces.map((s) => ({
			...s,
			available: false
		}));

		return {
			...base,
			environmentStatus: "not-configured",
			surfaces
		};
	}
}
