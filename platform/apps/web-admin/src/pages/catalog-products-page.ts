// E13-S6-T2: Product Management page — product list with DataTable,
// SearchToolbar, bulk actions, and create/edit SlidePanel.

import { defineComponent, h, onMounted, ref } from "vue";

import { useSdk } from "../composables/use-sdk";
import {
	buildProductDisplayRow,
	catalogTabs,
	generateSlug,
	getCatalogTabLabel,
	getProductBulkActionLabel,
	getProductBulkActionConfirmMessage,
	productBulkActions,
	type CatalogTab,
	type ProductBulkAction,
	type ProductDisplayRow,
} from "../catalog-views";
import type {
	Category,
	CatalogItemRecord,
	CatalogItemStatus,
	ItemStatus,
} from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type ProductFormData = {
	categoryId: string;
	compareAtPrice: string;
	description: string;
	name: string;
	price: string;
	slug: string;
	status: ItemStatus;
};

type ProductPageState = {
	categories: Category[];
	editTarget: CatalogItemRecord | null;
	error: string | null;
	filterCategory: string;
	filterStatus: string;
	formData: ProductFormData;
	formError: string | null;
	isLoading: boolean;
	isSaving: boolean;
	page: number;
	products: ProductDisplayRow[];
	rawProducts: CatalogItemRecord[];
	searchQuery: string;
	selectedIds: Set<string>;
	showBulkConfirm: boolean;
	bulkAction: ProductBulkAction | null;
	showPanel: boolean;
	total: number;
};

function emptyProductForm(): ProductFormData {
	return {
		categoryId: "",
		compareAtPrice: "",
		description: "",
		name: "",
		price: "",
		slug: "",
		status: "draft",
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
	filterCategory: string,
	filterStatus: string,
	categories: Category[],
	onSearch: (query: string) => void,
	onCategoryFilter: (id: string) => void,
	onStatusFilter: (status: string) => void,
) {
	return h("div", { class: "search-toolbar", "data-testid": "product-search-toolbar" }, [
		h("input", {
			class: "search-toolbar__input",
			type: "search",
			placeholder: "Search products...",
			value: searchQuery,
			onInput: (e: Event) => onSearch((e.target as HTMLInputElement).value),
			"data-testid": "search-input",
		}),
		h("select", {
			class: "search-toolbar__filter",
			value: filterCategory,
			onChange: (e: Event) => onCategoryFilter((e.target as HTMLSelectElement).value),
			"data-testid": "category-filter",
		}, [
			h("option", { value: "" }, "All Categories"),
			...categories.map((c) => h("option", { value: c.id, key: c.id }, c.name)),
		]),
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

function renderBulkActions(
	selectedCount: number,
	onBulkAction: (action: ProductBulkAction) => void,
) {
	if (selectedCount === 0) return null;

	return h("div", { class: "bulk-actions", "data-testid": "bulk-actions" }, [
		h("span", { class: "bulk-actions__count" }, `${selectedCount} selected`),
		...productBulkActions.map((action) =>
			h("button", {
				class: `btn btn--sm ${action === "delete" ? "btn--danger" : "btn--secondary"}`,
				type: "button",
				key: action,
				onClick: () => onBulkAction(action),
				"data-testid": `bulk-${action}-btn`,
			}, getProductBulkActionLabel(action)),
		),
	]);
}

function renderProductTable(
	products: ProductDisplayRow[],
	selectedIds: Set<string>,
	onToggleSelect: (id: string) => void,
	onToggleAll: () => void,
	onEdit: (id: string) => void,
	onDelete: (id: string) => void,
) {
	if (products.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "products-empty" }, [
			h("p", "No products found"),
			h("p", { class: "empty-state__hint" }, "Create a product to start your catalog."),
		]);
	}

	const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.id));

	return h("div", { class: "data-table-wrapper", style: { overflowX: "auto" } }, [
		h("table", { class: "data-table", "data-testid": "products-table" }, [
			h("thead", [
				h("tr", [
					h("th", [
						h("input", {
							type: "checkbox",
							checked: allSelected,
							onChange: onToggleAll,
							"data-testid": "select-all",
						}),
					]),
					h("th", "Name"),
					h("th", "Category"),
					h("th", "Price"),
					h("th", "Status"),
					h("th", "Visibility"),
					h("th", "Actions"),
				]),
			]),
			h("tbody", products.map((product) =>
				h("tr", {
					key: product.id,
					"data-testid": `product-row-${product.id}`,
					class: selectedIds.has(product.id) ? "data-table__row--selected" : "",
				}, [
					h("td", [
						h("input", {
							type: "checkbox",
							checked: selectedIds.has(product.id),
							onChange: () => onToggleSelect(product.id),
						}),
					]),
					h("td", product.name),
					h("td", product.categoryId),
					h("td", product.priceFormatted),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${product.statusBadge.colorClass}`,
						}, product.statusBadge.label),
					]),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${product.visibilityBadge.colorClass}`,
						}, product.visibilityBadge.label),
					]),
					h("td", { class: "table-actions" }, [
						h("button", {
							class: "btn btn--sm btn--secondary",
							type: "button",
							onClick: () => onEdit(product.id),
							"data-testid": "edit-product-btn",
						}, "Edit"),
						h("button", {
							class: "btn btn--sm btn--danger",
							type: "button",
							onClick: () => onDelete(product.id),
							"data-testid": "delete-product-btn",
						}, "Delete"),
					]),
				]),
			)),
		]),
	]);
}

