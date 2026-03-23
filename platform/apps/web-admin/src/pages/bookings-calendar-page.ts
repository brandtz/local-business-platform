// E13-S7-T3: Bookings Calendar page — calendar grid with day/week/month views,
// booking cards, date navigation, and new booking modal.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import {
	getBookingStatusBadge,
	type CalendarDayViewModel,
	type CalendarBlockViewModel,
} from "../booking-management";

// ── Types ────────────────────────────────────────────────────────────────────

type CalendarView = "day" | "week" | "month";

type BookingsPageState = {
	calendarDays: CalendarDayViewModel[];
	currentDate: string;
	error: string | null;
	isLoading: boolean;
	showNewBookingModal: boolean;
	view: CalendarView;
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatDateISO(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
	const d = new Date(dateStr + "T12:00:00Z");
	d.setUTCDate(d.getUTCDate() + days);
	return formatDateISO(d);
}

function getDateRange(dateStr: string, view: CalendarView): { start: string; end: string } {
	const d = new Date(dateStr + "T12:00:00Z");
	if (view === "day") {
		return { start: dateStr, end: dateStr };
	}
	if (view === "week") {
		const dayOfWeek = d.getUTCDay();
		const start = addDays(dateStr, -dayOfWeek);
		const end = addDays(start, 6);
		return { start, end };
	}
	// month
	const firstDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
	const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
	return { start: formatDateISO(firstDay), end: formatDateISO(lastDay) };
}

const TIME_SLOTS: string[] = [];
for (let h = 0; h < 24; h++) {
	for (let m = 0; m < 60; m += 30) {
		const hh = String(h).padStart(2, "0");
		const mm = String(m).padStart(2, "0");
		TIME_SLOTS.push(`${hh}:${mm}`);
	}
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderViewToggle(
	activeView: CalendarView,
	onViewChange: (view: CalendarView) => void,
) {
	const views: CalendarView[] = ["day", "week", "month"];
	return h("div", { class: "view-toggle", "data-testid": "calendar-view-toggle" },
		views.map((v) =>
			h("button", {
				class: `view-toggle__btn${activeView === v ? " view-toggle__btn--active" : ""}`,
				"data-testid": `view-${v}`,
				onClick: () => onViewChange(v),
			}, v.charAt(0).toUpperCase() + v.slice(1)),
		),
	);
}

function renderDateNav(
	currentDate: string,
	view: CalendarView,
	onPrev: () => void,
	onNext: () => void,
	onToday: () => void,
) {
	return h("div", { class: "date-nav", "data-testid": "calendar-date-nav" }, [
		h("button", { "data-testid": "date-prev", onClick: onPrev }, "‹"),
		h("button", { "data-testid": "date-today", onClick: onToday }, "Today"),
		h("button", { "data-testid": "date-next", onClick: onNext }, "›"),
		h("span", { class: "date-nav__label", "data-testid": "date-label" }, currentDate),
	]);
}

function renderDayView(days: CalendarDayViewModel[], onBookingClick: (id: string) => void) {
	const day = days[0];
	if (!day) {
		return h("div", { class: "calendar-day empty-state", "data-testid": "day-view-empty" }, "No bookings for this day.");
	}

	return h("div", { class: "calendar-day", "data-testid": "day-view" }, [
		h("h3", { "data-testid": "day-label" }, day.dayLabel),
		h("div", { class: "calendar-day__grid", "data-testid": "day-grid" },
			TIME_SLOTS.map((slot) => {
				const blocksAtSlot = day.blocks.filter((b) => {
					const blockTime = b.startTimeFormatted.replace(/\s?(AM|PM)$/, "");
					return blockTime === formatSlotTime(slot);
				});
				return h("div", { class: "calendar-day__row", key: slot, "data-testid": `time-slot-${slot}` }, [
					h("span", { class: "calendar-day__time" }, formatSlotLabel(slot)),
					h("div", { class: "calendar-day__blocks" },
						blocksAtSlot.map((block) =>
							renderBookingCard(block, onBookingClick),
						),
					),
				]);
			}),
		),
	]);
}

function formatSlotTime(slot: string): string {
	const [hStr, mStr] = slot.split(":");
	let hour = parseInt(hStr!, 10);
	if (hour === 0) hour = 12;
	else if (hour > 12) hour -= 12;
	return `${hour}:${mStr}`;
}

function formatSlotLabel(slot: string): string {
	const [hStr, mStr] = slot.split(":");
	let hour = parseInt(hStr!, 10);
	const ampm = hour >= 12 ? "PM" : "AM";
	if (hour === 0) hour = 12;
	else if (hour > 12) hour -= 12;
	return `${hour}:${mStr} ${ampm}`;
}

function renderWeekView(days: CalendarDayViewModel[], onBookingClick: (id: string) => void) {
	return h("div", { class: "calendar-week", "data-testid": "week-view" },
		days.map((day) =>
			h("div", { class: "calendar-week__day", key: day.date, "data-testid": `week-day-${day.date}` }, [
				h("h4", { "data-testid": "week-day-label" }, day.dayLabel),
				day.blocks.length > 0
					? h("div", { class: "calendar-week__blocks" },
						day.blocks.map((block) =>
							renderBookingCard(block, onBookingClick),
						),
					)
					: h("span", { class: "text-muted" }, "No bookings"),
			]),
		),
	);
}

function renderMonthView(
	days: CalendarDayViewModel[],
	onDayClick: (date: string) => void,
) {
	return h("div", { class: "calendar-month", "data-testid": "month-view" },
		days.map((day) =>
			h("div", {
				class: "calendar-month__cell",
				key: day.date,
				"data-testid": `month-day-${day.date}`,
				onClick: () => onDayClick(day.date),
			}, [
				h("span", { class: "calendar-month__date" }, day.date.slice(-2)),
				day.blocks.length > 0
					? h("span", {
						class: "calendar-month__count badge badge-info",
						"data-testid": "booking-count",
					}, String(day.blocks.length))
					: null,
			]),
		),
	);
}

function renderBookingCard(block: CalendarBlockViewModel, onClick: (id: string) => void) {
	return h("div", {
		class: `booking-card ${block.statusBadge.colorClass}`,
		key: block.bookingId,
		"data-testid": `booking-card-${block.bookingId}`,
		onClick: () => onClick(block.bookingId),
	}, [
		h("span", { class: "booking-card__service" }, block.serviceName),
		h("span", { class: "booking-card__customer" }, block.customerName),
		h("span", { class: "booking-card__time" }, `${block.startTimeFormatted} - ${block.endTimeFormatted}`),
		h("span", { class: "booking-card__staff" }, block.staffName),
	]);
}

function renderNewBookingButton(onClick: () => void) {
	return h("button", {
		class: "btn btn--primary",
		"data-testid": "new-booking-btn",
		onClick,
	}, "+ New Booking");
}

// ── Component ────────────────────────────────────────────────────────────────

export const BookingsCalendarPage = defineComponent({
	name: "BookingsCalendarPage",
	setup() {
		const sdk = useSdk();
		const router = useRouter();

		const state = ref<BookingsPageState>({
			calendarDays: [],
			currentDate: formatDateISO(new Date()),
			error: null,
			isLoading: false,
			showNewBookingModal: false,
			view: "week",
		});

		async function loadBookings() {
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const { start, end } = getDateRange(state.value.currentDate, state.value.view);
				const response = await sdk.bookings.list({
					tenantId: "",
					dateFrom: start,
					dateTo: end,
				});
				// Build calendar days from flat booking list
				const days = buildCalendarDaysFromBookings(response.bookings, start, end);
				state.value = { ...state.value, isLoading: false, calendarDays: days };
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load bookings",
				};
			}
		}

		function handleViewChange(view: CalendarView) {
			state.value = { ...state.value, view };
			void loadBookings();
		}

		function handlePrev() {
			const offset = state.value.view === "day" ? -1 : state.value.view === "week" ? -7 : -30;
			state.value = { ...state.value, currentDate: addDays(state.value.currentDate, offset) };
			void loadBookings();
		}

		function handleNext() {
			const offset = state.value.view === "day" ? 1 : state.value.view === "week" ? 7 : 30;
			state.value = { ...state.value, currentDate: addDays(state.value.currentDate, offset) };
			void loadBookings();
		}

		function handleToday() {
			state.value = { ...state.value, currentDate: formatDateISO(new Date()) };
			void loadBookings();
		}

		function handleBookingClick(bookingId: string) {
			void router.push(`/bookings/${bookingId}`);
		}

		function handleDayClick(date: string) {
			state.value = { ...state.value, currentDate: date, view: "day" };
			void loadBookings();
		}

		onMounted(() => {
			void loadBookings();
		});

		return () => {
			const s = state.value;

			return h("section", { "data-testid": "bookings-page" }, [
				h("div", { class: "bookings-header" }, [
					h("h2", "Bookings"),
					renderNewBookingButton(() => {
						state.value = { ...state.value, showNewBookingModal: true };
					}),
				]),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "bookings-error" }, s.error)
					: null,

				h("div", { class: "calendar-controls" }, [
					renderViewToggle(s.view, handleViewChange),
					renderDateNav(s.currentDate, s.view, handlePrev, handleNext, handleToday),
				]),

				s.isLoading
					? h("div", { class: "loading", "data-testid": "bookings-loading" }, "Loading bookings…")
					: null,

				!s.isLoading && s.view === "day"
					? renderDayView(s.calendarDays, handleBookingClick)
					: null,
				!s.isLoading && s.view === "week"
					? renderWeekView(s.calendarDays, handleBookingClick)
					: null,
				!s.isLoading && s.view === "month"
					? renderMonthView(s.calendarDays, handleDayClick)
					: null,
			]);
		};
	},
});

