import { randomUUID } from "node:crypto";

export type AuthActorType = "platform" | "tenant" | "customer";

export type SessionScope = "platform" | "tenant" | "customer";

export type SessionLifecycleState = "active" | "expired" | "revoked";

export type SessionLifecyclePolicy = {
	absoluteTtlMs: number;
	idleTtlMs: number;
};

export type IssueSessionInput = {
	actorType: AuthActorType;
	refreshTokenHash: string;
	scope: SessionScope;
	userId: string;
};

export type RefreshSessionInput = {
	refreshTokenHash: string;
};

export type SessionRecord = {
	actorType: AuthActorType;
	createdAt: Date;
	expiresAt: Date;
	id: string;
	idleExpiresAt: Date;
	issuedAt: Date;
	lastSeenAt: Date | null;
	refreshTokenHash: string;
	revocationReason: string | null;
	revokedAt: Date | null;
	scope: SessionScope;
	updatedAt: Date;
	userId: string;
};

const DEFAULT_SESSION_POLICY: SessionLifecyclePolicy = {
	absoluteTtlMs: 1000 * 60 * 60 * 24 * 14,
	idleTtlMs: 1000 * 60 * 60 * 24 * 7
};

export class SessionLifecycleError extends Error {}

export class SessionLifecycleService {
	constructor(private readonly policy: SessionLifecyclePolicy = DEFAULT_SESSION_POLICY) {}

	getSessionState(session: SessionRecord, now: Date): SessionLifecycleState {
		if (session.revokedAt) {
			return "revoked";
		}

		if (now >= session.expiresAt || now >= session.idleExpiresAt) {
			return "expired";
		}

		return "active";
	}

	issueSession(input: IssueSessionInput, now: Date = new Date()): SessionRecord {
		return {
			actorType: input.actorType,
			createdAt: now,
			expiresAt: new Date(now.getTime() + this.policy.absoluteTtlMs),
			id: randomUUID(),
			idleExpiresAt: new Date(now.getTime() + this.policy.idleTtlMs),
			issuedAt: now,
			lastSeenAt: now,
			refreshTokenHash: input.refreshTokenHash,
			revocationReason: null,
			revokedAt: null,
			scope: input.scope,
			updatedAt: now,
			userId: input.userId
		};
	}

	refreshSession(
		session: SessionRecord,
		input: RefreshSessionInput,
		now: Date = new Date()
	): SessionRecord {
		this.assertRefreshable(session, now);

		return {
			...session,
			expiresAt: new Date(now.getTime() + this.policy.absoluteTtlMs),
			idleExpiresAt: new Date(now.getTime() + this.policy.idleTtlMs),
			lastSeenAt: now,
			refreshTokenHash: input.refreshTokenHash,
			updatedAt: now
		};
	}

	revokeSession(session: SessionRecord, reason: string, now: Date = new Date()): SessionRecord {
		if (session.revokedAt) {
			return session;
		}

		return {
			...session,
			revocationReason: reason,
			revokedAt: now,
			updatedAt: now
		};
	}

	private assertRefreshable(session: SessionRecord, now: Date): void {
		const state = this.getSessionState(session, now);

		if (state === "revoked") {
			throw new SessionLifecycleError("Cannot refresh a revoked session.");
		}

		if (state === "expired") {
			throw new SessionLifecycleError("Cannot refresh an expired session.");
		}
	}
}
