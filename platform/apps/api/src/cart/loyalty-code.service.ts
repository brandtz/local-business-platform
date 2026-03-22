import { Injectable } from "@nestjs/common";
import type {
	DiscountInput,
	LoyaltyCodeValidationResult
} from "@platform/types";

// ---------------------------------------------------------------------------
// Loyalty code validation service hook
// ---------------------------------------------------------------------------
// This service provides the interface for loyalty/reward code validation
// within the pricing pipeline. The actual loyalty program (points tracking,
// balance management, etc.) will be implemented in a future story. This
// service provides the hook point and contract.
// ---------------------------------------------------------------------------

@Injectable()
export class LoyaltyCodeService {
	/**
	 * Validate a loyalty code for a given tenant.
	 * Returns the validation status and, if valid, the discount to apply.
	 *
	 * Override this method or replace this service to integrate with
	 * a real loyalty program backend.
	 */
	validate(
		_tenantId: string,
		_code: string
	): LoyaltyCodeValidationResult {
		// Default implementation: all codes are invalid until a loyalty
		// program system is implemented.
		return {
			status: "invalid",
			discount: null
		};
	}

	/**
	 * Build a discount input from a validated loyalty code.
	 * Utility for downstream consumers.
	 */
	buildDiscount(
		valueCents: number
	): DiscountInput {
		return {
			code: "",
			type: "fixed",
			valueCents,
			valuePercent: 0
		};
	}
}
