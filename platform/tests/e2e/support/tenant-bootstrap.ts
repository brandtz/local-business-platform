import type { Page } from "@playwright/test";

import { setSessionStorageJson } from "./auth-viewer";

export const WEB_CUSTOMER_BOOTSTRAP_KEY =
	"__platform_test_web_customer_tenant_bootstrap__";

/**
 * Seeds tenant bootstrap data into sessionStorage so the web-customer app
 * resolves a tenant on the smoke-test host (127.0.0.1).
 */
export async function seedCustomerBootstrap(
	page: Page,
	overrides?: {
		displayName?: string;
		slug?: string;
		templateKey?: string;
		enabledModules?: string[];
		customDomains?: string[];
	}
): Promise<void> {
	await setSessionStorageJson(page, WEB_CUSTOMER_BOOTSTRAP_KEY, {
		tenants: [
			{
				id: "t-smoke",
				displayName: overrides?.displayName ?? "Customer Portal",
				slug: overrides?.slug ?? "customer-portal",
				status: "active",
				previewSubdomain: "customer-portal",
				customDomains: overrides?.customDomains ?? ["127.0.0.1"]
			}
		],
		tenantConfig: {
			templateKey: overrides?.templateKey ?? "restaurant-core",
			enabledModules: overrides?.enabledModules ?? ["catalog", "ordering"]
		}
	});
}
