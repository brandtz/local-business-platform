import { describe, expect, it } from "vitest";

import { PrivilegedAuthPolicyService } from "./privileged-auth-policy.service";

const service = new PrivilegedAuthPolicyService();

describe("privileged auth policy service", () => {
	it("requires fresh multifactor step-up for platform write and impersonation operations", () => {
		expect(
			service.resolveStepUpDecision({
				actorType: "platform",
				operation: "platform:write",
				platformRole: "admin",
				sessionScope: "platform"
			})
		).toEqual({
			maxAgeSeconds: 600,
			reason: "platform-write",
			required: true,
			requiredLevel: "multi-factor"
		});

		expect(
			service.resolveStepUpDecision({
				actorType: "platform",
				operation: "impersonation:start",
				platformRole: "support",
				sessionScope: "platform"
			})
		).toEqual({
			maxAgeSeconds: 300,
			reason: "platform-impersonation",
			required: true,
			requiredLevel: "multi-factor"
		});
	});

	it("requires step-up for tenant payment, refund, and sensitive admin writes", () => {
		expect(
			service.resolveStepUpDecision({
				actorType: "tenant",
				operation: "tenant:payment-write",
				sessionScope: "tenant",
				tenantRole: "owner"
			})
		).toEqual({
			maxAgeSeconds: 300,
			reason: "payment-credential-write",
			required: true,
			requiredLevel: "multi-factor"
		});

		expect(
			service.resolveStepUpDecision({
				actorType: "tenant",
				operation: "tenant:refund-write",
				sessionScope: "tenant",
				tenantRole: "admin"
			})
		).toEqual({
			maxAgeSeconds: 300,
			reason: "refund-write",
			required: true,
			requiredLevel: "multi-factor"
		});

		expect(
			service.resolveStepUpDecision({
				actorType: "tenant",
				operation: "tenant:settings-write",
				sessionScope: "tenant",
				tenantRole: "owner"
			})
		).toEqual({
			maxAgeSeconds: 900,
			reason: "tenant-admin-sensitive-write",
			required: true,
			requiredLevel: "multi-factor"
		});
	});

	it("does not require step-up for lower-risk reads or lower-privilege tenant actions", () => {
		expect(
			service.resolveStepUpDecision({
				actorType: "platform",
				operation: "platform:read",
				platformRole: "analyst",
				sessionScope: "platform"
			})
		).toEqual({
			maxAgeSeconds: null,
			reason: null,
			required: false,
			requiredLevel: null
		});

		expect(
			service.resolveStepUpDecision({
				actorType: "tenant",
				operation: "tenant:staff-write",
				sessionScope: "tenant",
				tenantRole: "manager"
			})
		).toEqual({
			maxAgeSeconds: null,
			reason: null,
			required: false,
			requiredLevel: null
		});
	});
});