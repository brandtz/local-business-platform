import {
	authActorTypes,
	logoutReasons,
	sessionScopes,
	tenantStatuses,
	tenantVerticalTemplateKeys,
	type LogoutRequest,
	type PlatformTenantOperationalSummaryQueryRequest,
	type PasswordResetRequestComplete,
	type PasswordResetRequestInitiate,
	type PasswordLoginRequest,
	type SessionRefreshRequest,
	type TenantModuleAssignmentRequest,
	type TenantProvisioningRequest,
	type TenantTemplateAssignmentRequest
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

export function assertValidPlatformTenantOperationalSummaryQueryRequest(
	payload: unknown
): asserts payload is PlatformTenantOperationalSummaryQueryRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError(
			"Platform tenant operational summary query payload must be an object."
		);
	}

	if (!Array.isArray(payload.tenants)) {
		throw new AuthApiContractError(
			"Platform tenant operational summary query payload requires a tenants array."
		);
	}

	payload.tenants.forEach((tenant, index) => {
		if (!isRecord(tenant)) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} must be an object.`
			);
		}

		if (!isNonEmptyString(tenant.id)) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} requires a non-empty id.`
			);
		}

		if (!isNonEmptyString(tenant.displayName)) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} requires a non-empty displayName.`
			);
		}

		if (!isNonEmptyString(tenant.slug)) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} requires a non-empty slug.`
			);
		}

		if (!tenantStatuses.includes(tenant.status as (typeof tenantStatuses)[number])) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} requires a supported status.`
			);
		}

		if (
			tenant.previewSubdomain !== undefined &&
			tenant.previewSubdomain !== null &&
			!isNonEmptyString(tenant.previewSubdomain)
		) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} previewSubdomain must be a non-empty string when provided.`
			);
		}

		if (tenant.customDomains !== undefined) {
			if (!Array.isArray(tenant.customDomains)) {
				throw new AuthApiContractError(
					`Operational summary tenant at index ${index} customDomains must be an array when provided.`
				);
			}

			tenant.customDomains.forEach((domain, domainIndex) => {
				if (!isNonEmptyString(domain)) {
					throw new AuthApiContractError(
						`Operational summary tenant at index ${index} customDomains[${domainIndex}] must be a non-empty string.`
					);
				}
			});
		}

		if (
			tenant.lastLifecycleAuditAt !== undefined &&
			tenant.lastLifecycleAuditAt !== null &&
			!isNonEmptyString(tenant.lastLifecycleAuditAt)
		) {
			throw new AuthApiContractError(
				`Operational summary tenant at index ${index} lastLifecycleAuditAt must be a non-empty string when provided.`
			);
		}
	});
}

export function assertValidTenantModuleAssignmentRequest(
	payload: unknown
): asserts payload is TenantModuleAssignmentRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Module assignment payload must be an object.");
	}

	if (!isNonEmptyString(payload.tenantId)) {
		throw new AuthApiContractError(
			"Module assignment payload requires a non-empty tenantId."
		);
	}

	if (!Array.isArray(payload.enabledModules)) {
		throw new AuthApiContractError(
			"Module assignment payload requires an enabledModules array."
		);
	}

	payload.enabledModules.forEach((moduleKey, index) => {
		if (!isNonEmptyString(moduleKey)) {
			throw new AuthApiContractError(
				`Module assignment enabledModules[${index}] must be a non-empty string.`
			);
		}
	});
}

export function assertValidTenantTemplateAssignmentRequest(
	payload: unknown
): asserts payload is TenantTemplateAssignmentRequest {
	if (!isRecord(payload)) {
		throw new AuthApiContractError("Template assignment payload must be an object.");
	}

	if (!isNonEmptyString(payload.tenantId)) {
		throw new AuthApiContractError(
			"Template assignment payload requires a non-empty tenantId."
		);
	}

	if (!isNonEmptyString(payload.templateKey)) {
		throw new AuthApiContractError(
			"Template assignment payload requires a non-empty templateKey."
		);
	}

	if (
		!tenantVerticalTemplateKeys.includes(
			payload.templateKey as (typeof tenantVerticalTemplateKeys)[number]
		)
	) {
		throw new AuthApiContractError(
			"Template assignment payload requires a supported templateKey."
		);
	}

	if (!Array.isArray(payload.enabledModules)) {
		throw new AuthApiContractError(
			"Template assignment payload requires an enabledModules array."
		);
	}

	payload.enabledModules.forEach((moduleKey, index) => {
		if (!isNonEmptyString(moduleKey)) {
			throw new AuthApiContractError(
				`Template assignment enabledModules[${index}] must be a non-empty string.`
			);
		}
	});
}
