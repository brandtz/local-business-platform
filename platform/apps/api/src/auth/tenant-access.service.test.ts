import { describe, expect, it } from "vitest";

import { TenantAccessDeniedError, TenantAccessService } from "./tenant-access.service";

const service = new TenantAccessService();

describe("tenant access service", () => {
	it("allows access when tenant membership matches the tenant and capability", () => {
		const membership = service.requireTenantCapability({
			actorType: "tenant",
			capability: "catalog:write",
			memberships: [
				{
					isPrimary: true,
					joinedAt: "2026-03-16T08:00:00.000Z",
					role: "manager",
					tenant: {
						displayName: "Alpha Fitness",
						id: "tenant-1",
						slug: "alpha-fitness",
						status: "active"
					},
					userId: "user-1"
				}
			],
			tenantId: "tenant-1",
			userId: "user-1"
		});

		expect(membership.role).toBe("manager");
	});

	it("denies access when membership is missing or points at another tenant", () => {
		expect(() =>
			service.requireTenantMembership({
				actorType: "tenant",
				memberships: [],
				tenantId: "tenant-1",
				userId: "user-1"
			})
		).toThrow(TenantAccessDeniedError);

		expect(() =>
			service.requireTenantMembership({
				actorType: "tenant",
				memberships: [
					{
						isPrimary: true,
						joinedAt: "2026-03-16T08:00:00.000Z",
						role: "owner",
						tenant: {
							displayName: "Beta Cafe",
							id: "tenant-2",
							slug: "beta-cafe",
							status: "active"
						},
						userId: "user-1"
					}
				],
				tenantId: "tenant-1",
				userId: "user-1"
			})
		).toThrow(TenantAccessDeniedError);
	});

	it("denies access for insufficient role or revoked membership without leaking tenant existence", () => {
		expect(() =>
			service.requireTenantCapability({
				actorType: "tenant",
				capability: "staff:manage",
				memberships: [
					{
						isPrimary: false,
						joinedAt: "2026-03-16T08:00:00.000Z",
						role: "staff",
						tenant: {
							displayName: "Gamma Salon",
							id: "tenant-3",
							slug: "gamma-salon",
							status: "active"
						},
						userId: "user-2"
					}
				],
				tenantId: "tenant-3",
				userId: "user-2"
			})
		).toThrow("Tenant access denied.");

		expect(() =>
			service.requireTenantMembership({
				actorType: "tenant",
				memberships: [
					{
						isPrimary: false,
						joinedAt: "2026-03-16T08:00:00.000Z",
						revokedAt: "2026-03-16T09:00:00.000Z",
						role: "admin",
						tenant: {
							displayName: "Delta Spa",
							id: "tenant-4",
							slug: "delta-spa",
							status: "active"
						},
						userId: "user-3"
					}
				],
				tenantId: "tenant-4",
				userId: "user-3"
			})
		).toThrow("Tenant access denied.");
	});

	it("denies access for non-tenant actor types", () => {
		expect(() =>
			service.requireTenantMembership({
				actorType: "platform",
				memberships: [],
				tenantId: "tenant-1",
				userId: "user-1"
			})
		).toThrow("Tenant access denied.");
	});
});