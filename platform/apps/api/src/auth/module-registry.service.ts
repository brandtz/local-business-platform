import { Injectable } from "@nestjs/common";

import type {
	ModuleEnablementValidationResult,
	ModuleRegistryEntry,
	TenantModuleKey
} from "@platform/types";

import {
	getFullModuleRegistry,
	getModuleDependencies,
	getModuleRegistryEntry,
	isValidModuleKey,
	tenantModuleKeys,
	validateModuleEnablementSet
} from "@platform/types";

const moduleRegistryErrorMessages = {
	"empty-set": "Module enablement set must not be empty.",
	"missing-dependency": "Module enablement set is missing a required dependency.",
	"unknown-module": "Module enablement set contains an unrecognized module key."
} as const;

export type ModuleRegistryErrorReason =
	| "empty-set"
	| "missing-dependency"
	| "unknown-module";

export class ModuleRegistryError extends Error {
	constructor(readonly reason: ModuleRegistryErrorReason) {
		super(moduleRegistryErrorMessages[reason]);
	}
}

@Injectable()
export class ModuleRegistryService {
	getRegistry(): readonly ModuleRegistryEntry[] {
		return getFullModuleRegistry();
	}

	getEntry(key: TenantModuleKey): ModuleRegistryEntry {
		return getModuleRegistryEntry(key);
	}

	getAllModuleKeys(): readonly TenantModuleKey[] {
		return tenantModuleKeys;
	}

	isValidKey(key: string): key is TenantModuleKey {
		return isValidModuleKey(key);
	}

	getDependencies(key: TenantModuleKey): readonly TenantModuleKey[] {
		return getModuleDependencies(key);
	}

	validateEnablement(
		modules: readonly string[]
	): ModuleEnablementValidationResult {
		return validateModuleEnablementSet(modules);
	}

	requireValidEnablement(modules: readonly string[]): void {
		const result = validateModuleEnablementSet(modules);

		if (!result.valid) {
			throw new ModuleRegistryError(result.reason);
		}
	}
}
