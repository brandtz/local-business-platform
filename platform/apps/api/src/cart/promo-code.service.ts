import { Injectable } from "@nestjs/common";
import type {
	DiscountInput,
	PromoCodeValidationResult
} from "@platform/types";

// ---------------------------------------------------------------------------
// Promo code validation service hook
// ---------------------------------------------------------------------------
// This service provides the interface for promo code validation within the
// pricing pipeline. The actual promo code storage and management (database
// of promo codes, usage tracking, etc.) will be implemented in a future
// story. This service provides the hook point and contract.
// ---------------------------------------------------------------------------

@Injectable()
export class PromoCodeService {
	/**
	 * Validate a promo code for a given tenant.
	 * Returns the validation status and, if valid, the discount to apply.
	 *
	 * Override this method or replace this service to integrate with
	 * a real promo code backend.
	 */
	validate(
		_tenantId: string,
		_code: string
	): PromoCodeValidationResult {
		// Default implementation: all codes are invalid until a promo code
		// management system is implemented.
		return {
			status: "invalid",
			discount: null
		};
	}

	/**
	 * Build a discount input from a validated promo code.
	 * Utility for downstream consumers.
	 */
	buildDiscount(
		type: "percentage" | "fixed",
		value: number
	): DiscountInput {
		return {
			code: "",
			type,
			valueCents: type === "fixed" ? value : 0,
			valuePercent: type === "percentage" ? value : 0
		};
	}
}
