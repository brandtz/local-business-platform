import { describe, expect, it } from "vitest";

import type { TenantModuleKey } from "@platform/types";

import {
	ModuleCapabilityError,
	ModuleCapabilityService,
	type ModuleCapabilityContext
} from "./module-capability.service";

function createContext(
	overrides: Partial<ModuleCapabilityContext> = {}
): ModuleCapabilityContext {
	return {
		enabledModules: ["catalog", "ordering", "content", "operations"],
		tenantId: "t-1",
		...overrides
	};
}

function createService(): ModuleCapabilityService {
	return new ModuleCapabilityService();
}

describe("ModuleCapabilityService", () => {
	describe("checkAccess", () => {
		it("allows access to an enabled module", () => {
			const service = createService();
			const result = service.checkAccess(createContext(), "catalog");

			expect(result.allowed).toBe(true);
			expect(result.moduleKey).toBe("catalog");
		});

		it("denies access to a disabled module", () => {
			const service = createService();
			const result = service.checkAccess(createContext(), "bookings");

			expect(result.allowed).toBe(false);
			if (!result.allowed) {
				expect(result.reason).toBe("module-disabled");
			}
		});

		it("denies access to an unknown module key", () => {
			const service = createService();
			const result = service.checkAccess(createContext(), "nonexistent");

			expect(result.allowed).toBe(false);
			if (!result.allowed) {
				expect(result.reason).toBe("unknown-module");
			}
		});

		it("checks against tenant-specific enablement", () => {
			const service = createService();
			const context = createContext({
				enabledModules: ["catalog", "bookings"],
				tenantId: "t-2"
			});

			expect(service.checkAccess(context, "bookings").allowed).toBe(true);
			expect(service.checkAccess(context, "ordering").allowed).toBe(false);
		});
	});

	describe("requireAccess", () => {
		it("does not throw for enabled module", () => {
			const service = createService();

			expect(() =>
				service.requireAccess(createContext(), "catalog")
			).not.toThrow();
		});

		it("throws ModuleCapabilityError for disabled module", () => {
			const service = createService();

			expect(() =>
				service.requireAccess(createContext(), "bookings")
			).toThrow(ModuleCapabilityError);

			try {
				service.requireAccess(createContext(), "bookings");
			} catch (error) {
				expect((error as ModuleCapabilityError).reason).toBe("module-disabled");
			}
		});

		it("throws ModuleCapabilityError for unknown module", () => {
			const service = createService();

			expect(() =>
				service.requireAccess(createContext(), "fake")
			).toThrow(ModuleCapabilityError);

			try {
				service.requireAccess(createContext(), "fake");
			} catch (error) {
				expect((error as ModuleCapabilityError).reason).toBe("unknown-module");
			}
		});
	});

	describe("requireAllAccess", () => {
		it("succeeds when all modules are enabled", () => {
			const service = createService();

			expect(() =>
				service.requireAllAccess(createContext(), ["catalog", "ordering"])
			).not.toThrow();
		});

		it("throws on first disabled module", () => {
			const service = createService();

			expect(() =>
				service.requireAllAccess(createContext(), ["catalog", "bookings"])
			).toThrow(ModuleCapabilityError);
		});
	});

	describe("buildCapabilityMap", () => {
		it("returns true for enabled modules and false for disabled", () => {
			const service = createService();
			const map = service.buildCapabilityMap(createContext());

			expect(map.catalog).toBe(true);
			expect(map.ordering).toBe(true);
			expect(map.content).toBe(true);
			expect(map.operations).toBe(true);
			expect(map.bookings).toBe(false);
		});

		it("returns all-false for empty enablement", () => {
			const service = createService();
			const map = service.buildCapabilityMap(
				createContext({ enabledModules: [] })
			);

			expect(map.catalog).toBe(false);
			expect(map.ordering).toBe(false);
			expect(map.bookings).toBe(false);
			expect(map.content).toBe(false);
			expect(map.operations).toBe(false);
		});

		it("capability map has entries for all module keys", () => {
			const service = createService();
			const map = service.buildCapabilityMap(createContext());
			const expectedKeys: TenantModuleKey[] = [
				"bookings",
				"catalog",
				"content",
				"operations",
				"ordering"
			];

			for (const key of expectedKeys) {
				expect(map).toHaveProperty(key);
				expect(typeof map[key]).toBe("boolean");
			}
		});
	});

	describe("getEnabledModules", () => {
		it("returns the enabled modules from context", () => {
			const service = createService();
			const context = createContext({
				enabledModules: ["catalog", "bookings"]
			});

			expect(service.getEnabledModules(context)).toEqual(["catalog", "bookings"]);
		});
	});

	describe("tenant isolation", () => {
		it("different tenants have independent capability checks", () => {
			const service = createService();
			const tenantA = createContext({
				enabledModules: ["catalog", "ordering"],
				tenantId: "t-a"
			});
			const tenantB = createContext({
				enabledModules: ["catalog", "bookings"],
				tenantId: "t-b"
			});

			expect(service.checkAccess(tenantA, "ordering").allowed).toBe(true);
			expect(service.checkAccess(tenantA, "bookings").allowed).toBe(false);
			expect(service.checkAccess(tenantB, "ordering").allowed).toBe(false);
			expect(service.checkAccess(tenantB, "bookings").allowed).toBe(true);
		});
	});
});
