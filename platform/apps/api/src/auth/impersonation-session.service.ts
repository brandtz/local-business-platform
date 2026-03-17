import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";

import type {
	ImpersonationSessionState,
	ImpersonationSessionSummary,
	PlatformActorRole,
	TenantSummary
} from "@platform/types";

export type ImpersonationLifecyclePolicy = {
	maxTtlMs: number;
};

export type StartImpersonationSessionInput = {
	impersonatorUserId: string;
	platformRole: PlatformActorRole;
	reason: string;
	targetTenant: TenantSummary;
};

export type ImpersonationSessionRecord = {
	expiresAt: Date;
	impersonatorUserId: string;
	platformRole: PlatformActorRole;
	reason: string;
	revocationReason: string | null;
	revokedAt: Date | null;
	sessionId: string;
	startedAt: Date;
	targetTenant: TenantSummary;
};

const DEFAULT_IMPERSONATION_POLICY: ImpersonationLifecyclePolicy = {
	maxTtlMs: 1000 * 60 * 30
};

export class ImpersonationSessionError extends Error {}

@Injectable()
export class ImpersonationSessionService {
	constructor(
		private readonly policy: ImpersonationLifecyclePolicy = DEFAULT_IMPERSONATION_POLICY
	) {}

	getSessionState(
		session: ImpersonationSessionRecord,
		now: Date
	): ImpersonationSessionState {
		if (session.revokedAt) {
			return "revoked";
		}

		if (now >= session.expiresAt) {
			return "expired";
		}

		return "active";
	}

	requireActiveSession(
		session: ImpersonationSessionRecord,
		now: Date = new Date()
	): ImpersonationSessionRecord {
		const state = this.getSessionState(session, now);

		if (state !== "active") {
			throw new ImpersonationSessionError(`Impersonation session is ${state}.`);
		}

		return session;
	}

	revokeSession(
		session: ImpersonationSessionRecord,
		reason: string,
		now: Date = new Date()
	): ImpersonationSessionRecord {
		if (session.revokedAt) {
			return session;
		}

		return {
			...session,
			revocationReason: reason,
			revokedAt: now
		};
	}

	startSession(
		input: StartImpersonationSessionInput,
		now: Date = new Date()
	): ImpersonationSessionRecord {
		return {
			expiresAt: new Date(now.getTime() + this.policy.maxTtlMs),
			impersonatorUserId: input.impersonatorUserId,
			platformRole: input.platformRole,
			reason: input.reason,
			revocationReason: null,
			revokedAt: null,
			sessionId: randomUUID(),
			startedAt: now,
			targetTenant: input.targetTenant
		};
	}

	toSummary(session: ImpersonationSessionRecord): ImpersonationSessionSummary {
		return {
			expiresAt: session.expiresAt.toISOString(),
			impersonatorUserId: session.impersonatorUserId,
			platformRole: session.platformRole,
			sessionId: session.sessionId,
			startedAt: session.startedAt.toISOString(),
			targetTenantId: session.targetTenant.id,
			targetTenantName: session.targetTenant.displayName
		};
	}
}