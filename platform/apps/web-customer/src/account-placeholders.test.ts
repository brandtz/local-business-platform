import { describe, it, expect, beforeEach } from "vitest";

import type { TenantFrontendContext } from "./tenant-bootstrap";
import {
	accountSections,
	checkSectionAvailability,
	getAvailableSections,
	createPlaceholderPage,
	createAllPlaceholderPages,
	registerAccountMountPoint,
	getAccountMountPoint,
	getRegisteredMountPointKeys,
	clearAccountMountPoints,
	type OrdersMountPoint,
	type BookingsMountPoint,
	type LoyaltyMountPoint,
	type PreferencesMountPoint,
	type AccountSectionDescriptor
} from "./account-placeholders";
import { defineComponent, h } from "vue";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function createContext(
	modules: readonly string[] = ["catalog", "ordering", "bookings", "content"]
): TenantFrontendContext {
	return {
		tenantId: "tenant-1",
		displayName: "Test Business",
		slug: "test-biz",
		status: "active",
		previewSubdomain: "test-biz",
		templateKey: "restaurant-core",
		enabledModules: modules as TenantFrontendContext["enabledModules"]
	};
}

const stubComponent = defineComponent({
	name: "StubComponent",
	setup() {
		return () => h("div", "stub");
	}
});

// ── Account Sections ─────────────────────────────────────────────────────────

describe("accountSections", () => {
	it("defines 4 sections", () => {
		expect(accountSections).toHaveLength(4);
	});

	it("includes orders with ordering module requirement", () => {
		const orders = accountSections.find((s) => s.key === "orders");
		expect(orders).toBeDefined();
		expect(orders!.requiredModule).toBe("ordering");
	});

	it("includes bookings with bookings module requirement", () => {
		const bookings = accountSections.find((s) => s.key === "bookings");
		expect(bookings).toBeDefined();
		expect(bookings!.requiredModule).toBe("bookings");
	});

	it("loyalty has no module requirement", () => {
		const loyalty = accountSections.find((s) => s.key === "loyalty");
		expect(loyalty).toBeDefined();
		expect(loyalty!.requiredModule).toBeUndefined();
	});

	it("preferences has no module requirement", () => {
		const prefs = accountSections.find((s) => s.key === "preferences");
		expect(prefs).toBeDefined();
		expect(prefs!.requiredModule).toBeUndefined();
	});
});

// ── Section Availability ─────────────────────────────────────────────────────

describe("checkSectionAvailability", () => {
	it("reports orders available when ordering module is enabled", () => {
		const context = createContext(["ordering"]);
		const section = accountSections.find((s) => s.key === "orders")!;
		expect(checkSectionAvailability(section, context)).toEqual({ available: true });
	});

	it("reports orders unavailable when ordering module is disabled", () => {
		const context = createContext(["catalog"]);
		const section = accountSections.find((s) => s.key === "orders")!;
		expect(checkSectionAvailability(section, context)).toEqual({
			available: false,
			reason: "module-disabled"
		});
	});

	it("reports bookings unavailable when bookings module is disabled", () => {
		const context = createContext(["ordering"]);
		const section = accountSections.find((s) => s.key === "bookings")!;
		expect(checkSectionAvailability(section, context)).toEqual({
			available: false,
			reason: "module-disabled"
		});
	});

	it("reports loyalty always available (no module requirement)", () => {
		const context = createContext([]);
		const section = accountSections.find((s) => s.key === "loyalty")!;
		expect(checkSectionAvailability(section, context)).toEqual({ available: true });
	});

	it("reports preferences always available", () => {
		const context = createContext([]);
		const section = accountSections.find((s) => s.key === "preferences")!;
		expect(checkSectionAvailability(section, context)).toEqual({ available: true });
	});
});

describe("getAvailableSections", () => {
	it("returns all 4 sections when all modules enabled", () => {
		const context = createContext(["ordering", "bookings"]);
		expect(getAvailableSections(context)).toHaveLength(4);
	});

	it("excludes orders when ordering disabled", () => {
		const context = createContext(["bookings"]);
		const available = getAvailableSections(context);
		expect(available.find((s) => s.key === "orders")).toBeUndefined();
		expect(available).toHaveLength(3);
	});

	it("excludes bookings when bookings disabled", () => {
		const context = createContext(["ordering"]);
		const available = getAvailableSections(context);
		expect(available.find((s) => s.key === "bookings")).toBeUndefined();
		expect(available).toHaveLength(3);
	});

	it("returns loyalty and preferences even with no modules", () => {
		const context = createContext([]);
		const available = getAvailableSections(context);
		expect(available).toHaveLength(2);
		expect(available.map((s) => s.key).sort()).toEqual(["loyalty", "preferences"]);
	});
});

// ── Mount Point Registry ─────────────────────────────────────────────────────

