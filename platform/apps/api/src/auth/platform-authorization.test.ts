import { describe, expect, it } from "vitest";

import {
	assertPlatformCapability,
	getPlatformRoleCapabilities,
	hasPlatformCapability
} from "./platform-authorization";

describe("platform authorization", () => {
	it("grants owner and admin the expected platform capabilities", () => {
		expect(getPlatformRoleCapabilities("owner")).toContain("platform:manage");
		expect(hasPlatformCapability("admin", "domains:manage")).toBe(true);
		expect(hasPlatformCapability("admin", "impersonation:manage")).toBe(false);
	});

	it("keeps support and analyst capabilities separate from tenant-role concerns", () => {
		expect(hasPlatformCapability("support", "impersonation:manage")).toBe(true);
		expect(hasPlatformCapability("support", "tenants:write")).toBe(false);
		expect(hasPlatformCapability("analyst", "analytics:read")).toBe(true);
		expect(hasPlatformCapability("analyst", "domains:manage")).toBe(false);
	});

	it("throws for forbidden platform capability requests", () => {
		expect(() => assertPlatformCapability("support", "platform:manage")).toThrow(
			"Platform role support does not allow platform:manage."
		);
	});
});
