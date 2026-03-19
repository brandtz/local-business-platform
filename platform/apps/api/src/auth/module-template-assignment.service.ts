import { Injectable } from "@nestjs/common";

import type {
	TenantModuleKey,
	TenantVerticalTemplateKey
} from "@platform/types";

import { ModuleRegistryService } from "./module-registry.service";
import {
	TemplateRegistryService,
	type TenantTemplateAssociation
} from "./template-registry.service";

export type ModuleAssignmentRequest = {
	enabledModules: readonly string[];
	tenantId: string;
};

export type TemplateAssignmentRequest = {
	currentTemplate?: TenantVerticalTemplateKey | null;
	tenantId: string;
	verticalTemplate: TenantVerticalTemplateKey;
};

export type ModuleAssignmentResult = {
	enabledModules: readonly TenantModuleKey[];
	kind: "assigned";
	tenantId: string;
};

export type TemplateAssignmentResult = {
	association: TenantTemplateAssociation;
	kind: "assigned";
};

const moduleTemplateAssignmentErrorMessages = {
	"incompatible-modules": "The module set does not satisfy the template's required modules.",
	"invalid-modules": "The module enablement set is invalid.",
	"not-authorized": "Only platform administrators can assign modules and templates.",
	"same-template": "The tenant is already assigned to the requested template."
} as const;

export type ModuleTemplateAssignmentErrorReason =
	| "incompatible-modules"
	| "invalid-modules"
	| "not-authorized"
	| "same-template";

export class ModuleTemplateAssignmentError extends Error {
	constructor(readonly reason: ModuleTemplateAssignmentErrorReason) {
		super(moduleTemplateAssignmentErrorMessages[reason]);
	}
}

export type AssignmentActorContext = {
	actorType: string | null;
	platformRole: string | null;
};

@Injectable()
export class ModuleTemplateAssignmentService {
	constructor(
		private readonly moduleRegistryService: ModuleRegistryService,
		private readonly templateRegistryService: TemplateRegistryService
	) {}

	assignModules(
		actor: AssignmentActorContext,
		request: ModuleAssignmentRequest
	): ModuleAssignmentResult {
		this.requirePlatformAdmin(actor);

		this.moduleRegistryService.requireValidEnablement(request.enabledModules);

		return {
			enabledModules: request.enabledModules as TenantModuleKey[],
			kind: "assigned",
			tenantId: request.tenantId
		};
	}

	assignTemplate(
		actor: AssignmentActorContext,
		request: TemplateAssignmentRequest
	): TemplateAssignmentResult {
		this.requirePlatformAdmin(actor);

		if (
			request.currentTemplate &&
			!this.templateRegistryService.canReassign(
				request.currentTemplate,
				request.verticalTemplate
			)
		) {
			throw new ModuleTemplateAssignmentError("same-template");
		}

		this.templateRegistryService.getEntry(
			request.verticalTemplate
		);

		return {
			association: this.templateRegistryService.buildAssociation(
				request.tenantId,
				request.verticalTemplate,
				new Date().toISOString()
			),
			kind: "assigned"
		};
	}

	assignModulesWithTemplateCheck(
		actor: AssignmentActorContext,
		request: ModuleAssignmentRequest,
		templateKey: TenantVerticalTemplateKey
	): ModuleAssignmentResult {
		this.requirePlatformAdmin(actor);

		this.moduleRegistryService.requireValidEnablement(request.enabledModules);

		this.templateRegistryService.requireModuleCompatibility(
			templateKey,
			request.enabledModules as TenantModuleKey[]
		);

		return {
			enabledModules: request.enabledModules as TenantModuleKey[],
			kind: "assigned",
			tenantId: request.tenantId
		};
	}

	private requirePlatformAdmin(actor: AssignmentActorContext): void {
		if (
			actor.actorType !== "platform" ||
			(actor.platformRole !== "owner" && actor.platformRole !== "admin")
		) {
			throw new ModuleTemplateAssignmentError("not-authorized");
		}
	}
}
