import { Injectable } from "@nestjs/common";

import type {
	PlatformTenantFilterCriteria,
	PlatformTenantOperationalSummary
} from "@platform/types";
import { applyTenantFilterCriteria } from "@platform/types";

import { PlatformAccessService } from "./platform-access.service";

export type PlatformFilterActor = {
	actorType: "platform" | "tenant" | "customer" | null;
	platformRole: "owner" | "admin" | "support" | "analyst" | null;
	userId: string | null;
};

@Injectable()
export class PlatformTenantFilterService {
	constructor(
		private readonly platformAccessService: PlatformAccessService
	) {}

	filterSummaries(
		actor: PlatformFilterActor,
		summaries: readonly PlatformTenantOperationalSummary[],
		criteria: PlatformTenantFilterCriteria
	): PlatformTenantOperationalSummary[] {
		this.platformAccessService.requirePlatformCapability({
			actorType: actor.actorType,
			capability: "tenants:read",
			platformRole: actor.platformRole,
			userId: actor.userId
		});

		return applyTenantFilterCriteria(summaries, criteria);
	}
}
