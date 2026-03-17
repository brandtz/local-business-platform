import { Injectable } from "@nestjs/common";

import type {
	TenantModuleKey,
	TenantProvisioningDefaults,
	TenantVerticalTemplateKey
} from "@platform/types";

export type TenantProvisioningTemplateProfile = {
	configurationDefaults: Partial<TenantProvisioningDefaults>;
	enabledModules: TenantModuleKey[];
	verticalTemplate: TenantVerticalTemplateKey;
};

const templateProfiles: Record<
	TenantVerticalTemplateKey,
	TenantProvisioningTemplateProfile
> = {
	"restaurant-core": {
		configurationDefaults: {
			brandPreset: "starter-restaurant",
			navigationPreset: "restaurant-default",
			operatingMode: "ordering",
			themePreset: "starter-warm"
		},
		enabledModules: ["catalog", "ordering", "content", "operations"],
		verticalTemplate: "restaurant-core"
	},
	"services-core": {
		configurationDefaults: {
			brandPreset: "starter-services",
			navigationPreset: "services-default",
			operatingMode: "booking",
			themePreset: "starter-clean"
		},
		enabledModules: ["catalog", "bookings", "content", "operations"],
		verticalTemplate: "services-core"
	},
	"hybrid-local-business": {
		configurationDefaults: {
			brandPreset: "starter-brand",
			navigationPreset: "service-default",
			operatingMode: "hybrid",
			themePreset: "starter-light"
		},
		enabledModules: ["catalog", "ordering", "bookings", "content", "operations"],
		verticalTemplate: "hybrid-local-business"
	}
};

@Injectable()
export class TenantProvisioningTemplateService {
	getTemplateProfile(
		verticalTemplate: TenantVerticalTemplateKey
	): TenantProvisioningTemplateProfile {
		return templateProfiles[verticalTemplate];
	}
}