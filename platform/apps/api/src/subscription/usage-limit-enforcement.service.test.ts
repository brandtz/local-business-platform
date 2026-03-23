// E12-S2-T5: Tests for usage-limit enforcement service.
// Verifies soft and hard limit enforcement with warning notifications.

import { describe, expect, it, beforeEach } from "vitest";
import type {
	TenantSubscriptionContext,
} from "@platform/types";
import { UsageLimitEnforcementService } from "./usage-limit-enforcement.service";

// ─── Helpers ────────────────────────────────────────────────────────

function createSubscription(
	overrides: Partial<TenantSubscriptionContext> = {},
): TenantSubscriptionContext {
	return {
		tenantId: "t-1",
		packageId: "pkg-starter",
		packageName: "Starter",
		packageVersionNumber: 1,
		status: "active",
		entitlements: {
			modules: { catalog: true, ordering: true },
			premiumFeatures: [],
			usageLimits: {
				orders_per_month: {
					softLimit: 100,
					hardLimit: 150,
					resetPeriod: "monthly",
				},
				staff_seats: {
					softLimit: null,
					hardLimit: 3,
					resetPeriod: "none",
				},
			},
		},
		gracePeriodEnd: null,
		subscribedAt: "2026-01-01T00:00:00Z",
		...overrides,
	};
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("UsageLimitEnforcementService", () => {
	let service: UsageLimitEnforcementService;

	beforeEach(() => {
		service = new UsageLimitEnforcementService();
		service.resetAllUsage();
	});

	describe("checkLimit", () => {
		it("returns within-limits when under soft limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"orders_per_month",
				50,
			);
			expect(result.status).toBe("within-limits");
			expect(result.warningMessage).toBeNull();
		});

		it("returns soft-limit-warning when at soft limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"orders_per_month",
				100,
			);
			expect(result.status).toBe("soft-limit-warning");
			expect(result.warningMessage).toBeTruthy();
			expect(result.warningMessage).toContain("approaching");
		});

		it("returns soft-limit-warning between soft and hard limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"orders_per_month",
				120,
			);
			expect(result.status).toBe("soft-limit-warning");
			expect(result.remainingBeforeHard).toBe(30);
		});

		it("returns hard-limit-reached at hard limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"orders_per_month",
				150,
			);
			expect(result.status).toBe("hard-limit-reached");
			expect(result.remainingBeforeHard).toBe(0);
			expect(result.warningMessage).toContain("reached the maximum");
		});

		it("returns hard-limit-reached over hard limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"orders_per_month",
				200,
			);
			expect(result.status).toBe("hard-limit-reached");
		});

		it("returns within-limits for unlimited type", () => {
			const result = service.checkLimit(
				createSubscription(),
				"storage_gb",
				1000,
			);
			expect(result.status).toBe("within-limits");
		});

		it("handles limit with no soft limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"staff_seats",
				2,
			);
			expect(result.status).toBe("within-limits");
		});

		it("returns hard-limit-reached for no-soft-limit type at hard limit", () => {
			const result = service.checkLimit(
				createSubscription(),
				"staff_seats",
				3,
			);
			expect(result.status).toBe("hard-limit-reached");
		});

		it("returns hard-limit-reached when no subscription", () => {
			const result = service.checkLimit(null, "orders_per_month", 0);
			expect(result.status).toBe("hard-limit-reached");
			expect(result.warningMessage).toContain("No active subscription");
		});
	});

	describe("incrementAndCheck", () => {
		it("allows increment when under limit", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 50);
			const { allowed, result, notification } = service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(allowed).toBe(true);
			expect(result.currentUsage).toBe(51);
			expect(notification).toBeNull();
		});

		it("allows increment at soft limit but emits notification", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 99);
			const { allowed, result, notification } = service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(allowed).toBe(true);
			expect(result.status).toBe("soft-limit-warning");
			expect(notification).not.toBeNull();
			expect(notification!.status).toBe("soft-limit-warning");
		});

		it("blocks increment at hard limit", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 150);
			const { allowed, result, notification } = service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(allowed).toBe(false);
			expect(result.status).toBe("hard-limit-reached");
			expect(notification).not.toBeNull();
			expect(notification!.status).toBe("hard-limit-reached");
		});

		it("emits notification when approaching hard limit", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 148);
			const { allowed, notification } = service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(allowed).toBe(true);
			expect(notification).not.toBeNull();
			expect(notification!.tenantId).toBe("t-1");
		});
	});

	describe("usage tracking", () => {
		it("starts at 0 for new tenant", () => {
			expect(
				service.getCurrentUsage("t-new", "orders_per_month"),
			).toBe(0);
		});

		it("tracks usage after increment", () => {
			service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(
				service.getCurrentUsage("t-1", "orders_per_month"),
			).toBe(1);
		});

		it("resets usage for specific type", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 50);
			service.resetUsage("t-1", "orders_per_month");
			expect(
				service.getCurrentUsage("t-1", "orders_per_month"),
			).toBe(0);
		});

		it("resets all usage", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 50);
			service.setCurrentUsage("t-1", "staff_seats", 5);
			service.resetAllUsage();
			expect(
				service.getCurrentUsage("t-1", "orders_per_month"),
			).toBe(0);
			expect(
				service.getCurrentUsage("t-1", "staff_seats"),
			).toBe(0);
		});
	});

	describe("notification content", () => {
		it("soft limit notification includes tenant and limit details", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 99);
			const { notification } = service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(notification).not.toBeNull();
			expect(notification!.tenantId).toBe("t-1");
			expect(notification!.limitType).toBe("orders_per_month");
			expect(notification!.hardLimit).toBe(150);
			expect(notification!.emittedAt).toBeTruthy();
		});

		it("hard limit notification has correct status", () => {
			service.setCurrentUsage("t-1", "orders_per_month", 150);
			const { notification } = service.incrementAndCheck(
				createSubscription(),
				"orders_per_month",
				"t-1",
			);
			expect(notification!.status).toBe("hard-limit-reached");
		});
	});
});
