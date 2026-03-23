// Account Bookings page — upcoming and past bookings with cards,
// plus booking detail view with full info and actions.
// Fetches data via SDK bookings API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type { AdminBookingSummary, AdminBookingDetail, BookingStatus } from "@platform/types";

import { useSdk } from "../composables/use-sdk";
import { renderAccountSidebar } from "./account-dashboard-page";

// ── Pure Helpers ─────────────────────────────────────────────────────────────

export function formatBookingDate(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

export function formatBookingTime(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
}

export function isUpcomingBooking(dateStr: string): boolean {
	const date = new Date(dateStr);
	return date.getTime() > Date.now();
}

const terminalBookingStatuses = new Set(["completed", "cancelled", "no-show"]);

export function isTerminalBookingStatus(status: string): boolean {
	return terminalBookingStatuses.has(status);
}

export function getBookingStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		requested: "Requested",
		confirmed: "Confirmed",
		"checked-in": "Checked In",
		completed: "Completed",
		cancelled: "Cancelled",
		"no-show": "No Show",
	};
	return labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(message: string): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", message),
	]);
}

function renderError(message: string, backTo: string, backLabel: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Something went wrong"),
		h("p", message),
		h(RouterLink, { to: backTo, class: "page-error__back" }, {
			default: () => backLabel,
		}),
	]);
}

function renderBookingCard(booking: AdminBookingSummary): VNode {
	return h(RouterLink, {
		to: `/account/bookings/${booking.id}`,
		class: "account-bookings__card",
		"data-testid": `booking-card-${booking.id}`,
	}, {
		default: () => [
			h("div", { class: "account-bookings__card-header" }, [
				h("span", {
					class: "account-bookings__service-name",
					"data-testid": "booking-service",
				}, booking.serviceName),
				h("span", {
					class: [
						"account-bookings__status-badge",
						`account-bookings__status-badge--${booking.status}`,
					],
					"data-testid": "booking-status",
				}, getBookingStatusLabel(booking.status)),
			]),
			h("div", { class: "account-bookings__card-body" }, [
				h("span", {
					class: "account-bookings__datetime",
					"data-testid": "booking-datetime",
				}, `${formatBookingDate(booking.startTime)} at ${formatBookingTime(booking.startTime)}`),
				h("span", {
					class: "account-bookings__staff",
					"data-testid": "booking-staff",
				}, `with ${booking.staffName}`),
				h("span", {
					class: "account-bookings__duration",
					"data-testid": "booking-duration",
				}, `${booking.durationMinutes} min`),
			]),
		],
	});
}

function renderEmptyBookings(): VNode {
	return h("div", {
		class: "account-bookings__empty",
		"data-testid": "empty-state",
	}, [
		h("p", { class: "account-bookings__empty-title" }, "No bookings yet"),
		h("p", { class: "account-bookings__empty-message" }, "No bookings yet — explore our services"),
		h(RouterLink, {
			to: "/services",
			class: "account-bookings__empty-action",
			"data-testid": "browse-services-link",
		}, { default: () => "Explore Services" }),
	]);
}

function renderBookingSection(title: string, bookings: AdminBookingSummary[], testId: string): VNode {
	if (bookings.length === 0) return h("span");

	return h("section", {
		class: "account-bookings__section",
		"data-testid": testId,
	}, [
		h("h2", { class: "account-bookings__section-title" }, title),
		h("div", { class: "account-bookings__list" },
			bookings.map((b) => renderBookingCard(b))
		),
	]);
}

// ── Detail Render Helpers ───────────────────────────────────────────────────

