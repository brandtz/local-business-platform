// E13-S6-T1: Category Management page — category list with tree view,
// create/edit SlidePanel, drag-reorder, and delete confirmation.

import { defineComponent, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { useSdk } from "../composables/use-sdk";
import {
	buildCategoryTree,
	catalogTabs,
	generateSlug,
	getCatalogTabLabel,
	getCategoryStatusBadge,
	type CatalogTab,
	type CategoryDisplayRow,
} from "../catalog-views";
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type CategoryFormData = {
	description: string;
	displayOrder: number;
	imageUrl: string;
	name: string;
	parentCategoryId: string;
	slug: string;
};

type CategoryPageState = {
	categories: CategoryDisplayRow[];
	rawCategories: Category[];
	deleteTarget: CategoryDisplayRow | null;
	editTarget: Category | null;
	error: string | null;
	formData: CategoryFormData;
	formError: string | null;
	isLoading: boolean;
	isSaving: boolean;
	showDeleteConfirm: boolean;
	showPanel: boolean;
};

function emptyForm(): CategoryFormData {
	return {
		description: "",
		displayOrder: 0,
		imageUrl: "",
		name: "",
		parentCategoryId: "",
		slug: "",
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

function renderCategoryRow(
	row: CategoryDisplayRow,
	onEdit: (id: string) => void,
	onDelete: (row: CategoryDisplayRow) => void,
) {
	const badge = getCategoryStatusBadge(row.status);
	const indent = row.depth * 24;

	return h("tr", {
		key: row.id,
		"data-testid": `category-row-${row.id}`,
		draggable: "true",
	}, [
		h("td", { style: { paddingLeft: `${indent + 12}px` } }, [
			row.depth > 0 ? h("span", { class: "tree-indent" }, "└ ") : null,
			row.name,
		]),
		h("td", row.slug),
		h("td", row.description),
		h("td", String(row.displayOrder)),
		h("td", [
			h("span", { class: `status-badge status-badge--${badge.colorClass}` }, badge.label),
		]),
		h("td", { class: "table-actions" }, [
			h("button", {
				class: "btn btn--sm btn--secondary",
				type: "button",
				onClick: () => onEdit(row.id),
				"data-testid": "edit-category-btn",
			}, "Edit"),
			h("button", {
				class: "btn btn--sm btn--danger",
				type: "button",
				onClick: () => onDelete(row),
				"data-testid": "delete-category-btn",
			}, "Delete"),
		]),
	]);
}

function renderCategoryTable(
	categories: CategoryDisplayRow[],
	onEdit: (id: string) => void,
	onDelete: (row: CategoryDisplayRow) => void,
) {
	if (categories.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "categories-empty" }, [
			h("p", "No categories found"),
			h("p", { class: "empty-state__hint" }, "Create a category to organize your catalog."),
		]);
	}

	return h("table", { class: "data-table", "data-testid": "categories-table" }, [
		h("thead", [
			h("tr", [
				h("th", "Name"),
				h("th", "Slug"),
				h("th", "Description"),
				h("th", "Order"),
				h("th", "Status"),
				h("th", "Actions"),
			]),
		]),
		h("tbody", categories.map((cat) => renderCategoryRow(cat, onEdit, onDelete))),
	]);
}

function renderCategoryFormPanel(
	formData: CategoryFormData,
	rawCategories: Category[],
	editTarget: Category | null,
	formError: string | null,
	isSaving: boolean,
	onFieldChange: (field: keyof CategoryFormData, value: string | number) => void,
	onSave: () => void,
	onClose: () => void,
) {
	const title = editTarget ? "Edit Category" : "Create Category";

	return h("div", { class: "slide-panel-overlay", "data-testid": "category-panel" }, [
		h("div", { class: "slide-panel", role: "dialog", "aria-labelledby": "category-panel-title" }, [
			h("div", { class: "slide-panel__header" }, [
				h("h3", { id: "category-panel-title", class: "slide-panel__title" }, title),
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
						h("label", { class: "form-field__label", for: "cat-name" }, "Name *"),
						h("input", {
							class: "form-field__input",
							id: "cat-name",
							type: "text",
							value: formData.name,
							onInput: (e: Event) => onFieldChange("name", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "cat-slug" }, "Slug"),
						h("input", {
							class: "form-field__input",
							id: "cat-slug",
							type: "text",
							value: formData.slug,
							onInput: (e: Event) => onFieldChange("slug", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "cat-description" }, "Description"),
						h("textarea", {
							class: "form-field__input",
							id: "cat-description",
							value: formData.description,
							rows: 3,
							onInput: (e: Event) => onFieldChange("description", (e.target as HTMLTextAreaElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "cat-parent" }, "Parent Category"),
						h("select", {
							class: "form-field__input",
							id: "cat-parent",
							value: formData.parentCategoryId,
							onChange: (e: Event) => onFieldChange("parentCategoryId", (e.target as HTMLSelectElement).value),
						}, [
							h("option", { value: "" }, "— None (root) —"),
							...rawCategories
								.filter((c) => c.id !== (editTarget?.id ?? ""))
								.map((c) => h("option", { value: c.id, key: c.id }, c.name)),
						]),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "cat-image" }, "Image URL"),
						h("input", {
							class: "form-field__input",
							id: "cat-image",
							type: "text",
							value: formData.imageUrl,
							onInput: (e: Event) => onFieldChange("imageUrl", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "cat-order" }, "Display Order"),
						h("input", {
							class: "form-field__input",
							id: "cat-order",
							type: "number",
							value: String(formData.displayOrder),
							onInput: (e: Event) => onFieldChange("displayOrder", Number((e.target as HTMLInputElement).value)),
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
					"data-testid": "save-category-btn",
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

function renderDeleteConfirm(
	target: CategoryDisplayRow,
	rawCategories: Category[],
	onConfirm: () => void,
	onCancel: () => void,
) {
	const hasChildren = rawCategories.some((c) => c.parentCategoryId === target.id);
	const warningText = hasChildren
		? "This category has child categories. Deleting it will orphan them."
		: "";

	return h("div", { class: "modal-overlay", "data-testid": "delete-confirm" }, [
		h("div", { class: "modal", role: "dialog" }, [
			h("div", { class: "modal__header" }, [
				h("h3", { class: "modal__title" }, "Delete Category"),
			]),
			h("div", { class: "modal__body" }, [
				h("p", `Are you sure you want to delete "${target.name}"?`),
				warningText ? h("p", { class: "alert alert--warning" }, warningText) : null,
			]),
			h("div", { class: "modal__footer" }, [
				h("button", {
					class: "btn btn--danger",
					type: "button",
					onClick: onConfirm,
					"data-testid": "confirm-delete-btn",
				}, "Delete"),
				h("button", {
					class: "btn btn--secondary",
					type: "button",
					onClick: onCancel,
				}, "Cancel"),
			]),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const CatalogCategoriesPage = defineComponent({
	name: "CatalogCategoriesPage",
	setup() {

		const sdk = useSdk();
		const router = useRouter();
		const state = ref<CategoryPageState>({
			categories: [],
			rawCategories: [],
			deleteTarget: null,
			editTarget: null,
			error: null,
			formData: emptyForm(),
			formError: null,
			isLoading: true,
			isSaving: false,
			showDeleteConfirm: false,
			showPanel: false,
		});

		async function loadCategories() {
			try {
				const result = await sdk.catalog.listCategories();
				const rawCategories = result.items;
				const categories = buildCategoryTree(rawCategories);
				state.value = {
					...state.value,
					categories,
					rawCategories,
					isLoading: false,
					error: null,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load categories",
				};
			}
		}

		onMounted(loadCategories);

		function openCreate() {
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: null,
				formData: emptyForm(),
				formError: null,
			};
		}

		function openEdit(id: string) {
			const cat = state.value.rawCategories.find((c) => c.id === id);
			if (!cat) return;
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: cat,
				formData: {
					description: cat.description ?? "",
					displayOrder: cat.displayOrder,
					imageUrl: cat.imageUrl ?? "",
					name: cat.name,
					parentCategoryId: cat.parentCategoryId ?? "",
					slug: cat.slug,
				},
				formError: null,
			};
		}

		function closePanel() {
			state.value = { ...state.value, showPanel: false, editTarget: null };
		}

		function updateField(field: keyof CategoryFormData, value: string | number) {
			const formData = { ...state.value.formData, [field]: value };
			if (field === "name" && !state.value.editTarget) {
				formData.slug = generateSlug(String(value));
			}
			state.value = { ...state.value, formData };
		}

		async function saveCategory() {
			const { formData, editTarget } = state.value;
			if (!formData.name.trim()) {
				state.value = { ...state.value, formError: "Name is required" };
				return;
			}

			state.value = { ...state.value, isSaving: true, formError: null };
			try {
				if (editTarget) {
					const params: UpdateCategoryRequest = {
						description: formData.description || undefined,
						displayOrder: formData.displayOrder,
						imageUrl: formData.imageUrl || undefined,
						name: formData.name,
						parentCategoryId: formData.parentCategoryId || undefined,
						slug: formData.slug,
					};
					await sdk.catalog.updateCategory(editTarget.id, params);
				} else {
					const params: CreateCategoryRequest = {
						description: formData.description || undefined,
						displayOrder: formData.displayOrder,
						imageUrl: formData.imageUrl || undefined,
						name: formData.name,
						parentCategoryId: formData.parentCategoryId || undefined,
						slug: formData.slug || generateSlug(formData.name),
					};
					await sdk.catalog.createCategory(params);
				}
				state.value = { ...state.value, isSaving: false, showPanel: false };
				await loadCategories();
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					formError: err instanceof Error ? err.message : "Failed to save category",
				};
			}
		}

		function openDeleteConfirm(row: CategoryDisplayRow) {
			state.value = { ...state.value, showDeleteConfirm: true, deleteTarget: row };
		}

		function closeDeleteConfirm() {
			state.value = { ...state.value, showDeleteConfirm: false, deleteTarget: null };
		}

		async function confirmDelete() {
			const { deleteTarget } = state.value;
			if (!deleteTarget) return;
			try {
				await sdk.catalog.deleteCategory(deleteTarget.id);
				closeDeleteConfirm();
				await loadCategories();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to delete category",
				};
				closeDeleteConfirm();
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "admin-page admin-page--loading", role: "status", "data-testid": "categories-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading categories..."),
				]);
			}

			return h("div", { class: "admin-page", "data-testid": "catalog-categories-page" }, [
				h("div", { class: "admin-page__header" }, [
					h("h2", { class: "admin-page__title" }, "Catalog"),
					h("button", {
						class: "btn btn--primary",
						type: "button",
						onClick: openCreate,
						"data-testid": "create-category-btn",
					}, "Add Category"),
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderCatalogTabBar("categories", (tab) => { router.push(`/catalog/${tab}`); }),
				renderCategoryTable(s.categories, openEdit, openDeleteConfirm),
				s.showPanel
					? renderCategoryFormPanel(
							s.formData,
							s.rawCategories,
							s.editTarget,
							s.formError,
							s.isSaving,
							updateField,
							saveCategory,
							closePanel,
						)
					: null,
				s.showDeleteConfirm && s.deleteTarget
					? renderDeleteConfirm(s.deleteTarget, s.rawCategories, confirmDelete, closeDeleteConfirm)
					: null,
			]);
		};
	},
});
