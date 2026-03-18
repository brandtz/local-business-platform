import { Injectable } from "@nestjs/common";

import type {
	PlatformOperationsWidgetSet,
	PlatformTenantOperationalSummary
} from "@platform/types";
import { derivePlatformOperationsWidgets } from "@platform/types";

import { PlatformAccessService } from "./platform-access.service";

export type PlatformWidgetActor = {
	actorType: "platform" | "tenant" | "customer" | null;
	platformRole: "owner" | "admin" | "support" | "analyst" | null;
	userId: string | null;
};

@Injectable()
export class PlatformTenantWidgetService {
	constructor(
		private readonly platformAccessService: PlatformAccessService
	) {}

	createWidgets(
		actor: PlatformWidgetActor,
		summaries: readonly PlatformTenantOperationalSummary[]
	): PlatformOperationsWidgetSet {
		this.platformAccessService.requirePlatformCapability({
			actorType: actor.actorType,
			capability: "tenants:read",
			platformRole: actor.platformRole,
			userId: actor.userId
		});

		return derivePlatformOperationsWidgets(summaries);
	}
}
