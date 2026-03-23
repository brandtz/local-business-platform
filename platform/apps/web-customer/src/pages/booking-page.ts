// Booking Availability Picker page — date picker, time slot grid, staff filter,
// location selector, service summary, and booking confirmation.
// Fetches data via SDK services, locations, and bookings APIs.

import { defineComponent, h, ref, onMounted, computed, watch, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type {
	ServiceRecord,
	ServiceAvailabilitySlot,
	CreateBookingInput,
} from "@platform/types";
import type { LocationRecord, LocationListResponse } from "@platform/sdk";

import { useSdk } from "../composables/use-sdk";
import { getAuthViewerState } from "../auth-state";

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayDateString(): string {
	const d = new Date();
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function formatBookingPrice(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}

export function formatTimeFromISO(iso: string): string {
	const date = new Date(iso);
	let hours = date.getHours();
	const minutes = String(date.getMinutes()).padStart(2, "0");
	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12 || 12;
	return `${hours}:${minutes} ${ampm}`;
}

// ── Render Helpers ───────────────────────────────────────────────────────────

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

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Something went wrong"),
		h("p", message),
		h(RouterLink, { to: "/services", class: "page-error__back" }, {
			default: () => "Back to Services",
		}),
	]);
}

function renderDatePicker(
	selectedDate: string,
	onChange: (date: string) => void,
): VNode {
	return h("div", { class: "booking__date-picker", "data-testid": "date-picker" }, [
		h("label", { class: "booking__label", for: "booking-date" }, "Select Date"),
		h("input", {
			id: "booking-date",
			class: "booking__date-input",
			type: "date",
			value: selectedDate,
			min: todayDateString(),
			"data-testid": "date-input",
			onInput: (e: Event) => {
				const target = e.target as HTMLInputElement;
				onChange(target.value);
			},
		}),
	]);
}

function renderStaffFilter(
	staffOptions: { staffId: string; staffName: string }[],
	selectedStaffId: string,
	onChange: (staffId: string) => void,
): VNode | null {
	if (staffOptions.length <= 1) return null;

	return h("div", { class: "booking__staff-filter", "data-testid": "staff-filter" }, [
		h("label", { class: "booking__label", for: "staff-select" }, "Provider"),
		h("select", {
			id: "staff-select",
			class: "booking__select",
			value: selectedStaffId,
			"data-testid": "staff-select",
			onChange: (e: Event) => {
				const target = e.target as HTMLSelectElement;
				onChange(target.value);
			},
		}, [
			h("option", { value: "" }, "Any Provider"),
			...staffOptions.map((s) =>
				h("option", { value: s.staffId, key: s.staffId }, s.staffName)
			),
		]),
	]);
}

function renderLocationSelector(
	locations: LocationRecord[],
	selectedLocationId: string,
	onChange: (locationId: string) => void,
): VNode | null {
	if (locations.length === 0) return null;
	if (locations.length === 1) return null;

	return h("div", { class: "booking__location-selector", "data-testid": "location-selector" }, [
		h("label", { class: "booking__label", for: "location-select" }, "Location"),
		h("select", {
			id: "location-select",
			class: "booking__select",
			value: selectedLocationId,
			"data-testid": "location-select",
			onChange: (e: Event) => {
				const target = e.target as HTMLSelectElement;
				onChange(target.value);
			},
		}, locations.map((loc) =>
			h("option", { value: loc.id, key: loc.id },
				`${loc.name} — ${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`
			)
		)),
	]);
}

function renderTimeSlots(
	slots: ServiceAvailabilitySlot[],
	selectedSlot: ServiceAvailabilitySlot | null,
	slotsLoading: boolean,
	onSelect: (slot: ServiceAvailabilitySlot) => void,
): VNode {
	if (slotsLoading) {
		return h("div", {
			class: "booking__slots-loading",
			role: "status",
			"data-testid": "slots-loading",
		}, [
			h("div", { class: "page-loading__spinner" }),
			h("p", "Loading available times..."),
		]);
	}

	if (slots.length === 0) {
		return h("div", { class: "booking__slots-empty", "data-testid": "slots-empty" }, [
			h("p", "No available time slots for this date. Please select a different date."),
		]);
	}

	return h("div", { class: "booking__slots-grid", "data-testid": "slots-grid" },
		slots.map((slot) => {
			const isSelected = selectedSlot?.startTime === slot.startTime
				&& selectedSlot?.staffId === slot.staffId;

			return h("button", {
				key: `${slot.startTime}-${slot.staffId}`,
				class: [
					"booking__slot",
					isSelected ? "booking__slot--selected" : "",
				],
				type: "button",
				"data-testid": "slot-button",
				"aria-pressed": isSelected ? "true" : "false",
				onClick: () => onSelect(slot),
			}, [
				h("span", { class: "booking__slot-time" }, formatTimeFromISO(slot.startTime)),
				h("span", { class: "booking__slot-staff" }, slot.staffName),
			]);
		})
	);
}

