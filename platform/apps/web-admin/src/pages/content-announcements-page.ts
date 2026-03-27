// E13-S6-T6: Announcements Management page — announcement list with DataTable,
// create/edit SlidePanel with scheduling and visibility settings.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useSdk } from "../composables/use-sdk";
import {
	buildAnnouncementDisplayRow,
	contentTabs,
	getAnnouncementPlacementLabel,
	getContentTabLabel,
	type AnnouncementDisplayRow,
	type ContentTab,
} from "../content-views";
import type {
	AnnouncementPlacement,
	AnnouncementRecord,
	CreateAnnouncementRequest,
	UpdateAnnouncementRequest,
} from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type AnnouncementFormData = {
	body: string;
	displayPriority: string;
	endDate: string;
	isActive: boolean;
	placement: AnnouncementPlacement;
	startDate: string;
	title: string;
};

type AnnouncementPageState = {
	announcements: AnnouncementDisplayRow[];
	editTarget: AnnouncementRecord | null;
	error: string | null;
	formData: AnnouncementFormData;
	formError: string | null;
	isLoading: boolean;
	isSaving: boolean;
	rawAnnouncements: AnnouncementRecord[];
	showPanel: boolean;
};

function emptyAnnouncementForm(): AnnouncementFormData {
	return {
		body: "",
		displayPriority: "1",
		endDate: "",
		isActive: true,
		placement: "banner",
		startDate: "",
		title: "",
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

function renderAnnouncementTable(
	announcements: AnnouncementDisplayRow[],
	onEdit: (id: string) => void,
	onToggleActive: (id: string, isActive: boolean) => void,
	onDelete: (id: string) => void,
) {
	if (announcements.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "announcements-empty" }, [
			h("p", "No announcements found"),
			h("p", { class: "empty-state__hint" }, "Create an announcement to communicate with customers."),
		]);
	}

	return h("div", { class: "data-table-wrapper", style: { overflowX: "auto" } }, [
		h("table", { class: "data-table", "data-testid": "announcements-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Title"),
					h("th", "Status"),
					h("th", "Placement"),
					h("th", "Start Date"),
					h("th", "End Date"),
					h("th", "Actions"),
				]),
			]),
			h("tbody", announcements.map((ann) =>
				h("tr", { key: ann.id, "data-testid": `announcement-row-${ann.id}` }, [
					h("td", ann.title),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${ann.statusBadge.colorClass}`,
						}, ann.statusLabel),
					]),
					h("td", ann.placementLabel),
					h("td", ann.startDate || "—"),
					h("td", ann.endDate || "—"),
					h("td", { class: "table-actions" }, [
						h("button", {
							class: `btn btn--sm ${ann.isActive ? "btn--warning" : "btn--success"}`,
							type: "button",
							onClick: () => onToggleActive(ann.id, !ann.isActive),
							"data-testid": "toggle-active-btn",
						}, ann.isActive ? "Deactivate" : "Activate"),
						h("button", {
							class: "btn btn--sm btn--secondary",
							type: "button",
							onClick: () => onEdit(ann.id),
							"data-testid": "edit-announcement-btn",
						}, "Edit"),
						h("button", {
							class: "btn btn--sm btn--danger",
							type: "button",
							onClick: () => onDelete(ann.id),
							"data-testid": "delete-announcement-btn",
						}, "Delete"),
					]),
				]),
			)),
		]),
	]);
}

function renderAnnouncementFormPanel(
	formData: AnnouncementFormData,
	editTarget: AnnouncementRecord | null,
	formError: string | null,
	isSaving: boolean,
	onFieldChange: (field: keyof AnnouncementFormData, value: string | boolean) => void,
	onSave: () => void,
	onClose: () => void,
) {
	const title = editTarget ? "Edit Announcement" : "Create Announcement";

	return h("div", { class: "slide-panel-overlay", "data-testid": "announcement-panel" }, [
		h("div", { class: "slide-panel", role: "dialog", "aria-labelledby": "announcement-panel-title" }, [
			h("div", { class: "slide-panel__header" }, [
				h("h3", { id: "announcement-panel-title", class: "slide-panel__title" }, title),
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
					h("h4", { class: "form-section__title" }, "Content"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "ann-title" }, "Title *"),
						h("input", {
							class: "form-field__input",
							id: "ann-title",
							type: "text",
							value: formData.title,
							onInput: (e: Event) => onFieldChange("title", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "ann-body" }, "Body *"),
						h("textarea", {
							class: "form-field__input",
							id: "ann-body",
							rows: 5,
							value: formData.body,
							onInput: (e: Event) => onFieldChange("body", (e.target as HTMLTextAreaElement).value),
						}),
					]),
				]),
				h("div", { class: "form-section" }, [
					h("h4", { class: "form-section__title" }, "Display Settings"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "ann-placement" }, "Display Type"),
						h("select", {
							class: "form-field__input",
							id: "ann-placement",
							value: formData.placement,
							onChange: (e: Event) => onFieldChange("placement", (e.target as HTMLSelectElement).value),
						}, [
							h("option", { value: "banner" }, getAnnouncementPlacementLabel("banner")),
							h("option", { value: "popup" }, getAnnouncementPlacementLabel("popup")),
							h("option", { value: "inline" }, getAnnouncementPlacementLabel("inline")),
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
					h("h4", { class: "form-section__title" }, "Scheduling"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "ann-start" }, "Start Date"),
						h("input", {
							class: "form-field__input",
							id: "ann-start",
							type: "datetime-local",
							value: formData.startDate,
							onInput: (e: Event) => onFieldChange("startDate", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "ann-end" }, "End Date"),
						h("input", {
							class: "form-field__input",
							id: "ann-end",
							type: "datetime-local",
							value: formData.endDate,
							onInput: (e: Event) => onFieldChange("endDate", (e.target as HTMLInputElement).value),
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
					"data-testid": "save-announcement-btn",
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

export const ContentAnnouncementsPage = defineComponent({
	name: "ContentAnnouncementsPage",
	setup() {
		const state = ref<AnnouncementPageState>({
			announcements: [],
			editTarget: null,
			error: null,
			formData: emptyAnnouncementForm(),
			formError: null,
			isLoading: true,
			isSaving: false,
			rawAnnouncements: [],
			showPanel: false,
		});

		const sdk = useSdk();
		const router = useRouter();

		async function loadAnnouncements() {
			try {
				const result = await sdk.content.listAnnouncements();
				const rawAnnouncements = result.data;
				state.value = {
					...state.value,
					rawAnnouncements,
					announcements: rawAnnouncements.map(buildAnnouncementDisplayRow),
					isLoading: false,
					error: null,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load announcements",
				};
			}
		}

		onMounted(loadAnnouncements);

		function openCreate() {
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: null,
				formData: emptyAnnouncementForm(),
				formError: null,
			};
		}

		function openEdit(id: string) {
			const ann = state.value.rawAnnouncements.find((a) => a.id === id);
			if (!ann) return;
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: ann,
				formData: {
					body: ann.body,
					displayPriority: String(ann.displayPriority),
					endDate: ann.endDate ?? "",
					isActive: ann.isActive,
					placement: ann.placement,
					startDate: ann.startDate ?? "",
					title: ann.title,
				},
				formError: null,
			};
		}

		function closePanel() {
			state.value = { ...state.value, showPanel: false, editTarget: null };
		}

		function updateField(field: keyof AnnouncementFormData, value: string | boolean) {
			state.value = { ...state.value, formData: { ...state.value.formData, [field]: value } };
		}

		async function saveAnnouncement() {
			const { formData, editTarget } = state.value;
			if (!formData.title.trim()) {
				state.value = { ...state.value, formError: "Title is required" };
				return;
			}

			state.value = { ...state.value, isSaving: true, formError: null };
			try {
				if (editTarget) {
					const params: UpdateAnnouncementRequest = {
						body: formData.body,
						displayPriority: Number(formData.displayPriority) || 1,
						endDate: formData.endDate || null,
						isActive: formData.isActive,
						placement: formData.placement,
						startDate: formData.startDate || null,
						title: formData.title,
					};
					await sdk.content.updateAnnouncement(editTarget.id, params);
				} else {
					const params: CreateAnnouncementRequest = {
						body: formData.body,
						displayPriority: Number(formData.displayPriority) || 1,
						endDate: formData.endDate || null,
						placement: formData.placement,
						startDate: formData.startDate || null,
						title: formData.title,
					};
					await sdk.content.createAnnouncement(params);
				}
				state.value = { ...state.value, isSaving: false, showPanel: false };
				await loadAnnouncements();
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					formError: err instanceof Error ? err.message : "Failed to save announcement",
				};
			}
		}

		async function toggleActive(id: string, isActive: boolean) {
			try {
				await sdk.content.updateAnnouncement(id, { isActive });
				await loadAnnouncements();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to update announcement",
				};
			}
		}

		async function handleDelete(id: string) {
			try {
				await sdk.content.deleteAnnouncement(id);
				await loadAnnouncements();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to delete announcement",
				};
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "admin-page admin-page--loading", role: "status", "data-testid": "announcements-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading announcements..."),
				]);
			}

			return h("div", { class: "admin-page", "data-testid": "content-announcements-page" }, [
				h("div", { class: "admin-page__header" }, [
					h("h2", { class: "admin-page__title" }, "Content"),
					h("button", {
						class: "btn btn--primary",
						type: "button",
						onClick: openCreate,
						"data-testid": "create-announcement-btn",
					}, "Add Announcement"),
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderContentTabBar("announcements", (tab) => { router.push(`/content/${tab}`); }),
				renderAnnouncementTable(s.announcements, openEdit, toggleActive, handleDelete),
				s.showPanel
					? renderAnnouncementFormPanel(
							s.formData,
							s.editTarget,
							s.formError,
							s.isSaving,
							updateField,
							saveAnnouncement,
							closePanel,
						)
					: null,
			]);
		};
	},
});
