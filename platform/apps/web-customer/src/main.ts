// E4-S2-T1/T2: Tenant-aware bootstrap — resolves tenant context from the current
// host before any route renders. On success the full storefront app mounts;
// on failure a shell state renders based on the bootstrap outcome.
// Security: failure shells must NOT expose tenant identifiers or configuration.

import { createApp, defineComponent, h } from "vue";
import { createRouter, createWebHistory, RouterLink, RouterView } from "vue-router";

import type { ShellStateDescriptor } from "@platform/ui";

import { createRoutes } from "./routes";
import { getRuntimeConfig } from "./runtime-config";
import {
	classifyBootstrapResult,
	describeBootstrapShellState,
	isRetryableBootstrapFailure,
	resolveBootstrapShellPolicy
} from "./shell-state";
import {
	isBootstrapResolved,
	type BootstrapResult,
	type TenantFrontendContext
} from "./tenant-bootstrap";
import {
	createDevBootstrapDataSource,
	executeTenantBootstrap,
	readManagedPreviewDomains,
	TENANT_BOOTSTRAP_RESULT_KEY,
	TENANT_CONTEXT_KEY
} from "./tenant-context";

const runtimeConfig = getRuntimeConfig();

document.title = runtimeConfig.appTitle;

// ── Bootstrap Gate ───────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
	const result = await executeTenantBootstrap({
		host: window.location.hostname,
		managedPreviewDomains: readManagedPreviewDomains(
			import.meta.env.VITE_MANAGED_PREVIEW_DOMAINS
		),
		fetchData: createDevBootstrapDataSource()
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
	document.title = context.displayName;

	const router = createRouter({
		history: createWebHistory(),
		routes: createRoutes(runtimeConfig, context)
	});

	const AppShell = defineComponent({
		name: "WebCustomerShell",
		setup() {
			return () =>
				h("div", { class: "app-shell" }, [
					h("header", [
						h("h1", context.displayName),
						h("p", `Tenant: ${context.slug} | Template: ${context.templateKey}`)
					]),
					h("nav", [
						h(RouterLink, { to: "/" }, { default: () => "Home" }),
						" | ",
						h(RouterLink, { to: "/status" }, { default: () => "Status" })
					]),
					h("main", [h(RouterView)])
				]);
		}
	});

	const app = createApp(AppShell);

	app.provide(TENANT_CONTEXT_KEY, context);
	app.provide(TENANT_BOOTSTRAP_RESULT_KEY, result);
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
	category: string,
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
