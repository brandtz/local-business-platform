import { randomUUID, timingSafeEqual } from "node:crypto";

export type PasswordResetLifecyclePolicy = {
	resetTokenTtlMs: number;
};

export type IssuePasswordResetInput = {
	email: string;
	resetTokenHash: string;
	userExists: boolean;
	userId: string;
};

export type CompletePasswordResetInput = {
	newPasswordHash: string;
	resetTokenHash: string;
};

export type PasswordResetRequestResult = {
	issuedRecord: PasswordResetRecord | null;
	requested: true;
};

export type PasswordResetRecord = {
	completedAt: Date | null;
	email: string;
	expiresAt: Date;
	id: string;
	issuedAt: Date;
	newPasswordHash: string | null;
	resetTokenHash: string;
	userId: string;
};

const DEFAULT_PASSWORD_RESET_POLICY: PasswordResetLifecyclePolicy = {
	resetTokenTtlMs: 1000 * 60 * 30
};

export class PasswordResetLifecycleError extends Error {}

export class PasswordResetLifecycleService {
	constructor(
		private readonly policy: PasswordResetLifecyclePolicy = DEFAULT_PASSWORD_RESET_POLICY
	) {}

	completeReset(
		resetRecord: PasswordResetRecord,
		input: CompletePasswordResetInput,
		now: Date = new Date()
	): PasswordResetRecord {
		if (resetRecord.completedAt) {
			throw new PasswordResetLifecycleError("Password reset token has already been used.");
		}

		if (now >= resetRecord.expiresAt) {
			throw new PasswordResetLifecycleError("Password reset token has expired.");
		}

		if (!this.hashesMatch(resetRecord.resetTokenHash, input.resetTokenHash)) {
			throw new PasswordResetLifecycleError("Password reset token is invalid.");
		}

		return {
			...resetRecord,
			completedAt: now,
			newPasswordHash: input.newPasswordHash
		};
	}

	issueResetRequest(
		input: IssuePasswordResetInput,
		now: Date = new Date()
	): PasswordResetRequestResult {
		if (!input.userExists) {
			return {
				issuedRecord: null,
				requested: true
			};
		}

		return {
			issuedRecord: {
				completedAt: null,
				email: input.email,
				expiresAt: new Date(now.getTime() + this.policy.resetTokenTtlMs),
				id: randomUUID(),
				issuedAt: now,
				newPasswordHash: null,
				resetTokenHash: input.resetTokenHash,
				userId: input.userId
			},
			requested: true
		};
	}

	private hashesMatch(expectedHash: string, providedHash: string): boolean {
		const expectedBuffer = Buffer.from(expectedHash);
		const providedBuffer = Buffer.from(providedHash);

		if (expectedBuffer.length !== providedBuffer.length) {
			return false;
		}

		return timingSafeEqual(expectedBuffer, providedBuffer);
	}
}