import { describe, expect, it } from "vitest";

import {
	PasswordResetLifecycleError,
	PasswordResetLifecycleService
} from "./password-reset-lifecycle";

describe("password reset lifecycle service", () => {
	const service = new PasswordResetLifecycleService({
		resetTokenTtlMs: 1000 * 60 * 15
	});

	it("issues a generic request result and only creates a record when the user exists", () => {
		const issuedAt = new Date("2026-03-16T19:00:00.000Z");
		const existingUserResult = service.issueResetRequest(
			{
				email: "owner@example.com",
				resetTokenHash: "reset-hash-1",
				userExists: true,
				userId: "user-1"
			},
			issuedAt
		);
		const missingUserResult = service.issueResetRequest(
			{
				email: "missing@example.com",
				resetTokenHash: "reset-hash-2",
				userExists: false,
				userId: "missing-user"
			},
			issuedAt
		);

		expect(existingUserResult.requested).toBe(true);
		expect(existingUserResult.issuedRecord?.expiresAt.toISOString()).toBe(
			"2026-03-16T19:15:00.000Z"
		);
		expect(missingUserResult).toEqual({
			issuedRecord: null,
			requested: true
		});
	});

	it("completes a reset with a valid token and stores the new password hash", () => {
		const issuedAt = new Date("2026-03-16T19:00:00.000Z");
		const resetRequest = service.issueResetRequest(
			{
				email: "owner@example.com",
				resetTokenHash: "reset-hash-1",
				userExists: true,
				userId: "user-1"
			},
			issuedAt
		);
		const completed = service.completeReset(
			resetRequest.issuedRecord!,
			{
				newPasswordHash: "new-password-hash",
				resetTokenHash: "reset-hash-1"
			},
			new Date("2026-03-16T19:05:00.000Z")
		);

		expect(completed.completedAt?.toISOString()).toBe("2026-03-16T19:05:00.000Z");
		expect(completed.newPasswordHash).toBe("new-password-hash");
	});

	it("rejects expired, replayed, and invalid reset token completion attempts", () => {
		const issuedAt = new Date("2026-03-16T19:00:00.000Z");
		const resetRequest = service.issueResetRequest(
			{
				email: "owner@example.com",
				resetTokenHash: "reset-hash-1",
				userExists: true,
				userId: "user-1"
			},
			issuedAt
		);

		expect(() =>
			service.completeReset(
				resetRequest.issuedRecord!,
				{
					newPasswordHash: "new-password-hash",
					resetTokenHash: "wrong-hash"
				},
				new Date("2026-03-16T19:01:00.000Z")
			)
		).toThrow("Password reset token is invalid.");

		expect(() =>
			service.completeReset(
				resetRequest.issuedRecord!,
				{
					newPasswordHash: "new-password-hash",
					resetTokenHash: "reset-hash-1"
				},
				new Date("2026-03-16T19:16:00.000Z")
			)
		).toThrow("Password reset token has expired.");

		const completed = service.completeReset(
			resetRequest.issuedRecord!,
			{
				newPasswordHash: "new-password-hash",
				resetTokenHash: "reset-hash-1"
			},
			new Date("2026-03-16T19:05:00.000Z")
		);

		expect(() =>
			service.completeReset(
				completed,
				{
					newPasswordHash: "another-password-hash",
					resetTokenHash: "reset-hash-1"
				},
				new Date("2026-03-16T19:06:00.000Z")
			)
		).toThrow(PasswordResetLifecycleError);
	});
});