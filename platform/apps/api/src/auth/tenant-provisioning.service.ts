import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";

import type {
	PlatformActorRole,
	PreviewEnvironmentMetadataOptions,
	TenantProvisioningDefaults,
	TenantProvisioningRequest,
	TenantProvisioningResult,
	TenantResolutionTenantRecord
} from "@platform/types";

import { buildPreviewEnvironmentMetadata } from "@platform/types";

import { PlatformAccessService } from "./platform-access.service";
import { TenantProvisioningTemplateService } from "./tenant-provisioning-template.service";

export type TenantProvisioningActor = {
	actorType: "platform" | "tenant" | "customer" | null;
	platformRole: PlatformActorRole | null;
	userId: string | null;
};

export type TenantProvisioningOptions = {
	defaults?: Partial<TenantProvisioningDefaults>;
	now?: Date;
	previewEnvironment?: PreviewEnvironmentMetadataOptions;
	tenantIdFactory?: () => string;
};

const defaultProvisioningDefaults: TenantProvisioningDefaults = {
	brandPreset: "starter-brand",
	currency: "USD",
	navigationPreset: "service-default",
	operatingMode: "hybrid",
	taxMode: "exclusive",
	themePreset: "starter-light",
	timezone: "UTC"
};

@Injectable()
export class TenantProvisioningService {
	constructor(
		private readonly platformAccessService: PlatformAccessService,
		private readonly tenantProvisioningTemplateService: TenantProvisioningTemplateService
	) {}

	createTenant(
		actor: TenantProvisioningActor,
		request: TenantProvisioningRequest,
		options: TenantProvisioningOptions = {}
	): TenantProvisioningResult {
		this.platformAccessService.requirePlatformCapability({
			actorType: actor.actorType,
			capability: "tenants:write",
			platformRole: actor.platformRole,
			userId: actor.userId
		});

		const now = (options.now || new Date()).toISOString();
		const tenantId = options.tenantIdFactory ? options.tenantIdFactory() : randomUUID();
		const templateProfile = this.tenantProvisioningTemplateService.getTemplateProfile(
			request.verticalTemplate
		);
		const tenant: TenantResolutionTenantRecord = {
			displayName: request.displayName,
			id: tenantId,
			previewSubdomain: request.previewSubdomain,
			slug: request.slug,
			status: "draft"
		};

		return {
			defaultConfiguration: {
				...defaultProvisioningDefaults,
				...templateProfile.configurationDefaults,
				...options.defaults
			},
			enabledModules: [...templateProfile.enabledModules],
			ownerMembership: {
				isPrimary: true,
				joinedAt: now,
				role: "owner",
				tenant: {
					displayName: tenant.displayName,
					id: tenant.id,
					slug: tenant.slug,
					status: tenant.status
				},
				userId: request.owner.id
			},
			previewMetadata: buildPreviewEnvironmentMetadata(
				tenantId,
				request.previewSubdomain,
				options.previewEnvironment
			),
			tenant,
			verticalTemplate: templateProfile.verticalTemplate
		};
	}
}