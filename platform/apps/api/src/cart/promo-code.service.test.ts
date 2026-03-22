import { describe, expect, it } from "vitest";
import { PromoCodeService } from "./promo-code.service";

describe("PromoCodeService", () => {
	it("returns invalid by default for any code", () => {
		const service = new PromoCodeService();
		const result = service.validate("tenant-1", "SAVE10");
		expect(result.status).toBe("invalid");
		expect(result.discount).toBeNull();
	});

	it("builds percentage discount", () => {
		const service = new PromoCodeService();
		const discount = service.buildDiscount("percentage", 10);
		expect(discount.type).toBe("percentage");
		expect(discount.valuePercent).toBe(10);
		expect(discount.valueCents).toBe(0);
	});

	it("builds fixed discount", () => {
		const service = new PromoCodeService();
		const discount = service.buildDiscount("fixed", 500);
		expect(discount.type).toBe("fixed");
		expect(discount.valueCents).toBe(500);
		expect(discount.valuePercent).toBe(0);
	});
});
