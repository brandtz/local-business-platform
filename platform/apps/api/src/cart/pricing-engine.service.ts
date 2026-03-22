import { Injectable } from "@nestjs/common";
import type {
	DiscountInput,
	PricingInput,
	PricingLineItemInput,
	PricingLineItemOutput,
	PricingQuote
} from "@platform/types";

// ---------------------------------------------------------------------------
// Pricing engine — deterministic, pure calculation service
// ---------------------------------------------------------------------------

@Injectable()
export class PricingEngineService {
	/**
	 * Compute a deterministic pricing quote from the given inputs.
	 * Identical inputs always produce identical outputs.
	 *
	 * Rounding rules:
	 *  - All intermediate values are kept as integers (cents).
	 *  - Percentage discounts are rounded down (Math.floor).
	 *  - Tax is rounded to nearest cent (Math.round).
	 *  - Tip percentages are applied to the post-tax subtotal, rounded (Math.round).
	 */
	computeQuote(input: PricingInput): PricingQuote {
		const lineItems = input.lineItems.map((li) =>
			this.computeLineItem(li)
		);

		const subtotalCents = lineItems.reduce(
			(sum, li) => sum + li.lineTotalCents,
			0
		);

		const discountCents = this.computeDiscount(
			input.discount,
			subtotalCents
		);

		const taxableAmount = Math.max(subtotalCents - discountCents, 0);
		const taxCents = this.computeTax(
			taxableAmount,
			input.taxPolicy.rateBasisPoints
		);

		const tipCents = this.computeTip(input.tip, subtotalCents);

		const deliveryFeeCents = input.deliveryFee
			? Math.max(input.deliveryFee.feeCents, 0)
			: 0;

		const totalCents =
			subtotalCents - discountCents + taxCents + tipCents + deliveryFeeCents;

		return {
			lineItems,
			subtotalCents,
			discountCents,
			taxCents,
			tipCents,
			deliveryFeeCents,
			totalCents: Math.max(totalCents, 0)
		};
	}

	// -----------------------------------------------------------------------
	// Line item calculation
	// -----------------------------------------------------------------------

	private computeLineItem(
		input: PricingLineItemInput
	): PricingLineItemOutput {
		const modifiersTotalCents = input.modifiers.reduce(
			(sum, m) => sum + m.priceCents,
			0
		);

		const unitPriceCents = input.currentPriceCents + modifiersTotalCents;
		const lineTotalCents = unitPriceCents * input.quantity;

		const isStalePrice = input.currentPriceCents !== input.addedPriceCents;

		return {
			cartItemId: input.cartItemId,
			catalogItemId: input.catalogItemId,
			itemName: "",
			quantity: input.quantity,
			unitPriceCents: input.currentPriceCents,
			modifiersTotalCents,
			lineTotalCents,
			isStalePrice
		};
	}

	// -----------------------------------------------------------------------
	// Discount calculation
	// -----------------------------------------------------------------------

	private computeDiscount(
		discount: DiscountInput | null,
		subtotalCents: number
	): number {
		if (!discount) return 0;

		if (discount.type === "percentage") {
			const raw = (subtotalCents * discount.valuePercent) / 100;
			return Math.min(Math.floor(raw), subtotalCents);
		}

		if (discount.type === "fixed") {
			return Math.min(
				Math.max(discount.valueCents, 0),
				subtotalCents
			);
		}

		return 0;
	}

	// -----------------------------------------------------------------------
	// Tax calculation
	// -----------------------------------------------------------------------

	private computeTax(
		taxableAmountCents: number,
		rateBasisPoints: number
	): number {
		if (rateBasisPoints <= 0) return 0;
		return Math.round((taxableAmountCents * rateBasisPoints) / 10000);
	}

	// -----------------------------------------------------------------------
	// Tip calculation
	// -----------------------------------------------------------------------

	private computeTip(
		tip: { type: "percentage" | "custom"; percentage: number; customAmountCents: number } | null,
		subtotalCents: number
	): number {
		if (!tip) return 0;

		if (tip.type === "percentage") {
			if (tip.percentage <= 0) return 0;
			return Math.round((subtotalCents * tip.percentage) / 100);
		}

		if (tip.type === "custom") {
			return Math.max(tip.customAmountCents, 0);
		}

		return 0;
	}
}
