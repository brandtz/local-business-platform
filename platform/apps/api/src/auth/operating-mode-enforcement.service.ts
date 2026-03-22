// E7-S6-T2: Operating mode enforcement — blocks disabled transaction flows
// at the API layer based on the tenant's resolved operating mode.
// If ordering module is off, cart and order APIs return descriptive errors.
// If booking module is off, booking APIs return descriptive errors.

import { Injectable } from "@nestjs/common";

import type {
	TenantModuleKey,
	TenantOperatingMode,
	TransactionFlow
} from "@platform/types";

import {
	resolveOperatingMode,
	isTransactionFlowAllowed,
	getOperatingModeRules,
	getBlockedFlows
} from "@platform/types";

// ── Error Messages ───────────────────────────────────────────────────────────

const flowDisplayNames: Record<TransactionFlow, string> = {
	cart: "Cart",
	order: "Order",
	booking: "Booking"
};

function buildFlowBlockedMessage(
	flow: TransactionFlow,
	mode: TenantOperatingMode
): string {
	return `${flowDisplayNames[flow]} operations are not available in ${mode} operating mode.`;
}

// ── Error Type ───────────────────────────────────────────────────────────────

export type OperatingModeErrorReason = "flow-disabled";

export class OperatingModeError extends Error {
	constructor(
		readonly reason: OperatingModeErrorReason,
		readonly flow: TransactionFlow,
		readonly mode: TenantOperatingMode
	) {
		super(buildFlowBlockedMessage(flow, mode));
	}
}

// ── Enforcement Context ──────────────────────────────────────────────────────

export type OperatingModeContext = {
	enabledModules: readonly TenantModuleKey[];
	tenantId: string;
};

// ── Check Result ─────────────────────────────────────────────────────────────

export type OperatingModeCheckResult =
	| { allowed: true; mode: TenantOperatingMode }
	| { allowed: false; mode: TenantOperatingMode; flow: TransactionFlow; message: string };

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class OperatingModeEnforcementService {
	/**
	 * Resolves the tenant's operating mode from enabled modules.
	 */
	resolveMode(context: OperatingModeContext): TenantOperatingMode {
		return resolveOperatingMode(context.enabledModules);
	}

	/**
	 * Checks whether a specific transaction flow is allowed for the tenant.
	 */
	checkFlow(
		context: OperatingModeContext,
		flow: TransactionFlow
	): OperatingModeCheckResult {
		const mode = resolveOperatingMode(context.enabledModules);

		if (!isTransactionFlowAllowed(mode, flow)) {
			return {
				allowed: false,
				mode,
				flow,
				message: buildFlowBlockedMessage(flow, mode)
			};
		}

		return { allowed: true, mode };
	}

	/**
	 * Throws OperatingModeError if the transaction flow is not allowed.
	 */
	requireFlow(
		context: OperatingModeContext,
		flow: TransactionFlow
	): void {
		const result = this.checkFlow(context, flow);

		if (!result.allowed) {
			throw new OperatingModeError("flow-disabled", flow, result.mode);
		}
	}

	/**
	 * Returns the rules for the tenant's resolved operating mode.
	 */
	getRules(context: OperatingModeContext) {
		const mode = resolveOperatingMode(context.enabledModules);
		return getOperatingModeRules(mode);
	}

	/**
	 * Returns the blocked flows for the tenant's resolved operating mode.
	 */
	getBlockedFlows(context: OperatingModeContext): readonly TransactionFlow[] {
		const mode = resolveOperatingMode(context.enabledModules);
		return getBlockedFlows(mode);
	}
}
