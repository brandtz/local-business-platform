// Admin layout shell — sidebar navigation, header with tenant branding,
// impersonation banner, user menu, and main content area. Uses render
// functions to stay consistent with the existing app architecture.

import { defineComponent, h, type PropType, type VNode } from "vue";
import { RouterLink, RouterView } from "vue-router";

// ── Types ────────────────────────────────────────────────────────────────────

export type AdminSidebarItem = {
	label: string;
	path: string;
	icon: string;
	section: string;
	children?: { label: string; path: string }[];
};

export type AdminHeaderData = {
	businessName: string;
	userDisplayName: string;
};

// ── Impersonation Banner ─────────────────────────────────────────────────────

function renderImpersonationBanner(label: string): VNode {
	return h(
		"div",
		{
			class: "admin-layout__impersonation-banner",
			role: "alert",
			"aria-live": "polite",
			"data-testid": "impersonation-banner",
		},
		[
			h("span", { class: "admin-layout__impersonation-label" }, label),
			h(
				RouterLink,
				{ to: "/platform", class: "admin-layout__impersonation-exit" },
				{ default: () => "Return to Platform" },
			),
		],
	);
}

// ── Header ───────────────────────────────────────────────────────────────────

function renderHeader(
	headerData: AdminHeaderData,
	onToggleSidebar: () => void,
	onSignOut: () => void,
): VNode {
	return h("header", { class: "admin-header", "data-testid": "admin-header" }, [
		h("div", { class: "admin-header__left" }, [
			h(
				"button",
				{
					class: "admin-header__hamburger",
					type: "button",
					"aria-label": "Toggle sidebar",
					onClick: onToggleSidebar,
				},
				"☰",
			),
			h("div", { class: "admin-header__brand" }, [
				h(
					RouterLink,
					{ to: "/", class: "admin-header__brand-link" },
					{
						default: () =>
							h("span", { class: "admin-header__business-name" }, headerData.businessName),
					},
				),
			]),
		]),
		h("div", { class: "admin-header__actions" }, [
			h("div", { class: "admin-header__user-menu" }, [
				h(
					"span",
					{ class: "admin-header__user-name", "data-testid": "admin-user-name" },
					headerData.userDisplayName,
				),
				h(
					"button",
					{
						class: "admin-header__signout-btn",
						type: "button",
						onClick: onSignOut,
					},
					"Sign Out",
				),
			]),
		]),
	]);
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

function renderSidebarItem(item: AdminSidebarItem): VNode {
	const hasChildren = item.children && item.children.length > 0;

	const parentLink = h(
		RouterLink,
		{ to: item.path, class: "admin-sidebar__nav-link" },
		{
			default: () => [
				h("span", { class: "admin-sidebar__nav-icon", "aria-hidden": "true" }, item.icon),
				h("span", { class: "admin-sidebar__nav-label" }, item.label),
			],
		},
	);

	const children = hasChildren
		? h(
				"ul",
				{ class: "admin-sidebar__sub-nav" },
				item.children!.map((child) =>
					h("li", { class: "admin-sidebar__sub-nav-item", key: child.path }, [
						h(
							RouterLink,
							{ to: child.path, class: "admin-sidebar__sub-nav-link" },
							{ default: () => child.label },
						),
					]),
				),
			)
		: null;

	return h(
		"li",
		{
			class: "admin-sidebar__nav-item",
			"data-section": item.section,
			key: item.path,
		},
		[parentLink, children],
	);
}

function renderSidebar(items: AdminSidebarItem[], isOpen: boolean): VNode {
	const sidebarClass = isOpen
		? "admin-sidebar admin-sidebar--open"
		: "admin-sidebar";

	return h(
		"aside",
		{
			class: sidebarClass,
			"aria-label": "Admin navigation",
			"data-testid": "admin-sidebar",
		},
		[
			h(
				"nav",
				{ class: "admin-sidebar__nav" },
				[
					h(
						"ul",
						{ class: "admin-sidebar__nav-list", role: "list" },
						items.map((item) => renderSidebarItem(item)),
					),
				],
			),
		],
	);
}

// ── Layout Component ─────────────────────────────────────────────────────────

export const AdminLayout = defineComponent({
	name: "AdminLayout",
	props: {
		sidebarItems: {
			type: Array as PropType<AdminSidebarItem[]>,
			required: true,
		},
		headerData: {
			type: Object as PropType<AdminHeaderData>,
			required: true,
		},
		isSidebarOpen: {
			type: Boolean as PropType<boolean>,
			required: true,
		},
		isImpersonating: {
			type: Boolean as PropType<boolean>,
			required: true,
		},
		impersonationLabel: {
			type: String as PropType<string>,
			default: "",
		},
		shellTitle: {
			type: String as PropType<string>,
			default: "Admin Shell",
		},
		authDescription: {
			type: String as PropType<string>,
			default: "",
		},
		onToggleSidebar: {
			type: Function as PropType<() => void>,
			required: true,
		},
		onSignOut: {
			type: Function as PropType<() => void>,
			required: true,
		},
	},
	setup(props) {
		return () =>
			h("div", { class: "admin-layout" }, [
				props.isImpersonating
					? renderImpersonationBanner(props.impersonationLabel)
					: null,
				renderHeader(props.headerData, props.onToggleSidebar, props.onSignOut),
				h("div", { class: "admin-layout__body" }, [
					renderSidebar(props.sidebarItems, props.isSidebarOpen),
					h("main", { class: "admin-layout__main", "data-testid": "admin-main" }, [
						h("h2", { class: "admin-layout__shell-title" }, props.shellTitle),
						props.authDescription
							? h("p", { class: "admin-layout__auth-description" }, props.authDescription)
							: null,
						h(RouterView),
					]),
				]),
			]);
	},
});
