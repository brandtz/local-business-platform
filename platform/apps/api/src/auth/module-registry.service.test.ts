import { describe, expect, it } from "vitest";

import {
	ModuleRegistryError,
	ModuleRegistryService
} from "./module-registry.service";

const service = new ModuleRegistryService();

describe("module registry service", () => {
	it("returns the full registry with metadata for every supported module key", () => {
		const registry = service.getRegistry();

		expect(registry).toHaveLength(5);
		expect(registry.map((entry) => entry.key)).toEqual([
			"catalog",
			"ordering",
			"bookings",
			"content",
			"operations"
		]);

		const ordering = service.getEntry("ordering");
		expect(ordering.displayName).toBe("Ordering");
		expect(ordering.category).toBe("commerce");
		expect(ordering.requiredDependencies).toEqual(["catalog"]);

		const bookings = service.getEntry("bookings");
		expect(bookings.category).toBe("scheduling");
		expect(bookings.requiredDependencies).toEqual(["catalog"]);

		const catalog = service.getEntry("catalog");
		expect(catalog.requiredDependencies).toEqual([]);
	});

	it("validates module keys and reports unknown modules", () => {
		expect(service.isValidKey("catalog")).toBe(true);
		expect(service.isValidKey("nonexistent")).toBe(false);

		expect(service.getDependencies("ordering")).toEqual(["catalog"]);
		expect(service.getDependencies("content")).toEqual([]);
	});

	it("accepts valid module enablement sets including all dependency-complete combinations", () => {
		expect(service.validateEnablement(["catalog"])).toEqual({ valid: true });

		expect(
			service.validateEnablement(["catalog", "ordering"])
		).toEqual({ valid: true });

		expect(
			service.validateEnablement(["catalog", "ordering", "bookings", "content", "operations"])
		).toEqual({ valid: true });

		expect(
			service.validateEnablement(["catalog", "bookings", "content", "operations"])
		).toEqual({ valid: true });

		expect(() =>
			service.requireValidEnablement(["catalog", "content", "operations"])
		).not.toThrow();
	});

	it("rejects enablement sets with missing dependencies", () => {
		const orderingWithoutCatalog = service.validateEnablement(["ordering", "content"]);
		expect(orderingWithoutCatalog).toEqual({
			valid: false,
			reason: "missing-dependency",
			module: "ordering",
			missingDependency: "catalog"
		});

		const bookingsWithoutCatalog = service.validateEnablement(["bookings"]);
		expect(bookingsWithoutCatalog).toEqual({
			valid: false,
			reason: "missing-dependency",
			module: "bookings",
			missingDependency: "catalog"
		});

		expect(() =>
			service.requireValidEnablement(["ordering"])
		).toThrow(ModuleRegistryError);

		try {
			service.requireValidEnablement(["ordering"]);
		} catch (error) {
			expect((error as ModuleRegistryError).reason).toBe("missing-dependency");
		}
	});

	it("rejects empty and unknown module sets", () => {
		expect(service.validateEnablement([])).toEqual({
			valid: false,
			reason: "empty-set"
		});

		expect(service.validateEnablement(["catalog", "nonexistent"])).toEqual({
			valid: false,
			reason: "unknown-module",
			invalidKey: "nonexistent"
		});

		expect(() =>
			service.requireValidEnablement([])
		).toThrow(ModuleRegistryError);

		try {
			service.requireValidEnablement([]);
		} catch (error) {
			expect((error as ModuleRegistryError).reason).toBe("empty-set");
		}
	});
});
