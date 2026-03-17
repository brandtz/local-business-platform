import { describe, expect, it } from "vitest";

import {
	TenantPublishPolicyError,
	TenantPublishPolicyService
} from "./tenant-publish-policy.service";

const service = new TenantPublishPolicyService();

describe("tenant publish policy service", () => {
	it("allows only active tenants through the publish gate", () => {
		expect(
			service.requirePublishableTenant({
				displayName: "Alpha Fitness",
				id: "tenant-1",
				slug: "alpha-fitness",
				status: "active"
			})
		).toEqual({
			displayName: "Alpha Fitness",
			id: "tenant-1",
			slug: "alpha-fitness",
			status: "active"
		});
	});

	it("denies draft, suspended, and archived tenants with machine-readable reasons", () => {
		try {
			service.requirePublishableTenant({
				displayName: "Bravo Cafe",
				id: "tenant-2",
				slug: "bravo-cafe",
				status: "draft"
			});
		} catch (error) {
			expect((error as TenantPublishPolicyError).reason).toBe("tenant-inactive");
		}

		try {
			service.requirePublishableTenant({
				displayName: "Charlie Spa",
				id: "tenant-3",
				slug: "charlie-spa",
				status: "suspended"
			});
		} catch (error) {
			expect((error as TenantPublishPolicyError).reason).toBe("tenant-suspended");
		}

		try {
			service.requirePublishableTenant({
				displayName: "Delta Grill",
				id: "tenant-4",
				slug: "delta-grill",
				status: "archived"
			});
		} catch (error) {
			expect((error as TenantPublishPolicyError).reason).toBe("tenant-archived");
		}
	});
});