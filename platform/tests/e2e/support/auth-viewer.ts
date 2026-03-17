import type { Page } from "@playwright/test";

export const WEB_ADMIN_AUTH_VIEWER_KEY = "__platform_test_web_admin_auth_viewer__";
export const WEB_CUSTOMER_AUTH_VIEWER_KEY = "__platform_test_web_customer_auth_viewer__";
export const WEB_PLATFORM_ADMIN_AUTH_VIEWER_KEY =
	"__platform_test_web_platform_admin_auth_viewer__";

export async function setSessionStorageJson(
	page: Page,
	key: string,
	value: unknown
): Promise<void> {
	await page.addInitScript(
		({ storageKey, storageValue }) => {
			window.sessionStorage.setItem(storageKey, JSON.stringify(storageValue));
		},
		{
			storageKey: key,
			storageValue: value
		}
	);
}