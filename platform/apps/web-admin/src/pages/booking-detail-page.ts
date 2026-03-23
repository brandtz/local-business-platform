// E13-S7-T4: Booking Detail page — booking header, status workflow buttons,
// reschedule action, staff reassignment, cancel with reason, notes.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSdk } from "../composables/use-sdk";
import {
	buildBookingDetailViewModel,
	type BookingDetailViewModel,
} from "../booking-management";
import type { BookingStatus } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type BookingDetailPageState = {
	cancelReason: string;
	detail: BookingDetailViewModel | null;
	error: string | null;
	isLoading: boolean;
	isUpdating: boolean;
	notes: string;
	showCancelModal: boolean;
	showRescheduleForm: boolean;
	rescheduleDate: string;
	rescheduleStartTime: string;
	rescheduleEndTime: string;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderBookingHeader(detail: BookingDetailViewModel) {
	return h("div", { class: "booking-header", "data-testid": "booking-header" }, [
		h("div", { class: "booking-header__info" }, [
			h("h2", { "data-testid": "booking-service" }, detail.serviceName),
			h("span", {
				class: `badge ${detail.statusBadge.colorClass}`,
				"data-testid": "booking-status-badge",
			}, detail.statusBadge.label),
		]),
		h("div", { class: "booking-header__meta" }, [
			h("span", { "data-testid": "booking-customer" }, detail.customerName),
			h("span", { "data-testid": "booking-staff" }, `Staff: ${detail.staffName}`),
			h("span", { "data-testid": "booking-time" }, `${detail.startTimeFormatted} - ${detail.endTimeFormatted}`),
			h("span", { "data-testid": "booking-duration" }, detail.durationLabel),
		]),
	]);
}

function renderWorkflowButtons(
	detail: BookingDetailViewModel,
	onAction: (status: BookingStatus) => void,
	onShowCancel: () => void,
	isUpdating: boolean,
) {
	return h("div", { class: "workflow-actions", "data-testid": "booking-workflow-actions" }, [
		...detail.quickActions.map((action) =>
			h("button", {
				class: "btn btn--primary",
				disabled: isUpdating,
				"data-testid": `action-${action.targetStatus}`,
				onClick: () => onAction(action.targetStatus),
			}, action.label),
		),
		detail.canCancel
			? h("button", {
				class: "btn btn--danger",
				disabled: isUpdating,
				"data-testid": "action-cancel-booking",
				onClick: onShowCancel,
			}, "Cancel Booking")
			: null,
	]);
}

function renderRescheduleForm(
	show: boolean,
	date: string,
	startTime: string,
	endTime: string,
	onToggle: () => void,
	onDateChange: (v: string) => void,
	onStartChange: (v: string) => void,
	onEndChange: (v: string) => void,
	onSubmit: () => void,
	isUpdating: boolean,
) {
	return h("div", { class: "reschedule-section", "data-testid": "reschedule-section" }, [
		h("button", {
			class: "btn btn--secondary",
			"data-testid": "reschedule-toggle",
			onClick: onToggle,
		}, show ? "Cancel Reschedule" : "Reschedule"),
		show
			? h("div", { class: "reschedule-form", "data-testid": "reschedule-form" }, [
				h("label", "Date"),
				h("input", {
					type: "date",
					value: date,
					"data-testid": "reschedule-date",
					onInput: (e: Event) => onDateChange((e.target as HTMLInputElement).value),
				}),
				h("label", "Start Time"),
				h("input", {
					type: "time",
					value: startTime,
					"data-testid": "reschedule-start",
					onInput: (e: Event) => onStartChange((e.target as HTMLInputElement).value),
				}),
				h("label", "End Time"),
				h("input", {
					type: "time",
					value: endTime,
					"data-testid": "reschedule-end",
					onInput: (e: Event) => onEndChange((e.target as HTMLInputElement).value),
				}),
				h("button", {
					class: "btn btn--primary",
					disabled: isUpdating || !date || !startTime || !endTime,
					"data-testid": "reschedule-submit",
					onClick: onSubmit,
				}, "Confirm Reschedule"),
			])
			: null,
	]);
}

function renderCancelModal(
	show: boolean,
	reason: string,
	onReasonChange: (v: string) => void,
	onConfirm: () => void,
	onClose: () => void,
	isUpdating: boolean,
) {
	if (!show) return null;

	return h("div", { class: "modal-overlay", "data-testid": "cancel-modal" }, [
		h("div", { class: "modal" }, [
			h("h3", "Cancel Booking"),
			h("p", "Please provide a reason for cancellation:"),
			h("textarea", {
				value: reason,
				"data-testid": "cancel-reason",
				onInput: (e: Event) => onReasonChange((e.target as HTMLTextAreaElement).value),
			}),
			h("div", { class: "modal__actions" }, [
				h("button", {
					class: "btn btn--danger",
					disabled: isUpdating || !reason.trim(),
					"data-testid": "cancel-confirm",
					onClick: onConfirm,
				}, "Cancel Booking"),
				h("button", {
					class: "btn",
					"data-testid": "cancel-dismiss",
					onClick: onClose,
				}, "Keep Booking"),
			]),
		]),
	]);
}

function renderContactInfo(detail: BookingDetailViewModel) {
	return h("div", { class: "contact-info", "data-testid": "booking-contact-info" }, [
		h("h3", "Customer"),
		h("p", { "data-testid": "contact-name" }, detail.customerName),
		detail.customerEmail ? h("p", { "data-testid": "contact-email" }, detail.customerEmail) : null,
		detail.customerPhone ? h("p", { "data-testid": "contact-phone" }, detail.customerPhone) : null,
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const BookingDetailPage = defineComponent({
	name: "BookingDetailPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const state = ref<BookingDetailPageState>({
			cancelReason: "",
			detail: null,
			error: null,
			isLoading: false,
			isUpdating: false,
			notes: "",
			showCancelModal: false,
			showRescheduleForm: false,
			rescheduleDate: "",
			rescheduleStartTime: "",
			rescheduleEndTime: "",
		});

		async function loadBooking() {
			const bookingId = route.params.bookingId as string;
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const detail = await sdk.bookings.get(bookingId);
				const viewModel = buildBookingDetailViewModel(detail);
				state.value = { ...state.value, isLoading: false, detail: viewModel, notes: detail.notes ?? "" };
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load booking",
				};
			}
		}

		async function handleStatusAction(status: BookingStatus) {
			const bookingId = route.params.bookingId as string;
			state.value = { ...state.value, isUpdating: true };
			try {
				await sdk.bookings.updateStatus(bookingId, { status });
				void loadBooking();
			} catch {
				state.value = { ...state.value, isUpdating: false, error: "Failed to update booking status" };
			}
		}

		async function handleCancel() {
			const bookingId = route.params.bookingId as string;
			state.value = { ...state.value, isUpdating: true };
			try {
				await sdk.bookings.cancel(bookingId, { reason: state.value.cancelReason });
				state.value = { ...state.value, showCancelModal: false, cancelReason: "" };
				void loadBooking();
			} catch {
				state.value = { ...state.value, isUpdating: false, error: "Failed to cancel booking" };
			}
		}

		async function handleReschedule() {
			const bookingId = route.params.bookingId as string;
			state.value = { ...state.value, isUpdating: true };
			try {
				await sdk.bookings.reschedule(bookingId, {
					date: state.value.rescheduleDate,
					startTime: state.value.rescheduleStartTime,
					endTime: state.value.rescheduleEndTime,
				});
				state.value = { ...state.value, showRescheduleForm: false };
				void loadBooking();
			} catch {
				state.value = { ...state.value, isUpdating: false, error: "Failed to reschedule booking" };
			}
		}

		onMounted(() => {
			void loadBooking();
		});

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("section", { "data-testid": "booking-detail-page" }, [
					h("div", { class: "loading", "data-testid": "booking-detail-loading" }, "Loading booking…"),
				]);
			}

			if (s.error && !s.detail) {
				return h("section", { "data-testid": "booking-detail-page" }, [
					h("div", { class: "alert alert--error", "data-testid": "booking-detail-error" }, s.error),
					h("button", { class: "btn", onClick: () => router.push("/bookings") }, "Back to Bookings"),
				]);
			}

			if (!s.detail) {
				return h("section", { "data-testid": "booking-detail-page" }, [
					h("div", { class: "empty-state" }, "Booking not found."),
				]);
			}

			return h("section", { "data-testid": "booking-detail-page" }, [
				h("button", {
					class: "btn btn--link",
					"data-testid": "back-to-bookings",
					onClick: () => router.push("/bookings"),
				}, "← Back to Bookings"),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "booking-detail-error" }, s.error)
					: null,

				renderBookingHeader(s.detail),
				renderWorkflowButtons(
					s.detail,
					handleStatusAction,
					() => { state.value = { ...state.value, showCancelModal: true }; },
					s.isUpdating,
				),

				renderRescheduleForm(
					s.showRescheduleForm,
					s.rescheduleDate,
					s.rescheduleStartTime,
					s.rescheduleEndTime,
					() => { state.value = { ...state.value, showRescheduleForm: !state.value.showRescheduleForm }; },
					(v) => { state.value = { ...state.value, rescheduleDate: v }; },
					(v) => { state.value = { ...state.value, rescheduleStartTime: v }; },
					(v) => { state.value = { ...state.value, rescheduleEndTime: v }; },
					handleReschedule,
					s.isUpdating,
				),

				renderContactInfo(s.detail),

				h("div", { class: "booking-notes", "data-testid": "booking-notes" }, [
					h("h3", "Internal Notes"),
					h("textarea", {
						value: s.notes,
						class: "notes-textarea",
						"data-testid": "booking-notes-input",
						onInput: (e: Event) => { state.value = { ...state.value, notes: (e.target as HTMLTextAreaElement).value }; },
					}),
				]),

				s.detail.cancellationReason
					? h("div", { class: "cancellation-reason", "data-testid": "cancellation-reason" }, [
						h("h3", "Cancellation Reason"),
						h("p", s.detail.cancellationReason),
					])
					: null,

				renderCancelModal(
					s.showCancelModal,
					s.cancelReason,
					(v) => { state.value = { ...state.value, cancelReason: v }; },
					handleCancel,
					() => { state.value = { ...state.value, showCancelModal: false, cancelReason: "" }; },
					s.isUpdating,
				),
			]);
		};
	},
});