function renderSummary(
	service: ServiceRecord,
	selectedDate: string,
	selectedSlot: ServiceAvailabilitySlot | null,
): VNode {
	return h("aside", { class: "booking__summary", "data-testid": "booking-summary" }, [
		h("h2", { class: "booking__summary-title" }, "Booking Summary"),
		h("dl", { class: "booking__summary-list" }, [
			h("dt", "Service"),
			h("dd", { "data-testid": "summary-service" }, service.name),
			h("dt", "Duration"),
			h("dd", { "data-testid": "summary-duration" }, `${service.durationMinutes} minutes`),
			h("dt", "Price"),
			h("dd", { "data-testid": "summary-price" }, formatBookingPrice(service.price)),
			h("dt", "Date"),
			h("dd", { "data-testid": "summary-date" }, selectedDate || "—"),
			h("dt", "Time"),
			h("dd", { "data-testid": "summary-time" },
				selectedSlot ? formatTimeFromISO(selectedSlot.startTime) : "—"
			),
			h("dt", "Provider"),
			h("dd", { "data-testid": "summary-staff" }, selectedSlot?.staffName ?? "—"),
		]),
	]);
}

function renderGuestFields(
	guestName: string,
	guestEmail: string,
	guestPhone: string,
	onNameChange: (v: string) => void,
	onEmailChange: (v: string) => void,
	onPhoneChange: (v: string) => void,
): VNode {
	return h("div", { class: "booking__guest-fields", "data-testid": "guest-fields" }, [
		h("h3", { class: "booking__label" }, "Your Information"),
		h("div", { class: "booking__field" }, [
			h("label", { for: "guest-name" }, "Name"),
			h("input", {
				id: "guest-name",
				class: "booking__input",
				type: "text",
				value: guestName,
				placeholder: "Full name",
				"data-testid": "guest-name-input",
				onInput: (e: Event) => onNameChange((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "booking__field" }, [
			h("label", { for: "guest-email" }, "Email"),
			h("input", {
				id: "guest-email",
				class: "booking__input",
				type: "email",
				value: guestEmail,
				placeholder: "email@example.com",
				"data-testid": "guest-email-input",
				onInput: (e: Event) => onEmailChange((e.target as HTMLInputElement).value),
			}),
		]),
		h("div", { class: "booking__field" }, [
			h("label", { for: "guest-phone" }, "Phone (optional)"),
			h("input", {
				id: "guest-phone",
				class: "booking__input",
				type: "tel",
				value: guestPhone,
				placeholder: "(555) 123-4567",
				"data-testid": "guest-phone-input",
				onInput: (e: Event) => onPhoneChange((e.target as HTMLInputElement).value),
			}),
		]),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const BookingPage = defineComponent({
	name: "BookingPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		// ── State ────────────────────────────────────────────────────────
		const loading = ref(true);
		const error = ref<string | null>(null);
		const service = ref<ServiceRecord | null>(null);
		const locations = ref<LocationRecord[]>([]);
		const selectedLocationId = ref("");
		const selectedDate = ref(todayDateString());
		const slots = ref<ServiceAvailabilitySlot[]>([]);
		const slotsLoading = ref(false);
		const slotsError = ref<string | null>(null);
		const selectedSlot = ref<ServiceAvailabilitySlot | null>(null);
		const selectedStaffId = ref("");
		const submitting = ref(false);
		const submitError = ref<string | null>(null);

		// Guest info (for unauthenticated users)
		const guestName = ref("");
		const guestEmail = ref("");
		const guestPhone = ref("");

		// ── Computed ─────────────────────────────────────────────────────
		const uniqueStaff = computed(() => {
			const map = new Map<string, string>();
			for (const slot of slots.value) {
				if (!map.has(slot.staffId)) {
					map.set(slot.staffId, slot.staffName);
				}
			}
			return Array.from(map.entries()).map(([staffId, staffName]) => ({
				staffId,
				staffName,
			}));
		});

		const filteredSlots = computed(() => {
			if (!selectedStaffId.value) return slots.value;
			return slots.value.filter((s) => s.staffId === selectedStaffId.value);
		});

		const canSubmit = computed(() => {
			if (!selectedSlot.value || !service.value || !selectedLocationId.value) {
				return false;
			}
			const auth = getAuthViewerState();
			if (!auth.isAuthenticated) {
				return guestName.value.trim() !== "" && guestEmail.value.trim() !== "";
			}
			return true;
		});

		// ── Data Fetching ────────────────────────────────────────────────
		async function fetchAvailability(): Promise<void> {
			if (!service.value || !selectedDate.value) return;

			slotsLoading.value = true;
			slotsError.value = null;
			selectedSlot.value = null;

			try {
				slots.value = await sdk.services.getAvailability({
					date: selectedDate.value,
					serviceId: service.value.id,
					tenantId: service.value.tenantId,
				});
			} catch {
				slotsError.value = "Failed to load availability. Please try again.";
				slots.value = [];
			} finally {
				slotsLoading.value = false;
			}
		}

		watch(selectedDate, () => {
			fetchAvailability();
		});

		onMounted(async () => {
			const serviceId = route.params.serviceId as string;
			if (!serviceId) {
				error.value = "No service specified.";
				loading.value = false;
				return;
			}

			try {
				const [serviceResult, locationsResult] = await Promise.all([
					sdk.services.get(serviceId),
					sdk.locations.list() as Promise<LocationListResponse>,
				]);

				service.value = serviceResult;
				locations.value = locationsResult.data ?? [];

				if (locations.value.length > 0) {
					selectedLocationId.value = locations.value[0].id;
				}

				// Pre-populate guest fields from auth
				const auth = getAuthViewerState();
				if (auth.isAuthenticated && auth.displayName) {
					guestName.value = auth.displayName;
				}

				await fetchAvailability();
			} catch {
				error.value = "Failed to load booking information. Please try again.";
			} finally {
				loading.value = false;
			}
		});

		// ── Actions ──────────────────────────────────────────────────────
		function selectSlot(slot: ServiceAvailabilitySlot): void {
			selectedSlot.value = slot;
		}

		function onDateChange(date: string): void {
			selectedDate.value = date;
		}

		function onStaffChange(staffId: string): void {
			selectedStaffId.value = staffId;
			selectedSlot.value = null;
		}

		function onLocationChange(locationId: string): void {
			selectedLocationId.value = locationId;
		}

		async function confirmBooking(): Promise<void> {
			if (!canSubmit.value || !service.value || !selectedSlot.value) return;

			submitting.value = true;
			submitError.value = null;

			const auth = getAuthViewerState();

			const input: CreateBookingInput = {
				tenantId: service.value.tenantId,
				locationId: selectedLocationId.value,
				customerId: auth.isAuthenticated ? auth.userId : null,
				customerName: auth.isAuthenticated
					? (auth.displayName ?? guestName.value)
					: guestName.value,
				customerEmail: auth.isAuthenticated
					? null
					: guestEmail.value || null,
				customerPhone: guestPhone.value || null,
				serviceId: service.value.id,
				serviceName: service.value.name,
				staffId: selectedSlot.value.staffId,
				staffName: selectedSlot.value.staffName,
				startTime: selectedSlot.value.startTime,
				endTime: selectedSlot.value.endTime,
				durationMinutes: service.value.durationMinutes,
				notes: null,
			};

			try {
				const booking = await sdk.bookings.create(input);
				router.push(`/bookings/${booking.id}/confirmation`);
			} catch {
				submitError.value = "Failed to create booking. Please try again.";
			} finally {
				submitting.value = false;
			}
		}

		// ── Render ───────────────────────────────────────────────────────
		return () => {
			if (loading.value) return renderLoading("Loading booking page...");
			if (error.value || !service.value) {
				return renderError(error.value ?? "Service not found");
			}

			const currentService = service.value;
			const auth = getAuthViewerState();

			return h("div", { class: "booking-page", "data-testid": "booking-page" }, [
				h("nav", { class: "booking__breadcrumb", "aria-label": "Breadcrumb" }, [
					h(RouterLink, { to: "/services" }, { default: () => "Services" }),
					h("span", " / "),
					h(RouterLink, { to: `/services/${currentService.id}` }, {
						default: () => currentService.name,
					}),
					h("span", " / "),
					h("span", "Book"),
				]),

				h("h1", { class: "booking__title", "data-testid": "booking-title" },
					`Book ${currentService.name}`
				),

				h("div", { class: "booking__layout" }, [
					// Main column
					h("div", { class: "booking__main" }, [
						renderDatePicker(selectedDate.value, onDateChange),

						renderStaffFilter(
							uniqueStaff.value,
							selectedStaffId.value,
							onStaffChange,
						),

						renderLocationSelector(
							locations.value,
							selectedLocationId.value,
							onLocationChange,
						),

						slotsError.value
							? h("div", {
								class: "booking__slots-error",
								role: "alert",
								"data-testid": "slots-error",
							}, slotsError.value)
							: renderTimeSlots(
								filteredSlots.value,
								selectedSlot.value,
								slotsLoading.value,
								selectSlot,
							),

						// Guest fields for unauthenticated users
						!auth.isAuthenticated
							? renderGuestFields(
								guestName.value,
								guestEmail.value,
								guestPhone.value,
								(v) => { guestName.value = v; },
								(v) => { guestEmail.value = v; },
								(v) => { guestPhone.value = v; },
							)
							: null,

						submitError.value
							? h("div", {
								class: "booking__submit-error",
								role: "alert",
								"data-testid": "submit-error",
							}, submitError.value)
							: null,

						h("button", {
							class: "booking__confirm-btn",
							type: "button",
							disabled: !canSubmit.value || submitting.value,
							"data-testid": "confirm-booking-btn",
							onClick: confirmBooking,
						}, submitting.value ? "Submitting..." : "Confirm Booking"),
					]),

					// Sidebar
					renderSummary(currentService, selectedDate.value, selectedSlot.value),
				]),
			]);
		};
	},
});
