import { Injectable } from "@nestjs/common";

import type { TenantResolutionTenantRecord } from "@platform/types";

import {
	normalizeRequestHost,
	resolveManagedSubdomain
} from "./tenant-request-host";

export type PreviewSurface = "storefront" | "admin";

export type PreviewRouteResolutionInput = {
	host: string | null | undefined;
	tenants: readonly TenantResolutionTenantRecord[];
};

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
			reason: "no-host" | "no-matching-domain" | "no-matching-tenant";
	  };

export type PreviewRouteResolutionOptions = {
	managedAdminPreviewDomains?: readonly string[];
	managedStorefrontPreviewDomains?: readonly string[];
};

@Injectable()
export class PreviewRouteResolutionService {
	constructor(private readonly options: PreviewRouteResolutionOptions = {}) {}

	resolve(input: PreviewRouteResolutionInput): PreviewRouteResolutionResult {
		const normalizedHost = normalizeRequestHost(input.host);

		if (!normalizedHost) {
			return {
				kind: "unresolved",
				normalizedHost: null,
				reason: "no-host"
			};
		}

		const storefrontMatch = this.resolveForSurface(
			normalizedHost,
			input.tenants,
			"storefront"
		);

		if (storefrontMatch) {
			return storefrontMatch;
		}

		const adminMatch = this.resolveForSurface(
			normalizedHost,
			input.tenants,
			"admin"
		);

		if (adminMatch) {
			return adminMatch;
		}

		return {
			kind: "unresolved",
			normalizedHost,
			reason: "no-matching-domain"
		};
	}

	private resolveForSurface(
		normalizedHost: string,
		tenants: readonly TenantResolutionTenantRecord[],
		surface: PreviewSurface
	): PreviewRouteResolutionResult | null {
		const domains =
			surface === "storefront"
				? this.options.managedStorefrontPreviewDomains || []
				: this.options.managedAdminPreviewDomains || [];

		const subdomain = resolveManagedSubdomain(normalizedHost, domains);

		if (!subdomain) {
			return null;
		}

		const tenant = this.findTenantByPreviewSubdomain(tenants, subdomain);

		if (!tenant) {
			return {
				kind: "unresolved",
				normalizedHost,
				reason: "no-matching-tenant"
			};
		}

		return {
			kind: "resolved",
			normalizedHost,
			surface,
			tenant
		};
	}

	private findTenantByPreviewSubdomain(
		tenants: readonly TenantResolutionTenantRecord[],
		previewSubdomain: string
	): TenantResolutionTenantRecord | null {
		return (
			tenants.find(
				(tenant) => tenant.previewSubdomain.toLowerCase() === previewSubdomain.toLowerCase()
			) || null
		);
	}
}
