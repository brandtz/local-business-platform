import { Injectable } from "@nestjs/common";

import type {
	TenantResolutionRequest,
	TenantResolutionResult,
	TenantResolutionTenantRecord
} from "@platform/types";

import {
	normalizeRequestHost,
	resolveManagedSubdomain
} from "./tenant-request-host";

export type TenantResolutionServiceOptions = {
	managedPreviewDomains?: readonly string[];
	platformAdminDomains?: readonly string[];
};

@Injectable()
export class TenantResolutionService {
	constructor(private readonly options: TenantResolutionServiceOptions = {}) {}

	resolveTenant(request: TenantResolutionRequest): TenantResolutionResult {
		const normalizedHost = normalizeRequestHost(request.host);

		if (normalizedHost && this.isPlatformAdminHost(normalizedHost)) {
			return {
				kind: "platform-admin",
				normalizedHost,
				source: "platform-admin-domain"
			};
		}

		if (request.routeSpace === "platform-admin") {
			return {
				kind: "unresolved",
				normalizedHost,
				source: "unresolved"
			};
		}

		if (request.routeSpace === "tenant-admin" && request.adminTenantId) {
			const adminTenant = this.findTenantById(request.tenants, request.adminTenantId);

			if (adminTenant) {
				return {
					kind: "tenant",
					normalizedHost,
					source: "tenant-admin-context",
					tenant: adminTenant
				};
			}
		}

		if (normalizedHost) {
			const customDomainTenant = this.findTenantByCustomDomain(
				request.tenants,
				normalizedHost
			);

			if (customDomainTenant) {
				return {
					kind: "tenant",
					normalizedHost,
					source: "custom-domain",
					tenant: customDomainTenant
				};
			}

			const previewSubdomain = resolveManagedSubdomain(
				normalizedHost,
				this.options.managedPreviewDomains || []
			);

			if (previewSubdomain) {
				const previewTenant = this.findTenantByPreviewSubdomain(
					request.tenants,
					previewSubdomain
				);

				if (previewTenant) {
					return {
						kind: "tenant",
						normalizedHost,
						source: "preview-subdomain",
						tenant: previewTenant
					};
				}
			}
		}

		return {
			kind: "unresolved",
			normalizedHost,
			source: "unresolved"
		};
	}

	private findTenantByCustomDomain(
		tenants: TenantResolutionTenantRecord[],
		host: string
	): TenantResolutionTenantRecord | null {
		return (
			tenants.find((tenant) =>
				tenant.customDomains?.some(
					(customDomain) => normalizeRequestHost(customDomain) === host
				) || false
			) || null
		);
	}

	private findTenantById(
		tenants: TenantResolutionTenantRecord[],
		tenantId: string
	): TenantResolutionTenantRecord | null {
		return tenants.find((tenant) => tenant.id === tenantId) || null;
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

	private isPlatformAdminHost(host: string): boolean {
		return (this.options.platformAdminDomains || []).some(
			(platformAdminDomain) => normalizeRequestHost(platformAdminDomain) === host
		);
	}
}