function renderDetailInfo(booking: AdminBookingDetail): VNode {
	const rows: { label: string; value: string; testId: string }[] = [
		{ label: "Service", value: booking.serviceName, testId: "detail-service" },
		{ label: "Staff", value: booking.staffName, testId: "detail-staff" },
		{
			label: "Date",
			value: formatBookingDate(booking.startTime),
			testId: "detail-date",
		},
		{
			label: "Time",
			value: `${formatBookingTime(booking.startTime)} – ${formatBookingTime(booking.endTime)}`,
			testId: "detail-time",
		},
		{
			label: "Duration",
			value: `${booking.durationMinutes} minutes`,
			testId: "detail-duration",
		},
		{ label: "Status", value: getBookingStatusLabel(booking.status), testId: "detail-status" },
	];

	if (booking.notes) {
		rows.push({ label: "Notes", value: booking.notes, testId: "detail-notes" });
	}

	if (booking.customerName) {
		rows.push({ label: "Customer", value: booking.customerName, testId: "detail-customer" });
	}

	if (booking.customerEmail) {
		rows.push({ label: "Email", value: booking.customerEmail, testId: "detail-email" });
	}

	if (booking.cancellationReason) {
		rows.push({ label: "Cancellation Reason", value: booking.cancellationReason, testId: "detail-cancel-reason" });
	}

	return h("section", {
		class: "account-booking-detail__info",
		"data-testid": "booking-info",
	}, rows.map((row) =>
		h("div", {
			key: row.testId,
			class: "account-booking-detail__info-row",
			"data-testid": row.testId,
		}, [
			h("span", { class: "account-booking-detail__info-label" }, row.label),
			h("span", { class: "account-booking-detail__info-value" }, row.value),
		])
	));
}

function renderDetailTimeline(booking: AdminBookingDetail): VNode {
	const timelineEntries: { label: string; timestamp: string | null; testId: string }[] = [
		{ label: "Requested", timestamp: booking.requestedAt, testId: "timeline-requested" },
		{ label: "Confirmed", timestamp: booking.confirmedAt, testId: "timeline-confirmed" },
		{ label: "Checked In", timestamp: booking.checkedInAt, testId: "timeline-checked-in" },
		{ label: "Completed", timestamp: booking.completedAt, testId: "timeline-completed" },
	];

	if (booking.cancelledAt) {
		timelineEntries.push({ label: "Cancelled", timestamp: booking.cancelledAt, testId: "timeline-cancelled" });
	}

	const filteredEntries = timelineEntries.filter((e) => e.timestamp !== null);

	if (filteredEntries.length === 0) return h("span");

	return h("section", {
		class: "account-booking-detail__timeline",
		"data-testid": "booking-timeline",
	}, [
		h("h3", "Timeline"),
		h("ol", { class: "account-booking-detail__timeline-list" },
			filteredEntries.map((entry) =>
				h("li", {
					key: entry.testId,
					class: "account-booking-detail__timeline-entry",
					"data-testid": entry.testId,
				}, [
					h("span", { class: "account-booking-detail__timeline-label" }, entry.label),
					h("span", { class: "account-booking-detail__timeline-time" },
						formatBookingDate(entry.timestamp!) + " " + formatBookingTime(entry.timestamp!)
					),
				])
			)
		),
	]);
}

function renderDetailActions(
	booking: AdminBookingDetail,
	cancelling: boolean,
	onCancel: () => void,
): VNode {
	const upcoming = isUpcomingBooking(booking.startTime);
	const canCancel = upcoming && (booking.status === "requested" || booking.status === "confirmed");

	return h("section", {
		class: "account-booking-detail__actions",
		"data-testid": "booking-actions",
	}, [
		canCancel
			? h("button", {
				class: "account-booking-detail__btn account-booking-detail__btn--danger",
				"data-testid": "cancel-booking-btn",
				disabled: cancelling,
				onClick: onCancel,
			}, cancelling ? "Cancelling..." : "Cancel Booking")
			: null,
		upcoming && canCancel
			? h(RouterLink, {
				to: "/book",
				class: "account-booking-detail__btn account-booking-detail__btn--secondary",
				"data-testid": "reschedule-btn",
			}, { default: () => "Reschedule" })
			: null,
		!upcoming
			? h(RouterLink, {
				to: "/book",
				class: "account-booking-detail__btn account-booking-detail__btn--primary",
				"data-testid": "book-again-btn",
			}, { default: () => "Book Again" })
			: null,
		h(RouterLink, {
			to: "/account/bookings",
			class: "account-booking-detail__btn account-booking-detail__btn--secondary",
			"data-testid": "back-to-bookings",
		}, { default: () => "Back to Bookings" }),
	]);
}

