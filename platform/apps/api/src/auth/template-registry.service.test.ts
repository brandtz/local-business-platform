import { describe, expect, it } from "vitest";

import { tenantVerticalTemplateKeys } from "@platform/types";

import { ModuleRegistryService } from "./module-registry.service";
import {
	TemplateRegistryError,
	TemplateRegistryService,
	type TemplateModuleCompatibilityResult,
	type TemplateRegistryEntry
} from "./template-registry.service";

function createService(): TemplateRegistryService {
	return new TemplateRegistryService(new ModuleRegistryService());
}

describe("TemplateRegistryService", () => {
	describe("registry shape stability", () => {
		it("contains an entry for every vertical template key", () => {
			const service = createService();
			const entries = service.getAllEntries();

			expect(entries).toHaveLength(tenantVerticalTemplateKeys.length);

			for (const key of tenantVerticalTemplateKeys) {
				const entry = service.getEntry(key);
				expect(entry.verticalTemplate).toBe(key);
			}
		});

		it("every entry has display metadata", () => {
			const service = createService();

			for (const key of tenantVerticalTemplateKeys) {
				const entry = service.getEntry(key);
				expect(entry.metadata.displayName).toBeTruthy();
				expect(entry.metadata.description).toBeTruthy();
				expect(entry.metadata.icon).toBeTruthy();
				expect(entry.metadata.verticalTemplate).toBe(key);
			}
		});

		it("every entry declares required modules", () => {
			const service = createService();

			for (const key of tenantVerticalTemplateKeys) {
				const entry = service.getEntry(key);
				expect(entry.requiredModules.length).toBeGreaterThan(0);
			}
		});

		it("entry shape has all required fields", () => {
			const service = createService();
			const entry = service.getEntry("restaurant-core");
			const expectedKeys: (keyof TemplateRegistryEntry)[] = [
				"configurationDefaults",
				"metadata",
				"requiredModules",
				"verticalTemplate"
			];

			for (const key of expectedKeys) {
				expect(entry).toHaveProperty(key);
			}
		});

		it("getAllTemplateKeys matches the constant", () => {
			const service = createService();
			expect(service.getAllTemplateKeys()).toEqual(tenantVerticalTemplateKeys);
		});
	});

	describe("template-module compatibility", () => {
		it("restaurant-core is compatible with its required modules", () => {
			const service = createService();
			const result = service.checkModuleCompatibility(
				"restaurant-core",
				["catalog", "ordering", "content", "operations"]
			);

			expect(result.compatible).toBe(true);
		});

		it("restaurant-core is compatible when extra modules are present", () => {
			const service = createService();
			const result = service.checkModuleCompatibility(
				"restaurant-core",
				["catalog", "ordering", "content", "operations", "bookings"]
			);

			expect(result.compatible).toBe(true);
		});

		it("restaurant-core is incompatible when required modules are missing", () => {
			const service = createService();
			const result = service.checkModuleCompatibility(
				"restaurant-core",
				["catalog", "content"]
			);

			expect(result.compatible).toBe(false);
			const failed = result as Extract<TemplateModuleCompatibilityResult, { compatible: false }>;
			expect(failed.missingModules).toContain("ordering");
			expect(failed.missingModules).toContain("operations");
		});

		it("services-core requires bookings instead of ordering", () => {
			const service = createService();
			const result = service.checkModuleCompatibility(
				"services-core",
				["catalog", "ordering", "content", "operations"]
			);

			expect(result.compatible).toBe(false);
			const failed = result as Extract<TemplateModuleCompatibilityResult, { compatible: false }>;
			expect(failed.missingModules).toContain("bookings");
		});

		it("hybrid-local-business requires all modules", () => {
			const service = createService();
			const result = service.checkModuleCompatibility(
				"hybrid-local-business",
				["catalog", "ordering", "bookings", "content", "operations"]
			);

			expect(result.compatible).toBe(true);
		});

		it("requireModuleCompatibility throws for incompatible set", () => {
			const service = createService();

			expect(() =>
				service.requireModuleCompatibility("restaurant-core", ["catalog"])
			).toThrow(TemplateRegistryError);
		});

		it("requireModuleCompatibility throws for invalid module keys", () => {
			const service = createService();

			expect(() =>
				service.requireModuleCompatibility(
					"restaurant-core",
					["catalog", "ordering", "content", "operations", "unknown" as never]
				)
			).toThrow(TemplateRegistryError);
		});

		it("requireModuleCompatibility succeeds for valid compatible set", () => {
			const service = createService();

			expect(() =>
				service.requireModuleCompatibility(
					"restaurant-core",
					["catalog", "ordering", "content", "operations"]
				)
			).not.toThrow();
		});
	});

	describe("tenant-template association", () => {
		it("builds association with correct shape", () => {
			const service = createService();
			const association = service.buildAssociation(
				"t-1",
				"restaurant-core",
				"2026-01-15T10:00:00Z"
			);

			expect(association.tenantId).toBe("t-1");
			expect(association.verticalTemplate).toBe("restaurant-core");
			expect(association.assignedAt).toBe("2026-01-15T10:00:00Z");
		});

		it("canReassign returns true for different templates", () => {
			const service = createService();
			expect(service.canReassign("restaurant-core", "services-core")).toBe(true);
		});

		it("canReassign returns false for same template", () => {
			const service = createService();
			expect(service.canReassign("restaurant-core", "restaurant-core")).toBe(false);
		});
	});
});
