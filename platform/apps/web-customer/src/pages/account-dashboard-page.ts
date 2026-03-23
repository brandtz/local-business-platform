// Account Dashboard page — profile card, sidebar navigation, quick stats,
// and quick links to recent orders and upcoming bookings.
// Fetches user profile via SDK auth API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { AuthUserSummary } from "@platform/types";

import { useSdk } from "../composables/use-sdk";
import {
	getAccountNavigationItems,
	type AccountRouteMetadata,
} from "../account-routes";

// ── Types ───────────────────────────────────────────────────────────────────

export type QuickStats = {
	totalOrders: number;
	upcomingBookings: number;
	loyaltyPoints: number;
};

export type QuickStatCard = {
	label: string;
	value: number | string;
	link: string;
};

// ── Pure Helpers ─────────────────────────────────────────────────────────────

export function formatMemberSince(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return "Member";
	const month = date.toLocaleString("en-US", { month: "long" });
	const year = date.getFullYear();
	return `Member since ${month} ${year}`;
}

export function getQuickStatCards(stats: QuickStats): QuickStatCard[] {
	return [
		{ label: "Total Orders", value: stats.totalOrders, link: "/account/orders" },
		{ label: "Upcoming Bookings", value: stats.upcomingBookings, link: "/account/bookings" },
		{ label: "Loyalty Points", value: stats.loyaltyPoints.toLocaleString(), link: "/account/loyalty" },
	];
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading your account..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Something went wrong"),
		h("p", message),
		h(RouterLink, { to: "/", class: "page-error__back" }, {
			default: () => "Back to Home",
		}),
	]);
}

function renderProfileCard(user: AuthUserSummary): VNode {
	const initials = (user.displayName ?? user.email)
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return h("section", {
		class: "account-dashboard__profile-card",
		"data-testid": "profile-card",
	}, [
		h("div", {
			class: "account-dashboard__avatar",
			"data-testid": "profile-avatar",
			"aria-hidden": "true",
		}, initials),
		h("div", { class: "account-dashboard__profile-info" }, [
			h("h2", {
				class: "account-dashboard__name",
				"data-testid": "profile-name",
			}, user.displayName ?? "Customer"),
			h("p", {
				class: "account-dashboard__email",
				"data-testid": "profile-email",
			}, user.email),
		]),
	]);
}

function renderQuickStats(stats: QuickStats): VNode {
	const cards = getQuickStatCards(stats);

	return h("section", {
		class: "account-dashboard__quick-stats",
		"data-testid": "quick-stats",
	}, cards.map((card) =>
		h(RouterLink, {
			to: card.link,
			class: "account-dashboard__stat-card",
			"data-testid": `stat-card-${card.label.toLowerCase().replace(/\s+/g, "-")}`,
		}, {
			default: () => [
				h("span", { class: "account-dashboard__stat-value" }, String(card.value)),
				h("span", { class: "account-dashboard__stat-label" }, card.label),
			],
		})
	));
}

function renderQuickLinks(): VNode {
	return h("section", {
		class: "account-dashboard__quick-links",
		"data-testid": "quick-links",
	}, [
		h("h3", { class: "account-dashboard__section-title" }, "Quick Links"),
		h("div", { class: "account-dashboard__link-row" }, [
			h(RouterLink, {
				to: "/account/orders",
				class: "account-dashboard__quick-link",
				"data-testid": "link-recent-orders",
			}, { default: () => "View Recent Orders" }),
			h(RouterLink, {
				to: "/account/bookings",
				class: "account-dashboard__quick-link",
				"data-testid": "link-upcoming-bookings",
			}, { default: () => "View Upcoming Bookings" }),
		]),
	]);
}

// ── Account Sidebar ─────────────────────────────────────────────────────────

export function renderAccountSidebar(currentPath: string): VNode {
	const navItems = getAccountNavigationItems();

	return h("nav", {
		class: "account-sidebar",
		"data-testid": "account-sidebar",
		"aria-label": "Account navigation",
	}, [
		h("ul", { class: "account-sidebar__list" },
			navItems.map((item: AccountRouteMetadata) =>
				h("li", {
					key: item.key,
					class: [
						"account-sidebar__item",
						currentPath === item.path || currentPath.startsWith(item.path + "/")
							? "account-sidebar__item--active"
							: "",
					],
				}, [
					h(RouterLink, {
						to: item.path,
						class: "account-sidebar__link",
						"data-testid": `sidebar-link-${item.key}`,
					}, { default: () => item.label }),
				])
			)
		),
		// Mobile dropdown fallback
		h("select", {
			class: "account-sidebar__mobile-select",
			"data-testid": "sidebar-mobile-select",
			value: currentPath,
			onChange: (e: Event) => {
				const target = e.target as HTMLSelectElement;
				if (target.value) {
					window.location.href = target.value;
				}
			},
		},
			navItems.map((item: AccountRouteMetadata) =>
				h("option", { key: item.key, value: item.path }, item.label)
			)
		),
	]);
}

export const AccountSidebar = defineComponent({
	name: "AccountSidebar",
	setup() {
		const route = useRoute();
		return () => renderAccountSidebar(route.path);
	},
});

// ── Page Component ──────────────────────────────────────────────────────────

export const AccountDashboardPage = defineComponent({
	name: "AccountDashboardPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const user = ref<AuthUserSummary | null>(null);
		const stats = ref<QuickStats>({ totalOrders: 0, upcomingBookings: 0, loyaltyPoints: 0 });

		async function fetchDashboardData(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const [profile, ordersRes, bookingsRes] = await Promise.all([
					sdk.auth.me(),
					sdk.orders.list({ page: 1, pageSize: 1 } as Parameters<typeof sdk.orders.list>[0]),
					sdk.bookings.list({ page: 1, pageSize: 1 } as Parameters<typeof sdk.bookings.list>[0]),
				]);

				user.value = profile;

				stats.value = {
					totalOrders: ordersRes.total,
					upcomingBookings: bookingsRes.total,
					loyaltyPoints: 0,
				};

				// Attempt to fetch loyalty points (non-critical)
				try {
					const loyalty = await sdk.loyalty.getCustomerPoints(profile.id);
					stats.value = { ...stats.value, loyaltyPoints: loyalty.pointBalance };
				} catch {
					// Loyalty may not be enabled — keep 0
				}
			} catch {
				error.value = "Unable to load your account. Please try again later.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(fetchDashboardData);

		return () => {
			if (loading.value) return renderLoading();
			if (error.value || !user.value) return renderError(error.value ?? "Account not found");

			return h("div", {
				class: "account-dashboard",
				"data-testid": "account-dashboard-page",
			}, [
				renderAccountSidebar(route.path),
				h("div", { class: "account-dashboard__content" }, [
					renderProfileCard(user.value),
					renderQuickStats(stats.value),
					renderQuickLinks(),
				]),
			]);
		};
	},
});