// ── Bookings List Component ─────────────────────────────────────────────────

export const AccountBookingsPage = defineComponent({
	name: "AccountBookingsPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const bookings = ref<AdminBookingSummary[]>([]);

		async function fetchBookings(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.bookings.list({
					page: 1,
					pageSize: 100,
				} as Parameters<typeof sdk.bookings.list>[0]);
				bookings.value = result.bookings;
			} catch {
				error.value = "Unable to load your bookings. Please try again later.";
			} finally {
				loading.value = false;
			}
		}

		onMounted(fetchBookings);

		return () => {
			if (loading.value) return renderLoading("Loading bookings...");
			if (error.value) return renderError(error.value, "/account", "Back to Account");

			if (bookings.value.length === 0) {
				return h("div", {
					class: "account-bookings-page",
					"data-testid": "account-bookings-page",
				}, [
					renderAccountSidebar(route.path, (path) => router.push(path)),
					h("div", { class: "account-bookings__content" }, [
						h("h1", { class: "account-bookings__heading" }, "Bookings"),
						renderEmptyBookings(),
					]),
				]);
			}

			const upcoming = bookings.value.filter((b) =>
				isUpcomingBooking(b.startTime) && !isTerminalBookingStatus(b.status)
			);
			const past = bookings.value.filter((b) =>
				!isUpcomingBooking(b.startTime) || isTerminalBookingStatus(b.status)
			);

			return h("div", {
				class: "account-bookings-page",
				"data-testid": "account-bookings-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-bookings__content" }, [
					h("h1", { class: "account-bookings__heading" }, "Bookings"),
					renderBookingSection("Upcoming", upcoming, "upcoming-bookings"),
					renderBookingSection("Past", past, "past-bookings"),
				]),
			]);
		};
	},
});

// ── Booking Detail Component ────────────────────────────────────────────────

export const AccountBookingDetailPage = defineComponent({
	name: "AccountBookingDetailPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const booking = ref<AdminBookingDetail | null>(null);
		const cancelling = ref(false);

		async function fetchBooking(bookingId: string): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				booking.value = await sdk.bookings.get(bookingId);
			} catch {
				error.value = "This booking could not be found.";
			} finally {
				loading.value = false;
			}
		}

		async function cancelBooking(): Promise<void> {
			if (!booking.value) return;
			cancelling.value = true;
			try {
				await sdk.bookings.cancel(booking.value.id);
				// Refresh after cancellation
				await fetchBooking(booking.value.id);
			} catch {
				error.value = "Unable to cancel booking. Please try again.";
			} finally {
				cancelling.value = false;
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
			if (loading.value) return renderLoading("Loading booking details...");
			if (error.value || !booking.value) return renderError(
				error.value ?? "Booking not found",
				"/account/bookings",
				"Back to Bookings",
			);

			const currentBooking = booking.value;

			return h("div", {
				class: "account-booking-detail-page",
				"data-testid": "account-booking-detail-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-booking-detail__content" }, [
					h("h1", {
						class: "account-booking-detail__heading",
						"data-testid": "booking-heading",
					}, currentBooking.serviceName),
					h("div", {
						class: "account-booking-detail__meta",
						"data-testid": "booking-meta",
					}, [
						h("span", {
							class: [
								"account-booking-detail__status-badge",
								`account-booking-detail__status-badge--${currentBooking.status}`,
							],
							"data-testid": "booking-status-badge",
						}, getBookingStatusLabel(currentBooking.status)),
					]),
					renderDetailInfo(currentBooking),
					renderDetailTimeline(currentBooking),
					renderDetailActions(currentBooking, cancelling.value, cancelBooking),
				]),
			]);
		};
	},
});
