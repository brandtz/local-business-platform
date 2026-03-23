import { expect, test } from "@playwright/test";

import {
	setSessionStorageJson,
	WEB_CUSTOMER_AUTH_VIEWER_KEY
} from "./support/auth-viewer";
import { seedCustomerBootstrap } from "./support/tenant-bootstrap";

test.describe("web customer shell", () => {
	test("renders the storefront shell for anonymous viewers", async ({ page }) => {
		await seedCustomerBootstrap(page);
		await page.goto("http://127.0.0.1:4175/");

		await expect(page).toHaveURL("http://127.0.0.1:4175/");
		await expect(page.getByRole("heading", { name: /Welcome to Customer Portal/ })).toBeVisible();
		await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
	});

	test("renders authenticated customer context when seeded", async ({ page }) => {
		await seedCustomerBootstrap(page);
		await setSessionStorageJson(page, WEB_CUSTOMER_AUTH_VIEWER_KEY, {
			actorType: "customer",
			displayName: "Pat Customer",
			isAuthenticated: true,
			sessionScope: "customer",
			status: "authenticated",
			userId: "customer-user-1"
		});

		await page.goto("http://127.0.0.1:4175/");

		await expect(page.getByRole("link", { name: "Account" })).toBeVisible();
	});

	test("exposes the runtime status route", async ({ page }) => {
		await seedCustomerBootstrap(page);
		await page.goto("http://127.0.0.1:4175/status");

		await expect(page.getByRole("heading", { name: "Runtime Status" })).toBeVisible();
		await expect(page.getByText(/App: web-customer\./)).toBeVisible();
	});
});