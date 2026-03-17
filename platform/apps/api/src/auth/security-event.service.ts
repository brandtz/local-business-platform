import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";

import type {
	AuthActorType,
	SecurityEventKind,
	SecurityEventRecord,
	SecurityEventSeverity
} from "@platform/types";

export type SecurityEventInput = {
	actorType?: AuthActorType | null;
	context?: Record<string, string | null | undefined>;
	kind: SecurityEventKind;
	occurredAt?: Date;
	tenantId?: string | null;
	userId?: string | null;
};

const severityByKind: Record<SecurityEventKind, SecurityEventSeverity> = {
	"auth.impersonation_started": "critical",
	"auth.impersonation_revoked": "info",
	"auth.login_failed": "warning",
	"auth.login_succeeded": "info",
	"auth.mfa_challenge_failed": "warning",
	"auth.mfa_challenge_issued": "info",
	"auth.mfa_challenge_verified": "info",
	"auth.password_reset_completed": "critical",
	"auth.password_reset_failed": "warning",
	"auth.password_reset_requested": "info"
};

@Injectable()
export class SecurityEventService {
	createEvent(input: SecurityEventInput): SecurityEventRecord {
		return {
			actorType: input.actorType || null,
			context: this.normalizeContext(input.context),
			id: randomUUID(),
			kind: input.kind,
			occurredAt: (input.occurredAt || new Date()).toISOString(),
			severity: severityByKind[input.kind],
			tenantId: input.tenantId || null,
			userId: input.userId || null
		};
	}

	private normalizeContext(
		context: Record<string, string | null | undefined> | undefined
	): Record<string, string | null> {
		if (!context) {
			return {};
		}

		return Object.fromEntries(
			Object.entries(context).map(([key, value]) => [key, value ?? null])
		);
	}
}