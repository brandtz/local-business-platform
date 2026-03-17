import { Injectable } from "@nestjs/common";

import type { AuthActorType, TenantMembershipRecord } from "@platform/types";

import {
	assertTenantCapability,
	type TenantCapability
} from "./tenant-authorization";

export class TenantAccessDeniedError extends Error {
	constructor() {
		super("Tenant access denied.");
	}
}

export type TenantAccessRequest = {
	actorType: AuthActorType | null;
	memberships: TenantMembershipRecord[];
	tenantId: string;
	userId: string | null;
};

export type TenantCapabilityAccessRequest = TenantAccessRequest & {
	capability: TenantCapability;
};

@Injectable()
export class TenantAccessService {
	hasTenantMembership(request: TenantAccessRequest): boolean {
		return this.findMembership(request) !== null;
	}

	requireTenantMembership(request: TenantAccessRequest): TenantMembershipRecord {
		const membership = this.findMembership(request);

		if (!membership) {
			throw new TenantAccessDeniedError();
		}

		return membership;
	}

	requireTenantCapability(
		request: TenantCapabilityAccessRequest
	): TenantMembershipRecord {
		const membership = this.requireTenantMembership(request);

		try {
			assertTenantCapability(membership.role, request.capability);
		} catch {
			throw new TenantAccessDeniedError();
		}

		return membership;
	}

	private findMembership(
		request: TenantAccessRequest
	): TenantMembershipRecord | null {
		if (request.actorType !== "tenant" || !request.userId) {
			return null;
		}

		return (
			request.memberships.find(
				(membership) =>
					membership.userId === request.userId &&
					membership.tenant.id === request.tenantId &&
					!membership.revokedAt
			) || null
		);
	}
}