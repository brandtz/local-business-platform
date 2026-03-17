import { describe, expect, it } from "vitest";

import {
	assertTenantCapability,
	getTenantRoleCapabilities,
	hasTenantCapability
} from "./tenant-authorization";

describe("tenant authorization", () => {
	it("grants expected capabilities to owner and admin roles", () => {
		expect(getTenantRoleCapabilities("owner")).toContain("tenant:manage");
		expect(hasTenantCapability("admin", "staff:manage")).toBe(true);
		expect(hasTenantCapability("admin", "tenant:manage")).toBe(false);
	});

	it("limits manager and staff capabilities appropriately", () => {
		expect(hasTenantCapability("manager", "catalog:write")).toBe(true);
		expect(hasTenantCapability("manager", "staff:manage")).toBe(false);
		expect(hasTenantCapability("staff", "orders:manage")).toBe(true);
		expect(hasTenantCapability("staff", "content:publish")).toBe(false);
	});

	it("throws when a role attempts a forbidden capability", () => {
		expect(() => assertTenantCapability("staff", "tenant:manage")).toThrow(
			"Tenant role staff does not allow tenant:manage."
		);
	});
});
