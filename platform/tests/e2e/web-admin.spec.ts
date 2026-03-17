import { expect, test } from "@playwright/test";

import {
	setSessionStorageJson,
	WEB_ADMIN_AUTH_VIEWER_KEY
} from "./support/auth-viewer";

test.describe("web admin shell", () => {
	test("redirects anonymous viewers to authentication required", async ({ page }) => {
		await page.goto("http://127.0.0.1:4173/");

		await expect(page).toHaveURL(/\/auth-required$/);
		await expect(page.getByRole("heading", { name: "Authentication Required" })).toBeVisible();
	});

	test("allows tenant-admin viewers into the protected shell", async ({ page }) => {
		await setSessionStorageJson(page, WEB_ADMIN_AUTH_VIEWER_KEY, {
			actorType: "tenant",
			displayName: "Tenant Admin",
			isAuthenticated: true,
			sessionScope: "tenant",
			status: "authenticated",
			userId: "tenant-user-1"
		});

		await page.goto("http://127.0.0.1:4173/");

		await expect(page).toHaveURL("http://127.0.0.1:4173/");
		await expect(page.getByRole("heading", { name: "Admin Shell" })).toBeVisible();
		await expect(page.getByText(/authenticated \(tenant scope\)/)).toBeVisible();
	});

	test("renders impersonation context for tenant-admin sessions", async ({ page }) => {
		await setSessionStorageJson(page, WEB_ADMIN_AUTH_VIEWER_KEY, {
			actorType: "tenant",
			displayName: "Tenant Admin",
			impersonationSession: {
				expiresAt: "2026-03-16T21:30:00.000Z",
				impersonatorUserId: "platform-user-1",
				platformRole: "support",
				sessionId: "impersonation-1",
				startedAt: "2026-03-16T21:00:00.000Z",
				targetTenantId: "tenant-1",
				targetTenantName: "Alpha Fitness"
			},
			isAuthenticated: true,
			sessionScope: "tenant",
			status: "authenticated",
			userId: "tenant-user-1"
		});

		await page.goto("http://127.0.0.1:4173/");

		await expect(page.getByText(/Impersonation active for Alpha Fitness/)).toBeVisible();
	});
});