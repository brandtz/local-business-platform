import { expect, test } from "@playwright/test";

import {
	setSessionStorageJson,
	WEB_CUSTOMER_AUTH_VIEWER_KEY
} from "./support/auth-viewer";

test.describe("web customer shell", () => {
	test("renders the storefront shell for anonymous viewers", async ({ page }) => {
		await page.goto("http://127.0.0.1:4175/");

		await expect(page).toHaveURL("http://127.0.0.1:4175/");
		await expect(page.getByRole("heading", { name: "Customer Portal" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Storefront Shell" })).toBeVisible();
		await expect(page.getByText(/anonymous \(customer scope\)/)).toBeVisible();
	});

	test("renders authenticated customer context when seeded", async ({ page }) => {
		await setSessionStorageJson(page, WEB_CUSTOMER_AUTH_VIEWER_KEY, {
			actorType: "customer",
			displayName: "Pat Customer",
			isAuthenticated: true,
			sessionScope: "customer",
			status: "authenticated",
			userId: "customer-user-1"
		});

		await page.goto("http://127.0.0.1:4175/");

		await expect(page.getByText(/authenticated \(customer scope\)/)).toBeVisible();
	});

	test("exposes the runtime status route", async ({ page }) => {
		await page.goto("http://127.0.0.1:4175/status");

		await expect(page.getByRole("heading", { name: "Runtime Status" })).toBeVisible();
		await expect(page.getByText(/Application web-customer bootstrapped successfully\./)).toBeVisible();
	});
});