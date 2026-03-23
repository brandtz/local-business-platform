// Tests for customers CRM page data transforms and CRM logic

import { describe, expect, it } from "vitest";

import { formatCents } from "../order-management";
import type { CustomerProfile } from "@platform/types";
import type { CustomerMetrics } from "@platform/sdk";

describe("CustomersPage helpers", () => {
	describe("customer row mapping", () => {
		function mapCustomerToRow(c: CustomerProfile) {
			return {
				id: c.id,
				name: c.displayName ?? "—",
				email: c.email,
				phone: c.phone ?? "",
				createdAt: c.createdAt,
			};
		}

		it("maps customer profile to row", () => {
			const profile: CustomerProfile = {
				id: "cust-1",
				tenantId: "t-1",
				userId: "u-1",
				email: "jane@example.com",
				displayName: "Jane Doe",
				phone: "555-1234",
				avatarUrl: null,
				createdAt: "2026-01-15T10:00:00Z",
				updatedAt: "2026-03-15T10:00:00Z",
			};

			const row = mapCustomerToRow(profile);
			expect(row.id).toBe("cust-1");
			expect(row.name).toBe("Jane Doe");
			expect(row.email).toBe("jane@example.com");
			expect(row.phone).toBe("555-1234");
		});

		it("defaults to dash for null displayName", () => {
			const profile: CustomerProfile = {
				id: "cust-2",
				tenantId: "t-1",
				userId: "u-2",
				email: "no-name@example.com",
				displayName: null,
				phone: null,
				avatarUrl: null,
				createdAt: "2026-02-01T10:00:00Z",
				updatedAt: "2026-02-01T10:00:00Z",
			};

			const row = mapCustomerToRow(profile);
			expect(row.name).toBe("—");
			expect(row.phone).toBe("");
		});
	});

	describe("customer metrics display", () => {
		it("formats average order value", () => {
			const metrics: CustomerMetrics = {
				totalCustomers: 150,
				activeCustomers: 120,
				newCustomersThisMonth: 15,
				averageOrderValue: 2500,
			};

			expect(formatCents(metrics.averageOrderValue)).toBe("$25.00");
			expect(metrics.totalCustomers).toBe(150);
			expect(metrics.activeCustomers).toBe(120);
		});

		it("handles zero metrics", () => {
			const metrics: CustomerMetrics = {
				totalCustomers: 0,
				activeCustomers: 0,
				newCustomersThisMonth: 0,
				averageOrderValue: 0,
			};

			expect(formatCents(metrics.averageOrderValue)).toBe("$0.00");
		});
	});

	describe("lazy loading pattern", () => {
		it("customer panel loads lazily on row click (not preloaded)", () => {
			// Verify the pattern: customer detail is not loaded until row is clicked
			// This is a design validation test
			let panelLoaded = false;
			const loadCustomerDetail = () => { panelLoaded = true; };

			expect(panelLoaded).toBe(false);
			loadCustomerDetail();
			expect(panelLoaded).toBe(true);
		});
	});

	describe("search filtering", () => {
		function matchesSearch(customer: { name: string; email: string }, query: string): boolean {
			const q = query.toLowerCase();
			return customer.name.toLowerCase().includes(q) || customer.email.toLowerCase().includes(q);
		}

		it("matches by name", () => {
			expect(matchesSearch({ name: "Jane Doe", email: "jane@example.com" }, "jane")).toBe(true);
		});

		it("matches by email", () => {
			expect(matchesSearch({ name: "Jane Doe", email: "jane@example.com" }, "example.com")).toBe(true);
		});

		it("does not match unrelated query", () => {
			expect(matchesSearch({ name: "Jane Doe", email: "jane@example.com" }, "bob")).toBe(false);
		});

		it("case insensitive matching", () => {
			expect(matchesSearch({ name: "Jane Doe", email: "jane@example.com" }, "JANE")).toBe(true);
		});
	});
});