function renderProductFormPanel(
	formData: ProductFormData,
	categories: Category[],
	editTarget: CatalogItemRecord | null,
	formError: string | null,
	isSaving: boolean,
	onFieldChange: (field: keyof ProductFormData, value: string) => void,
	onSave: () => void,
	onClose: () => void,
) {
	const title = editTarget ? "Edit Product" : "Create Product";

	return h("div", { class: "slide-panel-overlay", "data-testid": "product-panel" }, [
		h("div", { class: "slide-panel", role: "dialog", "aria-labelledby": "product-panel-title" }, [
			h("div", { class: "slide-panel__header" }, [
				h("h3", { id: "product-panel-title", class: "slide-panel__title" }, title),
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
						h("label", { class: "form-field__label", for: "prod-name" }, "Name *"),
						h("input", {
							class: "form-field__input",
							id: "prod-name",
							type: "text",
							value: formData.name,
							onInput: (e: Event) => onFieldChange("name", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "prod-slug" }, "Slug"),
						h("input", {
							class: "form-field__input",
							id: "prod-slug",
							type: "text",
							value: formData.slug,
							onInput: (e: Event) => onFieldChange("slug", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "prod-desc" }, "Description"),
						h("textarea", {
							class: "form-field__input",
							id: "prod-desc",
							rows: 4,
							value: formData.description,
							onInput: (e: Event) => onFieldChange("description", (e.target as HTMLTextAreaElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "prod-category" }, "Category"),
						h("select", {
							class: "form-field__input",
							id: "prod-category",
							value: formData.categoryId,
							onChange: (e: Event) => onFieldChange("categoryId", (e.target as HTMLSelectElement).value),
						}, [
							h("option", { value: "" }, "— Select —"),
							...categories.map((c) => h("option", { value: c.id, key: c.id }, c.name)),
						]),
					]),
				]),
				h("div", { class: "form-section" }, [
					h("h4", { class: "form-section__title" }, "Pricing"),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "prod-price" }, "Price (cents) *"),
						h("input", {
							class: "form-field__input",
							id: "prod-price",
							type: "number",
							min: "0",
							value: formData.price,
							onInput: (e: Event) => onFieldChange("price", (e.target as HTMLInputElement).value),
						}),
					]),
					h("div", { class: "form-field" }, [
						h("label", { class: "form-field__label", for: "prod-compare" }, "Compare-at Price (cents)"),
						h("input", {
							class: "form-field__input",
							id: "prod-compare",
							type: "number",
							min: "0",
							value: formData.compareAtPrice,
							onInput: (e: Event) => onFieldChange("compareAtPrice", (e.target as HTMLInputElement).value),
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
					"data-testid": "save-product-btn",
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

export const CatalogProductsPage = defineComponent({
	name: "CatalogProductsPage",
	setup() {
		const state = ref<ProductPageState>({
			categories: [],
			editTarget: null,
			error: null,
			filterCategory: "",
			filterStatus: "",
			formData: emptyProductForm(),
			formError: null,
			isLoading: true,
			isSaving: false,
			page: 1,
			products: [],
			rawProducts: [],
			searchQuery: "",
			selectedIds: new Set(),
			showBulkConfirm: false,
			bulkAction: null,
			showPanel: false,
			total: 0,
		});

		async function loadProducts() {
			try {
				const sdk = useSdk();
				const [itemsResult, catsResult] = await Promise.allSettled([
					sdk.catalog.listItems({
						search: state.value.searchQuery || undefined,
						status: (state.value.filterStatus as CatalogItemStatus) || undefined,
						page: state.value.page,
						pageSize: 25,
					}),
					sdk.catalog.listCategories(),
				]);

				const rawProducts = itemsResult.status === "fulfilled" ? itemsResult.value.items : [];
				const categories = catsResult.status === "fulfilled" ? catsResult.value.items : [];

				state.value = {
					...state.value,
					rawProducts,
					products: rawProducts.map(buildProductDisplayRow),
					categories,
					total: itemsResult.status === "fulfilled" ? itemsResult.value.total : 0,
					isLoading: false,
					error: null,
					selectedIds: new Set(),
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load products",
				};
			}
		}

		onMounted(loadProducts);

		function setSearch(query: string) {
			state.value = { ...state.value, searchQuery: query, page: 1 };
			void loadProducts();
		}

		function setCategoryFilter(id: string) {
			state.value = { ...state.value, filterCategory: id, page: 1 };
			void loadProducts();
		}

		function setStatusFilter(status: string) {
			state.value = { ...state.value, filterStatus: status, page: 1 };
			void loadProducts();
		}

		function toggleSelect(id: string) {
			const next = new Set(state.value.selectedIds);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			state.value = { ...state.value, selectedIds: next };
		}

		function toggleAll() {
			const allSelected = state.value.products.every((p) => state.value.selectedIds.has(p.id));
			const next = allSelected
				? new Set<string>()
				: new Set(state.value.products.map((p) => p.id));
			state.value = { ...state.value, selectedIds: next };
		}

		function openCreate() {
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: null,
				formData: emptyProductForm(),
				formError: null,
			};
		}

		function openEdit(id: string) {
			const item = state.value.rawProducts.find((p) => p.id === id);
			if (!item) return;
			state.value = {
				...state.value,
				showPanel: true,
				editTarget: item,
				formData: {
					categoryId: item.categoryId,
					compareAtPrice: item.compareAtPrice != null ? String(item.compareAtPrice) : "",
					description: item.description ?? "",
					name: item.name,
					price: String(item.price),
					slug: item.slug,
					status: item.status === "active" ? "active" : "draft",
				},
				formError: null,
			};
		}

		function closePanel() {
			state.value = { ...state.value, showPanel: false, editTarget: null };
		}

		function updateField(field: keyof ProductFormData, value: string) {
			const formData = { ...state.value.formData, [field]: value };
			if (field === "name" && !state.value.editTarget) {
				formData.slug = generateSlug(value);
			}
			state.value = { ...state.value, formData };
		}

		async function saveProduct() {
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

			state.value = { ...state.value, isSaving: true, formError: null };
			try {
				const sdk = useSdk();
				if (editTarget) {
					await sdk.catalog.updateItem(editTarget.id, {
						categoryId: formData.categoryId || undefined,
						description: formData.description || undefined,
						name: formData.name,
						slug: formData.slug,
						status: formData.status,
					});
				} else {
					await sdk.catalog.createItem({
						categoryId: formData.categoryId,
						description: formData.description || undefined,
						name: formData.name,
						slug: formData.slug || generateSlug(formData.name),
						variants: [{ name: "Default", priceCents: price, isDefault: true }],
					});
				}
				state.value = { ...state.value, isSaving: false, showPanel: false };
				await loadProducts();
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					formError: err instanceof Error ? err.message : "Failed to save product",
				};
			}
		}

		async function handleDelete(id: string) {
			try {
				const sdk = useSdk();
				await sdk.catalog.deleteItem(id);
				await loadProducts();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to delete product",
				};
			}
		}

		function startBulkAction(action: ProductBulkAction) {
			state.value = { ...state.value, showBulkConfirm: true, bulkAction: action };
		}

		async function executeBulkAction() {
			const { bulkAction, selectedIds } = state.value;
			if (!bulkAction || selectedIds.size === 0) return;
			state.value = { ...state.value, showBulkConfirm: false };

			try {
				const sdk = useSdk();
				const ids = Array.from(selectedIds);
				for (const id of ids) {
					if (bulkAction === "delete") {
						await sdk.catalog.deleteItem(id);
					} else {
						await sdk.catalog.updateItem(id, {
							status: bulkAction === "activate" ? "active" : "archived",
						});
					}
				}
				await loadProducts();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Bulk operation failed",
				};
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "admin-page admin-page--loading", role: "status", "data-testid": "products-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading products..."),
				]);
			}

			return h("div", { class: "admin-page", "data-testid": "catalog-products-page" }, [
				h("div", { class: "admin-page__header" }, [
					h("h2", { class: "admin-page__title" }, "Catalog"),
					h("button", {
						class: "btn btn--primary",
						type: "button",
						onClick: openCreate,
						"data-testid": "create-product-btn",
					}, "Add Product"),
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderCatalogTabBar("products", () => { /* tab navigation handled by router */ }),
				renderSearchToolbar(
					s.searchQuery,
					s.filterCategory,
					s.filterStatus,
					s.categories,
					setSearch,
					setCategoryFilter,
					setStatusFilter,
				),
				renderBulkActions(s.selectedIds.size, startBulkAction),
				renderProductTable(s.products, s.selectedIds, toggleSelect, toggleAll, openEdit, handleDelete),
				s.total > 0
					? h("div", { class: "pagination", "data-testid": "products-pagination" }, [
							h("span", `Showing ${s.products.length} of ${s.total}`),
						])
					: null,
				s.showPanel
					? renderProductFormPanel(
							s.formData,
							s.categories,
							s.editTarget,
							s.formError,
							s.isSaving,
							updateField,
							saveProduct,
							closePanel,
						)
					: null,
				s.showBulkConfirm && s.bulkAction
					? h("div", { class: "modal-overlay", "data-testid": "bulk-confirm" }, [
							h("div", { class: "modal", role: "dialog" }, [
								h("div", { class: "modal__body" }, [
									h("p", getProductBulkActionConfirmMessage(s.bulkAction, s.selectedIds.size)),
								]),
								h("div", { class: "modal__footer" }, [
									h("button", {
										class: "btn btn--primary",
										type: "button",
										onClick: executeBulkAction,
										"data-testid": "confirm-bulk-btn",
									}, "Confirm"),
									h("button", {
										class: "btn btn--secondary",
										type: "button",
										onClick: () => { state.value = { ...state.value, showBulkConfirm: false }; },
									}, "Cancel"),
								]),
							]),
						])
					: null,
			]);
		};
	},
});
