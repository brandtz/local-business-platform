// Tests for module-gated sidebar builder in main.ts

import { describe, expect, it } from "vitest";

import type { TenantModuleKey, TenantActorRole } from "@platform/types";
import { filterNavigationForContext } from "../module-navigation";

describe("sidebar navigation with module gating", () => {
	it("shows all sections for owner with all modules enabled", () => {
		const allModules: TenantModuleKey[] = [
			"catalog", "ordering", "bookings", "content", "operations", "portfolio", "loyalty", "quotes",
		];

		const entries = filterNavigationForContext({
			enabledModules: allModules,
			role: "owner" as TenantActorRole,
		});

		const labels = entries.map((e) => e.label);
		expect(labels).toContain("Dashboard");
		expect(labels).toContain("Catalog");
		expect(labels).toContain("Ordering");
		expect(labels).toContain("Bookings");
		expect(labels).toContain("Content");
		expect(labels).toContain("Settings");
	});

	it("hides bookings section when bookings module is disabled", () => {
		const modules: TenantModuleKey[] = ["catalog", "ordering", "content"];

		const entries = filterNavigationForContext({
			enabledModules: modules,
			role: "owner",
		});

		const labels = entries.map((e) => e.label);
		expect(labels).not.toContain("Bookings");
		expect(labels).toContain("Dashboard");
		expect(labels).toContain("Catalog");
	});

	it("hides ordering section when ordering module is disabled", () => {
		const modules: TenantModuleKey[] = ["catalog", "content"];

		const entries = filterNavigationForContext({
			enabledModules: modules,
			role: "owner",
		});

		const labels = entries.map((e) => e.label);
		expect(labels).not.toContain("Ordering");
	});

	it("staff role cannot see settings or users sections", () => {
		const allModules: TenantModuleKey[] = [
			"catalog", "ordering", "bookings", "content", "operations",
		];

		const entries = filterNavigationForContext({
			enabledModules: allModules,
			role: "staff",
		});

		const labels = entries.map((e) => e.label);
		expect(labels).not.toContain("Settings");
		expect(labels).not.toContain("Users");
		expect(labels).toContain("Dashboard");
	});

	it("admin role can see users but not settings", () => {
		const allModules: TenantModuleKey[] = [
			"catalog", "ordering", "bookings", "content", "operations",
		];

		const entries = filterNavigationForContext({
			enabledModules: allModules,
			role: "admin",
		});

		const labels = entries.map((e) => e.label);
		expect(labels).toContain("Users");
		expect(labels).not.toContain("Settings");
	});

	it("minimal tenant with no modules sees only dashboard and always-visible sections", () => {
		const entries = filterNavigationForContext({
			enabledModules: [],
			role: "owner",
		});

		const labels = entries.map((e) => e.label);
		expect(labels).toContain("Dashboard");
		expect(labels).not.toContain("Catalog");
		expect(labels).not.toContain("Ordering");
		expect(labels).not.toContain("Bookings");
	});
});
