import { describe, expect, it } from "vitest";

import { getCustomerNavLinks } from "./customer-layout";
import type { TenantFrontendContext } from "../tenant-bootstrap";

function createContext(overrides: Partial<TenantFrontendContext> = {}): TenantFrontendContext {
	return {
		tenantId: "t-001",
		displayName: "Test Store",
		slug: "test-store",
		status: "active",
		previewSubdomain: "test-store",
		templateKey: "restaurant-core",
		enabledModules: ["catalog", "ordering"],
		...overrides,
	};
}

describe("getCustomerNavLinks", () => {
	it("always includes Home and Menu links", () => {
		const links = getCustomerNavLinks(createContext());
		const labels = links.map((l) => l.label);

		expect(labels).toContain("Home");
		expect(labels).toContain("Menu");
	});

	it("includes Services link when bookings module is enabled", () => {
		const links = getCustomerNavLinks(createContext({
			enabledModules: ["catalog", "ordering", "bookings"],
		}));
		const labels = links.map((l) => l.label);

		expect(labels).toContain("Services");
	});

	it("does not include Services link when bookings module is disabled", () => {
		const links = getCustomerNavLinks(createContext({
			enabledModules: ["catalog", "ordering"],
		}));
		const labels = links.map((l) => l.label);

		expect(labels).not.toContain("Services");
	});

	it("Home link points to /", () => {
		const links = getCustomerNavLinks(createContext());
		const home = links.find((l) => l.label === "Home");

		expect(home?.to).toBe("/");
	});

	it("Menu link points to /menu", () => {
		const links = getCustomerNavLinks(createContext());
		const menu = links.find((l) => l.label === "Menu");

		expect(menu?.to).toBe("/menu");
	});

	it("Services link points to /services", () => {
		const links = getCustomerNavLinks(createContext({
			enabledModules: ["catalog", "bookings"],
		}));
		const services = links.find((l) => l.label === "Services");

		expect(services?.to).toBe("/services");
	});
});
