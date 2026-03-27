// E13-S6-T3: Services Management page — service list with DataTable,
// SearchToolbar, and create/edit SlidePanel with booking config.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useSdk } from "../composables/use-sdk";
import {
	buildServiceDisplayRow,
	type ServiceDisplayRow,
} from "../services-views";
import {
	catalogTabs,
	getCatalogTabLabel,
	type CatalogTab,
} from "../catalog-views";
import type { ServiceRecord, ServiceStatus } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type ServiceFormData = {
	bufferMinutes: string;
	description: string;
	durationMinutes: string;
	isBookable: boolean;
	maxAdvanceDays: string;
	minAdvanceHours: string;
	name: string;
	price: string;
	slug: string;
	status: ServiceStatus;
};

type ServicePageState = {
	editTarget: ServiceRecord | null;
	error: string | null;
	filterStatus: string;
	formData: ServiceFormData;
	formError: string | null;
	isLoading: boolean;
	isSaving: boolean;
	searchQuery: string;
	services: ServiceDisplayRow[];
	rawServices: ServiceRecord[];
	showPanel: boolean;
	total: number;
};

function emptyServiceForm(): ServiceFormData {
	return {
		bufferMinutes: "15",
		description: "",
		durationMinutes: "60",
		isBookable: true,
		maxAdvanceDays: "30",
		minAdvanceHours: "2",
		name: "",
		price: "",
		slug: "",
		status: "active",
	};
}

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderCatalogTabBar(
	activeTab: CatalogTab,
	onTabChange: (tab: CatalogTab) => void,
) {
	return h("div", { class: "tab-bar", role: "tablist", "data-testid": "catalog-tabs" },
		catalogTabs.map((tab) =>
			h("button", {
				class: `tab-bar__tab${activeTab === tab ? " tab-bar__tab--active" : ""}`,
				role: "tab",
				"aria-selected": activeTab === tab ? "true" : "false",
				key: tab,
				onClick: () => onTabChange(tab),
			}, getCatalogTabLabel(tab)),
		),
	);
}

function renderSearchToolbar(
	searchQuery: string,
	filterStatus: string,
	onSearch: (query: string) => void,
	onStatusFilter: (status: string) => void,
) {
	return h("div", { class: "search-toolbar", "data-testid": "service-search-toolbar" }, [
		h("input", {
			class: "search-toolbar__input",
			type: "search",
			placeholder: "Search services...",
			value: searchQuery,
			onInput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
			"data-testid": "search-input",
		}),
		h("select", {
			class: "search-toolbar__filter",
			value: filterStatus,
			onChange: (e: Event) => onStatusFilter((e.target as HTMLSelectElement).value),
			"data-testid": "status-filter",
		}, [
			h("option", { value: "" }, "All Statuses"),
			h("option", { value: "active" }, "Active"),
			h("option", { value: "inactive" }, "Inactive"),
		]),
	]);
}

