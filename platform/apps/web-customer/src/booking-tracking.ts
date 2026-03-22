// E7-S4-T6: Customer-facing booking tracking — progress bar state mapping,
// booking confirmation, and status tracking data contract.

import type {
	BookingTrackingData,
	BookingTrackingStepInfo,
} from "@platform/types";
import { formatTimeAgo } from "@platform/types";

// ---------------------------------------------------------------------------
// Booking tracking page view model
// ---------------------------------------------------------------------------

export type BookingTrackingViewModel = {
	bookingId: string;
	isCancelled: boolean;
	isNoShow: boolean;
	progressBar: BookingProgressBarStep[];
	progressPercent: number;
	statusMessage: string;
	serviceInfo: BookingServiceInfoViewModel;
};

export type BookingProgressBarStep = {
	label: string;
	state: "completed" | "current" | "upcoming" | "skipped";
	timeAgo: string | null;
};

export type BookingServiceInfoViewModel = {
	serviceName: string;
	staffName: string;
	startTimeFormatted: string;
	endTimeFormatted: string;
	durationLabel: string;
};

// ---------------------------------------------------------------------------
// Status messages
// ---------------------------------------------------------------------------

const statusMessages: Record<string, string> = {
	requested: "Your booking has been requested and is waiting to be confirmed.",
	confirmed: "Your booking has been confirmed. See you soon!",
	"checked-in": "You've checked in. Your appointment is in progress.",
	completed: "Your appointment has been completed. Thank you!",
	cancelled: "Your booking has been cancelled.",
	"no-show": "This booking was marked as a no-show.",
};

// ---------------------------------------------------------------------------
// View model builder
// ---------------------------------------------------------------------------

export function buildBookingTrackingViewModel(
	data: BookingTrackingData,
	now?: number
): BookingTrackingViewModel {
	const totalSteps = data.steps.length;
	const completedSteps = data.steps.filter(
		(s) => s.state === "completed" || s.state === "current"
	).length;
	const progressPercent =
		totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

	return {
		bookingId: data.bookingId,
		isCancelled: data.isCancelled,
		isNoShow: data.isNoShow,
		progressBar: data.steps.map((step) => buildProgressBarStep(step, now)),
		progressPercent,
		statusMessage: statusMessages[data.status] ?? "Booking status unknown.",
		serviceInfo: buildServiceInfo(data),
	};
}

function buildProgressBarStep(
	step: BookingTrackingStepInfo,
	now?: number
): BookingProgressBarStep {
	return {
		label: step.label,
		state: step.state,
		timeAgo: step.timestamp ? formatTimeAgo(step.timestamp, now) : null,
	};
}

function buildServiceInfo(data: BookingTrackingData): BookingServiceInfoViewModel {
	return {
		serviceName: data.serviceName,
		staffName: data.staffName,
		startTimeFormatted: formatBookingDateTime(data.startTime),
		endTimeFormatted: formatBookingDateTime(data.endTime),
		durationLabel: `${data.durationMinutes} min`,
	};
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatBookingDateTime(isoTimestamp: string): string {
	const parts = isoTimestamp.split("T");
	if (parts.length < 2) return isoTimestamp;

	const datePart = parts[0];
	const timePart = parts[1].slice(0, 5); // HH:mm

	const [year, month, day] = datePart.split("-");
	return `${month}/${day}/${year} ${formatTimeTo12Hour(timePart)}`;
}

function formatTimeTo12Hour(time24: string): string {
	const [hourStr, minStr] = time24.split(":");
	let hour = parseInt(hourStr, 10);
	const ampm = hour >= 12 ? "PM" : "AM";
	if (hour === 0) hour = 12;
	else if (hour > 12) hour -= 12;
	return `${hour}:${minStr} ${ampm}`;
}
