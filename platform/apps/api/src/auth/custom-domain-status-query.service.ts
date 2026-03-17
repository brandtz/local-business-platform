import { Injectable } from "@nestjs/common";

import type {
	CustomDomainPromotionState,
	CustomDomainVerificationState,
	TenantCustomDomainRecord
} from "@platform/types";

export type CustomDomainStatusSummary = {
	hostname: string;
	id: string;
	promotionState: CustomDomainPromotionState;
	promotionFailureReason: string | null;
	tenantId: string;
	verificationState: CustomDomainVerificationState;
	verificationFailureReason: string | null;
};

export type TenantDomainStatusResult = {
	domains: readonly CustomDomainStatusSummary[];
	tenantId: string;
};

export type PlatformDomainStatusResult = {
	tenants: readonly TenantDomainStatusResult[];
};

export type CustomDomainStatusQueryRequest = {
	tenantId: string;
	domainRecords: readonly TenantCustomDomainRecord[];
};

export type PlatformDomainStatusQueryRequest = {
	tenants: readonly CustomDomainStatusQueryRequest[];
};

function toStatusSummary(
	record: TenantCustomDomainRecord
): CustomDomainStatusSummary {
	return {
		hostname: record.hostname,
		id: record.id,
		promotionFailureReason: record.promotionFailureReason ?? null,
		promotionState: record.promotionState,
		tenantId: record.tenantId,
		verificationFailureReason: record.verificationFailureReason ?? null,
		verificationState: record.verificationState
	};
}

@Injectable()
export class CustomDomainStatusQueryService {
	getTenantDomainStatus(
		request: CustomDomainStatusQueryRequest
	): TenantDomainStatusResult {
		const domains = request.domainRecords
			.filter((record) => record.tenantId === request.tenantId)
			.map(toStatusSummary);

		return {
			domains,
			tenantId: request.tenantId
		};
	}

	getPlatformDomainStatus(
		request: PlatformDomainStatusQueryRequest
	): PlatformDomainStatusResult {
		const tenants = request.tenants.map((tenant) =>
			this.getTenantDomainStatus(tenant)
		);

		return { tenants };
	}
}
