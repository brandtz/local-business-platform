// Tests for admin layout shell component

import { describe, expect, it } from "vitest";

import type { AdminSidebarItem, AdminHeaderData } from "../layout/admin-layout";

describe("AdminLayout types", () => {
	it("defines a valid AdminSidebarItem structure", () => {
		const item: AdminSidebarItem = {
			label: "Dashboard",
			path: "/",
			icon: "📊",
			section: "dashboard",
		};

		expect(item.label).toBe("Dashboard");
		expect(item.path).toBe("/");
		expect(item.icon).toBe("📊");
		expect(item.section).toBe("dashboard");
	});

	it("supports sidebar items with children", () => {
		const item: AdminSidebarItem = {
			label: "Settings",
			path: "/settings",
			icon: "⚙️",
			section: "settings",
			children: [
				{ label: "Profile & Branding", path: "/settings/profile" },
				{ label: "Payments", path: "/settings/payments" },
				{ label: "Users", path: "/settings/users" },
				{ label: "Activity Log", path: "/settings/activity" },
			],
		};

		expect(item.children).toHaveLength(4);
		expect(item.children![0]!.label).toBe("Profile & Branding");
		expect(item.children![0]!.path).toBe("/settings/profile");
	});

	it("defines a valid AdminHeaderData structure", () => {
		const header: AdminHeaderData = {
			businessName: "Alpha Fitness",
			userDisplayName: "Jane Owner",
		};

		expect(header.businessName).toBe("Alpha Fitness");
		expect(header.userDisplayName).toBe("Jane Owner");
	});
});

describe("sidebar navigation structure", () => {
	it("builds a complete admin sidebar", () => {
		const sidebarItems: AdminSidebarItem[] = [
			{ label: "Dashboard", path: "/", icon: "📊", section: "dashboard" },
			{
				label: "Catalog",
				path: "/catalog",
				icon: "📦",
				section: "catalog",
				children: [
					{ label: "Categories", path: "/catalog/categories" },
					{ label: "Products", path: "/catalog/products" },
					{ label: "Services", path: "/catalog/services" },
				],
			},
			{
				label: "Settings",
				path: "/settings",
				icon: "⚙️",
				section: "settings",
				children: [
					{ label: "Profile & Branding", path: "/settings/profile" },
					{ label: "Payments", path: "/settings/payments" },
					{ label: "Users", path: "/settings/users" },
					{ label: "Activity Log", path: "/settings/activity" },
				],
			},
		];

		expect(sidebarItems).toHaveLength(3);
		expect(sidebarItems[0]!.children).toBeUndefined();
		expect(sidebarItems[1]!.children).toHaveLength(3);
		expect(sidebarItems[2]!.children).toHaveLength(4);
	});

	it("sidebar items without children have no children property", () => {
		const item: AdminSidebarItem = {
			label: "Dashboard",
			path: "/",
			icon: "📊",
			section: "dashboard",
		};

		expect(item.children).toBeUndefined();
	});
});
