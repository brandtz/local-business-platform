import { Injectable } from "@nestjs/common";

import type { TenantModuleKey } from "@platform/types";

import { isValidModuleKey } from "@platform/types";

const moduleCapabilityErrorMessages = {
	"module-disabled": "Access denied: the requested module is not enabled for this tenant.",
	"unknown-module": "The specified module key is not recognized."
} as const;

export type ModuleCapabilityErrorReason =
	| "module-disabled"
	| "unknown-module";

export class ModuleCapabilityError extends Error {
	constructor(readonly reason: ModuleCapabilityErrorReason) {
		super(moduleCapabilityErrorMessages[reason]);
	}
}

export type ModuleCapabilityContext = {
	enabledModules: readonly TenantModuleKey[];
	tenantId: string;
};

export type ModuleCapabilityCheckResult =
	| { allowed: true; moduleKey: TenantModuleKey }
	| { allowed: false; moduleKey: TenantModuleKey; reason: ModuleCapabilityErrorReason };

@Injectable()
export class ModuleCapabilityService {
	checkAccess(
		context: ModuleCapabilityContext,
		moduleKey: string
	): ModuleCapabilityCheckResult {
		if (!isValidModuleKey(moduleKey)) {
			return {
				allowed: false,
				moduleKey: moduleKey as TenantModuleKey,
				reason: "unknown-module"
			};
		}

		if (!context.enabledModules.includes(moduleKey)) {
			return {
				allowed: false,
				moduleKey,
				reason: "module-disabled"
			};
		}

		return { allowed: true, moduleKey };
	}

	requireAccess(
		context: ModuleCapabilityContext,
		moduleKey: string
	): void {
		const result = this.checkAccess(context, moduleKey);

		if (!result.allowed) {
			throw new ModuleCapabilityError(result.reason);
		}
	}

	requireAllAccess(
		context: ModuleCapabilityContext,
		moduleKeys: readonly string[]
	): void {
		for (const key of moduleKeys) {
			this.requireAccess(context, key);
		}
	}

	getEnabledModules(
		context: ModuleCapabilityContext
	): readonly TenantModuleKey[] {
		return context.enabledModules;
	}

	buildCapabilityMap(
		context: ModuleCapabilityContext
	): Record<TenantModuleKey, boolean> {
		const enabledSet = new Set(context.enabledModules);

		return {
			bookings: enabledSet.has("bookings"),
			catalog: enabledSet.has("catalog"),
			content: enabledSet.has("content"),
			operations: enabledSet.has("operations"),
			ordering: enabledSet.has("ordering")
		};
	}
}
