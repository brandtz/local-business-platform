import { describe, expect, it } from "vitest";
import { LoyaltyCodeService } from "./loyalty-code.service";

describe("LoyaltyCodeService", () => {
	it("returns invalid by default for any code", () => {
		const service = new LoyaltyCodeService();
		const result = service.validate("tenant-1", "LOYALTY123");
		expect(result.status).toBe("invalid");
		expect(result.discount).toBeNull();
	});

	it("builds fixed discount", () => {
		const service = new LoyaltyCodeService();
		const discount = service.buildDiscount(500);
		expect(discount.type).toBe("fixed");
		expect(discount.valueCents).toBe(500);
		expect(discount.valuePercent).toBe(0);
	});
});
