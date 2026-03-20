import { describe, expect, it } from "vitest";

import type { ServiceRecord } from "@platform/types";

import { ServiceManagementService } from "./service-management.service";

const service = new ServiceManagementService();

const tenantId = "tenant-1";

const services: ServiceRecord[] = [
	{
		id: "svc-1", tenantId, name: "Haircut", slug: "haircut",
		description: "Standard haircut", durationMinutes: 30, price: 2500,
		status: "active", isBookable: true, bufferMinutes: 10,
		maxAdvanceDays: 30, minAdvanceHours: 2, sortOrder: 0
	},
	{
		id: "svc-2", tenantId, name: "Color Treatment", slug: "color-treatment",
		description: "Full color service", durationMinutes: 90, price: 8500,
		status: "active", isBookable: true, bufferMinutes: 15,
		maxAdvanceDays: 14, minAdvanceHours: 24, sortOrder: 1
	},
	{
		id: "svc-3", tenantId, name: "Consultation", slug: "consultation",
		description: null, durationMinutes: 15, price: 0,
		status: "inactive", isBookable: false, bufferMinutes: 0,
		maxAdvanceDays: 7, minAdvanceHours: 1, sortOrder: 2
	},
];

describe("service management service", () => {
	describe("validateCreate", () => {
		it("accepts valid service input with unique slug", () => {
			const result = service.validateCreate(
				{
					name: "Beard Trim", slug: "beard-trim", price: 1500,
					durationMinutes: 15, bufferMinutes: 5, maxAdvanceDays: 30,
					minAdvanceHours: 1, isBookable: true, tenantId
				},
				["haircut"]
			);
			expect(result).toEqual({ valid: true });
		});

		it("rejects empty name", () => {
			const result = service.validateCreate(
				{
					name: "", slug: "trim", price: 1500,
					durationMinutes: 15, bufferMinutes: 5, maxAdvanceDays: 30,
					minAdvanceHours: 1, isBookable: true, tenantId
				},
				[]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects duplicate slug", () => {
			const result = service.validateCreate(
				{
					name: "Haircut 2", slug: "haircut", price: 1500,
					durationMinutes: 15, bufferMinutes: 5, maxAdvanceDays: 30,
					minAdvanceHours: 1, isBookable: true, tenantId
				},
				["haircut"]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects non-positive duration", () => {
			const result = service.validateCreate(
				{
					name: "Bad Service", slug: "bad", price: 100,
					durationMinutes: 0, bufferMinutes: 5, maxAdvanceDays: 30,
					minAdvanceHours: 1, isBookable: true, tenantId
				},
				[]
			);
			expect(result.valid).toBe(false);
		});

		it("rejects negative price", () => {
			const result = service.validateCreate(
				{
					name: "Bad Price", slug: "bad-price", price: -100,
					durationMinutes: 30, bufferMinutes: 5, maxAdvanceDays: 30,
					minAdvanceHours: 1, isBookable: true, tenantId
				},
				[]
			);
			expect(result.valid).toBe(false);
		});
	});

	describe("filterServices", () => {
		it("filters by tenant", () => {
			const otherTenant = { ...services[0], id: "svc-other", tenantId: "tenant-2" };
			const result = service.filterServices([...services, otherTenant], tenantId);
			expect(result).toHaveLength(3);
		});

		it("filters by status", () => {
			const result = service.filterServices(services, tenantId, { status: "active" });
			expect(result).toHaveLength(2);
		});

		it("filters by bookable", () => {
			const result = service.filterServices(services, tenantId, { isBookable: true });
			expect(result).toHaveLength(2);
		});

		it("filters by search term", () => {
			const result = service.filterServices(services, tenantId, { search: "color" });
			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("svc-2");
		});

		it("returns sorted by sortOrder", () => {
			const result = service.filterServices(services, tenantId);
			expect(result.map((s) => s.id)).toEqual(["svc-1", "svc-2", "svc-3"]);
		});
	});

	describe("assembleStorefrontListings", () => {
		it("returns only active bookable services", () => {
			const result = service.assembleStorefrontListings(services, tenantId);
			expect(result).toHaveLength(2);
			expect(result[0].name).toBe("Haircut");
			expect(result[1].name).toBe("Color Treatment");
		});

		it("excludes inactive and non-bookable services", () => {
			const result = service.assembleStorefrontListings(services, tenantId);
			expect(result.map((s) => s.id)).not.toContain("svc-3");
		});

		it("returns correct storefront shape without internal fields", () => {
			const result = service.assembleStorefrontListings(services, tenantId);
			const keys = Object.keys(result[0]);
			expect(keys).not.toContain("status");
			expect(keys).not.toContain("isBookable");
			expect(keys).not.toContain("tenantId");
		});
	});

	describe("isEligibleForBooking", () => {
		it("returns true for active bookable service", () => {
			expect(service.isEligibleForBooking(services[0])).toBe(true);
		});

		it("returns false for inactive service", () => {
			expect(service.isEligibleForBooking(services[2])).toBe(false);
		});

		it("returns false for active but non-bookable service", () => {
			const nonBookable = { ...services[0], isBookable: false };
			expect(service.isEligibleForBooking(nonBookable)).toBe(false);
		});
	});

	describe("computeSortOrder", () => {
		it("returns 0 for empty list", () => {
			expect(service.computeSortOrder([])).toBe(0);
		});

		it("returns max + 1", () => {
			expect(service.computeSortOrder(services)).toBe(3);
		});
	});
});