describe("mount point registry", () => {
	beforeEach(() => {
		clearAccountMountPoints();
	});

	it("starts empty", () => {
		expect(getRegisteredMountPointKeys()).toHaveLength(0);
	});

	it("registers and retrieves orders mount point", () => {
		const mp: OrdersMountPoint = {
			sectionKey: "orders",
			listComponent: stubComponent,
			detailComponent: stubComponent,
			emptyState: { title: "No Orders", message: "No orders yet." }
		};
		registerAccountMountPoint("orders", mp);
		expect(getAccountMountPoint("orders")).toBe(mp);
	});

	it("registers and retrieves bookings mount point", () => {
		const mp: BookingsMountPoint = {
			sectionKey: "bookings",
			listComponent: stubComponent,
			detailComponent: stubComponent,
			emptyState: { title: "No Bookings", message: "No bookings yet." }
		};
		registerAccountMountPoint("bookings", mp);
		expect(getAccountMountPoint("bookings")).toBe(mp);
	});

	it("registers and retrieves loyalty mount point", () => {
		const mp: LoyaltyMountPoint = {
			sectionKey: "loyalty",
			dashboardComponent: stubComponent,
			emptyState: { title: "Loyalty", message: "Join our program." }
		};
		registerAccountMountPoint("loyalty", mp);
		expect(getAccountMountPoint("loyalty")).toBe(mp);
	});

	it("registers and retrieves preferences mount point", () => {
		const mp: PreferencesMountPoint = {
			sectionKey: "preferences",
			formComponent: stubComponent
		};
		registerAccountMountPoint("preferences", mp);
		expect(getAccountMountPoint("preferences")).toBe(mp);
	});

	it("tracks registered keys", () => {
		registerAccountMountPoint("orders", {
			sectionKey: "orders",
			listComponent: stubComponent,
			detailComponent: stubComponent,
			emptyState: { title: "t", message: "m" }
		});
		registerAccountMountPoint("loyalty", {
			sectionKey: "loyalty",
			dashboardComponent: stubComponent,
			emptyState: { title: "t", message: "m" }
		});
		expect(getRegisteredMountPointKeys().sort()).toEqual(["loyalty", "orders"]);
	});

	it("clearAccountMountPoints removes all registrations", () => {
		registerAccountMountPoint("orders", {
			sectionKey: "orders",
			listComponent: stubComponent,
			detailComponent: stubComponent,
			emptyState: { title: "t", message: "m" }
		});
		clearAccountMountPoints();
		expect(getRegisteredMountPointKeys()).toHaveLength(0);
		expect(getAccountMountPoint("orders")).toBeUndefined();
	});

	it("returns undefined for unregistered mount point", () => {
		expect(getAccountMountPoint("bookings")).toBeUndefined();
	});
});

// ── Placeholder Page Components ──────────────────────────────────────────────

describe("createPlaceholderPage", () => {
	beforeEach(() => {
		clearAccountMountPoints();
	});

	it("creates a component for an available section", () => {
		const context = createContext(["ordering"]);
		const section = accountSections.find((s) => s.key === "orders")!;
		const page = createPlaceholderPage(section, context);
		expect(page).toBeDefined();
		expect(typeof page).toBe("object");
	});

	it("creates a component for a section without module requirement", () => {
		const context = createContext([]);
		const section = accountSections.find((s) => s.key === "loyalty")!;
		const page = createPlaceholderPage(section, context);
		expect(page).toBeDefined();
	});

	it("creates a component for a disabled module section", () => {
		const context = createContext([]); // no ordering
		const section = accountSections.find((s) => s.key === "orders")!;
		const page = createPlaceholderPage(section, context);
		expect(page).toBeDefined();
	});
});

describe("createAllPlaceholderPages", () => {
	it("creates pages for all 4 sections", () => {
		const context = createContext(["ordering", "bookings"]);
		const pages = createAllPlaceholderPages(context);
		expect(Object.keys(pages)).toHaveLength(4);
		expect(Object.keys(pages).sort()).toEqual([
			"bookings",
			"loyalty",
			"orders",
			"preferences"
		]);
	});

	it("each page is a component object", () => {
		const context = createContext(["ordering", "bookings"]);
		const pages = createAllPlaceholderPages(context);
		for (const page of Object.values(pages)) {
			expect(page).toBeDefined();
			expect(typeof page).toBe("object");
		}
	});
});

// ── Mount Point Interface Completeness ───────────────────────────────────────

describe("mount point interface contracts", () => {
	it("OrdersMountPoint requires list and detail components", () => {
		const mp: OrdersMountPoint = {
			sectionKey: "orders",
			listComponent: stubComponent,
			detailComponent: stubComponent,
			emptyState: { title: "t", message: "m" }
		};
		expect(mp.sectionKey).toBe("orders");
		expect(mp.listComponent).toBe(stubComponent);
		expect(mp.detailComponent).toBe(stubComponent);
		expect(mp.emptyState).toBeDefined();
	});

	it("BookingsMountPoint requires list and detail components", () => {
		const mp: BookingsMountPoint = {
			sectionKey: "bookings",
			listComponent: stubComponent,
			detailComponent: stubComponent,
			emptyState: { title: "t", message: "m" }
		};
		expect(mp.sectionKey).toBe("bookings");
		expect(mp.listComponent).toBe(stubComponent);
		expect(mp.detailComponent).toBe(stubComponent);
	});

	it("LoyaltyMountPoint requires dashboard component", () => {
		const mp: LoyaltyMountPoint = {
			sectionKey: "loyalty",
			dashboardComponent: stubComponent,
			emptyState: { title: "t", message: "m" }
		};
		expect(mp.sectionKey).toBe("loyalty");
		expect(mp.dashboardComponent).toBe(stubComponent);
	});

	it("PreferencesMountPoint requires form component", () => {
		const mp: PreferencesMountPoint = {
			sectionKey: "preferences",
			formComponent: stubComponent
		};
		expect(mp.sectionKey).toBe("preferences");
		expect(mp.formComponent).toBe(stubComponent);
	});
});
