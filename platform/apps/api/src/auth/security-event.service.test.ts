import { describe, expect, it } from "vitest";

import { SecurityEventService } from "./security-event.service";

const service = new SecurityEventService();

describe("security event service", () => {
	it("creates deterministic auth event records with mapped severities", () => {
		const event = service.createEvent({
			actorType: "platform",
			context: {
				ipAddress: "127.0.0.1",
				resetToken: undefined
			},
			kind: "auth.password_reset_completed",
			occurredAt: new Date("2026-03-16T20:00:00.000Z"),
			tenantId: null,
			userId: "user-1"
		});

		expect(event.kind).toBe("auth.password_reset_completed");
		expect(event.severity).toBe("critical");
		expect(event.actorType).toBe("platform");
		expect(event.occurredAt).toBe("2026-03-16T20:00:00.000Z");
		expect(event.context).toEqual({
			ipAddress: "127.0.0.1",
			resetToken: null
		});
	});

	it("assigns warning severity to login anomalies and mfa/reset failures", () => {
		expect(service.createEvent({ kind: "auth.login_failed" }).severity).toBe("warning");
		expect(service.createEvent({ kind: "auth.mfa_challenge_failed" }).severity).toBe(
			"warning"
		);
		expect(service.createEvent({ kind: "auth.password_reset_failed" }).severity).toBe(
			"warning"
		);
		expect(service.createEvent({ kind: "auth.impersonation_started" }).severity).toBe(
			"critical"
		);
		expect(service.createEvent({ kind: "auth.impersonation_revoked" }).severity).toBe(
			"info"
		);
	});
});