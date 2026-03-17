import { describe, expect, it } from "vitest";

import {
	SessionLifecycleError,
	SessionLifecycleService
} from "./session-lifecycle";

describe("session lifecycle service", () => {
	const service = new SessionLifecycleService({
		absoluteTtlMs: 1000 * 60 * 60,
		idleTtlMs: 1000 * 60 * 30
	});

	it("issues a session with deterministic timestamps", () => {
		const now = new Date("2026-03-15T12:00:00.000Z");
		const session = service.issueSession(
			{
				actorType: "tenant",
				refreshTokenHash: "hash-1",
				scope: "tenant",
				userId: "user-1"
			},
			now
		);

		expect(session.actorType).toBe("tenant");
		expect(session.scope).toBe("tenant");
		expect(session.expiresAt.toISOString()).toBe("2026-03-15T13:00:00.000Z");
		expect(session.idleExpiresAt.toISOString()).toBe("2026-03-15T12:30:00.000Z");
		expect(service.getSessionState(session, now)).toBe("active");
	});

	it("refreshes an active session and rotates the token hash", () => {
		const issuedAt = new Date("2026-03-15T12:00:00.000Z");
		const session = service.issueSession(
			{
				actorType: "platform",
				refreshTokenHash: "hash-1",
				scope: "platform",
				userId: "user-2"
			},
			issuedAt
		);
		const refreshedAt = new Date("2026-03-15T12:20:00.000Z");
		const refreshed = service.refreshSession(
			session,
			{ refreshTokenHash: "hash-2" },
			refreshedAt
		);

		expect(refreshed.refreshTokenHash).toBe("hash-2");
		expect(refreshed.lastSeenAt?.toISOString()).toBe("2026-03-15T12:20:00.000Z");
		expect(refreshed.expiresAt.toISOString()).toBe("2026-03-15T13:20:00.000Z");
	});

	it("marks sessions expired when absolute or idle ttl elapses", () => {
		const issuedAt = new Date("2026-03-15T12:00:00.000Z");
		const session = service.issueSession(
			{
				actorType: "customer",
				refreshTokenHash: "hash-3",
				scope: "customer",
				userId: "user-3"
			},
			issuedAt
		);

		expect(service.getSessionState(session, new Date("2026-03-15T12:31:00.000Z"))).toBe(
			"expired"
		);
	});

	it("revokes a session and prevents future refresh", () => {
		const issuedAt = new Date("2026-03-15T12:00:00.000Z");
		const session = service.issueSession(
			{
				actorType: "tenant",
				refreshTokenHash: "hash-4",
				scope: "tenant",
				userId: "user-4"
			},
			issuedAt
		);
		const revoked = service.revokeSession(session, "manual logout", new Date("2026-03-15T12:05:00.000Z"));

		expect(service.getSessionState(revoked, new Date("2026-03-15T12:06:00.000Z"))).toBe(
			"revoked"
		);
		expect(() =>
			service.refreshSession(
				revoked,
				{ refreshTokenHash: "hash-5" },
				new Date("2026-03-15T12:07:00.000Z")
			)
		).toThrow(SessionLifecycleError);
	});
});
