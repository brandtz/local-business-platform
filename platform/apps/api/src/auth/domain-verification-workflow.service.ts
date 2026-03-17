import { Injectable } from "@nestjs/common";

import type {
	CustomDomainVerificationEvidence,
	CustomDomainVerificationState,
	TenantCustomDomainRecord
} from "@platform/types";

import {
	TenantCustomDomainPolicyError,
	TenantCustomDomainPolicyService,
	type TenantCustomDomainVerificationDecision
} from "./tenant-custom-domain-policy.service";

export type DomainVerificationCheckResult = {
	evidence: CustomDomainVerificationEvidence;
	passed: boolean;
};

export interface DomainVerificationCheckAdapter {
	check(hostname: string, tenantId: string): DomainVerificationCheckResult;
}

export type DomainVerificationWorkflowRequest = {
	domainRecord: TenantCustomDomainRecord;
};

export type DomainVerificationWorkflowResult =
	| {
		decision: TenantCustomDomainVerificationDecision;
		evidence: CustomDomainVerificationEvidence;
		kind: "verified";
		newState: "verified";
	  }
	| {
		decision: TenantCustomDomainVerificationDecision;
		evidence: CustomDomainVerificationEvidence;
		kind: "failed";
		newState: "failed";
	  }
	| {
		kind: "denied";
		decision: TenantCustomDomainVerificationDecision;
		newState: "denied";
	  }
	| {
		kind: "no-transition";
		reason: string;
	  };

export const domainVerificationWorkflowErrorReasons = [
	"hostname-mismatch",
	"tenant-mismatch"
] as const;

export type DomainVerificationWorkflowErrorReason =
	(typeof domainVerificationWorkflowErrorReasons)[number];

export class DomainVerificationWorkflowError extends Error {
	constructor(readonly reason: DomainVerificationWorkflowErrorReason) {
		super(
			reason === "hostname-mismatch"
				? "Domain record hostname does not match the expected hostname."
				: "Domain record tenant does not match the expected tenant."
		);
	}
}

@Injectable()
export class DomainVerificationWorkflowService {
	constructor(
		private readonly policyService: TenantCustomDomainPolicyService,
		private readonly checkAdapter: DomainVerificationCheckAdapter
	) {}

	verify(
		request: DomainVerificationWorkflowRequest
	): DomainVerificationWorkflowResult {
		const record = request.domainRecord;
		const currentState = record.verificationState;

		const targetState = this.resolveTargetState(currentState);

		if (!targetState) {
			return {
				kind: "no-transition",
				reason: `Verification not applicable from state: ${currentState}`
			};
		}

		const checkResult = this.checkAdapter.check(
			record.hostname,
			record.tenantId
		);

		const nextState: CustomDomainVerificationState = checkResult.passed
			? "verified"
			: "failed";

		if (nextState === currentState) {
			return {
				kind: "no-transition",
				reason: `Verification re-check produced same state: ${currentState}`
			};
		}

		const decision = this.policyService.requireVerificationTransition(
			currentState,
			nextState
		);

		if (nextState === "verified") {
			return {
				decision,
				evidence: checkResult.evidence,
				kind: "verified",
				newState: "verified"
			};
		}

		return {
			decision,
			evidence: checkResult.evidence,
			kind: "failed",
			newState: "failed"
		};
	}

	deny(
		request: DomainVerificationWorkflowRequest
	): DomainVerificationWorkflowResult {
		const record = request.domainRecord;
		const decision = this.policyService.requireVerificationTransition(
			record.verificationState,
			"denied"
		);

		return {
			decision,
			kind: "denied",
			newState: "denied"
		};
	}

	private resolveTargetState(
		currentState: CustomDomainVerificationState
	): "verified" | "failed" | null {
		if (currentState === "denied") {
			return null;
		}

		return "verified";
	}
}
