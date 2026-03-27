// E13-S6-T4: Location Management page — location list with DataTable,
// create/edit SlidePanel with address fields and operating hours grid.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useSdk } from "../composables/use-sdk";
import {
	buildLocationDisplayRow,
	buildDefaultWeekHours,
	contentTabs,
	getContentTabLabel,
	type ContentTab,
	type DayHours,
	type LocationDisplayRow,
} from "../content-views";
import type { LocationRecord, CreateLocationParams } from "@platform/sdk";

// ── Types ────────────────────────────────────────────────────────────────────

type LocationFormData = {
	address: string;
	city: string;
	email: string;
	isActive: boolean;
	name: string;
	phone: string;
	state: string;
	zip: string;
	hours: DayHours[];
};

type LocationPageState = {
	editTarget: LocationRecord | null;
	error: string | null;
	formData: LocationFormData;
	formError: string | null;
	isLoading: boolean;
	isSaving: boolean;
	locations: LocationDisplayRow[];
	rawLocations: LocationRecord[];
	showPanel: boolean;
};

function emptyLocationForm(): LocationFormData {
	return {
		address: "",
		city: "",
		email: "",
		isActive: true,
		name: "",
		phone: "",
		state: "",
		zip: "",
		hours: buildDefaultWeekHours(),
	};
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderContentTabBar(
	activeTab: ContentTab,
	onTabChange: (tab: ContentTab) => void,
) {
	return h("div", { class: "tab-bar", role: "tablist", "data-testid": "content-tabs" },
		contentTabs.map((tab) =>
			h("button", {
				class: `tab-bar__tab${activeTab === tab ? " tab-bar__tab--active" : ""}`,
				role: "tab",
				"aria-selected": activeTab === tab ? "true" : "false",
				key: tab,
				onClick: () => onTabChange(tab),
			}, getContentTabLabel(tab)),
		),
	);
}

function renderLocationTable(
	locations: LocationDisplayRow[],
	onEdit: (id: string) => void,
	onDelete: (id: string) => void,
) {
	if (locations.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "locations-empty" }, [
			h("p", "No locations found"),
			h("p", { class: "empty-state__hint" }, "Add a location to get started."),
		]);
	}

	return h("div", { class: "data-table-wrapper", style: { overflowX: "auto" } }, [
		h("table", { class: "data-table", "data-testid": "locations-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Name"),
					h("th", "Address"),
					h("th", "Phone"),
					h("th", "Status"),
					h("th", "Actions"),
				]),
			]),
			h("tbody", locations.map((loc) =>
				h("tr", { key: loc.id, "data-testid": `location-row-${loc.id}` }, [
					h("td", loc.name),
					h("td", loc.fullAddress),
					h("td", loc.phone),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${loc.statusBadge.colorClass}`,
						}, loc.statusBadge.label),
					]),
					h("td", { class: "table-actions" }, [
						h("button", {
							class: "btn btn--sm btn--secondary",
							type: "button",
							onClick: () => onEdit(loc.id),
							"data-testid": "edit-location-btn",
						}, "Edit"),
						h("button", {
							class: "btn btn--sm btn--danger",
							type: "button",
							onClick: () => onDelete(loc.id),
							"data-testid": "delete-location-btn",
						}, "Delete"),
					]),
				]),
			)),
		]),
	]);
}

function renderHoursGrid(
	hours: DayHours[],
	onHoursChange: (index: number, field: keyof DayHours, value: string | boolean) => void,
) {
	return h("div", { class: "hours-grid", "data-testid": "hours-grid" },
		hours.map((day, i) =>
			h("div", { class: "hours-grid__row", key: day.day }, [
				h("span", { class: "hours-grid__day" }, day.day),
				h("label", { class: "hours-grid__closed" }, [
					h("input", {
						type: "checkbox",
						checked: day.isClosed,
						onChange: (e: Event) => onHoursChange(i, "isClosed", (e.target as HTMLInputElement).checked),
					}),
					" Closed",
				]),
				!day.isClosed
					? h("span", { class: "hours-grid__times" }, [
							h("input", {
								type: "time",
								value: day.openTime,
								onInput: (e: Event) => onHoursChange(i, "openTime", (e.target as HTMLInputElement).value),
								class: "form-field__input form-field__input--time",
							}),
							h("span", " — "),
							h("input", {
								type: "time",
								value: day.closeTime,
								onInput: (e: Event) => onHoursChange(i, "closeTime", (e.target as HTMLInputElement).value),
								class: "form-field__input form-field__input--time",
							}),
						])
					: null,
			]),
		),
	);
}

function renderLocationFormPanel(
	formData: LocationFormData,
	editTarget: LocationRecord | null,
	formError: string | null,
	isSaving: boolean,
	onFieldChange: (field: keyof LocationFormData, value: string | boolean) => void,
	onHoursChange: (index: number, field: keyof DayHours, value: string | boolean) => void,
	onSave: () => void,
	onClose: () => void,
) {
	const title = editTarget ? "Edit Location" : "Create Location";

	return h("div", { class: "slide-panel-overlay", "data-testid": "location-panel" }, [
		h("div", { class: "slide-panel", role: "dialog", "aria-labelledby": "location-panel-title" }, [
			h("div", { class: "slide-panel__header" }, [
				h("h3", { id: "location-panel-title", class: "slide-panel__title" }, title),
				h("button", {
					class: "slide-panel__close",
					type: "button",
					"aria-label": "Close",
					onClick: onClose,
				}, "×"),
			]),
			h("div", { class: "slide-panel__body" }, [
				formError
					? h("div", { class: "alert alert--error", role: "alert" }, formError)
					: null,
				h("div", { class: "form-section" }, [
					h("h4", { class: "form-section__title" }, "Basic Information"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "loc-name" }, "Name *"),
						h("input", {
							class: "form-field__input",
							id: "loc-name",
							type: "text",
							value: formData.name,
							onInput: (e: Event) => onFieldChange("name", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "loc-address" }, "Address *"),
						h("input", {
							class: "form-field__input",
							id: "loc-address",
							type: "text",
							value: formData.address,
							onInput: (e: Event) => onFieldChange("address", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field-row" }, [
						h("div", { class: "form-field" }, [
							h("label", { class: "form-field__label", for: "loc-city" }, "City *"),
							h("input", {
								class: "form-field__input",
								id: "loc-city",
								type: "text",
								value: formData.city,
								onInput: (e: Event) => onFieldChange("city", (e.target as HTMLInputElement).value),
							}),
						]),
						h("div", { class: "form-field" }, [
							h("label", { class: "form-field__label", for: "loc-state" }, "State *"),
							h("input", {
								class: "form-field__input",
								id: "loc-state",
								type: "text",
								value: formData.state,
								onInput: (e: Event) => onFieldChange("state", (e.target as HTMLInputElement).value),
							}),
						]),
						h("div", { class: "form-field" }, [
							h("label", { class: "form-field__label", for: "loc-zip" }, "ZIP *"),
							h("input", {
								class: "form-field__input",
								id: "loc-zip",
								type: "text",
								value: formData.zip,
								onInput: (e: Event) => onFieldChange("zip", (e.target as HTMLInputElement).value),
							}),
						]),
					]),
					h("div", { class: "form-field-row" }, [
						h("div", { class: "form-field" }, [
							h("label", { class: "form-field__label", for: "loc-phone" }, "Phone"),
							h("input", {
								class: "form-field__input",
								id: "loc-phone",
								type: "tel",
								value: formData.phone,
								onInput: (e: Event) => onFieldChange("phone", (e.target as HTMLInputElement).value),
							}),
						]),
						h("div", { class: "form-field" }, [
							h("label", { class: "form-field__label", for: "loc-email" }, "Email"),
							h("input", {
								class: "form-field__input",
								id: "loc-email",
								type: "email",
								value: formData.email,
								onInput: (e: Event) => onFieldChange("email", (e.target as HTMLInputElement).value),
							}),
						]),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label" }, [
							h("input", {
								type: "checkbox",
								checked: formData.isActive,
								onChange: (e: Event) => onFieldChange("isActive", (e.target as HTMLInputElement).checked),
							}),
							" Active",
						]),
					]),
				]),
				h("div", { class: "form-section" }, [
					h("h4", { class: "form-section__title" }, "Operating Hours"),
					renderHoursGrid(formData.hours, onHoursChange),
				]),
			]),
			h("div", { class: "slide-panel__footer" }, [
				h("button", {
					class: "btn btn--primary",
					type: "button",
					disabled: isSaving,
					onClick: onSave,
					"data-testid": "save-location-btn",
				}, isSaving ? "Saving..." : "Save"),
				h("button", {
					class: "btn btn--secondary",
					type: "button",
					onClick: onClose,
				}, "Cancel"),
			]),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const ContentLocationsPage = defineComponent({
	name: "ContentLocationsPage",
	setup() {
		const state = ref<LocationPageState>({
			editTarget: null,
			error: null,
			formData: emptyLocationForm(),
			formError: null,
			isLoading: true,
			isSaving: false,
			locations: [],
			rawLocations: [],
			showPanel: false,
		});

		const sdk = useSdk();
		const router = useRouter();

		async function loadLocations() {
			try {
				const result = await sdk.locations.list();
				const rawLocations = result.data;
				state.value = {
					...state.value,
					rawLocations,
					locations: rawLocations.map(buildLocationDisplayRow),
					isLoading: false,
					error: null,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load locations",
				};
			}
		}

		onMounted(loadLocations);

		function openCreate() {
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: null,
				formData: emptyLocationForm(),
				formError: null,
			};
		}

		function openEdit(id: string) {
			const loc = state.value.rawLocations.find((l) => l.id === id);
			if (!loc) return;
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: loc,
				formData: {
					address: loc.address,
					city: loc.city,
					email: loc.email,
					isActive: loc.isActive,
					name: loc.name,
					phone: loc.phone,
					state: loc.state,
					zip: loc.zip,
					hours: buildDefaultWeekHours(),
				},
				formError: null,
			};
		}

		function closePanel() {
			state.value = { ...state.value, showPanel: false, editTarget: null };
		}

		function updateField(field: keyof LocationFormData, value: string | boolean) {
			state.value = { ...state.value, formData: { ...state.value.formData, [field]: value } };
		}

		function updateHours(index: number, field: keyof DayHours, value: string | boolean) {
			const hours = [...state.value.formData.hours];
			hours[index] = { ...hours[index]!, [field]: value };
			state.value = { ...state.value, formData: { ...state.value.formData, hours } };
		}

		async function saveLocation() {
			const { formData, editTarget } = state.value;
			if (!formData.name.trim()) {
				state.value = { ...state.value, formError: "Name is required" };
				return;
			}
			if (!formData.address.trim()) {
				state.value = { ...state.value, formError: "Address is required" };
				return;
			}

			state.value = { ...state.value, isSaving: true, formError: null };
			try {
				const params: CreateLocationParams = {
					address: formData.address,
					city: formData.city,
					email: formData.email,
					isActive: formData.isActive,
					latitude: null,
					longitude: null,
					name: formData.name,
					phone: formData.phone,
					state: formData.state,
					zip: formData.zip,
				};

				if (editTarget) {
					await sdk.locations.update(editTarget.id, params);
				} else {
					await sdk.locations.create(params);
				}
				state.value = { ...state.value, isSaving: false, showPanel: false };
				await loadLocations();
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					formError: err instanceof Error ? err.message : "Failed to save location",
				};
			}
		}

		async function handleDelete(id: string) {
			try {
				await sdk.locations.delete(id);
				await loadLocations();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to delete location",
				};
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "admin-page admin-page--loading", role: "status", "data-testid": "locations-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading locations..."),
				]);
			}

			return h("div", { class: "admin-page", "data-testid": "content-locations-page" }, [
				h("div", { class: "admin-page__header" }, [
					h("h2", { class: "admin-page__title" }, "Content"),
					h("button", {
						class: "btn btn--primary",
						type: "button",
						onClick: openCreate,
						"data-testid": "create-location-btn",
					}, "Add Location"),
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderContentTabBar("locations", (tab) => { router.push(`/content/${tab}`); }),
				renderLocationTable(s.locations, openEdit, handleDelete),
				s.showPanel
					? renderLocationFormPanel(
							s.formData,
							s.editTarget,
							s.formError,
							s.isSaving,
							updateField,
							updateHours,
							saveLocation,
							closePanel,
						)
					: null,
			]);
		};
	},
});