// ── Utility: build calendar day structures from flat bookings ─────────────────

import type { AdminBookingSummary } from "@platform/types";
import { formatBookingTime } from "../booking-management";

function buildCalendarDaysFromBookings(
	bookings: AdminBookingSummary[],
	startDate: string,
	endDate: string,
): CalendarDayViewModel[] {
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const days: CalendarDayViewModel[] = [];
	let current = startDate;

	while (current <= endDate) {
		const d = new Date(current + "T12:00:00Z");
		const dayName = dayNames[d.getUTCDay()];
		const [, month, day] = current.split("-");
		const dayLabel = `${dayName} ${month}/${day}`;

		const dayBookings = bookings.filter((b) => b.startTime.startsWith(current));
		const blocks: CalendarBlockViewModel[] = dayBookings.map((b) => ({
			bookingId: b.id,
			statusBadge: getBookingStatusBadge(b.status),
			customerName: b.customerName ?? "Walk-in",
			serviceName: b.serviceName,
			staffName: b.staffName,
			startTimeFormatted: formatBookingTime(b.startTime),
			endTimeFormatted: formatBookingTime(b.endTime),
			durationLabel: `${b.durationMinutes} min`,
		}));

		days.push({ date: current, dayLabel, blocks });
		current = addDays(current, 1);
	}

	return days;
}
