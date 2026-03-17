import { Injectable } from "@nestjs/common";

import type {
	CustomDomainPromotionState,
	CustomDomainVerificationState
} from "@platform/types";

import {
	getAllowedCustomDomainPromotionStates,
	getAllowedCustomDomainVerificationStates
} from "@platform/types";

const tenantCustomDomainPolicyErrorMessages = {
	"already-in-state": "Tenant custom domain transition denied because the domain is already in the requested state.",
	"invalid-promotion-transition": "Tenant custom domain promotion transition denied because the requested state change is not allowed.",
	"invalid-verification-transition": "Tenant custom domain verification transition denied because the requested state change is not allowed."
} as const;

export type TenantCustomDomainPolicyErrorReason =
	| "already-in-state"
	| "invalid-promotion-transition"
	| "invalid-verification-transition";

export class TenantCustomDomainPolicyError extends Error {
	constructor(readonly reason: TenantCustomDomainPolicyErrorReason) {
		super(tenantCustomDomainPolicyErrorMessages[reason]);
	}
}

export type TenantCustomDomainVerificationDecision = {
	from: CustomDomainVerificationState;
	to: CustomDomainVerificationState;
};

export type TenantCustomDomainPromotionDecision = {
	from: CustomDomainPromotionState;
	to: CustomDomainPromotionState;
};

@Injectable()
export class TenantCustomDomainPolicyService {
	getAllowedVerificationTransitions(
		state: CustomDomainVerificationState
	): readonly CustomDomainVerificationState[] {
		return getAllowedCustomDomainVerificationStates(state);
	}

	requireVerificationTransition(
		from: CustomDomainVerificationState,
		to: CustomDomainVerificationState
	): TenantCustomDomainVerificationDecision {
		if (from === to) {
			throw new TenantCustomDomainPolicyError("already-in-state");
		}

		if (!getAllowedCustomDomainVerificationStates(from).includes(to)) {
			throw new TenantCustomDomainPolicyError("invalid-verification-transition");
		}

		return {
			from,
			to
		};
	}

	getAllowedPromotionTransitions(
		state: CustomDomainPromotionState
	): readonly CustomDomainPromotionState[] {
		return getAllowedCustomDomainPromotionStates(state);
	}

	requirePromotionTransition(
		from: CustomDomainPromotionState,
		to: CustomDomainPromotionState
	): TenantCustomDomainPromotionDecision {
		if (from === to) {
			throw new TenantCustomDomainPolicyError("already-in-state");
		}

		if (!getAllowedCustomDomainPromotionStates(from).includes(to)) {
			throw new TenantCustomDomainPolicyError("invalid-promotion-transition");
		}

		return {
			from,
			to
		};
	}
}