// Booking Confirmation page — success hero, booking details card,
// tracking timeline, calendar link, and manage-booking actions.
// Fetches booking data via SDK bookings API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { AdminBookingDetail, BookingTrackingStepInfo } from "@platform/types";
import { computeBookingTrackingSteps } from "@platform/types";

import { useSdk } from "../composables/use-sdk";

// ── Formatting ──────────────────────────────────────────────────────────────

const MONTH_NAMES = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

function formatDateTime(iso: string): string {
	const date = new Date(iso);
	const month = MONTH_NAMES[date.getMonth()];
	const day = date.getDate();
	const year = date.getFullYear();

	let hours = date.getHours();
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const ampm = hours >= 12 ? "PM" : "AM";
	if (hours === 0) hours = 12;
	else if (hours > 12) hours -= 12;

	return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
}

function toCalendarUtc(iso: string): string {
	const d = new Date(iso);
	return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(booking: AdminBookingDetail): string {
	const title = encodeURIComponent(booking.serviceName);
	const start = toCalendarUtc(booking.startTime);
	const end = toCalendarUtc(booking.endTime);
	const details = encodeURIComponent(
		`Booking with ${booking.staffName}\nDuration: ${booking.durationMinutes} min`,
	);
	return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading booking details..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Booking not found"),
		h("p", message),
		h(RouterLink, { to: "/services", class: "page-error__back" }, {
			default: () => "Back to Services",
		}),
	]);
}

function renderSuccessHero(): VNode {
	return h("section", {
		class: "booking-confirmation__hero",
		"data-testid": "success-hero",
	}, [
		h("div", {
			class: "booking-confirmation__checkmark",
			"aria-hidden": "true",
		}, "✓"),
		h("h1", { class: "booking-confirmation__heading" }, "Booking Confirmed!"),
		h("p", { class: "booking-confirmation__subheading" },
			"Your appointment has been scheduled. We look forward to seeing you!",
		),
	]);
}

function renderBookingDetails(booking: AdminBookingDetail): VNode {
	const rows: { label: string; value: string; testId: string }[] = [
		{ label: "Service", value: booking.serviceName, testId: "detail-service" },
		{ label: "Date & Time", value: formatDateTime(booking.startTime), testId: "detail-datetime" },
		{ label: "Staff", value: booking.staffName, testId: "detail-staff" },
		{ label: "Duration", value: `${booking.durationMinutes} min`, testId: "detail-duration" },
	];

	return h("section", {
		class: "booking-confirmation__details",
		"data-testid": "booking-details",
	}, [
		h("h2", { class: "booking-confirmation__section-title" }, "Booking Details"),
		...rows.map((row) =>
			h("div", {
				key: row.testId,
				class: "booking-confirmation__detail-row",
				"data-testid": row.testId,
			}, [
				h("span", { class: "booking-confirmation__detail-label" }, row.label),
				h("span", { class: "booking-confirmation__detail-value" }, row.value),
			]),
		),
	]);
}

function renderTrackingTimeline(steps: BookingTrackingStepInfo[]): VNode {
	return h("section", {
		class: "booking-confirmation__timeline",
		"data-testid": "booking-timeline",
	}, [
		h("h2", { class: "booking-confirmation__section-title" }, "Booking Status"),
		h("ol", { class: "booking-confirmation__steps" },
			steps.map((step) =>
				h("li", {
					key: step.step,
					class: [
						"booking-confirmation__step",
						`booking-confirmation__step--${step.state}`,
					],
					"data-testid": `tracking-step-${step.step}`,
					"data-state": step.state,
				}, [
					h("span", { class: "booking-confirmation__step-indicator" }),
					h("span", { class: "booking-confirmation__step-label" }, step.label),
				]),
			),
		),
	]);
}

function renderCalendarLink(booking: AdminBookingDetail): VNode {
	return h("a", {
		href: buildGoogleCalendarUrl(booking),
		target: "_blank",
		rel: "noopener noreferrer",
		class: "booking-confirmation__calendar-link",
		"data-testid": "add-to-calendar-link",
	}, "Add to Calendar");
}

function renderActions(booking: AdminBookingDetail): VNode {
	return h("section", {
		class: "booking-confirmation__actions",
		"data-testid": "booking-actions",
	}, [
		renderCalendarLink(booking),
		h(RouterLink, {
			to: "/account/bookings",
			class: "booking-confirmation__action-btn booking-confirmation__action-btn--primary",
			"data-testid": "reschedule-link",
		}, { default: () => "Reschedule" }),
		h(RouterLink, {
			to: "/account/bookings",
			class: "booking-confirmation__action-btn booking-confirmation__action-btn--secondary",
			"data-testid": "cancel-link",
		}, { default: () => "Cancel" }),
	]);
}

// ── Page Component ──────────────────────────────────────────────────────────

export const BookingConfirmationPage = defineComponent({
	name: "BookingConfirmationPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const booking = ref<AdminBookingDetail | null>(null);

		async function fetchBooking(bookingId: string): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.bookings.get(bookingId);
				booking.value = result;
			} catch {
				error.value = "This booking could not be found. It may have been removed or is no longer available.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(() => {
			const bookingId = route.params.bookingId as string;
			if (bookingId) {
				fetchBooking(bookingId);
			} else {
				error.value = "No booking specified.";
				loading.value = false;
			}
		});

		return () => {
			if (loading.value) return renderLoading();
			if (error.value || !booking.value) return renderError(error.value ?? "Booking not found");

			const currentBooking = booking.value;

			const steps = computeBookingTrackingSteps(currentBooking.status, {
				requestedAt: currentBooking.requestedAt,
				confirmedAt: currentBooking.confirmedAt,
				checkedInAt: currentBooking.checkedInAt,
				completedAt: currentBooking.completedAt,
			});

			return h("div", {
				class: "booking-confirmation-page",
				"data-testid": "booking-confirmation-page",
			}, [
				renderSuccessHero(),
				h("p", {
					class: "booking-confirmation__booking-id",
					"data-testid": "booking-id",
				}, `Booking #${currentBooking.id}`),
				renderBookingDetails(currentBooking),
				renderTrackingTimeline(steps),
				renderActions(currentBooking),
			]);
		};
	},
});
