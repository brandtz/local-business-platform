import { describe, expect, it } from "vitest";

import { createApiClient } from "./client-factory";
import { createApiClientConfig } from "./api-client";

describe("client factory", () => {
	const config = createApiClientConfig("web-admin", {
		baseUrl: "https://api.example.com",
	});

	const client = createApiClient(config);

	it("returns an object with all domain namespaces", () => {
		const expectedNamespaces = [
			"auth",
			"catalog",
			"services",
			"orders",
			"bookings",
			"customers",
			"staff",
			"payments",
			"notifications",
			"analytics",
			"loyalty",
			"search",
			"content",
			"locations",
			"portfolio",
			"quotes",
			"subscriptions",
			"tenants",
			"domains",
			"config",
			"health",
			"audit",
			"deployments",
			"transport",
		];

		for (const ns of expectedNamespaces) {
			expect(client).toHaveProperty(ns);
			expect(client[ns as keyof typeof client]).toBeDefined();
		}
	});

	describe("auth namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.auth.login).toBe("function");
			expect(typeof client.auth.register).toBe("function");
			expect(typeof client.auth.forgotPassword).toBe("function");
			expect(typeof client.auth.resetPassword).toBe("function");
			expect(typeof client.auth.me).toBe("function");
		});
	});

	describe("catalog namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.catalog.listCategories).toBe("function");
			expect(typeof client.catalog.getCategory).toBe("function");
			expect(typeof client.catalog.createCategory).toBe("function");
			expect(typeof client.catalog.updateCategory).toBe("function");
			expect(typeof client.catalog.deleteCategory).toBe("function");
			expect(typeof client.catalog.listItems).toBe("function");
			expect(typeof client.catalog.getItem).toBe("function");
			expect(typeof client.catalog.createItem).toBe("function");
			expect(typeof client.catalog.updateItem).toBe("function");
			expect(typeof client.catalog.deleteItem).toBe("function");
		});
	});

	describe("services namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.services.list).toBe("function");
			expect(typeof client.services.get).toBe("function");
			expect(typeof client.services.create).toBe("function");
			expect(typeof client.services.update).toBe("function");
			expect(typeof client.services.delete).toBe("function");
			expect(typeof client.services.getAvailability).toBe("function");
		});
	});

	describe("orders namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.orders.list).toBe("function");
			expect(typeof client.orders.get).toBe("function");
			expect(typeof client.orders.create).toBe("function");
			expect(typeof client.orders.updateStatus).toBe("function");
			expect(typeof client.orders.refund).toBe("function");
		});
	});

	describe("bookings namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.bookings.list).toBe("function");
			expect(typeof client.bookings.get).toBe("function");
			expect(typeof client.bookings.create).toBe("function");
			expect(typeof client.bookings.updateStatus).toBe("function");
			expect(typeof client.bookings.reschedule).toBe("function");
			expect(typeof client.bookings.cancel).toBe("function");
		});
	});

	describe("customers namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.customers.list).toBe("function");
			expect(typeof client.customers.get).toBe("function");
			expect(typeof client.customers.getMetrics).toBe("function");
		});
	});

	describe("staff namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.staff.list).toBe("function");
			expect(typeof client.staff.get).toBe("function");
			expect(typeof client.staff.invite).toBe("function");
			expect(typeof client.staff.update).toBe("function");
			expect(typeof client.staff.deactivate).toBe("function");
			expect(typeof client.staff.getSchedule).toBe("function");
		});
	});

	describe("payments namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.payments.getConfig).toBe("function");
			expect(typeof client.payments.updateConfig).toBe("function");
			expect(typeof client.payments.listMethods).toBe("function");
			expect(typeof client.payments.addMethod).toBe("function");
			expect(typeof client.payments.removeMethod).toBe("function");
		});
	});

	describe("notifications namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.notifications.list).toBe("function");
			expect(typeof client.notifications.markRead).toBe("function");
		});
	});

	describe("analytics namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.analytics.dashboard).toBe("function");
			expect(typeof client.analytics.revenue).toBe("function");
			expect(typeof client.analytics.salesBreakdown).toBe("function");
			expect(typeof client.analytics.topPerformers).toBe("function");
		});
	});

	describe("loyalty namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.loyalty.getConfig).toBe("function");
			expect(typeof client.loyalty.updateConfig).toBe("function");
			expect(typeof client.loyalty.getCustomerPoints).toBe("function");
			expect(typeof client.loyalty.listRewards).toBe("function");
			expect(typeof client.loyalty.redeem).toBe("function");
		});
	});

	describe("search namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.search.query).toBe("function");
		});
	});

	describe("content namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.content.listPages).toBe("function");
			expect(typeof client.content.getPage).toBe("function");
			expect(typeof client.content.createPage).toBe("function");
			expect(typeof client.content.updatePage).toBe("function");
			expect(typeof client.content.deletePage).toBe("function");
			expect(typeof client.content.listAnnouncements).toBe("function");
			expect(typeof client.content.getAnnouncement).toBe("function");
			expect(typeof client.content.createAnnouncement).toBe("function");
			expect(typeof client.content.updateAnnouncement).toBe("function");
			expect(typeof client.content.deleteAnnouncement).toBe("function");
		});
	});

	describe("locations namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.locations.list).toBe("function");
			expect(typeof client.locations.get).toBe("function");
			expect(typeof client.locations.create).toBe("function");
			expect(typeof client.locations.update).toBe("function");
			expect(typeof client.locations.delete).toBe("function");
		});
	});

	describe("portfolio namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.portfolio.list).toBe("function");
			expect(typeof client.portfolio.get).toBe("function");
			expect(typeof client.portfolio.create).toBe("function");
			expect(typeof client.portfolio.update).toBe("function");
			expect(typeof client.portfolio.delete).toBe("function");
		});
	});

	describe("quotes namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.quotes.list).toBe("function");
			expect(typeof client.quotes.get).toBe("function");
			expect(typeof client.quotes.create).toBe("function");
			expect(typeof client.quotes.update).toBe("function");
			expect(typeof client.quotes.delete).toBe("function");
			expect(typeof client.quotes.send).toBe("function");
			expect(typeof client.quotes.accept).toBe("function");
			expect(typeof client.quotes.decline).toBe("function");
		});
	});

	describe("subscriptions namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.subscriptions.listPlans).toBe("function");
			expect(typeof client.subscriptions.getPlan).toBe("function");
			expect(typeof client.subscriptions.createPlan).toBe("function");
			expect(typeof client.subscriptions.updatePlan).toBe("function");
			expect(typeof client.subscriptions.deletePlan).toBe("function");
			expect(typeof client.subscriptions.getSubscription).toBe("function");
			expect(typeof client.subscriptions.createSubscription).toBe("function");
			expect(typeof client.subscriptions.cancelSubscription).toBe("function");
		});
	});

	describe("tenants namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.tenants.list).toBe("function");
			expect(typeof client.tenants.get).toBe("function");
			expect(typeof client.tenants.create).toBe("function");
			expect(typeof client.tenants.update).toBe("function");
			expect(typeof client.tenants.impersonate).toBe("function");
		});
	});

	describe("domains namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.domains.list).toBe("function");
			expect(typeof client.domains.get).toBe("function");
			expect(typeof client.domains.create).toBe("function");
			expect(typeof client.domains.verify).toBe("function");
			expect(typeof client.domains.delete).toBe("function");
		});
	});

	describe("config namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.config.getModules).toBe("function");
			expect(typeof client.config.updateModule).toBe("function");
			expect(typeof client.config.getGlobal).toBe("function");
			expect(typeof client.config.updateGlobal).toBe("function");
		});
	});

	describe("health namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.health.status).toBe("function");
			expect(typeof client.health.jobs).toBe("function");
		});
	});

	describe("audit namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.audit.list).toBe("function");
			expect(typeof client.audit.get).toBe("function");
		});
	});

	describe("deployments namespace", () => {
		it("has expected methods", () => {
			expect(typeof client.deployments.list).toBe("function");
			expect(typeof client.deployments.get).toBe("function");
			expect(typeof client.deployments.trigger).toBe("function");
			expect(typeof client.deployments.rollback).toBe("function");
		});
	});

	describe("transport access", () => {
		it("exposes the underlying transport", () => {
			expect(typeof client.transport.setAuthToken).toBe("function");
			expect(typeof client.transport.clearAuthToken).toBe("function");
			expect(typeof client.transport.setTenantId).toBe("function");
			expect(typeof client.transport.clearTenantId).toBe("function");
			expect(typeof client.transport.getActiveRequestCount).toBe("function");
		});
	});
});
