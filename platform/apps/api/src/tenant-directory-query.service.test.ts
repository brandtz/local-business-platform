import { describe, expect, it } from "vitest";

import { RequestContextService } from "./auth/request-context.service";
import { TenantAccessDeniedError } from "./auth/tenant-access.service";
import {
	TenantRequestPolicyError,
	TenantRequestPolicyService
} from "./auth/tenant-request-policy.service";
import { TenantResolutionService } from "./auth/tenant-resolution.service";
import { TenantDirectoryQueryService } from "./tenant-directory-query.service";

const requestContextService = new RequestContextService(
	new TenantResolutionService({
		managedPreviewDomains: ["preview.local"]
	})
);
const service = new TenantDirectoryQueryService(
	new TenantRequestPolicyService(requestContextService)
);

describe("tenant directory query service", () => {
	it("filters tenant-scoped records to the resolved request tenant", () => {
		const context = requestContextService.buildContext({
			actorType: "tenant",
			adminTenantId: "tenant-1",
			headers: {
				host: "admin.local"
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
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "active"
				}
			],
			userId: "tenant-user-1"
		});

		expect(
			service.filterRecordsForTenant(
				[
					{ id: "record-1", tenantId: "tenant-1" },
					{ id: "record-2", tenantId: "tenant-2" }
				],
				context
			)
		).toEqual([{ id: "record-1", tenantId: "tenant-1" }]);
	});

	it("requires tenant membership before returning current tenant data", () => {
		const context = requestContextService.buildContext({
			actorType: "tenant",
			adminTenantId: "tenant-1",
			headers: {
				host: "admin.local"
			},
			routeSpace: "tenant-admin",
			sessionScope: "tenant",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "active"
				}
			],
			userId: "tenant-user-1"
		});

		expect(() => service.getCurrentTenant(context)).toThrow(TenantAccessDeniedError);
	});

	it("fails suspended and archived tenants before returning or filtering tenant data", () => {
		const suspendedContext = requestContextService.buildContext({
			actorType: "tenant",
			adminTenantId: "tenant-1",
			headers: {
				host: "admin.local"
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
						status: "suspended"
					},
					userId: "tenant-user-1"
				}
			],
			routeSpace: "tenant-admin",
			sessionScope: "tenant",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "suspended"
				}
			],
			userId: "tenant-user-1"
		});
		const archivedContext = requestContextService.buildContext({
			actorType: "tenant",
			adminTenantId: "tenant-1",
			headers: {
				host: "admin.local"
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
						status: "archived"
					},
					userId: "tenant-user-1"
				}
			],
			routeSpace: "tenant-admin",
			sessionScope: "tenant",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "archived"
				}
			],
			userId: "tenant-user-1"
		});

		expect(() => service.getCurrentTenant(suspendedContext)).toThrow(
			TenantRequestPolicyError
		);
		expect(() =>
			service.filterRecordsForTenant([{ id: "record-1", tenantId: "tenant-1" }], archivedContext)
		).toThrow(TenantRequestPolicyError);
	});
});