// ---------------------------------------------------------------------------
// E8-S6-T3: Integration failure dashboard API contracts.
// Validates requests for listing, viewing, and acknowledging operational alerts.
// SECURITY: Only platform-admin role can access integration failure tooling.
// SECURITY: Alert views NEVER expose payment secrets or customer PII.
// ---------------------------------------------------------------------------

import {
	isAlertCategory,
	isAlertSeverity,
} from "@platform/types";

import type {
	OperationalAlertQuery,
	OperationalAlertSummary,
	OperationalAlertDetail,
	AlertCategory,
	AlertSeverity,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type AlertListValidationResult = {
	valid: boolean;
	error?: string;
	query?: OperationalAlertQuery;
};

/**
 * Validates platform-admin alert list query parameters.
 */
export function validateAlertListQuery(
	input: Record<string, unknown>,
): AlertListValidationResult {
	const query: OperationalAlertQuery = {};

	if (input.category !== undefined) {
		if (
			typeof input.category !== "string" ||
			!isAlertCategory(input.category)
		) {
			return { valid: false, error: "Invalid alert category." };
		}
		query.category = input.category as AlertCategory;
	}

	if (input.severity !== undefined) {
		if (
			typeof input.severity !== "string" ||
			!isAlertSeverity(input.severity)
		) {
			return { valid: false, error: "Invalid alert severity." };
		}
		query.severity = input.severity as AlertSeverity;
	}

	if (input.tenantId !== undefined) {
		if (typeof input.tenantId !== "string" || input.tenantId.length === 0) {
			return { valid: false, error: "Invalid tenantId." };
		}
		query.tenantId = input.tenantId;
	}

	if (input.acknowledged !== undefined) {
		if (typeof input.acknowledged !== "boolean") {
			return { valid: false, error: "acknowledged must be a boolean." };
		}
		query.acknowledged = input.acknowledged;
	}

	if (input.startDate !== undefined) {
		if (
			typeof input.startDate !== "string" ||
			Number.isNaN(Date.parse(input.startDate))
		) {
			return { valid: false, error: "Invalid startDate." };
		}
		query.startDate = input.startDate;
	}

	if (input.endDate !== undefined) {
		if (
			typeof input.endDate !== "string" ||
			Number.isNaN(Date.parse(input.endDate))
		) {
			return { valid: false, error: "Invalid endDate." };
		}
		query.endDate = input.endDate;
	}

	if (input.limit !== undefined) {
		const limit = Number(input.limit);
		if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
			return {
				valid: false,
				error: "limit must be an integer between 1 and 100.",
			};
		}
		query.limit = limit;
	}

	if (input.offset !== undefined) {
		const offset = Number(input.offset);
		if (!Number.isInteger(offset) || offset < 0) {
			return {
				valid: false,
				error: "offset must be a non-negative integer.",
			};
		}
		query.offset = offset;
	}

	return { valid: true, query };
}

// ---------------------------------------------------------------------------
// Security assertions
// ---------------------------------------------------------------------------

/** Fields that must NEVER appear in alert view data. */
const forbiddenFields = [
	"encryptedCredentials",
	"credentialsIv",
	"credentialsTag",
	"secretKey",
	"accessToken",
	"publishableKey",
	"webhookSecret",
	"signatureKey",
	"cardNumber",
	"rawCardNumber",
	"pan",
	"email",
	"phone",
	"address",
	"ssn",
	"dateOfBirth",
];

/**
 * Validates that alert view data does not contain any payment secrets
 * or customer PII. Defensive check for platform-admin views.
 */
export function assertNoSecretsInAlertView(
	data:
		| OperationalAlertSummary
		| OperationalAlertDetail
		| Record<string, unknown>,
): boolean {
	const str = JSON.stringify(data);
	return !forbiddenFields.some((f) => str.includes(f));
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * Checks whether the requester has platform-admin role.
 * Integration failure views are restricted to platform-admin only.
 */
export function assertPlatformAdminRole(role: string): boolean {
	return role === "platform-admin";
}
