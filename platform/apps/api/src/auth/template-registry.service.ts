import { Injectable } from "@nestjs/common";

import type {
	TenantModuleKey,
	TenantProvisioningDefaults,
	TenantVerticalTemplateKey
} from "@platform/types";

import {
	tenantVerticalTemplateKeys,
	validateModuleEnablementSet
} from "@platform/types";

import { ModuleRegistryService } from "./module-registry.service";

export type TemplateRegistryEntryMetadata = {
	description: string;
	displayName: string;
	icon: string;
	verticalTemplate: TenantVerticalTemplateKey;
};

export type TemplateRegistryEntry = {
	configurationDefaults: Partial<TenantProvisioningDefaults>;
	metadata: TemplateRegistryEntryMetadata;
	requiredModules: readonly TenantModuleKey[];
	verticalTemplate: TenantVerticalTemplateKey;
};

export type TenantTemplateAssociation = {
	assignedAt: string;
	tenantId: string;
	verticalTemplate: TenantVerticalTemplateKey;
};

export type TemplateModuleCompatibilityResult =
	| { compatible: true }
	| { compatible: false; missingModules: readonly TenantModuleKey[] };

const templateRegistryEntries: Record<
	TenantVerticalTemplateKey,
	TemplateRegistryEntry
> = {
	"restaurant-core": {
		configurationDefaults: {
			brandPreset: "starter-restaurant",
			navigationPreset: "restaurant-default",
			operatingMode: "ordering",
			themePreset: "starter-warm"
		},
		metadata: {
			description: "Full-service restaurant with online ordering and menu management.",
			displayName: "Restaurant",
			icon: "restaurant",
			verticalTemplate: "restaurant-core"
		},
		requiredModules: ["catalog", "ordering", "content", "operations"],
		verticalTemplate: "restaurant-core"
	},
	"services-core": {
		configurationDefaults: {
			brandPreset: "starter-services",
			navigationPreset: "services-default",
			operatingMode: "booking",
			themePreset: "starter-clean"
		},
		metadata: {
			description: "Service-based business with appointment booking and service catalog.",
			displayName: "Services",
			icon: "services",
			verticalTemplate: "services-core"
		},
		requiredModules: ["catalog", "bookings", "content", "operations"],
		verticalTemplate: "services-core"
	},
	"hybrid-local-business": {
		configurationDefaults: {
			brandPreset: "starter-brand",
			navigationPreset: "service-default",
			operatingMode: "hybrid",
			themePreset: "starter-light"
		},
		metadata: {
			description: "Combined ordering and booking for businesses that offer both products and services.",
			displayName: "Hybrid",
			icon: "hybrid",
			verticalTemplate: "hybrid-local-business"
		},
		requiredModules: ["catalog", "ordering", "bookings", "content", "operations"],
		verticalTemplate: "hybrid-local-business"
	}
};

const templateRegistryErrorMessages = {
	"incompatible-modules": "The provided module set does not satisfy the template's required modules.",
	"invalid-template": "The specified vertical template key is not recognized.",
	"template-already-assigned": "The tenant is already associated with the requested template."
} as const;

export type TemplateRegistryErrorReason =
	| "incompatible-modules"
	| "invalid-template"
	| "template-already-assigned";

export class TemplateRegistryError extends Error {
	constructor(readonly reason: TemplateRegistryErrorReason) {
		super(templateRegistryErrorMessages[reason]);
	}
}

@Injectable()
export class TemplateRegistryService {
	constructor(
		private readonly moduleRegistryService: ModuleRegistryService
	) {}

	getEntry(key: TenantVerticalTemplateKey): TemplateRegistryEntry {
		return templateRegistryEntries[key];
	}

	getAllEntries(): readonly TemplateRegistryEntry[] {
		return tenantVerticalTemplateKeys.map(
			(key) => templateRegistryEntries[key]
		);
	}

	getAllTemplateKeys(): readonly TenantVerticalTemplateKey[] {
		return tenantVerticalTemplateKeys;
	}

	checkModuleCompatibility(
		templateKey: TenantVerticalTemplateKey,
		enabledModules: readonly TenantModuleKey[]
	): TemplateModuleCompatibilityResult {
		const entry = templateRegistryEntries[templateKey];
		const enabledSet = new Set(enabledModules);

		const missingModules = entry.requiredModules.filter(
			(m) => !enabledSet.has(m)
		);

		if (missingModules.length === 0) {
			return { compatible: true };
		}

		return { compatible: false, missingModules };
	}

	requireModuleCompatibility(
		templateKey: TenantVerticalTemplateKey,
		enabledModules: readonly TenantModuleKey[]
	): void {
		const enablementResult = validateModuleEnablementSet(enabledModules as readonly string[]);

		if (!enablementResult.valid) {
			throw new TemplateRegistryError("incompatible-modules");
		}

		const compatibility = this.checkModuleCompatibility(templateKey, enabledModules);

		if (!compatibility.compatible) {
			throw new TemplateRegistryError("incompatible-modules");
		}
	}

	buildAssociation(
		tenantId: string,
		templateKey: TenantVerticalTemplateKey,
		assignedAt: string
	): TenantTemplateAssociation {
		return {
			assignedAt,
			tenantId,
			verticalTemplate: templateKey
		};
	}

	canReassign(
		currentTemplateKey: TenantVerticalTemplateKey,
		newTemplateKey: TenantVerticalTemplateKey
	): boolean {
		return currentTemplateKey !== newTemplateKey;
	}
}
