import {
	authActorTypes,
	logoutReasons,
	sessionScopes,
	tenantVerticalTemplateKeys,
	type LogoutRequest,
	type PasswordResetRequestComplete,
	type PasswordResetRequestInitiate,
	type PasswordLoginRequest,
	type SessionRefreshRequest,
	type TenantProvisioningRequest
} from "@platform/types";

export class AuthApiContractError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function assertValidPasswordLoginRequest(
	payload: unknown
): asserts payload is PasswordLoginRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Login payload must be an object.");
	}

	if (!isNonEmptyString(payload.email)) {
		throw new AuthApiContractError("Login payload requires a non-empty email.");
	}

	if (!isNonEmptyString(payload.password)) {
		throw new AuthApiContractError("Login payload requires a non-empty password.");
	}

	if (!authActorTypes.includes(payload.actorType as (typeof authActorTypes)[number])) {
		throw new AuthApiContractError("Login payload requires a supported actor type.");
	}

	if (!sessionScopes.includes(payload.scope as (typeof sessionScopes)[number])) {
		throw new AuthApiContractError("Login payload requires a supported session scope.");
	}

	if (payload.actorType !== payload.scope) {
		throw new AuthApiContractError("Login actor type and session scope must align.");
	}
	}

export function assertValidSessionRefreshRequest(
	payload: unknown
): asserts payload is SessionRefreshRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Refresh payload must be an object.");
	}

	if (!isNonEmptyString(payload.refreshToken)) {
		throw new AuthApiContractError("Refresh payload requires a non-empty refresh token.");
	}
}

export function assertValidLogoutRequest(payload: unknown): asserts payload is LogoutRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Logout payload must be an object.");
	}

	if (!isNonEmptyString(payload.sessionId)) {
		throw new AuthApiContractError("Logout payload requires a non-empty session id.");
	}

	if (
		payload.reason !== undefined &&
		!logoutReasons.includes(payload.reason as (typeof logoutReasons)[number])
	) {
		throw new AuthApiContractError("Logout payload reason is invalid.");
	}

	if (
		payload.terminateAllSessions !== undefined &&
		typeof payload.terminateAllSessions !== "boolean"
	) {
		throw new AuthApiContractError(
			"Logout payload terminateAllSessions must be a boolean when provided."
		);
	}
}

export function assertValidPasswordResetInitiateRequest(
	payload: unknown
): asserts payload is PasswordResetRequestInitiate {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Password reset request payload must be an object.");
	}

	if (!isNonEmptyString(payload.email)) {
		throw new AuthApiContractError(
			"Password reset request payload requires a non-empty email."
		);
	}
}

export function assertValidPasswordResetCompleteRequest(
	payload: unknown
): asserts payload is PasswordResetRequestComplete {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Password reset completion payload must be an object.");
	}

	if (!isNonEmptyString(payload.resetToken)) {
		throw new AuthApiContractError(
			"Password reset completion payload requires a non-empty reset token."
		);
	}

	if (!isNonEmptyString(payload.password)) {
		throw new AuthApiContractError(
			"Password reset completion payload requires a non-empty password."
		);
	}
}

export function assertValidTenantProvisioningRequest(
	payload: unknown
): asserts payload is TenantProvisioningRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Tenant provisioning payload must be an object.");
	}

	if (!isNonEmptyString(payload.displayName)) {
		throw new AuthApiContractError(
			"Tenant provisioning payload requires a non-empty displayName."
		);
	}

	if (!isNonEmptyString(payload.slug)) {
		throw new AuthApiContractError(
			"Tenant provisioning payload requires a non-empty slug."
		);
	}

	if (!isNonEmptyString(payload.previewSubdomain)) {
		throw new AuthApiContractError(
			"Tenant provisioning payload requires a non-empty previewSubdomain."
		);
	}

	if (
		!tenantVerticalTemplateKeys.includes(
			payload.verticalTemplate as (typeof tenantVerticalTemplateKeys)[number]
		)
	) {
		throw new AuthApiContractError(
			"Tenant provisioning payload requires a supported verticalTemplate."
		);
	}

	if (!isRecord(payload.owner)) {
		throw new AuthApiContractError(
			"Tenant provisioning payload requires an owner object."
		);
	}

	if (payload.owner.actorType !== "tenant") {
		throw new AuthApiContractError(
			"Tenant provisioning owner must use the tenant actor type."
		);
	}

	if (!isNonEmptyString(payload.owner.id)) {
		throw new AuthApiContractError(
			"Tenant provisioning owner requires a non-empty id."
		);
	}

	if (!isNonEmptyString(payload.owner.email)) {
		throw new AuthApiContractError(
			"Tenant provisioning owner requires a non-empty email."
		);
	}

	if (payload.owner.displayName !== undefined && !isNonEmptyString(payload.owner.displayName)) {
		throw new AuthApiContractError(
			"Tenant provisioning owner displayName must be a non-empty string when provided."
		);
	}

	if (payload.owner.status !== "invited" && payload.owner.status !== "active") {
		throw new AuthApiContractError(
			"Tenant provisioning owner status must be invited or active."
		);
	}
}
