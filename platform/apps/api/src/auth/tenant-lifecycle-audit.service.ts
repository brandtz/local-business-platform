import { Injectable } from "@nestjs/common";

import type {
	AuthActorType,
	PlatformActorRole,
	TenantLifecycleAccessMode,
	TenantRequestFailureReason,
	TenantStatus
} from "@platform/types";

import type { TenantLifecyclePolicyErrorReason } from "./tenant-lifecycle-policy.service";

export type TenantLifecycleAuditAction =
	| "tenant.lifecycle_transitioned"
	| "tenant.lifecycle_denied";

export type TenantLifecycleAuditPath =
	| "lifecycle-transition"
	| TenantLifecycleAccessMode;

export type TenantLifecycleAuditReason =
	| TenantLifecyclePolicyErrorReason
	| TenantRequestFailureReason
	| "platform-access-denied";

export type TenantLifecycleAuditRecord = {
	action: TenantLifecycleAuditAction;
	actorType: AuthActorType | null;
	occurredAt: string;
	path: TenantLifecycleAuditPath;
	platformRole: PlatformActorRole | null;
	reason: TenantLifecycleAuditReason | null;
	tenantId: string | null;
	toStatus: TenantStatus | null;
	fromStatus: TenantStatus | null;
	userId: string | null;
};

export type TenantLifecycleAuditTransitionInput = {
	actorType: AuthActorType | null;
	fromStatus: TenantStatus;
	now?: Date;
	platformRole?: PlatformActorRole | null;
	tenantId: string;
	toStatus: TenantStatus;
	userId: string | null;
};

export type TenantLifecycleAuditDeniedInput = {
	actorType: AuthActorType | null;
	now?: Date;
	path: TenantLifecycleAuditPath;
	platformRole?: PlatformActorRole | null;
	reason: TenantLifecycleAuditReason;
	status: TenantStatus | null;
	tenantId?: string | null;
	userId: string | null;
};

@Injectable()
export class TenantLifecycleAuditService {
	createTransitionRecord(
		input: TenantLifecycleAuditTransitionInput
	): TenantLifecycleAuditRecord {
		return {
			action: "tenant.lifecycle_transitioned",
			actorType: input.actorType,
			fromStatus: input.fromStatus,
			occurredAt: (input.now || new Date()).toISOString(),
			path: "lifecycle-transition",
			platformRole: input.platformRole || null,
			reason: null,
			tenantId: input.tenantId,
			toStatus: input.toStatus,
			userId: input.userId
		};
	}

	createDeniedRecord(
		input: TenantLifecycleAuditDeniedInput
	): TenantLifecycleAuditRecord {
		return {
			action: "tenant.lifecycle_denied",
			actorType: input.actorType,
			fromStatus: input.status,
			occurredAt: (input.now || new Date()).toISOString(),
			path: input.path,
			platformRole: input.platformRole || null,
			reason: input.reason,
			tenantId: input.tenantId || null,
			toStatus: null,
			userId: input.userId
		};
	}
}