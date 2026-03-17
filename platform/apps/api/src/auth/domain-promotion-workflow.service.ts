import { Injectable } from "@nestjs/common";

import type {
	CustomDomainPromotionState,
	TenantCustomDomainRecord
} from "@platform/types";

import {
	TenantCustomDomainPolicyService,
	type TenantCustomDomainPromotionDecision
} from "./tenant-custom-domain-policy.service";

export type DomainPromotionWorkflowRequest = {
	domainRecord: TenantCustomDomainRecord;
};

export type DomainPromotionFailureRequest = {
	domainRecord: TenantCustomDomainRecord;
	reason: string;
};

export type DomainPromotionWorkflowResult =
	| {
		decision: TenantCustomDomainPromotionDecision;
		kind: "ready";
		newState: "ready";
	  }
	| {
		decision: TenantCustomDomainPromotionDecision;
		kind: "promoted";
		newState: "promoted";
	  }
	| {
		decision: TenantCustomDomainPromotionDecision;
		kind: "rollback-initiated";
		newState: "rollback-pending";
	  }
	| {
		decision: TenantCustomDomainPromotionDecision;
		kind: "rolled-back";
		newState: "rolled-back";
		restoreManagedSubdomain: true;
	  }
	| {
		decision: TenantCustomDomainPromotionDecision;
		kind: "failed";
		newState: "failed";
		reason: string;
		restoreManagedSubdomain: boolean;
	  }
	| {
		kind: "ineligible";
		reason: string;
	  };

@Injectable()
export class DomainPromotionWorkflowService {
	constructor(
		private readonly policyService: TenantCustomDomainPolicyService
	) {}

	requestReady(
		request: DomainPromotionWorkflowRequest
	): DomainPromotionWorkflowResult {
		const record = request.domainRecord;

		if (record.verificationState !== "verified") {
			return {
				kind: "ineligible",
				reason: `Domain must be verified before promotion; current verification state: ${record.verificationState}`
			};
		}

		const decision = this.policyService.requirePromotionTransition(
			record.promotionState,
			"ready"
		);

		return {
			decision,
			kind: "ready",
			newState: "ready"
		};
	}

	promote(
		request: DomainPromotionWorkflowRequest
	): DomainPromotionWorkflowResult {
		const record = request.domainRecord;

		if (record.verificationState !== "verified") {
			return {
				kind: "ineligible",
				reason: `Domain must be verified before promotion; current verification state: ${record.verificationState}`
			};
		}

		const decision = this.policyService.requirePromotionTransition(
			record.promotionState,
			"promoted"
		);

		return {
			decision,
			kind: "promoted",
			newState: "promoted"
		};
	}

	initiateRollback(
		request: DomainPromotionWorkflowRequest
	): DomainPromotionWorkflowResult {
		const decision = this.policyService.requirePromotionTransition(
			request.domainRecord.promotionState,
			"rollback-pending"
		);

		return {
			decision,
			kind: "rollback-initiated",
			newState: "rollback-pending"
		};
	}

	completeRollback(
		request: DomainPromotionWorkflowRequest
	): DomainPromotionWorkflowResult {
		const decision = this.policyService.requirePromotionTransition(
			request.domainRecord.promotionState,
			"rolled-back"
		);

		return {
			decision,
			kind: "rolled-back",
			newState: "rolled-back",
			restoreManagedSubdomain: true
		};
	}

	failPromotion(
		request: DomainPromotionFailureRequest
	): DomainPromotionWorkflowResult {
		const fromState = request.domainRecord.promotionState;

		const decision = this.policyService.requirePromotionTransition(
			fromState,
			"failed"
		);

		const restoreManagedSubdomain = fromState === "rollback-pending";

		return {
			decision,
			kind: "failed",
			newState: "failed",
			reason: request.reason,
			restoreManagedSubdomain
		};
	}

	private static readonly eligibleForPromotionFrom: ReadonlySet<CustomDomainPromotionState> =
		new Set(["not-requested", "rolled-back", "failed"]);

	canRequestReady(record: TenantCustomDomainRecord): boolean {
		return (
			record.verificationState === "verified" &&
			DomainPromotionWorkflowService.eligibleForPromotionFrom.has(
				record.promotionState
			)
		);
	}
}
