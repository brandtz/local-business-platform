import { describe, expect, it } from "vitest";

import { InquiryLeadService } from "./inquiry-lead.service";

describe("InquiryLeadService", () => {
	const service = new InquiryLeadService();

	describe("validateCreate", () => {
		it("accepts valid input", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				name: "John Doe",
				email: "john@example.com",
			});
			expect(result.valid).toBe(true);
		});

		it("rejects empty name", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				name: "",
				email: "john@example.com",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({
					field: "name",
					reason: "empty",
				});
			}
		});

		it("rejects invalid email", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				name: "John",
				email: "not-an-email",
			});
			expect(result.valid).toBe(false);
			if (!result.valid) {
				expect(result.errors).toContainEqual({
					field: "email",
					reason: "invalid",
				});
			}
		});

		it("rejects empty email", () => {
			const result = service.validateCreate({
				tenantId: "t1",
				name: "John",
				email: "",
			});
			expect(result.valid).toBe(false);
		});
	});
});