function renderServiceTable(
	services: ServiceDisplayRow[],
	onEdit: (id: string) => void,
	onDelete: (id: string) => void,
) {
	if (services.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "services-empty" }, [
			h("p", "No services found"),
			h("p", { class: "empty-state__hint" }, "Create a service to start offering bookings."),
		]);
	}

	return h("div", { class: "data-table-wrapper", style: { overflowX: "auto" } }, [
		h("table", { class: "data-table", "data-testid": "services-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Name"),
					h("th", "Duration"),
					h("th", "Price"),
					h("th", "Bookable"),
					h("th", "Status"),
					h("th", "Actions"),
				]),
			]),
			h("tbody", services.map((svc) =>
				h("tr", { key: svc.id, "data-testid": `service-row-${svc.id}` }, [
					h("td", svc.name),
					h("td", svc.durationFormatted),
					h("td", svc.priceFormatted),
					h("td", svc.isBookable ? "Yes" : "No"),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${svc.statusBadge.colorClass}`,
						}, svc.statusBadge.label),
					]),
					h("td", { class: "table-actions" }, [
						h("button", {
							class: "btn btn--sm btn--secondary",
							type: "button",
							onClick: () => onEdit(svc.id),
							"data-testid": "edit-service-btn",
						}, "Edit"),
						h("button", {
							class: "btn btn--sm btn--danger",
							type: "button",
							onClick: () => onDelete(svc.id),
							"data-testid": "delete-service-btn",
						}, "Delete"),
					]),
				]),
			)),
		]),
	]);
}

function renderServiceFormPanel(
	formData: ServiceFormData,
	editTarget: ServiceRecord | null,
	formError: string | null,
	isSaving: boolean,
	onFieldChange: (field: keyof ServiceFormData, value: string | boolean) => void,
	onSave: () => void,
	onClose: () => void,
) {
	const title = editTarget ? "Edit Service" : "Create Service";

	return h("div", { class: "slide-panel-overlay", "data-testid": "service-panel" }, [
		h("div", { class: "slide-panel", role: "dialog", "aria-labelledby": "service-panel-title" }, [
			h("div", { class: "slide-panel__header" }, [
				h("h3", { id: "service-panel-title", class: "slide-panel__title" }, title),
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
					h("h4", { class: "form-section__title" }, "Basic Info"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-name" }, "Name *"),
						h("input", {
							class: "form-field__input",
							id: "svc-name",
							type: "text",
							value: formData.name,
							onInput: (e: Event) => onFieldChange("name", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-slug" }, "Slug"),
						h("input", {
							class: "form-field__input",
							id: "svc-slug",
							type: "text",
							value: formData.slug,
							onInput: (e: Event) => onFieldChange("slug", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-desc" }, "Description"),
						h("textarea", {
							class: "form-field__input",
							id: "svc-desc",
							rows: 3,
							value: formData.description,
							onInput: (e: Event) => onFieldChange("description", (e.target as HTMLTextAreaElement).value),
						}),
					]),
				]),
				h("div", { class: "form-section" }, [
					h("h4", { class: "form-section__title" }, "Pricing & Duration"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-price" }, "Price (cents) *"),
						h("input", {
							class: "form-field__input",
							id: "svc-price",
							type: "number",
							min: "0",
							value: formData.price,
							onInput: (e: Event) => onFieldChange("price", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-duration" }, "Duration (minutes) *"),
						h("input", {
							class: "form-field__input",
							id: "svc-duration",
							type: "number",
							min: "1",
							value: formData.durationMinutes,
							onInput: (e: Event) => onFieldChange("durationMinutes", (e.target as HTMLInputElement).value),
						}),
					]),
				]),
				h("div", { class: "form-section" }, [
					h("h4", { class: "form-section__title" }, "Booking Settings"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label" }, [
							h("input", {
								type: "checkbox",
								checked: formData.isBookable,
								onChange: (e: Event) => onFieldChange("isBookable", (e.target as HTMLInputElement).checked),
							}),
							" Bookable",
						]),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-buffer" }, "Buffer (minutes)"),
						h("input", {
							class: "form-field__input",
							id: "svc-buffer",
							type: "number",
							min: "0",
							value: formData.bufferMinutes,
							onInput: (e: Event) => onFieldChange("bufferMinutes", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-advance" }, "Max Advance Days"),
						h("input", {
							class: "form-field__input",
							id: "svc-advance",
							type: "number",
							min: "1",
							value: formData.maxAdvanceDays,
							onInput: (e: Event) => onFieldChange("maxAdvanceDays", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "svc-notice" }, "Min Advance Hours"),
						h("input", {
							class: "form-field__input",
							id: "svc-notice",
							type: "number",
							min: "0",
							value: formData.minAdvanceHours,
							onInput: (e: Event) => onFieldChange("minAdvanceHours", (e.target as HTMLInputElement).value),
						}),
					]),
				]),
			]),
			h("div", { class: "slide-panel__footer" }, [
				h("button", {
					class: "btn btn--primary",
					type: "button",
					disabled: isSaving,
					onClick: onSave,
					"data-testid": "save-service-btn",
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

export const CatalogServicesPage = defineComponent({
	name: "CatalogServicesPage",
	setup() {

		const sdk = useSdk();
		const router = useRouter();
		const state = ref<ServicePageState>({
			editTarget: null,
			error: null,
			filterStatus: "",
			formData: emptyServiceForm(),
			formError: null,
			isLoading: true,
			isSaving: false,
			searchQuery: "",
			services: [],
			rawServices: [],
			showPanel: false,
			total: 0,
		});

		async function loadServices() {
			try {
				const result = await sdk.services.list({
					search: state.value.searchQuery || undefined,
					status: (state.value.filterStatus as ServiceStatus) || undefined,
				});
				const rawServices = result.data;
				state.value = {
					...state.value,
					rawServices,
					services: rawServices.map(buildServiceDisplayRow),
					total: result.total,
					isLoading: false,
					error: null,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load services",
				};
			}
		}

		onMounted(loadServices);

		function setSearch(query: string) {
			state.value = { ...state.value, searchQuery: query };
			void loadServices();
		}

		function setStatusFilter(status: string) {
			state.value = { ...state.value, filterStatus: status };
			void loadServices();
		}

		function openCreate() {
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: null,
				formData: emptyServiceForm(),
				formError: null,
			};
		}

		function openEdit(id: string) {
			const svc = state.value.rawServices.find((s) => s.id === id);
			if (!svc) return;
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: svc,
				formData: {
					bufferMinutes: String(svc.bufferMinutes),
					description: svc.description ?? "",
					durationMinutes: String(svc.durationMinutes),
					isBookable: svc.isBookable,
					maxAdvanceDays: String(svc.maxAdvanceDays),
					minAdvanceHours: String(svc.minAdvanceHours),
					name: svc.name,
					price: String(svc.price),
					slug: svc.slug,
					status: svc.status,
				},
				formError: null,
			};
		}

		function closePanel() {
			state.value = { ...state.value, showPanel: false, editTarget: null };
		}

		function updateField(field: keyof ServiceFormData, value: string | boolean) {
			const formData = { ...state.value.formData, [field]: value };
			state.value = { ...state.value, formData };
		}

		async function saveService() {
			const { formData, editTarget } = state.value;
			if (!formData.name.trim()) {
				state.value = { ...state.value, formError: "Name is required" };
				return;
			}

			const price = Number(formData.price);
			if (isNaN(price) || price < 0) {
				state.value = { ...state.value, formError: "Price must be a non-negative number" };
				return;
			}

			const durationMinutes = Number(formData.durationMinutes);
			if (isNaN(durationMinutes) || durationMinutes <= 0) {
				state.value = { ...state.value, formError: "Duration must be a positive number" };
				return;
			}

			state.value = { ...state.value, isSaving: true, formError: null };
			try {
				const payload = {
					bufferMinutes: Number(formData.bufferMinutes) || 0,
					description: formData.description || undefined,
					durationMinutes,
					isBookable: formData.isBookable,
					maxAdvanceDays: Number(formData.maxAdvanceDays) || 30,
					minAdvanceHours: Number(formData.minAdvanceHours) || 0,
					name: formData.name,
					price,
					slug: formData.slug,
					sortOrder: 0,
					status: formData.status,
					tenantId: "",
				};

				if (editTarget) {
					await sdk.services.update(editTarget.id, payload);
				} else {
					await sdk.services.create(payload);
				}
				state.value = { ...state.value, isSaving: false, showPanel: false };
				await loadServices();
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					formError: err instanceof Error ? err.message : "Failed to save service",
				};
			}
		}

		async function handleDelete(id: string) {
			try {
				await sdk.services.delete(id);
				await loadServices();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to delete service",
				};
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "admin-page admin-page--loading", role: "status", "data-testid": "services-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading services..."),
				]);
			}

			return h("div", { class: "admin-page", "data-testid": "catalog-services-page" }, [
				h("div", { class: "admin-page__header" }, [
					h("h2", { class: "admin-page__title" }, "Catalog"),
					h("button", {
						class: "btn btn--primary",
						type: "button",
						onClick: openCreate,
						"data-testid": "create-service-btn",
					}, "Add Service"),
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderCatalogTabBar("services", (tab) => { router.push(`/catalog/${tab}`); }),
				renderSearchToolbar(s.searchQuery, s.filterStatus, setSearch, setStatusFilter),
				renderServiceTable(s.services, openEdit, handleDelete),
				s.showPanel
					? renderServiceFormPanel(
							s.formData,
							s.editTarget,
							s.formError,
							s.isSaving,
							updateField,
							saveService,
							closePanel,
						)
					: null,
			]);
		};
	},
});
