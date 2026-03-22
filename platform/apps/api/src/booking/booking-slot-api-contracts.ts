import type {
	AdminBookingSlot,
	AdminBookingSlotsResponse,
	BookingSlotQuery,
	ComputedSlot,
	SlotComputationResult,
	StorefrontBookingSlot,
	StorefrontBookingSlotsResponse,
} from "@platform/types";
import { validateBookingSlotQuery } from "@platform/types";

// ─── Contract Error ──────────────────────────────────────────────────────────

export class BookingSlotApiContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BookingSlotApiContractError";
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

// ─── Request Validation ──────────────────────────────────────────────────────

export function assertValidBookingSlotQuery(
	payload: unknown
): asserts payload is BookingSlotQuery {
	if (!isRecord(payload)) {
		throw new BookingSlotApiContractError(
			"Booking slot query must be an object."
		);
	}
	if (!isNonEmptyString(payload.serviceId)) {
		throw new BookingSlotApiContractError(
			"Booking slot query requires a non-empty serviceId."
		);
	}
	if (!isNonEmptyString(payload.locationId)) {
		throw new BookingSlotApiContractError(
			"Booking slot query requires a non-empty locationId."
		);
	}
	if (!isNonEmptyString(payload.startDate)) {
		throw new BookingSlotApiContractError(
			"Booking slot query requires a non-empty startDate."
		);
	}
	if (!isNonEmptyString(payload.endDate)) {
		throw new BookingSlotApiContractError(
			"Booking slot query requires a non-empty endDate."
		);
	}

	const validation = validateBookingSlotQuery(payload as Partial<BookingSlotQuery>);
	if (!validation.valid) {
		const messages = validation.errors.map(
			(e) => `${e.field}: ${e.reason}`
		);
		throw new BookingSlotApiContractError(
			`Invalid booking slot query: ${messages.join(", ")}`
		);
	}
}

// ─── Response Mappers ────────────────────────────────────────────────────────

/**
 * Maps computed slots to storefront response format.
 * Strips staff identity for public-facing endpoints.
 */
export function toStorefrontBookingSlotsResponse(
	result: SlotComputationResult
): StorefrontBookingSlotsResponse {
	// Deduplicate slots by start/end time (multiple staff → one slot for storefront)
	const seen = new Set<string>();
	const uniqueSlots: StorefrontBookingSlot[] = [];

	for (const slot of result.slots) {
		const key = `${slot.startTime}|${slot.endTime}`;
		if (!seen.has(key)) {
			seen.add(key);
			uniqueSlots.push({
				startTime: slot.startTime,
				endTime: slot.endTime,
			});
		}
	}

	return {
		serviceId: result.serviceId,
		date: result.date,
		slots: uniqueSlots,
	};
}

/**
 * Maps computed slots to admin response format.
 * Includes full staff assignment details.
 */
export function toAdminBookingSlotsResponse(
	result: SlotComputationResult
): AdminBookingSlotsResponse {
	const adminSlots: AdminBookingSlot[] = result.slots.map(
		(slot: ComputedSlot) => ({
			startTime: slot.startTime,
			endTime: slot.endTime,
			staffId: slot.staffId,
			staffName: slot.staffName,
		})
	);

	return {
		serviceId: result.serviceId,
		date: result.date,
		slots: adminSlots,
	};
}

/**
 * Asserts that a storefront response has the expected shape.
 */
export function assertValidStorefrontResponse(
	response: unknown
): asserts response is StorefrontBookingSlotsResponse {
	if (!isRecord(response)) {
		throw new BookingSlotApiContractError(
			"Storefront booking slots response must be an object."
		);
	}
	if (!isNonEmptyString(response.serviceId)) {
		throw new BookingSlotApiContractError(
			"Storefront response requires a serviceId."
		);
	}
	if (!isNonEmptyString(response.date)) {
		throw new BookingSlotApiContractError(
			"Storefront response requires a date."
		);
	}
	if (!Array.isArray(response.slots)) {
		throw new BookingSlotApiContractError(
			"Storefront response requires a slots array."
		);
	}
}

/**
 * Asserts that an admin response has the expected shape.
 */
export function assertValidAdminResponse(
	response: unknown
): asserts response is AdminBookingSlotsResponse {
	if (!isRecord(response)) {
		throw new BookingSlotApiContractError(
			"Admin booking slots response must be an object."
		);
	}
	if (!isNonEmptyString(response.serviceId)) {
		throw new BookingSlotApiContractError(
			"Admin response requires a serviceId."
		);
	}
	if (!isNonEmptyString(response.date)) {
		throw new BookingSlotApiContractError(
			"Admin response requires a date."
		);
	}
	if (!Array.isArray(response.slots)) {
		throw new BookingSlotApiContractError(
			"Admin response requires a slots array."
		);
	}
	for (const slot of response.slots as unknown[]) {
		if (!isRecord(slot)) {
			throw new BookingSlotApiContractError(
				"Each admin slot must be an object."
			);
		}
		if (!isNonEmptyString(slot.staffId)) {
			throw new BookingSlotApiContractError(
				"Each admin slot must include a staffId."
			);
		}
		if (!isNonEmptyString(slot.staffName)) {
			throw new BookingSlotApiContractError(
				"Each admin slot must include a staffName."
			);
		}
	}
}
