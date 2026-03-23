// E13-S2-T7: Customer storefront route configuration — defines all customer
// routes including storefront pages, auth pages, account area, and content pages.
// Auth guards protect account and checkout routes.

import { defineComponent, h, type Component } from "vue";
import type { RouteRecordRaw, NavigationGuardWithThis } from "vue-router";

import { getAuthViewerState } from "./auth-state";
import { HomePage } from "./pages/home-page";
import { CatalogPage } from "./pages/catalog-page";
import { ItemDetailPage } from "./pages/item-detail-page";
import { ServicesPage, ServiceDetailPage } from "./pages/services-page";
import { LoginPage, RegisterPage, ForgotPasswordPage } from "./pages/login-page";
import { ContentPage } from "./pages/content-page";
import { CartPage } from "./pages/cart-page";
import { CheckoutPage } from "./pages/checkout-page";
import type { WebCustomerRuntimeConfig } from "./runtime-config";
import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Placeholder Pages (for routes not yet implemented in this story) ─────────

function createPage(title: string, description: string): Component {
	return defineComponent({
		name: `${title.replace(/\s+/g, "")}Page`,
		setup() {
			return () =>
				h("section", [h("h2", title), h("p", description)]);
		}
	});
}

// ── Auth Guard ───────────────────────────────────────────────────────────────

/**
 * Creates a navigation guard that redirects unauthenticated users to /login.
 * The original route is preserved in the redirect query for post-login return.
 */
export function createAuthGuard(): NavigationGuardWithThis<undefined> {
	return (to) => {
		const authState = getAuthViewerState();
		if (!authState.isAuthenticated) {
			return { path: "/login", query: { redirect: to.fullPath } };
		}
		return true;
	};
}

// ── Route Builder ────────────────────────────────────────────────────────────

export function createRoutes(
	runtimeConfig: WebCustomerRuntimeConfig,
	tenantContext?: TenantFrontendContext
): RouteRecordRaw[] {
	const authGuard = createAuthGuard();

	const tenantLabel = tenantContext
		? `${tenantContext.displayName} (${tenantContext.slug})`
		: "no tenant context";

	return [
		// ── Storefront Pages ───────────────────────────────────────────────
		{
			path: "/",
			component: HomePage,
			meta: { title: "Home" }
		},
		{
			path: "/menu",
			component: CatalogPage,
			meta: { title: "Menu" }
		},
		{
			path: "/menu/:itemId",
			component: ItemDetailPage,
			meta: { title: "Item Detail" }
		},
		{
			path: "/services",
			component: ServicesPage,
			meta: { title: "Services" }
		},
		{
			path: "/services/:serviceId",
			component: ServiceDetailPage,
			meta: { title: "Service Detail" }
		},

		// ── Auth Pages ─────────────────────────────────────────────────────
		{
			path: "/login",
			component: LoginPage,
			meta: { title: "Sign In" }
		},
		{
			path: "/register",
			component: RegisterPage,
			meta: { title: "Register" }
		},
		{
			path: "/forgot-password",
			component: ForgotPasswordPage,
			meta: { title: "Forgot Password" }
		},

		// ── Protected Routes (account, checkout) ───────────────────────────
		{
			path: "/cart",
			component: CartPage,
			meta: { title: "Cart" }
		},
		{
			path: "/checkout",
			component: CheckoutPage,
			beforeEnter: authGuard,
			meta: { title: "Checkout", requiresAuth: true }
		},
		{
			path: "/account",
			component: createPage("Account", "Account overview — coming in E13-S4"),
			beforeEnter: authGuard,
			meta: { title: "Account", requiresAuth: true }
		},
		{
			path: "/account/:pathMatch(.*)*",
			component: createPage("Account", "Account section — coming in E13-S4"),
			beforeEnter: authGuard,
			meta: { title: "Account", requiresAuth: true }
		},

		// ── Content Pages ──────────────────────────────────────────────────
		{
			path: "/pages/:slug",
			component: ContentPage,
			meta: { title: "Content" }
		},

		// ── Status/Debug Route ─────────────────────────────────────────────
		{
			path: "/status",
			component: createPage(
				"Runtime Status",
				`App: ${runtimeConfig.appId}. Tenant: ${tenantLabel}. Template: ${tenantContext?.templateKey ?? "none"}.`
			)
		},

		// ── Catch-All 404 ──────────────────────────────────────────────────
		{
			path: "/:pathMatch(.*)*",
			component: createPage("Not Found", "The page you are looking for does not exist."),
			meta: { title: "Not Found" }
		}
	];
}
