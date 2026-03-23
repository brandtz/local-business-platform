import { createApp, defineComponent, h, ref, onMounted } from "vue";
import { createRouter, createWebHistory, RouterView } from "vue-router";

import { describeImpersonationIndicator, type TenantModuleKey, type TenantActorRole } from "@platform/types";

import { SDK_CLIENT_KEY, createAdminSdkClient } from "./composables/use-sdk";
import { AdminLayout, type AdminSidebarItem } from "./layout/admin-layout";
import { filterNavigationForContext } from "./module-navigation";
import { createRoutes } from "./routes";
import { getAuthViewerState } from "./auth-state";
import { getRuntimeConfig } from "./runtime-config";

const runtimeConfig = getRuntimeConfig();

document.title = runtimeConfig.appTitle;

// ── Sidebar Builder ──────────────────────────────────────────────────────────

const sidebarSectionConfig: Record<string, { icon: string; children?: { label: string; path: string }[] }> = {
	"/": { icon: "📊" },
	"/catalog": {
		icon: "📦",
		children: [
			{ label: "Categories", path: "/catalog/categories" },
			{ label: "Products", path: "/catalog/products" },
			{ label: "Services", path: "/catalog/services" },
		],
	},
	"/ordering": {
		icon: "🛒",
		children: [
			{ label: "Orders", path: "/ordering" },
			{ label: "Bookings", path: "/bookings" },
		],
	},
	"/bookings": { icon: "📅" },
	"/content": {
		icon: "📄",
		children: [
			{ label: "Pages", path: "/content/pages" },
			{ label: "Announcements", path: "/content/announcements" },
			{ label: "Locations", path: "/content/locations" },
		],
	},
	"/operations": { icon: "⚙️" },
	"/users": {
		icon: "👥",
		children: [
			{ label: "Customers", path: "/users/customers" },
			{ label: "Staff", path: "/users/staff" },
		],
	},
	"/settings": {
		icon: "⚙️",
		children: [
			{ label: "Profile & Branding", path: "/settings/profile" },
			{ label: "Payments", path: "/settings/payments" },
			{ label: "Users", path: "/settings/users" },
			{ label: "Activity Log", path: "/settings/activity" },
		],
	},
	"/audit": { icon: "📋" },
};

function buildSidebarItems(
	enabledModules: readonly TenantModuleKey[],
	role: TenantActorRole,
): AdminSidebarItem[] {
	const entries = filterNavigationForContext({ enabledModules, role });

	return entries.map((entry) => {
		const config = sidebarSectionConfig[entry.path] ?? { icon: "•" };
		return {
			label: entry.label,
			path: entry.path,
			icon: config.icon,
			section: entry.section,
			children: config.children,
		};
	});
}

// ── App Bootstrap ────────────────────────────────────────────────────────────

const authViewerState = getAuthViewerState();

const sdkClient = createAdminSdkClient(import.meta.env.VITE_API_BASE_URL);

const router = createRouter({
	history: createWebHistory(),
	routes: createRoutes(runtimeConfig, authViewerState),
});

const AppShell = defineComponent({
	name: "WebAdminShell",
	setup() {
		const enabledModules = ref<TenantModuleKey[]>([
			"catalog", "ordering", "bookings", "content", "operations",
		]);
		const role = ref<TenantActorRole>("owner");
		const businessName = ref(runtimeConfig.appTitle);
		const userDisplayName = ref(authViewerState.displayName ?? "Admin");
		const isSidebarOpen = ref(false);
		const isImpersonating = ref(!!authViewerState.impersonationSession);
		const impersonationLabel = ref(
			describeImpersonationIndicator(authViewerState) ?? "",
		);
		const isLoginRoute = ref(false);
		const authDescription = ref("");

		onMounted(async () => {
			try {
				const modules = await sdkClient.config.getModules();
				// Module registry returns all available modules; treat all returned as enabled
				enabledModules.value = modules.map((m) => m.key);
			} catch {
				// Use default modules on error
			}

			// Check if current route is login
			isLoginRoute.value = router.currentRoute.value.path === "/login";
			authDescription.value = (router.currentRoute.value.meta?.authDescription as string) ?? "";
		});

		router.afterEach((to) => {
			isLoginRoute.value = to.path === "/login";
			authDescription.value = (to.meta?.authDescription as string) ?? "";
		});

		function toggleSidebar() {
			isSidebarOpen.value = !isSidebarOpen.value;
		}

		function handleSignOut() {
			router.push("/login");
		}

		return () => {
			// Login page renders without the admin shell
			if (isLoginRoute.value) {
				return h(RouterView);
			}

			const sidebarItems = buildSidebarItems(enabledModules.value, role.value);

			return h(AdminLayout, {
				sidebarItems,
				headerData: {
					businessName: businessName.value,
					userDisplayName: userDisplayName.value,
				},
				isSidebarOpen: isSidebarOpen.value,
				isImpersonating: isImpersonating.value,
				impersonationLabel: impersonationLabel.value,
				authDescription: authDescription.value,
				onToggleSidebar: toggleSidebar,
				onSignOut: handleSignOut,
			});
		};
	},
});

const app = createApp(AppShell);
app.provide(SDK_CLIENT_KEY, sdkClient);
app.use(router);
app.mount("#app");

