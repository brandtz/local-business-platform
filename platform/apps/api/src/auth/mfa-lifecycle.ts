import { randomUUID, timingSafeEqual } from "node:crypto";

import type { AuthActorType, StepUpAuthReason } from "@platform/types";

export const mfaFactorKinds = ["totp", "email-otp"] as const;

export type MfaFactorKind = (typeof mfaFactorKinds)[number];

export const mfaChallengeStates = [
	"pending",
	"verified",
	"expired",
	"locked"
] as const;

export type MfaChallengeState = (typeof mfaChallengeStates)[number];

export type MfaLifecyclePolicy = {
	challengeTtlMs: number;
	maxVerificationAttempts: number;
};

export type IssueMfaChallengeInput = {
	actorType: AuthActorType;
	codeHash: string;
	factorKind: MfaFactorKind;
	purpose: StepUpAuthReason;
	userId: string;
};

export type VerifyMfaChallengeInput = {
	codeHash: string;
};

export type IssueRecoveryCodesInput = {
	actorType: AuthActorType;
	codeHashes: string[];
	userId: string;
};

export type RedeemRecoveryCodeInput = {
	codeHash: string;
};

export type MfaChallengeRecord = {
	actorType: AuthActorType;
	codeHash: string;
	expiresAt: Date;
	failedAttempts: number;
	factorKind: MfaFactorKind;
	id: string;
	issuedAt: Date;
	lastAttemptAt: Date | null;
	purpose: StepUpAuthReason;
	verifiedAt: Date | null;
	userId: string;
};

export type RecoveryCodeRecord = {
	actorType: AuthActorType;
	codeHash: string;
	consumedAt: Date | null;
	id: string;
	issuedAt: Date;
	userId: string;
};

const DEFAULT_MFA_POLICY: MfaLifecyclePolicy = {
	challengeTtlMs: 1000 * 60 * 10,
	maxVerificationAttempts: 5
};

export class MfaLifecycleError extends Error {}

export class MfaLifecycleService {
	constructor(private readonly policy: MfaLifecyclePolicy = DEFAULT_MFA_POLICY) {}

	getChallengeState(
		challenge: MfaChallengeRecord,
		now: Date
	): MfaChallengeState {
		if (challenge.verifiedAt) {
			return "verified";
		}

		if (challenge.failedAttempts >= this.policy.maxVerificationAttempts) {
			return "locked";
		}

		if (now >= challenge.expiresAt) {
			return "expired";
		}

		return "pending";
	}

	issueChallenge(
		input: IssueMfaChallengeInput,
		now: Date = new Date()
	): MfaChallengeRecord {
		return {
			actorType: input.actorType,
			codeHash: input.codeHash,
			expiresAt: new Date(now.getTime() + this.policy.challengeTtlMs),
			failedAttempts: 0,
			factorKind: input.factorKind,
			id: randomUUID(),
			issuedAt: now,
			lastAttemptAt: null,
			purpose: input.purpose,
			verifiedAt: null,
			userId: input.userId
		};
	}

	issueRecoveryCodes(
		input: IssueRecoveryCodesInput,
		now: Date = new Date()
	): RecoveryCodeRecord[] {
		return input.codeHashes.map((codeHash) => ({
			actorType: input.actorType,
			codeHash,
			consumedAt: null,
			id: randomUUID(),
			issuedAt: now,
			userId: input.userId
		}));
	}

	redeemRecoveryCode(
		recoveryCodes: RecoveryCodeRecord[],
		input: RedeemRecoveryCodeInput,
		now: Date = new Date()
	): RecoveryCodeRecord[] {
		const codeIndex = recoveryCodes.findIndex(
			(recoveryCode) =>
				recoveryCode.consumedAt === null &&
				this.hashesMatch(recoveryCode.codeHash, input.codeHash)
		);

		if (codeIndex === -1) {
			throw new MfaLifecycleError("Recovery code is invalid.");
		}

		return recoveryCodes.map((recoveryCode, index) =>
			index === codeIndex
				? {
					...recoveryCode,
					consumedAt: now
				}
				: recoveryCode
		);
	}

	verifyChallenge(
		challenge: MfaChallengeRecord,
		input: VerifyMfaChallengeInput,
		now: Date = new Date()
	): MfaChallengeRecord {
		const challengeState = this.getChallengeState(challenge, now);

		if (challengeState === "verified") {
			throw new MfaLifecycleError("MFA challenge has already been verified.");
		}

		if (challengeState === "expired") {
			throw new MfaLifecycleError("MFA challenge has expired.");
		}

		if (challengeState === "locked") {
			throw new MfaLifecycleError("MFA challenge is locked.");
		}

		if (!this.hashesMatch(challenge.codeHash, input.codeHash)) {
			const nextFailedAttempts = challenge.failedAttempts + 1;

			throw new MfaLifecycleError(
				nextFailedAttempts >= this.policy.maxVerificationAttempts
					? "MFA challenge is locked."
					: "MFA challenge code is invalid."
			);
		}

		return {
			...challenge,
			lastAttemptAt: now,
			verifiedAt: now
		};
	}

	recordFailedAttempt(
		challenge: MfaChallengeRecord,
		now: Date = new Date()
	): MfaChallengeRecord {
		return {
			...challenge,
			failedAttempts: challenge.failedAttempts + 1,
			lastAttemptAt: now
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