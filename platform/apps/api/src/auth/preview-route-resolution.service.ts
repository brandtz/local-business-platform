import { Injectable } from "@nestjs/common";

import type {
	TenantResolutionTenantRecord,
	TenantStatus
} from "@platform/types";

import { canTenantAccessLifecycleMode } from "@platform/types";

import {
	normalizeRequestHost,
	resolveManagedSubdomain
} from "./tenant-request-host";

export type PreviewSurface = "storefront" | "admin";

export type PreviewRouteResolutionResult =
	| {
		kind: "resolved";
		normalizedHost: string;
		surface: PreviewSurface;
		tenant: TenantResolutionTenantRecord;
	  }
	| {
		kind: "unresolved";
		normalizedHost: string | null;
		reason: PreviewRouteUnresolvedReason;
	  };

export type PreviewRouteUnresolvedReason =
	| "unknown-host"
	| "no-matching-domain"
	| "tenant-not-found"
	| "tenant-lifecycle-denied";

export type PreviewRouteResolutionOptions = {
	managedStorefrontPreviewDomains?: readonly string[];
	managedAdminPreviewDomains?: readonly string[];
};

@Injectable()
export class PreviewRouteResolutionService {
	constructor(private readonly options: PreviewRouteResolutionOptions = {}) {}

	resolve(
		host: string | null | undefined,
		tenants: readonly TenantResolutionTenantRecord[]
	): PreviewRouteResolutionResult {
		const normalizedHost = normalizeRequestHost(host);

		if (!normalizedHost) {
			return {
				kind: "unresolved",
				normalizedHost: null,
				reason: "unknown-host"
			};
		}

		const storefrontSubdomain = resolveManagedSubdomain(
			normalizedHost,
			this.options.managedStorefrontPreviewDomains || []
		);

		if (storefrontSubdomain) {
			return this.resolvePreviewTenant(
				normalizedHost,
				storefrontSubdomain,
				"storefront",
				tenants
			);
		}

		const adminSubdomain = resolveManagedSubdomain(
			normalizedHost,
			this.options.managedAdminPreviewDomains || []
		);

		if (adminSubdomain) {
			return this.resolvePreviewTenant(
				normalizedHost,
				adminSubdomain,
				"admin",
				tenants
			);
		}

		return {
			kind: "unresolved",
			normalizedHost,
			reason: "no-matching-domain"
		};
	}

	private resolvePreviewTenant(
		normalizedHost: string,
		subdomain: string,
		surface: PreviewSurface,
		tenants: readonly TenantResolutionTenantRecord[]
	): PreviewRouteResolutionResult {
		const tenant = tenants.find(
			(t) => t.previewSubdomain.toLowerCase() === subdomain
		) || null;

		if (!tenant) {
			return {
				kind: "unresolved",
				normalizedHost,
				reason: "tenant-not-found"
			};
		}

		if (!this.isPreviewAccessAllowed(tenant.status)) {
			return {
				kind: "unresolved",
				normalizedHost,
				reason: "tenant-lifecycle-denied"
			};
		}

		return {
			kind: "resolved",
			normalizedHost,
			surface,
			tenant
		};
	}

	private isPreviewAccessAllowed(status: TenantStatus): boolean {
		return canTenantAccessLifecycleMode(status, "preview-routing");
	}
}
