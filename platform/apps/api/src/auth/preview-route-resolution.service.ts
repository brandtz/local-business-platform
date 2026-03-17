import { Injectable } from "@nestjs/common";

import type { TenantResolutionTenantRecord } from "@platform/types";

import {
	normalizeRequestHost,
	resolveManagedSubdomain
} from "./tenant-request-host";

export type PreviewSurface = "storefront" | "admin";

export type PreviewRouteResolutionOptions = {
	managedPreviewAdminDomains?: readonly string[];
	managedPreviewStorefrontDomains?: readonly string[];
};

export type PreviewRouteResolutionRequest = {
	host: string | null | undefined;
	tenants: TenantResolutionTenantRecord[];
};

export type PreviewRouteResolutionResult =
	| {
		kind: "resolved";
		normalizedHost: string;
		previewSubdomain: string;
		surface: PreviewSurface;
		tenant: TenantResolutionTenantRecord;
	  }
	| {
		kind: "unresolved";
		normalizedHost: string | null;
		reason: PreviewRouteUnresolvedReason;
	  };

export type PreviewRouteUnresolvedReason =
	| "missing-host"
	| "no-matching-preview-domain"
	| "unknown-preview-subdomain";

@Injectable()
export class PreviewRouteResolutionService {
	constructor(private readonly options: PreviewRouteResolutionOptions = {}) {}

	resolvePreviewRoute(
		request: PreviewRouteResolutionRequest
	): PreviewRouteResolutionResult {
		const normalizedHost = normalizeRequestHost(request.host);

		if (!normalizedHost) {
			return {
				kind: "unresolved",
				normalizedHost: null,
				reason: "missing-host"
			};
		}

		const storefrontSubdomain = resolveManagedSubdomain(
			normalizedHost,
			this.options.managedPreviewStorefrontDomains || []
		);

		if (storefrontSubdomain) {
			return this.resolveSubdomainToTenant(
				request.tenants,
				storefrontSubdomain,
				"storefront",
				normalizedHost
			);
		}

		const adminSubdomain = resolveManagedSubdomain(
			normalizedHost,
			this.options.managedPreviewAdminDomains || []
		);

		if (adminSubdomain) {
			return this.resolveSubdomainToTenant(
				request.tenants,
				adminSubdomain,
				"admin",
				normalizedHost
			);
		}

		return {
			kind: "unresolved",
			normalizedHost,
			reason: "no-matching-preview-domain"
		};
	}

	private resolveSubdomainToTenant(
		tenants: TenantResolutionTenantRecord[],
		previewSubdomain: string,
		surface: PreviewSurface,
		normalizedHost: string
	): PreviewRouteResolutionResult {
		const tenant = tenants.find(
			(t) => t.previewSubdomain.toLowerCase() === previewSubdomain
		);

		if (tenant) {
			return {
				kind: "resolved",
				normalizedHost,
				previewSubdomain,
				surface,
				tenant
			};
		}

		return {
			kind: "unresolved",
			normalizedHost,
			reason: "unknown-preview-subdomain"
		};
	}
}
