import { Injectable } from "@nestjs/common";

import type {
	TenantVerticalTemplateKey
} from "@platform/types";

import { getTemplateRegistryEntry } from "@platform/types";

export type TenantProvisioningTemplateProfile = {
	configurationDefaults: ReturnType<typeof getTemplateRegistryEntry>["configurationDefaults"];
	enabledModules: ReturnType<typeof getTemplateRegistryEntry>["requiredModules"] extends readonly (infer T)[] ? T[] : never;
	verticalTemplate: TenantVerticalTemplateKey;
};

@Injectable()
export class TenantProvisioningTemplateService {
	getTemplateProfile(
		verticalTemplate: TenantVerticalTemplateKey
	): TenantProvisioningTemplateProfile {
		const entry = getTemplateRegistryEntry(verticalTemplate);
		return {
			configurationDefaults: entry.configurationDefaults,
			enabledModules: [...entry.requiredModules],
			verticalTemplate: entry.key
		};
	}
}