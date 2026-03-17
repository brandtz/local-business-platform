import { describe, expect, it } from "vitest";

import { RequestContextService } from "./request-context.service";
import {
	TenantRequestPolicyError,
	TenantRequestPolicyService
} from "./tenant-request-policy.service";
import { TenantResolutionService } from "./tenant-resolution.service";

const requestContextService = new RequestContextService(
	new TenantResolutionService({
		managedPreviewDomains: ["preview.local"]
	})
);
const service = new TenantRequestPolicyService(requestContextService);

describe("tenant request policy service", () => {
	it("allows active and draft tenants through the operational tenant gate", () => {
		const activeContext = requestContextService.buildContext({
			headers: {
				host: "alpha.preview.local"
			},
			routeSpace: "customer",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "active"
				},
				{
					displayName: "Bravo Cafe",
					id: "tenant-2",
					previewSubdomain: "bravo",
					slug: "bravo-cafe",
					status: "draft"
				}
			]
		});
		const draftContext = requestContextService.buildContext({
			headers: {
				host: "bravo.preview.local"
			},
			routeSpace: "customer",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "active"
				},
				{
					displayName: "Bravo Cafe",
					id: "tenant-2",
					previewSubdomain: "bravo",
					slug: "bravo-cafe",
					status: "draft"
				}
			]
		});

		expect(service.requireOperationalTenant(activeContext).id).toBe("tenant-1");
		expect(service.requireOperationalTenant(draftContext).id).toBe("tenant-2");
	});

	it("supports explicit lifecycle access modes for preview and live routing paths", () => {
		const draftContext = requestContextService.buildContext({
			headers: {
				host: "bravo.preview.local"
			},
			routeSpace: "customer",
			tenants: [
				{
					displayName: "Bravo Cafe",
					id: "tenant-2",
					previewSubdomain: "bravo",
					slug: "bravo-cafe",
					status: "draft"
				}
			]
		});

		expect(service.requireLifecycleAccess(draftContext, "preview-routing").id).toBe(
			"tenant-2"
		);

		try {
			service.requireLifecycleAccess(draftContext, "live-routing");
		} catch (error) {
			expect((error as TenantRequestPolicyError).reason).toBe("tenant-inactive");
		}
	});

	it("fails unresolved tenant requests with a distinct failure reason", () => {
		const unresolvedContext = requestContextService.buildContext({
			headers: {
				host: "missing.preview.local"
			},
			routeSpace: "customer",
			tenants: []
		});

		expect(() => service.requireOperationalTenant(unresolvedContext)).toThrow(
			TenantRequestPolicyError
		);
		try {
			service.requireOperationalTenant(unresolvedContext);
		} catch (error) {
			expect(error).toBeInstanceOf(TenantRequestPolicyError);
			expect((error as TenantRequestPolicyError).reason).toBe("tenant-unresolved");
		}
	});

	it("fails suspended and archived tenants with distinct failure reasons", () => {
		const suspendedContext = requestContextService.buildContext({
			headers: {
				host: "alpha.preview.local"
			},
			routeSpace: "customer",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "suspended"
				}
			]
		});
		const archivedContext = requestContextService.buildContext({
			headers: {
				host: "alpha.preview.local"
			},
			routeSpace: "customer",
			tenants: [
				{
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "archived"
				}
			]
		});

		try {
			service.requireOperationalTenant(suspendedContext);
		} catch (error) {
			expect((error as TenantRequestPolicyError).reason).toBe("tenant-suspended");
		}

		try {
			service.requireOperationalTenant(archivedContext);
		} catch (error) {
			expect((error as TenantRequestPolicyError).reason).toBe("tenant-archived");
		}
	});
});