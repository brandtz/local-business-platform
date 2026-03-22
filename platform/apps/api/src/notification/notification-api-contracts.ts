// ---------------------------------------------------------------------------
// E8-S4-T4: Notification API contracts
// ---------------------------------------------------------------------------

import {
	isDeliveryChannel,
	isNotificationEventType,
	deliveryStatuses,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Admin delivery log query validation
// ---------------------------------------------------------------------------

export type AdminDeliveryLogQueryInput = {
	tenantId: string;
	eventType?: string;
	channel?: string;
	status?: string;
	limit?: number;
	offset?: number;
};

export type AdminDeliveryLogValidationError = {
	field: string;
	code: string;
	message: string;
};

/**
 * Validates admin delivery log query parameters.
 */
export function validateAdminDeliveryLogQuery(
	input: AdminDeliveryLogQueryInput,
): AdminDeliveryLogValidationError[] {
	const errors: AdminDeliveryLogValidationError[] = [];

	if (!input.tenantId || input.tenantId.trim().length === 0) {
		errors.push({
			field: "tenantId",
			code: "REQUIRED",
			message: "tenantId is required.",
		});
	}

	if (input.eventType && !isNotificationEventType(input.eventType)) {
		errors.push({
			field: "eventType",
			code: "INVALID_VALUE",
			message: `Invalid event type: ${input.eventType}`,
		});
	}

	if (input.channel && !isDeliveryChannel(input.channel)) {
		errors.push({
			field: "channel",
			code: "INVALID_VALUE",
			message: `Invalid channel: ${input.channel}`,
		});
	}

	if (
		input.status &&
		!(deliveryStatuses as readonly string[]).includes(input.status)
	) {
		errors.push({
			field: "status",
			code: "INVALID_VALUE",
			message: `Invalid status: ${input.status}`,
		});
	}

	if (input.limit !== undefined && (input.limit < 1 || input.limit > 100)) {
		errors.push({
			field: "limit",
			code: "OUT_OF_RANGE",
			message: "limit must be between 1 and 100.",
		});
	}

	if (input.offset !== undefined && input.offset < 0) {
		errors.push({
			field: "offset",
			code: "OUT_OF_RANGE",
			message: "offset must be >= 0.",
		});
	}

	return errors;
}

// ---------------------------------------------------------------------------
// Customer notification query validation
// ---------------------------------------------------------------------------

export type CustomerNotificationQueryInput = {
	tenantId: string;
	recipientId: string;
	unreadOnly?: boolean;
	limit?: number;
	offset?: number;
};

export type MarkAsReadInput = {
	notificationId: string;
	tenantId: string;
	recipientId: string;
};

export type MarkAsReadResult = {
	success: boolean;
	error?: string;
};

/**
 * Validates customer notification query.
 */
export function validateCustomerNotificationQuery(
	input: CustomerNotificationQueryInput,
): AdminDeliveryLogValidationError[] {
	const errors: AdminDeliveryLogValidationError[] = [];

	if (!input.tenantId || input.tenantId.trim().length === 0) {
		errors.push({
			field: "tenantId",
			code: "REQUIRED",
			message: "tenantId is required.",
		});
	}

	if (!input.recipientId || input.recipientId.trim().length === 0) {
		errors.push({
			field: "recipientId",
			code: "REQUIRED",
			message: "recipientId is required.",
		});
	}

	if (input.limit !== undefined && (input.limit < 1 || input.limit > 100)) {
		errors.push({
			field: "limit",
			code: "OUT_OF_RANGE",
			message: "limit must be between 1 and 100.",
		});
	}

	return errors;
}

// ---------------------------------------------------------------------------
// Sanitization — no PII in logs or error messages
// ---------------------------------------------------------------------------

/**
 * Sanitizes a delivery log entry to ensure no PII leaks into admin views.
 * Masks email addresses and phone numbers.
 */
export function sanitizeRecipientAddress(address: string): string {
	// Mask email: show first 2 chars + domain
	if (address.includes("@")) {
		const [local, domain] = address.split("@");
		const masked =
			local.length > 2 ? local.slice(0, 2) + "***" : local + "***";
		return `${masked}@${domain}`;
	}
	// Mask phone: show last 4 digits
	if (address.length >= 10 && /^\+?\d+$/.test(address)) {
		return "***" + address.slice(-4);
	}
	return address;
}
