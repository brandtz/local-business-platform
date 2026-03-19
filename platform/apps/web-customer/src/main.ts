// E4-S2-T1: Tenant-aware bootstrap — resolves tenant context from the current
// host before any route renders. On success the full storefront app mounts;
// on failure a minimal error shell mounts instead.

import { createApp, defineComponent, h } from "vue";
import { createRouter, createWebHistory, RouterLink, RouterView } from "vue-router";

import { createRoutes } from "./routes";
import { getRuntimeConfig } from "./runtime-config";
import {
	createDevBootstrapDataSource,
	executeTenantBootstrap,
	readManagedPreviewDomains,
	TENANT_BOOTSTRAP_RESULT_KEY,
	TENANT_CONTEXT_KEY
} from "./tenant-context";
import {
	describeBootstrapResult,
	isBootstrapResolved,
	type BootstrapResult,
	type TenantFrontendContext
} from "./tenant-bootstrap";

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
		mountFailureShell(result);
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

// ── Failure Shell Mount ──────────────────────────────────────────────────────

function mountFailureShell(result: BootstrapResult): void {
	const FailureShell = defineComponent({
		name: "WebCustomerBootstrapFailure",
		setup() {
			return () =>
				h("div", { class: "bootstrap-failure", role: "alert" }, [
					h("h1", "Unable to load storefront"),
					h("p", describeBootstrapResult(result))
				]);
		}
	});

	const app = createApp(FailureShell);

	app.provide(TENANT_BOOTSTRAP_RESULT_KEY, result);
	app.mount("#app");
}

// ── Entry Point ──────────────────────────────────────────────────────────────

bootstrap();
