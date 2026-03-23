import { describe, expect, it } from "vitest";

import { createRoutes, createAuthGuard } from "./routes";
import { resolveRuntimeConfig } from "./runtime-config";
import type { TenantFrontendContext } from "./tenant-bootstrap";

const runtimeConfig = resolveRuntimeConfig({});

describe("web customer routes", () => {
	it("defines all storefront routes without tenant context", () => {
		const routes = createRoutes(runtimeConfig);
		const paths = routes.map((route) => route.path);

		expect(paths).toContain("/");
		expect(paths).toContain("/menu");
		expect(paths).toContain("/menu/:itemId");
		expect(paths).toContain("/services");
		expect(paths).toContain("/services/:serviceId");
		expect(paths).toContain("/login");
		expect(paths).toContain("/register");
		expect(paths).toContain("/forgot-password");
		expect(paths).toContain("/cart");
		expect(paths).toContain("/checkout");
		expect(paths).toContain("/account");
		expect(paths).toContain("/pages/:slug");
		expect(paths).toContain("/status");
		expect(paths).toContain("/:pathMatch(.*)*");
	});

	it("defines all storefront routes with tenant context", () => {
		const tenantContext: TenantFrontendContext = {
			tenantId: "t-001",
			displayName: "Joe's Diner",
			slug: "joes-diner",
			status: "active",
			previewSubdomain: "joes-diner",
			templateKey: "restaurant-core",
			enabledModules: ["catalog", "ordering"]
		};

		const routes = createRoutes(runtimeConfig, tenantContext);
		const paths = routes.map((route) => route.path);

		expect(paths).toContain("/");
		expect(paths).toContain("/menu");
		expect(paths).toContain("/services");
		expect(paths).toContain("/login");
		expect(paths).toContain("/pages/:slug");
	});

	it("marks checkout and account routes as requiring auth", () => {
		const routes = createRoutes(runtimeConfig);
		const checkout = routes.find((r) => r.path === "/checkout");
		const account = routes.find((r) => r.path === "/account");

		expect(checkout?.meta?.requiresAuth).toBe(true);
		expect(account?.meta?.requiresAuth).toBe(true);
	});

	it("protected routes have beforeEnter guards", () => {
		const routes = createRoutes(runtimeConfig);
		const checkout = routes.find((r) => r.path === "/checkout");
		const account = routes.find((r) => r.path === "/account");

		expect(checkout?.beforeEnter).toBeDefined();
		expect(account?.beforeEnter).toBeDefined();
	});

	it("public routes do not have auth guards", () => {
		const routes = createRoutes(runtimeConfig);
		const menu = routes.find((r) => r.path === "/menu");
		const login = routes.find((r) => r.path === "/login");

		expect(menu?.beforeEnter).toBeUndefined();
		expect(login?.beforeEnter).toBeUndefined();
	});
});

describe("createAuthGuard", () => {
	it("returns a function", () => {
		const guard = createAuthGuard();
		expect(typeof guard).toBe("function");
	});
});
