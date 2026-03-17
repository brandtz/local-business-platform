import { describe, expect, it } from "vitest";

import { TenantProvisioningTemplateService } from "./tenant-provisioning-template.service";

const service = new TenantProvisioningTemplateService();

describe("tenant provisioning template service", () => {
	it("returns deterministic module sets and configuration defaults for each supported template", () => {
		expect(service.getTemplateProfile("restaurant-core")).toEqual({
			configurationDefaults: {
				brandPreset: "starter-restaurant",
				navigationPreset: "restaurant-default",
				operatingMode: "ordering",
				themePreset: "starter-warm"
			},
			enabledModules: ["catalog", "ordering", "content", "operations"],
			verticalTemplate: "restaurant-core"
		});

		expect(service.getTemplateProfile("services-core").enabledModules).toEqual([
			"catalog",
			"bookings",
			"content",
			"operations"
		]);
		expect(service.getTemplateProfile("hybrid-local-business").configurationDefaults.operatingMode).toBe(
			"hybrid"
		);
	});
});