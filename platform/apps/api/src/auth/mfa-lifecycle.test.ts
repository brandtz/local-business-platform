import { describe, expect, it } from "vitest";

import { MfaLifecycleError, MfaLifecycleService } from "./mfa-lifecycle";

describe("mfa lifecycle service", () => {
	const service = new MfaLifecycleService({
		challengeTtlMs: 1000 * 60 * 5,
		maxVerificationAttempts: 3
	});

	it("issues and verifies an MFA challenge within the allowed window", () => {
		const issuedAt = new Date("2026-03-16T18:00:00.000Z");
		const challenge = service.issueChallenge(
			{
				actorType: "platform",
				codeHash: "hash-1",
				factorKind: "totp",
				purpose: "platform-write",
				userId: "user-1"
			},
			issuedAt
		);
		const verified = service.verifyChallenge(
			challenge,
			{ codeHash: "hash-1" },
			new Date("2026-03-16T18:03:00.000Z")
		);

		expect(challenge.expiresAt.toISOString()).toBe("2026-03-16T18:05:00.000Z");
		expect(verified.verifiedAt?.toISOString()).toBe("2026-03-16T18:03:00.000Z");
		expect(service.getChallengeState(verified, new Date("2026-03-16T18:03:01.000Z"))).toBe(
			"verified"
		);
	});

	it("rejects expired and replayed MFA challenge verification", () => {
		const issuedAt = new Date("2026-03-16T18:00:00.000Z");
		const expiredChallenge = service.issueChallenge(
			{
				actorType: "tenant",
				codeHash: "hash-2",
				factorKind: "email-otp",
				purpose: "tenant-admin-sensitive-write",
				userId: "user-2"
			},
			issuedAt
		);

		expect(() =>
			service.verifyChallenge(
				expiredChallenge,
				{ codeHash: "hash-2" },
				new Date("2026-03-16T18:06:00.000Z")
			)
		).toThrow("MFA challenge has expired.");

		const verifiedChallenge = service.verifyChallenge(
			service.issueChallenge(
				{
					actorType: "platform",
					codeHash: "hash-3",
					factorKind: "totp",
					purpose: "platform-impersonation",
					userId: "user-3"
				},
				issuedAt
			),
			{ codeHash: "hash-3" },
			new Date("2026-03-16T18:01:00.000Z")
		);

		expect(() =>
			service.verifyChallenge(
				verifiedChallenge,
				{ codeHash: "hash-3" },
				new Date("2026-03-16T18:02:00.000Z")
			)
		).toThrow("MFA challenge has already been verified.");
	});

	it("locks a challenge after too many invalid attempts", () => {
		const issuedAt = new Date("2026-03-16T18:00:00.000Z");
		let challenge = service.issueChallenge(
			{
				actorType: "tenant",
				codeHash: "hash-4",
				factorKind: "totp",
				purpose: "refund-write",
				userId: "user-4"
			},
			issuedAt
		);

		for (const [index, attemptTime] of [
			"2026-03-16T18:01:00.000Z",
			"2026-03-16T18:02:00.000Z"
		].entries()) {
			expect(() =>
				service.verifyChallenge(challenge, { codeHash: `wrong-${index}` }, new Date(attemptTime))
			).toThrow("MFA challenge code is invalid.");
			challenge = service.recordFailedAttempt(challenge, new Date(attemptTime));
		}

		expect(() =>
			service.verifyChallenge(
				challenge,
				{ codeHash: "wrong-final" },
				new Date("2026-03-16T18:03:00.000Z")
			)
		).toThrow("MFA challenge is locked.");
		challenge = service.recordFailedAttempt(challenge, new Date("2026-03-16T18:03:00.000Z"));
		expect(service.getChallengeState(challenge, new Date("2026-03-16T18:03:01.000Z"))).toBe(
			"locked"
		);
	});

	it("issues and burns one-time recovery codes", () => {
		const issuedAt = new Date("2026-03-16T18:00:00.000Z");
		const recoveryCodes = service.issueRecoveryCodes(
			{
				actorType: "platform",
				codeHashes: ["recovery-1", "recovery-2"],
				userId: "user-5"
			},
			issuedAt
		);
		const redeemedCodes = service.redeemRecoveryCode(
			recoveryCodes,
			{ codeHash: "recovery-1" },
			new Date("2026-03-16T18:10:00.000Z")
		);

		expect(redeemedCodes[0]?.consumedAt?.toISOString()).toBe(
			"2026-03-16T18:10:00.000Z"
		);
		expect(() =>
			service.redeemRecoveryCode(redeemedCodes, { codeHash: "recovery-1" })
		).toThrow(MfaLifecycleError);
	});
});