import { describe, expect, it } from "vitest";

import {
	TenantCustomDomainPolicyError,
	TenantCustomDomainPolicyService
} from "./tenant-custom-domain-policy.service";

const service = new TenantCustomDomainPolicyService();

describe("tenant custom domain policy service", () => {
	it("returns allowed verification and promotion transitions for lifecycle-ready states", () => {
		expect(service.getAllowedVerificationTransitions("pending")).toEqual([
			"verified",
			"failed",
			"denied"
		]);

		expect(service.getAllowedPromotionTransitions("ready")).toEqual([
			"promoted",
			"failed",
			"denied"
		]);

		expect(service.getAllowedPromotionTransitions("promoted")).toEqual([
			"rollback-pending"
		]);
	});

	it("allows valid verification and promotion transitions including rollback states", () => {
		expect(service.requireVerificationTransition("pending", "verified")).toEqual({
			from: "pending",
			to: "verified"
		});

		expect(service.requireVerificationTransition("failed", "pending")).toEqual({
			from: "failed",
			to: "pending"
		});

		expect(service.requirePromotionTransition("ready", "promoted")).toEqual({
			from: "ready",
			to: "promoted"
		});

		expect(
			service.requirePromotionTransition("promoted", "rollback-pending")
		).toEqual({
			from: "promoted",
			to: "rollback-pending"
		});

		expect(
			service.requirePromotionTransition("rollback-pending", "rolled-back")
		).toEqual({
			from: "rollback-pending",
			to: "rolled-back"
		});
	});

	it("rejects invalid or repeated transitions for verification and promotion", () => {
		expect(() => service.requireVerificationTransition("verified", "verified")).toThrow(
			TenantCustomDomainPolicyError
		);

		try {
			service.requireVerificationTransition("denied", "verified");
		} catch (error) {
			expect((error as TenantCustomDomainPolicyError).reason).toBe(
				"invalid-verification-transition"
			);
		}

		try {
			service.requirePromotionTransition("not-requested", "promoted");
		} catch (error) {
			expect((error as TenantCustomDomainPolicyError).reason).toBe(
				"invalid-promotion-transition"
			);
		}

		try {
			service.requirePromotionTransition("rolled-back", "promoted");
		} catch (error) {
			expect((error as TenantCustomDomainPolicyError).reason).toBe(
				"invalid-promotion-transition"
			);
		}
	});
});