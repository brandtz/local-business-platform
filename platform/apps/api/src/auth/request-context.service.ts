import { Injectable } from "@nestjs/common";

import {
	attachImpersonationToRequestViewerContext,
	createAnonymousRequestViewerContext,
	hasResolvedTenant,
	type AuthActorType,
	type ImpersonationSessionSummary,
	type PlatformActorRole,
	type RequestViewerContext,
	type SessionScope,
	type TenantMembershipRecord,
	type TenantResolutionResult,
	type TenantResolutionRouteSpace,
	type TenantResolutionTenantRecord
} from "@platform/types";

import {
	readPreferredRequestHost,
	type RequestHostHeaders
} from "./tenant-request-host";

import { TenantResolutionService } from "./tenant-resolution.service";

export const tenantRequestContextKey = "tenantRequestContext";

export type TenantRequestContext = {
	memberships: TenantMembershipRecord[];
	routeSpace: TenantResolutionRouteSpace;
	tenantResolution: TenantResolutionResult;
	viewer: RequestViewerContext;
};

export type TenantRequestContextCarrier = {
	[tenantRequestContextKey]?: TenantRequestContext;
};

export type CreateTenantRequestContextInput = {
	actorType?: AuthActorType | null;
	adminTenantId?: string | null;
	headers: RequestHostHeaders;
	impersonationSession?: ImpersonationSessionSummary | null;
	platformRole?: PlatformActorRole | null;
	routeSpace: TenantResolutionRouteSpace;
	sessionScope?: SessionScope | null;
	memberships?: TenantMembershipRecord[];
	tenants: TenantResolutionTenantRecord[];
	userId?: string | null;
};

export class TenantRequestContextError extends Error {
	constructor() {
		super("Tenant request context is unavailable.");
	}
}

@Injectable()
export class RequestContextService {
	constructor(private readonly tenantResolutionService: TenantResolutionService) {}

	attachContext(
		carrier: TenantRequestContextCarrier,
		context: TenantRequestContext
	): TenantRequestContext {
		carrier[tenantRequestContextKey] = context;
		return context;
	}

	buildContext(input: CreateTenantRequestContextInput): TenantRequestContext {
		const host = readPreferredRequestHost(input.headers);

		return {
			memberships: input.memberships || [],
			routeSpace: input.routeSpace,
			tenantResolution: this.tenantResolutionService.resolveTenant({
				adminTenantId: input.adminTenantId,
				host,
				routeSpace: input.routeSpace,
				tenants: input.tenants
			}),
			viewer: this.buildViewerContext(input)
		};
	}

	readContext(carrier: TenantRequestContextCarrier): TenantRequestContext | null {
		return carrier[tenantRequestContextKey] || null;
	}

	requireContext(carrier: TenantRequestContextCarrier): TenantRequestContext {
		const context = this.readContext(carrier);

		if (!context) {
			throw new TenantRequestContextError();
		}

		return context;
	}

	requireTenant(context: TenantRequestContext): TenantResolutionTenantRecord {
		if (!hasResolvedTenant(context.tenantResolution)) {
			throw new TenantRequestContextError();
		}

		return context.tenantResolution.tenant;
	}

	private buildViewerContext(
		input: CreateTenantRequestContextInput
	): RequestViewerContext {
		if (!input.actorType || !input.sessionScope || !input.userId) {
			return createAnonymousRequestViewerContext();
		}

		const viewerContext: RequestViewerContext = {
			actorType: input.actorType,
			isAuthenticated: true,
			platformRole:
				input.actorType === "platform" ? input.platformRole || null : null,
			sessionScope: input.sessionScope,
			userId: input.userId
		};

		if (input.impersonationSession) {
			return attachImpersonationToRequestViewerContext(
				viewerContext,
				input.impersonationSession
			);
		};

		return viewerContext;
	}
}