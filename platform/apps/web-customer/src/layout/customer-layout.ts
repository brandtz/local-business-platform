// E13-S2-T7: Customer layout shell — header with tenant branding, navigation,
// cart icon with count badge, user menu, and footer. Uses render functions
// to stay consistent with the existing app architecture.

import { defineComponent, h, type PropType, type VNode } from "vue";
import { RouterLink, RouterView } from "vue-router";

import type { TenantFrontendContext } from "../tenant-bootstrap";
import type { CartState } from "../cart-state";
import { getCartItemCount } from "../cart-state";
import type { AuthState } from "../composables/use-auth";

// ── Types ────────────────────────────────────────────────────────────────────

export type CustomerLayoutProps = {
	tenantContext: TenantFrontendContext;
	authState: AuthState;
	cartState: CartState;
	onLogout: () => void;
};

export type NavigationLink = {
	label: string;
	to: string;
};

// ── Navigation ───────────────────────────────────────────────────────────────

export function getCustomerNavLinks(context: TenantFrontendContext): NavigationLink[] {
	const links: NavigationLink[] = [
		{ label: "Home", to: "/" },
		{ label: "Menu", to: "/menu" },
	];

	if (context.enabledModules.includes("catalog")) {
		// Menu/Catalog is always available
	}

	if (context.enabledModules.includes("bookings")) {
		links.push({ label: "Services", to: "/services" });
	}

	return links;
}

// ── Header ───────────────────────────────────────────────────────────────────

function renderCartBadge(cartState: CartState): VNode {
	const count = getCartItemCount(cartState);
	return h(RouterLink, { to: "/cart", class: "customer-header__cart" }, {
		default: () => [
			h("span", { class: "customer-header__cart-icon", "aria-label": "Shopping cart" }, "🛒"),
			count > 0
				? h("span", { class: "customer-header__cart-badge", "data-testid": "cart-badge" }, String(count))
				: null,
		],
	});
}

function renderUserMenu(authState: AuthState, onLogout: () => void): VNode {
	if (authState.isAuthenticated) {
		return h("div", { class: "customer-header__user-menu" }, [
			h(RouterLink, { to: "/account", class: "customer-header__account-link" }, {
				default: () => "Account",
			}),
			h("button", {
				class: "customer-header__logout-btn",
				type: "button",
				onClick: onLogout,
			}, "Sign Out"),
		]);
	}

	return h(RouterLink, { to: "/login", class: "customer-header__signin-link" }, {
		default: () => "Sign In",
	});
}

function renderHeader(
	context: TenantFrontendContext,
	authState: AuthState,
	cartState: CartState,
	onLogout: () => void,
): VNode {
	const navLinks = getCustomerNavLinks(context);

	return h("header", { class: "customer-header", "data-testid": "customer-header" }, [
		h("div", { class: "customer-header__brand" }, [
			h(RouterLink, { to: "/", class: "customer-header__logo-link" }, {
				default: () => h("span", { class: "customer-header__name" }, context.displayName),
			}),
		]),
		h("nav", { class: "customer-header__nav", "aria-label": "Main navigation" }, [
			...navLinks.map((link) =>
				h(RouterLink, { to: link.to, class: "customer-header__nav-link" }, {
					default: () => link.label,
				})
			),
		]),
		h("div", { class: "customer-header__actions" }, [
			renderCartBadge(cartState),
			renderUserMenu(authState, onLogout),
		]),
	]);
}

// ── Footer ───────────────────────────────────────────────────────────────────

function renderFooter(context: TenantFrontendContext): VNode {
	return h("footer", { class: "customer-footer", "data-testid": "customer-footer" }, [
		h("div", { class: "customer-footer__content" }, [
			h("div", { class: "customer-footer__brand" }, [
				h("p", { class: "customer-footer__name" }, context.displayName),
			]),
			h("nav", { class: "customer-footer__links", "aria-label": "Footer navigation" }, [
				h(RouterLink, { to: "/pages/about" }, { default: () => "About" }),
				h(RouterLink, { to: "/pages/contact" }, { default: () => "Contact" }),
				h(RouterLink, { to: "/pages/privacy" }, { default: () => "Privacy Policy" }),
				h(RouterLink, { to: "/pages/terms" }, { default: () => "Terms of Service" }),
			]),
			h("p", { class: "customer-footer__copyright" },
				`© ${new Date().getFullYear()} ${context.displayName}. All rights reserved.`
			),
		]),
	]);
}

// ── Layout Component ─────────────────────────────────────────────────────────

export const CustomerLayout = defineComponent({
	name: "CustomerLayout",
	props: {
		tenantContext: { type: Object as PropType<TenantFrontendContext>, required: true },
		authState: { type: Object as PropType<AuthState>, required: true },
		cartState: { type: Object as PropType<CartState>, required: true },
		onLogout: { type: Function as PropType<() => void>, required: true },
	},
	setup(props) {
		return () =>
			h("div", { class: "customer-layout" }, [
				renderHeader(props.tenantContext, props.authState, props.cartState, props.onLogout),
				h("main", { class: "customer-layout__main" }, [h(RouterView)]),
				renderFooter(props.tenantContext),
			]);
	},
});
