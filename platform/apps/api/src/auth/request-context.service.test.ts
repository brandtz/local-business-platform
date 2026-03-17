import { describe, expect, it } from "vitest";

import {
	attachImpersonationToRequestViewerContext,
	type TenantResolutionTenantRecord
} from "@platform/types";

import {
	RequestContextService,
	TenantRequestContextError
} from "./request-context.service";
import { TenantResolutionService } from "./tenant-resolution.service";

const tenants: TenantResolutionTenantRecord[] = [
	{
		customDomains: ["alpha.example.com"],
		displayName: "Alpha Fitness",
		id: "tenant-1",
		previewSubdomain: "alpha",
		slug: "alpha-fitness",
		status: "active"
	}
];

function createService(): RequestContextService {
	return new RequestContextService(
		new TenantResolutionService({
			managedPreviewDomains: ["preview.local"],
			platformAdminDomains: ["platform.local"]
		})
	);
}

describe("request context service", () => {
	it("builds request context using forwarded host precedence", () => {
		const service = createService();

		const context = service.buildContext({
			headers: {
				host: "fallback.preview.local",
				"x-forwarded-host": "alpha.example.com"
			},
			routeSpace: "customer",
			tenants
		});

		expect(context.viewer.isAuthenticated).toBe(false);
		expect(context.memberships).toEqual([]);
		expect(context.tenantResolution).toMatchObject({
			kind: "tenant",
			normalizedHost: "alpha.example.com",
			source: "custom-domain"
		});
	});

	it("builds tenant-admin request context from trusted admin tenant scope", () => {
		const service = createService();

		const context = service.buildContext({
			actorType: "tenant",
			adminTenantId: "tenant-1",
			headers: {
				host: "other.example.com"
			},
			memberships: [
				{
					isPrimary: true,
					joinedAt: "2026-03-16T08:00:00.000Z",
					role: "owner",
					tenant: {
						displayName: "Alpha Fitness",
						id: "tenant-1",
						slug: "alpha-fitness",
						status: "active"
					},
					userId: "tenant-user-1"
				}
			],
			routeSpace: "tenant-admin",
			sessionScope: "tenant",
			tenants,
			userId: "tenant-user-1"
		});

		expect(context.viewer).toEqual({
			actorType: "tenant",
			isAuthenticated: true,
			platformRole: null,
			sessionScope: "tenant",
			userId: "tenant-user-1"
		});
		expect(context.tenantResolution).toMatchObject({
			kind: "tenant",
			source: "tenant-admin-context"
		});
		expect(context.memberships).toHaveLength(1);
	});

	it("attaches and reads request context from a carrier", () => {
		const service = createService();
		const carrier = {};
		const context = service.buildContext({
			headers: {
				host: "alpha.example.com"
			},
			routeSpace: "customer",
			tenants
		});

		service.attachContext(carrier, context);

		expect(service.readContext(carrier)).toBe(context);
	});

	it("propagates impersonation metadata into request viewer context", () => {
		const service = createService();
		const context = service.buildContext({
			actorType: "tenant",
			adminTenantId: "tenant-1",
			headers: {
				host: "alpha.example.com"
			},
			impersonationSession: {
				expiresAt: "2026-03-16T21:30:00.000Z",
				impersonatorUserId: "platform-user-1",
				platformRole: "support",
				sessionId: "impersonation-1",
				startedAt: "2026-03-16T21:00:00.000Z",
				targetTenantId: "tenant-1",
				targetTenantName: "Alpha Fitness"
			},
			routeSpace: "tenant-admin",
			sessionScope: "tenant",
			tenants,
			userId: "tenant-user-1"
		});

		expect(context.viewer.impersonationSession?.sessionId).toBe("impersonation-1");
		expect(
			attachImpersonationToRequestViewerContext(
				{
					actorType: "tenant",
					isAuthenticated: true,
					platformRole: null,
					sessionScope: "tenant",
					userId: "tenant-user-1"
				},
				context.viewer.impersonationSession!
			).impersonationSession?.targetTenantName
		).toBe("Alpha Fitness");
	});

	it("requires a resolved tenant for downstream tenant-scoped services", () => {
		const service = createService();
		const customerContext = service.buildContext({
			headers: {
				host: "alpha.preview.local"
			},
			routeSpace: "customer",
			tenants
		});

		expect(service.requireTenant(customerContext).id).toBe("tenant-1");

		const platformContext = service.buildContext({
			headers: {
				host: "platform.local"
			},
			routeSpace: "platform-admin",
			tenants
		});

		expect(() => service.requireTenant(platformContext)).toThrow(
			TenantRequestContextError
		);
	});
});