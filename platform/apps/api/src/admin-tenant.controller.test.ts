import { describe, expect, it } from "vitest";

import { AdminTenantController } from "./admin-tenant.controller";
import { RequestContextService, TenantRequestContextError } from "./auth/request-context.service";
import { TenantRequestPolicyError, TenantRequestPolicyService } from "./auth/tenant-request-policy.service";
import { TenantResolutionService } from "./auth/tenant-resolution.service";
import { TenantDirectoryQueryService } from "./tenant-directory-query.service";

function createController(): AdminTenantController {
	const requestContextService = new RequestContextService(
		new TenantResolutionService({
			managedPreviewDomains: ["preview.local"]
		})
	);

	return new AdminTenantController(
		requestContextService,
		new TenantDirectoryQueryService(new TenantRequestPolicyService(requestContextService))
	);
}

describe("AdminTenantController", () => {
	it("returns the current tenant from trusted request context", () => {
		const controller = createController();

		expect(
			controller.getTenant({
				tenantRequestContext: {
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
					tenantResolution: {
						kind: "tenant",
						normalizedHost: "admin.local",
						source: "tenant-admin-context",
						tenant: {
							customDomains: ["alpha.example.com"],
							displayName: "Alpha Fitness",
							id: "tenant-1",
							previewSubdomain: "alpha",
							slug: "alpha-fitness",
							status: "active"
						}
					},
					viewer: {
						actorType: "tenant",
						isAuthenticated: true,
						platformRole: null,
						sessionScope: "tenant",
						userId: "tenant-user-1"
					}
				}
			})
		).toEqual({
			displayName: "Alpha Fitness",
			id: "tenant-1",
			slug: "alpha-fitness",
			status: "active"
		});
	});

	it("fails closed when request context is missing", () => {
		const controller = createController();

		expect(() => controller.getTenant({})).toThrow(TenantRequestContextError);
	});

	it("fails suspended tenants with the tenant request policy error", () => {
		const controller = createController();

		expect(() =>
			controller.getTenant({
				tenantRequestContext: {
					memberships: [
						{
							isPrimary: true,
							joinedAt: "2026-03-16T08:00:00.000Z",
							role: "owner",
							tenant: {
								displayName: "Alpha Fitness",
								id: "tenant-1",
								slug: "alpha-fitness",
								status: "suspended"
							},
							userId: "tenant-user-1"
						}
					],
					routeSpace: "tenant-admin",
					tenantResolution: {
						kind: "tenant",
						normalizedHost: "admin.local",
						source: "tenant-admin-context",
						tenant: {
							customDomains: ["alpha.example.com"],
							displayName: "Alpha Fitness",
							id: "tenant-1",
							previewSubdomain: "alpha",
							slug: "alpha-fitness",
							status: "suspended"
						}
					},
					viewer: {
						actorType: "tenant",
						isAuthenticated: true,
						platformRole: null,
						sessionScope: "tenant",
						userId: "tenant-user-1"
					}
				}
			})
		).toThrow(TenantRequestPolicyError);
	});
});