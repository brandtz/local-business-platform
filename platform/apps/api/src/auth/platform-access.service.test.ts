import { describe, expect, it } from "vitest";

import { PlatformAccessDeniedError, PlatformAccessService } from "./platform-access.service";
import { TenantAccessDeniedError, TenantAccessService } from "./tenant-access.service";

describe("platform access service", () => {
	const platformAccessService = new PlatformAccessService();
	const tenantAccessService = new TenantAccessService();

	it("allows platform-only access without tenant memberships", () => {
		expect(
			platformAccessService.requirePlatformCapability({
				actorType: "platform",
				capability: "domains:manage",
				platformRole: "admin",
				userId: "platform-user-1"
			})
		).toBe("admin");
	});

	it("denies platform access when the actor is not a platform user or lacks a platform role", () => {
		expect(() =>
			platformAccessService.requirePlatformRole({
				actorType: "tenant",
				platformRole: null,
				userId: "tenant-user-1"
			})
		).toThrow(PlatformAccessDeniedError);

		expect(() =>
			platformAccessService.requirePlatformRole({
				actorType: "platform",
				platformRole: null,
				userId: "platform-user-1"
			})
		).toThrow("Platform access denied.");
	});

	it("keeps platform access success separate from tenant membership success", () => {
		expect(
			platformAccessService.requirePlatformCapability({
				actorType: "platform",
				capability: "analytics:read",
				platformRole: "analyst",
				userId: "platform-user-2"
			})
		).toBe("analyst");

		expect(() =>
			tenantAccessService.requireTenantMembership({
				actorType: "platform",
				memberships: [],
				tenantId: "tenant-1",
				userId: "platform-user-2"
			})
		).toThrow(TenantAccessDeniedError);
	});

	it("denies forbidden platform capabilities with a generic platform-only error", () => {
		expect(() =>
			platformAccessService.requirePlatformCapability({
				actorType: "platform",
				capability: "platform:manage",
				platformRole: "support",
				userId: "platform-user-3"
			})
		).toThrow("Platform access denied.");
	});
});