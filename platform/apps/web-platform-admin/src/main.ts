import { createApp, defineComponent, h, ref, type VNode } from "vue";
import { createRouter, createWebHistory, RouterLink, RouterView } from "vue-router";

import { SDK_CLIENT_KEY, createPlatformSdkClient } from "./composables/use-sdk";
import { createRoutes } from "./routes";
import { getAuthViewerState } from "./auth-state";
import { getRuntimeConfig } from "./runtime-config";

const runtimeConfig = getRuntimeConfig();

document.title = runtimeConfig.appTitle;

// ── Sidebar Configuration ────────────────────────────────────────────────────

type SidebarItem = {
	label: string;
	path: string;
	icon: string;
	children?: { label: string; path: string }[];
};

const sidebarItems: SidebarItem[] = [
	{ label: "Dashboard", path: "/", icon: "📊" },
	{ label: "Tenants", path: "/tenants", icon: "🏢" },
	{ label: "Domains", path: "/domains", icon: "🌐" },
	{
		label: "Configuration", path: "/config/modules", icon: "⚙️",
		children: [
			{ label: "Modules", path: "/config/modules" },
			{ label: "Global Settings", path: "/config/settings" },
			{ label: "Templates", path: "/config/templates" },
			{ label: "Payment Providers", path: "/config/payments" },
		],
	},
	{
		label: "Operations", path: "/operations", icon: "🔧",
		children: [
			{ label: "System Health", path: "/operations" },
			{ label: "Logs", path: "/operations/logs" },
		],
	},
	{ label: "Analytics", path: "/analytics", icon: "📈" },
	{ label: "Audit Trail", path: "/audit", icon: "📋" },
	{ label: "Publishing", path: "/publishing", icon: "🚀" },
];

// ── App Bootstrap ────────────────────────────────────────────────────────────

const authViewerState = getAuthViewerState();

const sdkClient = createPlatformSdkClient(import.meta.env.VITE_API_BASE_URL);

const router = createRouter({
	history: createWebHistory(),
	routes: createRoutes(runtimeConfig, authViewerState),
});

function renderSidebarItem(item: SidebarItem, currentPath: string): VNode {
	const isActive = currentPath === item.path || item.children?.some((c) => currentPath === c.path);
	const children: VNode[] = [
		h(RouterLink, {
			to: item.path,
			class: ["sidebar-item", isActive ? "sidebar-item--active" : ""],
		}, { default: () => `${item.icon} ${item.label}` }),
	];

	if (item.children) {
		children.push(
			h("ul", { class: "sidebar-children" },
				item.children.map((child) =>
					h("li", { key: child.path },
						h(RouterLink, {
							to: child.path,
							class: ["sidebar-child", currentPath === child.path ? "sidebar-child--active" : ""],
						}, { default: () => child.label })
					)
				)
			)
		);
	}

	return h("li", { key: item.path }, children);
}

const AppShell = defineComponent({
	name: "WebPlatformAdminShell",
	setup() {
		const isSidebarOpen = ref(false);
		const isLoginRoute = ref(false);
		const currentPath = ref("/");
		const userDisplayName = ref(authViewerState.displayName ?? "Admin");

		router.afterEach((to) => {
			isLoginRoute.value = to.path === "/login";
			currentPath.value = to.path;
		});

		function toggleSidebar() {
			isSidebarOpen.value = !isSidebarOpen.value;
		}

		function handleSignOut() {
			router.push("/login");
		}

		return () => {
			if (isLoginRoute.value) {
				return h(RouterView);
			}

			return h("div", { class: "platform-shell", "data-testid": "platform-shell" }, [
				// Sidebar
				h("aside", {
					class: ["platform-sidebar", isSidebarOpen.value ? "platform-sidebar--open" : ""],
					"data-testid": "platform-sidebar",
				}, [
					h("div", { class: "sidebar-header" }, [
						h("h2", "Platform Admin"),
					]),
					h("nav", [
						h("ul", { class: "sidebar-nav" },
							sidebarItems.map((item) => renderSidebarItem(item, currentPath.value))
						),
					]),
				]),
				// Main content
				h("div", { class: "platform-main" }, [
					h("header", { class: "platform-header", "data-testid": "platform-header" }, [
						h("button", {
							class: "sidebar-toggle",
							"data-testid": "sidebar-toggle",
							onClick: toggleSidebar,
						}, "☰"),
						h("span", { class: "header-title" }, "Platform Admin"),
						h("div", { class: "header-user" }, [
							h("span", { "data-testid": "user-display-name" }, userDisplayName.value),
							h("button", {
								class: "sign-out-btn",
								"data-testid": "sign-out-btn",
								onClick: handleSignOut,
							}, "Sign Out"),
						]),
					]),
					h("main", { class: "platform-content" }, [h(RouterView)]),
				]),
			]);
		};
	},
});

const app = createApp(AppShell);
app.provide(SDK_CLIENT_KEY, sdkClient);
app.use(router);
app.mount("#app");
