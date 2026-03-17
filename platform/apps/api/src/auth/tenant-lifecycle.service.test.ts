import { describe, expect, it } from "vitest";

import { PlatformAccessDeniedError } from "./platform-access.service";
import { TenantLifecyclePolicyError, TenantLifecyclePolicyService } from "./tenant-lifecycle-policy.service";
import { TenantLifecycleService } from "./tenant-lifecycle.service";
import { PlatformAccessService } from "./platform-access.service";

const service = new TenantLifecycleService(
	new PlatformAccessService(),
	new TenantLifecyclePolicyService()
);

const tenant = {
	displayName: "Alpha Fitness",
	id: "tenant-1",
	slug: "alpha-fitness",
	status: "draft" as const
};

describe("tenant lifecycle service", () => {
	it("allows platform actors with tenants:write to activate, suspend, and archive tenants", () => {
		expect(
			service.transitionTenant({
				actorType: "platform",
				platformRole: "admin",
				targetStatus: "active",
				tenant,
				userId: "platform-user-1"
			})
		).toEqual({
			event: "activate",
			performedByRole: "admin",
			previousStatus: "draft",
			tenant: {
				...tenant,
				status: "active"
			}
		});

		expect(
			service.transitionTenant({
				actorType: "platform",
				platformRole: "owner",
				targetStatus: "suspended",
				tenant: {
					...tenant,
					status: "active"
				},
				userId: "platform-user-2"
			})
		).toEqual({
			event: "suspend",
			performedByRole: "owner",
			previousStatus: "active",
			tenant: {
				...tenant,
				status: "suspended"
			}
		});
	});

	it("denies lifecycle transitions for platform actors without tenants:write or non-platform actors", () => {
		expect(() =>
			service.transitionTenant({
				actorType: "platform",
				platformRole: "support",
				targetStatus: "active",
				tenant,
				userId: "platform-user-3"
			})
		).toThrow(PlatformAccessDeniedError);

		expect(() =>
			service.transitionTenant({
				actorType: "tenant",
				platformRole: null,
				targetStatus: "active",
				tenant,
				userId: "tenant-user-1"
			})
		).toThrow(PlatformAccessDeniedError);
	});

	it("denies invalid or terminal lifecycle transitions even for authorized platform actors", () => {
		expect(() =>
			service.transitionTenant({
				actorType: "platform",
				platformRole: "admin",
				targetStatus: "suspended",
				tenant,
				userId: "platform-user-4"
			})
		).toThrow(TenantLifecyclePolicyError);

		try {
			service.transitionTenant({
				actorType: "platform",
				platformRole: "admin",
				targetStatus: "active",
				tenant: {
					...tenant,
					status: "archived"
				},
				userId: "platform-user-5"
			});
		} catch (error) {
			expect((error as TenantLifecyclePolicyError).reason).toBe("terminal-status");
		}
	});
});