import { Injectable } from "@nestjs/common";

import type {
	ActivationRollbackTrigger,
	DomainActivationRollbackResult,
	TenantCustomDomainRecord
} from "@platform/types";

import {
	DomainPromotionWorkflowService,
	type DomainPromotionWorkflowResult
} from "./domain-promotion-workflow.service";

// ── Domain Activation Rollback Service ───────────────────────────────────────
//
// Design-only stub for E8-S5-T3. Orchestrates automatic rollback when
// post-promotion validation fails. Delegates to DomainPromotionWorkflowService
// for state machine transitions.
//
// Rollback is triggered automatically when:
//   1. Post-promotion route validation fails
//   2. Post-promotion health check fails
//   3. Manual rollback is requested
//
// The rollback MUST restore the prior live configuration — the system must
// not leave a tenant in a broken state.

export type DomainActivationRollbackContext = {
	readonly domainRecord: TenantCustomDomainRecord;
	readonly trigger: ActivationRollbackTrigger;
	readonly reason: string;
};

@Injectable()
export class DomainActivationRollbackService {
	constructor(
		private readonly promotionWorkflow: DomainPromotionWorkflowService
	) {}

	/**
	 * Attempts to roll back a promoted domain to its prior safe state.
	 * This is a two-phase operation:
	 *   1. Initiate rollback (promoted → rollback-pending)
	 *   2. Complete rollback (rollback-pending → rolled-back)
	 *
	 * If any phase fails, the result reflects the failure with the trigger
	 * that caused it. The managed subdomain is always restored on success.
	 */
	rollback(
		context: DomainActivationRollbackContext
	): DomainActivationRollbackResult {
		const { domainRecord, trigger } = context;

		// Phase 1: Initiate rollback
		const initiateResult = this.tryInitiateRollback(domainRecord);

		if (!initiateResult.success) {
			return {
				kind: "rollback-failed",
				tenantId: domainRecord.tenantId,
				domainId: domainRecord.id,
				trigger,
				failureReason: initiateResult.failureReason
			};
		}

		// Phase 2: Complete rollback
		const rolledBackRecord: TenantCustomDomainRecord = {
			...domainRecord,
			promotionState: "rollback-pending"
		};

		const completeResult = this.tryCompleteRollback(rolledBackRecord);

		if (!completeResult.success) {
			return {
				kind: "rollback-failed",
				tenantId: domainRecord.tenantId,
				domainId: domainRecord.id,
				trigger,
				failureReason: completeResult.failureReason
			};
		}

		return {
			kind: "rolled-back",
			tenantId: domainRecord.tenantId,
			domainId: domainRecord.id,
			restoredState: "rolled-back",
			trigger
		};
	}

	/**
	 * Checks whether a domain record is in a state that supports rollback.
	 */
	canRollback(domainRecord: TenantCustomDomainRecord): boolean {
		return domainRecord.promotionState === "promoted";
	}

	private tryInitiateRollback(
		domainRecord: TenantCustomDomainRecord
	): { success: true } | { success: false; failureReason: string } {
		try {
			const result = this.promotionWorkflow.initiateRollback({
				domainRecord
			});

			if (result.kind === "rollback-initiated") {
				return { success: true };
			}

			return {
				success: false,
				failureReason: `Unexpected result kind: ${result.kind}`
			};
		} catch (error) {
			return {
				success: false,
				failureReason:
					error instanceof Error
						? error.message
						: "Unknown error during rollback initiation"
			};
		}
	}

	private tryCompleteRollback(
		domainRecord: TenantCustomDomainRecord
	): { success: true; result: DomainPromotionWorkflowResult } | { success: false; failureReason: string } {
		try {
			const result = this.promotionWorkflow.completeRollback({
				domainRecord
			});

			if (result.kind === "rolled-back") {
				return { success: true, result };
			}

			return {
				success: false,
				failureReason: `Unexpected result kind: ${result.kind}`
			};
		} catch (error) {
			return {
				success: false,
				failureReason:
					error instanceof Error
						? error.message
						: "Unknown error during rollback completion"
			};
		}
	}
}
