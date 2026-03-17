import { expect, test } from "@playwright/test";

import {
	setSessionStorageJson,
	WEB_PLATFORM_ADMIN_AUTH_VIEWER_KEY
} from "./support/auth-viewer";

test.describe("web platform admin shell", () => {
	test("redirects anonymous viewers to authentication required", async ({ page }) => {
		await page.goto("http://127.0.0.1:4174/");

		await expect(page).toHaveURL(/\/auth-required$/);
		await expect(page.getByRole("heading", { name: "Authentication Required" })).toBeVisible();
	});

	test("allows platform-admin viewers into the protected shell", async ({ page }) => {
		await setSessionStorageJson(page, WEB_PLATFORM_ADMIN_AUTH_VIEWER_KEY, {
			actorType: "platform",
			displayName: "Operator",
			isAuthenticated: true,
			sessionScope: "platform",
			status: "authenticated",
			userId: "platform-user-1"
		});

		await page.goto("http://127.0.0.1:4174/");

		await expect(page).toHaveURL("http://127.0.0.1:4174/");
		await expect(page.getByRole("heading", { name: "Platform Shell" })).toBeVisible();
		await expect(page.getByText(/authenticated \(platform scope\)/)).toBeVisible();
	});

	test("rejects wrong-scope viewers with access denied", async ({ page }) => {
		await setSessionStorageJson(page, WEB_PLATFORM_ADMIN_AUTH_VIEWER_KEY, {
			actorType: "tenant",
			displayName: "Tenant Admin",
			isAuthenticated: true,
			sessionScope: "tenant",
			status: "authenticated",
			userId: "tenant-user-1"
		});

		await page.goto("http://127.0.0.1:4174/");

		await expect(page).toHaveURL(/\/access-denied$/);
		await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
	});
});