import { Injectable } from "@nestjs/common";

import type { TenantResolutionTenantRecord } from "@platform/types";

import { canTenantAccessLifecycleMode } from "@platform/types";

import {
	normalizeRequestHost,
	resolveManagedSubdomain
} from "./tenant-request-host";

export const previewSurfaces = ["storefront", "admin"] as const;

export type PreviewSurface = (typeof previewSurfaces)[number];

export const previewRouteUnresolvedReasons = [
	"no-host",
	"no-matching-domain",
	"tenant-not-found",
	"tenant-not-accessible"
] as const;

export type PreviewRouteUnresolvedReason =
	(typeof previewRouteUnresolvedReasons)[number];

export type PreviewRouteResolutionRequest = {
	host: string | null | undefined;
	tenants: TenantResolutionTenantRecord[];
};

export type PreviewRouteResolutionResult =
	| {
		kind: "resolved";
		normalizedHost: string;
		subdomain: string;
		surface: PreviewSurface;
		tenant: TenantResolutionTenantRecord;
	  }
	| {
		kind: "unresolved";
		normalizedHost: string | null;
		reason: PreviewRouteUnresolvedReason;
	  };

export type PreviewRouteResolutionOptions = {
	managedPreviewAdminDomains?: readonly string[];
	managedPreviewStorefrontDomains?: readonly string[];
};

@Injectable()
export class PreviewRouteResolutionService {
	constructor(
		private readonly options: PreviewRouteResolutionOptions = {}
	) {}

	resolve(request: PreviewRouteResolutionRequest): PreviewRouteResolutionResult {
		const normalizedHost = normalizeRequestHost(request.host);

		if (!normalizedHost) {
			return {
				kind: "unresolved",
				normalizedHost: null,
				reason: "no-host"
			};
		}

		const adminMatch = this.resolvePreviewSubdomain(
			normalizedHost,
			this.options.managedPreviewAdminDomains || []
		);

		if (adminMatch) {
			return this.resolveForSurface(
				normalizedHost,
				adminMatch,
				"admin",
				request.tenants
			);
		}

		const storefrontMatch = this.resolvePreviewSubdomain(
			normalizedHost,
			this.options.managedPreviewStorefrontDomains || []
		);

		if (storefrontMatch) {
			return this.resolveForSurface(
				normalizedHost,
				storefrontMatch,
				"storefront",
				request.tenants
			);
		}

		return {
			kind: "unresolved",
			normalizedHost,
			reason: "no-matching-domain"
		};
	}

	private resolvePreviewSubdomain(
		host: string,
		domains: readonly string[]
	): string | null {
		return resolveManagedSubdomain(host, domains);
	}

	private resolveForSurface(
		normalizedHost: string,
		subdomain: string,
		surface: PreviewSurface,
		tenants: TenantResolutionTenantRecord[]
	): PreviewRouteResolutionResult {
		const tenant = this.findTenantByPreviewSubdomain(tenants, subdomain);

		if (!tenant) {
			return {
				kind: "unresolved",
				normalizedHost,
				reason: "tenant-not-found"
			};
		}

		if (!canTenantAccessLifecycleMode(tenant.status, "preview-routing")) {
			return {
				kind: "unresolved",
				normalizedHost,
				reason: "tenant-not-accessible"
			};
		}

		return {
			kind: "resolved",
			normalizedHost,
			subdomain,
			surface,
			tenant
		};
	}

	private findTenantByPreviewSubdomain(
		tenants: TenantResolutionTenantRecord[],
		previewSubdomain: string
	): TenantResolutionTenantRecord | null {
		return (
			tenants.find(
				(tenant) => tenant.previewSubdomain.toLowerCase() === previewSubdomain
			) || null
		);
	}
}
