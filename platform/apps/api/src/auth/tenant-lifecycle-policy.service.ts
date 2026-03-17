import { Injectable } from "@nestjs/common";

import type {
	TenantLifecycleEvent,
	TenantLifecycleTransition,
	TenantStatus
} from "@platform/types";

import {
	getAllowedTenantLifecycleTransitions,
	resolveTenantLifecycleEvent
} from "@platform/types";

const tenantLifecyclePolicyErrorMessages = {
	"already-in-status": "Tenant lifecycle transition denied because the tenant is already in the requested status.",
	"invalid-transition": "Tenant lifecycle transition denied because the requested status change is not allowed.",
	"terminal-status": "Tenant lifecycle transition denied because archived tenants are terminal."
} as const;

export type TenantLifecyclePolicyErrorReason =
	| "already-in-status"
	| "invalid-transition"
	| "terminal-status";

export class TenantLifecyclePolicyError extends Error {
	constructor(readonly reason: TenantLifecyclePolicyErrorReason) {
		super(tenantLifecyclePolicyErrorMessages[reason]);
	}
}

export type TenantLifecycleDecision = {
	event: TenantLifecycleEvent;
	from: TenantStatus;
	to: TenantStatus;
};

@Injectable()
export class TenantLifecyclePolicyService {
	getAllowedTransitions(status: TenantStatus): readonly TenantLifecycleTransition[] {
		return getAllowedTenantLifecycleTransitions(status);
	}

	requireTransition(from: TenantStatus, to: TenantStatus): TenantLifecycleDecision {
		if (from === to) {
			throw new TenantLifecyclePolicyError("already-in-status");
		}

		if (from === "archived") {
			throw new TenantLifecyclePolicyError("terminal-status");
		}

		const event = resolveTenantLifecycleEvent(from, to);

		if (!event) {
			throw new TenantLifecyclePolicyError("invalid-transition");
		}

		return {
			event,
			from,
			to
		};
	}
}