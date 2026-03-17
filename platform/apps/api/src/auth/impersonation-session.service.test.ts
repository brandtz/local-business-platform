import { describe, expect, it } from "vitest";

import {
	ImpersonationSessionError,
	ImpersonationSessionService
} from "./impersonation-session.service";

describe("impersonation session service", () => {
	const service = new ImpersonationSessionService({
		maxTtlMs: 1000 * 60 * 20
	});

	it("starts sessions with explicit target tenant and expiry", () => {
		const session = service.startSession(
			{
				impersonatorUserId: "platform-user-1",
				platformRole: "support",
				reason: "Troubleshoot setup",
				targetTenant: {
					displayName: "Alpha Fitness",
					id: "tenant-1",
					slug: "alpha-fitness",
					status: "active"
				}
			},
			new Date("2026-03-16T21:00:00.000Z")
		);

		expect(session.expiresAt.toISOString()).toBe("2026-03-16T21:20:00.000Z");
		expect(service.toSummary(session)).toMatchObject({
			impersonatorUserId: "platform-user-1",
			platformRole: "support",
			targetTenantId: "tenant-1",
			targetTenantName: "Alpha Fitness"
		});
	});

	it("tracks active, expired, and revoked impersonation states", () => {
		const startedAt = new Date("2026-03-16T21:00:00.000Z");
		const session = service.startSession(
			{
				impersonatorUserId: "platform-user-1",
				platformRole: "admin",
				reason: "Support request",
				targetTenant: {
					displayName: "Alpha Fitness",
					id: "tenant-1",
					slug: "alpha-fitness",
					status: "active"
				}
			},
			startedAt
		);

		expect(service.getSessionState(session, new Date("2026-03-16T21:10:00.000Z"))).toBe(
			"active"
		);
		expect(service.getSessionState(session, new Date("2026-03-16T21:21:00.000Z"))).toBe(
			"expired"
		);

		const revoked = service.revokeSession(session, "Ended support", new Date("2026-03-16T21:05:00.000Z"));
		expect(service.getSessionState(revoked, new Date("2026-03-16T21:06:00.000Z"))).toBe(
			"revoked"
		);
		expect(() => service.requireActiveSession(revoked)).toThrow(ImpersonationSessionError);
	});
});