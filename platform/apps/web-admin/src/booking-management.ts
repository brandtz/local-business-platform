// E7-S4-T5: Admin booking management views — booking list with pipeline counts,
// booking detail, status transitions, calendar view, and exception handling.

import type {
	BookingStatus,
	AdminBookingSummary,
	AdminBookingDetail,
	BookingPipelineCounts,
	BookingQuickAction,
	CalendarViewResponse,
	CalendarDayData,
	CalendarBookingBlock,
} from "@platform/types";
import {
	getBookingQuickActions,
	isBookingCancellable,
	formatTimeAgo,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Booking status badge display
// ---------------------------------------------------------------------------

export type BookingStatusBadge = {
	status: BookingStatus;
	label: string;
	colorClass: string;
};

const statusBadgeConfig: Record<BookingStatus, { label: string; colorClass: string }> = {
	requested: { label: "Requested", colorClass: "badge-info" },
	confirmed: { label: "Confirmed", colorClass: "badge-primary" },
	"checked-in": { label: "Checked In", colorClass: "badge-warning" },
	completed: { label: "Completed", colorClass: "badge-muted" },
	cancelled: { label: "Cancelled", colorClass: "badge-danger" },
	"no-show": { label: "No-Show", colorClass: "badge-danger" },
};

export function getBookingStatusBadge(status: BookingStatus): BookingStatusBadge {
	const config = statusBadgeConfig[status];
	return {
		status,
		label: config.label,
		colorClass: config.colorClass,
	};
}

// ---------------------------------------------------------------------------
// Pipeline view model
// ---------------------------------------------------------------------------

export type BookingPipelineStatusEntry = {
	status: BookingStatus;
	label: string;
	count: number;
	colorClass: string;
};

export function buildBookingPipelineView(
	pipeline: BookingPipelineCounts
): BookingPipelineStatusEntry[] {
	return pipeline.counts.map((c) => {
		const badge = getBookingStatusBadge(c.status);
		return {
			status: c.status,
			label: badge.label,
			count: c.count,
			colorClass: badge.colorClass,
		};
	});
}

// ---------------------------------------------------------------------------
// Booking list row view model
// ---------------------------------------------------------------------------

export type BookingListRowViewModel = {
	id: string;
	statusBadge: BookingStatusBadge;
	customerName: string;
	serviceName: string;
	staffName: string;
	startTimeFormatted: string;
	durationLabel: string;
	timeAgo: string;
};

export function buildBookingListRow(
	booking: AdminBookingSummary,
	now?: number
): BookingListRowViewModel {
	return {
		id: booking.id,
		statusBadge: getBookingStatusBadge(booking.status),
		customerName: booking.customerName ?? "Walk-in",
		serviceName: booking.serviceName,
		staffName: booking.staffName,
		startTimeFormatted: formatBookingDateTime(booking.startTime),
		durationLabel: `${booking.durationMinutes} min`,
		timeAgo: formatTimeAgo(booking.createdAt, now),
	};
}

// ---------------------------------------------------------------------------
// Booking detail view model
// ---------------------------------------------------------------------------

export type BookingDetailViewModel = {
	id: string;
	statusBadge: BookingStatusBadge;
	customerName: string;
	customerEmail: string | null;
	customerPhone: string | null;
	serviceName: string;
	staffName: string;
	locationId: string;
	startTimeFormatted: string;
	endTimeFormatted: string;
	durationLabel: string;
	notes: string | null;
	cancellationReason: string | null;
	quickActions: BookingQuickAction[];
	canCancel: boolean;
	timeAgo: string;
};

export function buildBookingDetailViewModel(
	detail: AdminBookingDetail,
	now?: number
): BookingDetailViewModel {
	return {
		id: detail.id,
		statusBadge: getBookingStatusBadge(detail.status),
		customerName: detail.customerName ?? "Walk-in",
		customerEmail: detail.customerEmail,
		customerPhone: detail.customerPhone,
		serviceName: detail.serviceName,
		staffName: detail.staffName,
		locationId: detail.locationId,
		startTimeFormatted: formatBookingDateTime(detail.startTime),
		endTimeFormatted: formatBookingDateTime(detail.endTime),
		durationLabel: `${detail.durationMinutes} min`,
		notes: detail.notes,
		cancellationReason: detail.cancellationReason,
		quickActions: getBookingQuickActions(detail.status),
		canCancel: isBookingCancellable(detail.status),
		timeAgo: formatTimeAgo(detail.createdAt, now),
	};
}

// ---------------------------------------------------------------------------
// Calendar view model
// ---------------------------------------------------------------------------

export type CalendarDayViewModel = {
	date: string;
	dayLabel: string;
	blocks: CalendarBlockViewModel[];
};

export type CalendarBlockViewModel = {
	bookingId: string;
	statusBadge: BookingStatusBadge;
	customerName: string;
	serviceName: string;
	staffName: string;
	startTimeFormatted: string;
	endTimeFormatted: string;
	durationLabel: string;
};

export function buildCalendarViewModel(
	response: CalendarViewResponse
): CalendarDayViewModel[] {
	return response.days.map((day) => ({
		date: day.date,
		dayLabel: formatCalendarDayLabel(day.date),
		blocks: day.blocks.map((block) => buildCalendarBlockViewModel(block)),
	}));
}

function buildCalendarBlockViewModel(
	block: CalendarBookingBlock
): CalendarBlockViewModel {
	return {
		bookingId: block.bookingId,
		statusBadge: getBookingStatusBadge(block.status),
		customerName: block.customerName ?? "Walk-in",
		serviceName: block.serviceName,
		staffName: block.staffName,
		startTimeFormatted: formatBookingTime(block.startTime),
		endTimeFormatted: formatBookingTime(block.endTime),
		durationLabel: `${block.durationMinutes} min`,
	};
}

// ---------------------------------------------------------------------------
// Exception handling view models
// ---------------------------------------------------------------------------

export type BookingExceptionAction =
	| { type: "no-show"; bookingId: string }
	| { type: "late-cancel"; bookingId: string; reason: string }
	| { type: "reschedule"; bookingId: string; newStartTime: string; newEndTime: string };

export function getAvailableExceptionActions(
	detail: AdminBookingDetail
): BookingExceptionAction["type"][] {
	const actions: BookingExceptionAction["type"][] = [];

	if (detail.status === "confirmed" || detail.status === "checked-in") {
		actions.push("no-show");
	}
	if (detail.status === "requested" || detail.status === "confirmed") {
		actions.push("late-cancel");
		actions.push("reschedule");
	}

	return actions;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatBookingDateTime(isoTimestamp: string): string {
	// Parse ISO timestamp (e.g., "2026-03-25T10:00:00")
	const parts = isoTimestamp.split("T");
	if (parts.length < 2) return isoTimestamp;

	const datePart = parts[0];
	const timePart = parts[1].slice(0, 5); // HH:mm

	const [year, month, day] = datePart.split("-");
	return `${month}/${day}/${year} ${formatTimeTo12Hour(timePart)}`;
}

export function formatBookingTime(isoTimestamp: string): string {
	const parts = isoTimestamp.split("T");
	if (parts.length < 2) return isoTimestamp;
	return formatTimeTo12Hour(parts[1].slice(0, 5));
}

function formatTimeTo12Hour(time24: string): string {
	const [hourStr, minStr] = time24.split(":");
	let hour = parseInt(hourStr, 10);
	const ampm = hour >= 12 ? "PM" : "AM";
	if (hour === 0) hour = 12;
	else if (hour > 12) hour -= 12;
	return `${hour}:${minStr} ${ampm}`;
}

function formatCalendarDayLabel(dateStr: string): string {
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const d = new Date(dateStr + "T12:00:00Z");
	const dayName = dayNames[d.getUTCDay()];
	const [, month, day] = dateStr.split("-");
	return `${dayName} ${month}/${day}`;
}
