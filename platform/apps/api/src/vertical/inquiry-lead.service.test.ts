import { describe, expect, it } from "vitest";

import { InquiryLeadService, InquiryLeadError } from "./inquiry-lead.service";

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

	describe("getFormConfig", () => {
		it("returns enabled config for contractor", () => {
			const config = service.getFormConfig("contractor");
			expect(config.enabled).toBe(true);
			expect(config.heading).toBe("Request a Free Estimate");
			expect(config.submitLabel).toBe("Submit Inquiry");
			expect(config.fields.length).toBeGreaterThan(0);
		});

		it("returns disabled config for restaurant", () => {
			const config = service.getFormConfig("restaurant");
			expect(config.enabled).toBe(false);
			expect(config.fields).toHaveLength(0);
		});

		it("returns disabled config for retail", () => {
			const config = service.getFormConfig("retail");
			expect(config.enabled).toBe(false);
		});

		it("returns disabled config for appointment", () => {
			const config = service.getFormConfig("appointment");
			expect(config.enabled).toBe(false);
		});
	});

	describe("isInquiryEnabled", () => {
		it("returns true for contractor", () => {
			expect(service.isInquiryEnabled("contractor")).toBe(true);
		});

		it("returns false for restaurant", () => {
			expect(service.isInquiryEnabled("restaurant")).toBe(false);
		});

		it("returns false for retail", () => {
			expect(service.isInquiryEnabled("retail")).toBe(false);
		});
	});

	describe("validateCreateForVertical", () => {
		it("validates successfully for contractor with valid input", () => {
			const result = service.validateCreateForVertical(
				{
					tenantId: "t1",
					name: "John Doe",
					email: "john@example.com",
					phone: "555-0100",
					message: "Need a roof repair",
					serviceInterest: "Roofing",
				},
				"contractor"
			);
			expect(result.valid).toBe(true);
		});

		it("throws for non-inquiry vertical", () => {
			expect(() =>
				service.validateCreateForVertical(
					{
						tenantId: "t1",
						name: "John",
						email: "john@example.com",
					},
					"restaurant"
				)
			).toThrow(InquiryLeadError);
		});

		it("throws with inquiry-disabled reason", () => {
			try {
				service.validateCreateForVertical(
					{
						tenantId: "t1",
						name: "John",
						email: "john@example.com",
					},
					"retail"
				);
			} catch (e) {
				expect(e).toBeInstanceOf(InquiryLeadError);
				expect((e as InquiryLeadError).reason).toBe("inquiry-disabled");
			}
		});

		it("returns validation errors for contractor with invalid input", () => {
			const result = service.validateCreateForVertical(
				{
					tenantId: "t1",
					name: "",
					email: "not-valid",
				},
				"contractor"
			);
			expect(result.valid).toBe(false);
		});
	});
});
