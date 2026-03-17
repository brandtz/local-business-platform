import { Injectable } from "@nestjs/common";

import type { AuthActorType } from "@platform/types";

import type { TenantRequestContext } from "./request-context.service";

export type AuditAttributionRecord = {
	action: string;
	effectiveActorType: AuthActorType | null;
	effectiveUserId: string | null;
	impersonationSessionId: string | null;
	originalActorType: AuthActorType | null;
	originalUserId: string | null;
	occurredAt: string;
	tenantId: string | null;
};

@Injectable()
export class AuditAttributionService {
	createRecord(
		action: string,
		context: TenantRequestContext,
		now: Date = new Date()
	): AuditAttributionRecord {
		return {
			action,
			effectiveActorType: context.viewer.actorType,
			effectiveUserId: context.viewer.userId,
			impersonationSessionId: context.viewer.impersonationSession?.sessionId || null,
			originalActorType: context.viewer.impersonationSession ? "platform" : null,
			originalUserId:
				context.viewer.impersonationSession?.impersonatorUserId || null,
			occurredAt: now.toISOString(),
			tenantId:
				context.tenantResolution.kind === "tenant"
					? context.tenantResolution.tenant.id
					: null
		};
	}
}