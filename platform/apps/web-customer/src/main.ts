// E4-S2-T1/T2: Tenant-aware bootstrap — resolves tenant context from the current
// host before any route renders. On success the full storefront app mounts;
// on failure a shell state renders based on the bootstrap outcome.
// Security: failure shells must NOT expose tenant identifiers or configuration.

import { createApp, defineComponent, h, ref } from "vue";
import { createRouter, createWebHistory, RouterLink, RouterView } from "vue-router";

import type { ShellStateDescriptor } from "@platform/ui";
import { createApiClientConfig } from "@platform/sdk";

import { SDK_CLIENT_KEY, createCustomerSdkClient } from "./composables/use-sdk";
import { useAuth, createInitialAuthState } from "./composables/use-auth";
import { CustomerLayout } from "./layout/customer-layout";
import { createInitialCartState } from "./cart-state";
import { createRoutes } from "./routes";
import { getRuntimeConfig } from "./runtime-config";
import {
	classifyBootstrapResult,
	isRetryableBootstrapFailure,
	resolveBootstrapShellPolicy,
	type BootstrapShellCategory
} from "./shell-state";
import {
	isBootstrapResolved,
	type BootstrapResult,
	type TenantFrontendContext
} from "./tenant-bootstrap";
import {
	createBootstrapDataSource,
	executeTenantBootstrap,
	readManagedPreviewDomains,
	TENANT_BOOTSTRAP_RESULT_KEY,
	TENANT_CONTEXT_KEY
} from "./tenant-context";
import { freezeTenantContext } from "./tenant-context-consumer";

const runtimeConfig = getRuntimeConfig();

document.title = runtimeConfig.appTitle;

// ── Bootstrap Gate ───────────────────────────────────────────────────────────

function resolveBootstrapDataSource() {
	const apiConfig = createApiClientConfig("web-customer", {
		baseUrl: import.meta.env.VITE_API_BASE_URL
	});

	return createBootstrapDataSource(apiConfig);
}

async function bootstrap(): Promise<void> {
	const result = await executeTenantBootstrap({
		host: window.location.hostname,
		managedPreviewDomains: readManagedPreviewDomains(
			import.meta.env.VITE_MANAGED_PREVIEW_DOMAINS
		),
		fetchData: resolveBootstrapDataSource()
	});

	if (isBootstrapResolved(result)) {
		mountApp(result.context, result);
	} else {
		mountShellState(result);
	}
}

// ── Resolved App Mount ───────────────────────────────────────────────────────

function mountApp(
	context: TenantFrontendContext,
	result: BootstrapResult
): void {
	const frozenContext = freezeTenantContext(context);

	document.title = frozenContext.displayName;

	const router = createRouter({
		history: createWebHistory(),
		routes: createRoutes(runtimeConfig, frozenContext)
	});

	// Create SDK client for API calls
	const sdkClient = createCustomerSdkClient(
		import.meta.env.VITE_API_BASE_URL
	);
	sdkClient.transport.setTenantId(frozenContext.tenantId);

	const AppShell = defineComponent({
		name: "WebCustomerShell",
		setup() {
			const authState = ref(createInitialAuthState());
			const cartState = ref(createInitialCartState());

			function onLogout(): void {
				authState.value = {
					isAuthenticated: false,
					user: null,
					token: null,
					isLoading: false,
					error: null,
				};
				sdkClient.transport.clearAuthToken();
				router.push("/");
			}

			return () =>
				h(CustomerLayout, {
					tenantContext: frozenContext,
					authState: authState.value,
					cartState: cartState.value,
					onLogout,
				});
		}
	});

	const app = createApp(AppShell);

	app.provide(TENANT_CONTEXT_KEY, frozenContext);
	app.provide(TENANT_BOOTSTRAP_RESULT_KEY, result);
	app.provide(SDK_CLIENT_KEY, sdkClient);
	app.use(router);
	app.mount("#app");
}

// ── Shell State Mount ────────────────────────────────────────────────────────
// Renders a shell state for non-resolved bootstrap outcomes using
// ShellStateDescriptor and ShellChromePolicy from @platform/ui.

function mountShellState(result: BootstrapResult): void {
	const policy = resolveBootstrapShellPolicy(result);
	const category = classifyBootstrapResult(result);
	const retryable = isRetryableBootstrapFailure(result);

	const ShellStateView = defineComponent({
		name: "WebCustomerShellState",
		setup() {
			return () => renderShellState(policy.descriptor, category, retryable);
		}
	});

	const app = createApp(ShellStateView);

	app.provide(TENANT_BOOTSTRAP_RESULT_KEY, result);
	app.mount("#app");
}

// ── Shell State Render Functions ─────────────────────────────────────────────

function renderShellState(
	descriptor: ShellStateDescriptor,
	category: BootstrapShellCategory,
	retryable: boolean
) {
	switch (category) {
		case "loading":
			return renderLoadingState(descriptor);
		case "suspended-tenant":
			return renderSuspendedState(descriptor);
		case "error":
			return renderErrorState(descriptor, retryable);
		case "unresolved-tenant":
			return renderUnresolvedState(descriptor);
		default:
			return renderErrorState(descriptor, false);
	}
}

function renderLoadingState(descriptor: ShellStateDescriptor) {
	return h(
		"div",
		{
			class: "shell-state shell-state--loading",
			role: "status",
			"aria-live": "polite",
			"data-shell-state": "loading"
		},
		[
			h("div", { class: "shell-state__content" }, [
				h("div", { class: "shell-state__spinner", "aria-hidden": "true" }),
				h("h1", { class: "shell-state__title" }, descriptor.title),
				h("p", { class: "shell-state__message" }, descriptor.message)
			])
		]
	);
}

function renderErrorState(
	descriptor: ShellStateDescriptor,
	retryable: boolean
) {
	const children = [
		h("h1", { class: "shell-state__title" }, descriptor.title),
		h("p", { class: "shell-state__message" }, descriptor.message)
	];

	if (retryable) {
		children.push(
			h(
				"button",
				{
					class: "shell-state__retry",
					type: "button",
					onClick: () => window.location.reload()
				},
				"Try Again"
			)
		);
	}

	return h(
		"div",
		{
			class: "shell-state shell-state--error",
			role: "alert",
			"data-shell-state": "error"
		},
		[h("div", { class: "shell-state__content" }, children)]
	);
}

function renderUnresolvedState(descriptor: ShellStateDescriptor) {
	return h(
		"div",
		{
			class: "shell-state shell-state--unresolved",
			role: "alert",
			"data-shell-state": "unresolved"
		},
		[
			h("div", { class: "shell-state__content" }, [
				h("h1", { class: "shell-state__title" }, descriptor.title),
				h("p", { class: "shell-state__message" }, descriptor.message)
			])
		]
	);
}

function renderSuspendedState(descriptor: ShellStateDescriptor) {
	return h(
		"div",
		{
			class: "shell-state shell-state--suspended",
			role: "alert",
			"data-shell-state": "suspended"
		},
		[
			h("div", { class: "shell-state__content" }, [
				h("h1", { class: "shell-state__title" }, descriptor.title),
				h("p", { class: "shell-state__message" }, descriptor.message)
			])
		]
	);
}

// ── Entry Point ──────────────────────────────────────────────────────────────

bootstrap();
