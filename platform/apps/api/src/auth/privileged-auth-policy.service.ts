import { Injectable } from "@nestjs/common";

import type {
	AuthActorType,
	PrivilegedOperation,
	SessionScope,
	StepUpAuthDecision,
	TenantActorRole,
	PlatformActorRole
} from "@platform/types";

export type PrivilegedAuthPolicyInput = {
	actorType: AuthActorType;
	operation: PrivilegedOperation;
	platformRole?: PlatformActorRole | null;
	sessionScope: SessionScope;
	tenantRole?: TenantActorRole | null;
};

const FIFTEEN_MINUTES_IN_SECONDS = 60 * 15;
const TEN_MINUTES_IN_SECONDS = 60 * 10;
const FIVE_MINUTES_IN_SECONDS = 60 * 5;

const noStepUpRequired: StepUpAuthDecision = {
	maxAgeSeconds: null,
	reason: null,
	required: false,
	requiredLevel: null
};

@Injectable()
export class PrivilegedAuthPolicyService {
	resolveStepUpDecision(input: PrivilegedAuthPolicyInput): StepUpAuthDecision {
		if (input.actorType === "platform" && input.sessionScope === "platform") {
			if (input.operation === "impersonation:start") {
				return {
					maxAgeSeconds: FIVE_MINUTES_IN_SECONDS,
					reason: "platform-impersonation",
					required: true,
					requiredLevel: "multi-factor"
				};
			}

			if (input.operation === "platform:write") {
				return {
					maxAgeSeconds: TEN_MINUTES_IN_SECONDS,
					reason: "platform-write",
					required: true,
					requiredLevel: "multi-factor"
				};
			}

			return noStepUpRequired;
		}

		if (input.actorType === "tenant" && input.sessionScope === "tenant") {
			if (
				input.operation === "tenant:payment-write" ||
				input.operation === "tenant:refund-write"
			) {
				return {
					maxAgeSeconds: FIVE_MINUTES_IN_SECONDS,
					reason:
						input.operation === "tenant:payment-write"
							? "payment-credential-write"
							: "refund-write",
					required: true,
					requiredLevel: "multi-factor"
				};
			}

			if (
				(input.operation === "tenant:settings-write" ||
					input.operation === "tenant:staff-write") &&
				(input.tenantRole === "owner" || input.tenantRole === "admin")
			) {
				return {
					maxAgeSeconds: FIFTEEN_MINUTES_IN_SECONDS,
					reason: "tenant-admin-sensitive-write",
					required: true,
					requiredLevel: "multi-factor"
				};
			}
		}

		return noStepUpRequired;
	}
}