// E13-S6-T5: Content Pages Editor — CardGrid of content pages,
// full-page editor with RichTextEditor, SEO section, and draft/publish workflow.

import { defineComponent, h, onMounted, ref } from "vue";

import { useSdk } from "../composables/use-sdk";
import {
	buildContentPageDisplayCard,
	contentTabs,
	generateSlugFromTitle,
	getContentTabLabel,
	type ContentPageDisplayCard,
	type ContentTab,
} from "../content-views";
import type {
	ContentPageRecord,
	ContentPageStatus,
	CreateContentPageRequest,
	UpdateContentPageRequest,
} from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type PageFormData = {
	body: string;
	featuredImage: string;
	seoDescription: string;
	seoTitle: string;
	slug: string;
	status: ContentPageStatus;
	title: string;
};

type ContentPagesState = {
	editTarget: ContentPageRecord | null;
	error: string | null;
	formData: PageFormData;
	formError: string | null;
	isLoading: boolean;
	isSaving: boolean;
	pages: ContentPageDisplayCard[];
	rawPages: ContentPageRecord[];
	showEditor: boolean;
};

function emptyPageForm(): PageFormData {
	return {
		body: "",
		featuredImage: "",
		seoDescription: "",
		seoTitle: "",
		slug: "",
		status: "draft",
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

function renderPageCard(
	page: ContentPageDisplayCard,
	onEdit: (id: string) => void,
	onDelete: (id: string) => void,
) {
	const badge = page.statusBadge;

	return h("div", {
		class: "card-grid__card",
		key: page.id,
		"data-testid": `page-card-${page.id}`,
	}, [
		h("div", { class: "card-grid__card-header" }, [
			h("h4", { class: "card-grid__card-title" }, page.title),
			h("span", {
				class: `status-badge status-badge--${badge.colorClass}`,
			}, badge.label),
		]),
		h("div", { class: "card-grid__card-body" }, [
			h("p", { class: "card-grid__card-slug" }, `/${page.slug}`),
			page.excerpt
				? h("p", { class: "card-grid__card-excerpt" }, page.excerpt)
				: null,
		]),
		h("div", { class: "card-grid__card-footer" }, [
			h("span", { class: "card-grid__card-date" }, `Updated: ${page.updatedAt}`),
			h("div", { class: "card-grid__card-actions" }, [
				h("button", {
					class: "btn btn--sm btn--secondary",
					type: "button",
					onClick: () => onEdit(page.id),
					"data-testid": "edit-page-btn",
				}, "Edit"),
				h("button", {
					class: "btn btn--sm btn--danger",
					type: "button",
					onClick: () => onDelete(page.id),
					"data-testid": "delete-page-btn",
				}, "Delete"),
			]),
		]),
	]);
}

function renderPageCardGrid(
	pages: ContentPageDisplayCard[],
	onEdit: (id: string) => void,
	onDelete: (id: string) => void,
) {
	if (pages.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "pages-empty" }, [
			h("p", "No content pages found"),
			h("p", { class: "empty-state__hint" }, "Create a page to share content with your customers."),
		]);
	}

	return h("div", { class: "card-grid", "data-testid": "pages-card-grid" },
		pages.map((page) => renderPageCard(page, onEdit, onDelete)),
	);
}

function renderPageEditor(
	formData: PageFormData,
	editTarget: ContentPageRecord | null,
	formError: string | null,
	isSaving: boolean,
	onFieldChange: (field: keyof PageFormData, value: string) => void,
	onSave: (status: ContentPageStatus) => void,
	onClose: () => void,
) {
	const title = editTarget ? "Edit Page" : "Create Page";

	return h("div", { class: "page-editor", "data-testid": "page-editor" }, [
		h("div", { class: "page-editor__header" }, [
			h("h3", { class: "page-editor__title" }, title),
			h("div", { class: "page-editor__actions" }, [
				h("button", {
					class: "btn btn--secondary",
					type: "button",
					onClick: onClose,
				}, "Cancel"),
				h("button", {
					class: "btn btn--secondary",
					type: "button",
					disabled: isSaving,
					onClick: () => onSave("draft"),
					"data-testid": "save-draft-btn",
				}, "Save Draft"),
				h("button", {
					class: "btn btn--primary",
					type: "button",
					disabled: isSaving,
					onClick: () => onSave("published"),
					"data-testid": "publish-btn",
				}, isSaving ? "Publishing..." : "Publish"),
			]),
		]),
		formError
			? h("div", { class: "alert alert--error", role: "alert" }, formError)
			: null,
		h("div", { class: "page-editor__body" }, [
			h("div", { class: "form-section" }, [
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "page-title" }, "Title *"),
					h("input", {
						class: "form-field__input form-field__input--large",
						id: "page-title",
						type: "text",
						placeholder: "Page title",
						value: formData.title,
						onInput: (e: Event) => onFieldChange("title", (e.target as HTMLInputElement).value),
					}),
				]),
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "page-slug" }, "URL Slug"),
					h("div", { class: "form-field__prefix-group" }, [
						h("span", { class: "form-field__prefix" }, "/"),
						h("input", {
							class: "form-field__input",
							id: "page-slug",
							type: "text",
							value: formData.slug,
							onInput: (e: Event) => onFieldChange("slug", (e.target as HTMLInputElement).value),
						}),
					]),
				]),
			]),
			h("div", { class: "form-section" }, [
				h("h4", { class: "form-section__title" }, "Content"),
				h("div", { class: "rich-text-editor", "data-testid": "rich-text-editor" }, [
					h("textarea", {
						class: "form-field__input rich-text-editor__textarea",
						rows: 20,
						placeholder: "Write your page content here...",
						value: formData.body,
						onInput: (e: Event) => onFieldChange("body", (e.target as HTMLTextAreaElement).value),
					}),
				]),
			]),
			h("div", { class: "form-section" }, [
				h("h4", { class: "form-section__title" }, "SEO"),
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "page-seo-title" }, "Meta Title"),
					h("input", {
						class: "form-field__input",
						id: "page-seo-title",
						type: "text",
						value: formData.seoTitle,
						onInput: (e: Event) => onFieldChange("seoTitle", (e.target as HTMLInputElement).value),
					}),
				]),
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "page-seo-desc" }, "Meta Description"),
					h("textarea", {
						class: "form-field__input",
						id: "page-seo-desc",
						rows: 3,
						value: formData.seoDescription,
						onInput: (e: Event) => onFieldChange("seoDescription", (e.target as HTMLTextAreaElement).value),
					}),
				]),
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "page-featured" }, "Featured Image URL"),
					h("input", {
						class: "form-field__input",
						id: "page-featured",
						type: "text",
						value: formData.featuredImage,
						onInput: (e: Event) => onFieldChange("featuredImage", (e.target as HTMLInputElement).value),
					}),
				]),
			]),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const ContentPagesPage = defineComponent({
	name: "ContentPagesPage",
	setup() {

		const state = ref<ContentPagesState>({
			editTarget: null,
			error: null,
			formData: emptyPageForm(),
			formError: null,
			isLoading: true,
			isSaving: false,
			pages: [],
			rawPages: [],
			showEditor: false,
		});

		async function loadPages() {
			try {
				const sdk = useSdk();
				const result = await sdk.content.listPages();
				const rawPages = result.data;
				state.value = {
					...state.value,
					rawPages,
					pages: rawPages.map(buildContentPageDisplayCard),
					isLoading: false,
					error: null,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load pages",
				};
			}
		}

		onMounted(loadPages);

		function openCreate() {
			state.value = {
				...state.value,
				showEditor: true,
				editTarget: null,
				formData: emptyPageForm(),
				formError: null,
			};
		}

		function openEdit(id: string) {
			const page = state.value.rawPages.find((p) => p.id === id);
			if (!page) return;
			state.value = {
				...state.value,
				showEditor: true,
				editTarget: page,
				formData: {
					body: typeof page.body === "string" ? page.body : JSON.stringify(page.body ?? ""),
					featuredImage: page.ogImageUrl ?? "",
					seoDescription: page.seoDescription ?? "",
					seoTitle: page.seoTitle ?? "",
					slug: page.slug,
					status: page.status,
					title: page.title,
				},
				formError: null,
			};
		}

		function closeEditor() {
			state.value = { ...state.value, showEditor: false, editTarget: null };
		}

		function updateField(field: keyof PageFormData, value: string) {
			const formData = { ...state.value.formData, [field]: value };
			if (field === "title" && !state.value.editTarget) {
				formData.slug = generateSlugFromTitle(value);
			}
			state.value = { ...state.value, formData };
		}

		async function savePage(targetStatus: ContentPageStatus) {
			state.value = { ...state.value, formData: { ...state.value.formData, status: targetStatus } };
			const { formData, editTarget } = state.value;
			if (!formData.title.trim()) {
				state.value = { ...state.value, formError: "Title is required" };
				return;
			}

			state.value = { ...state.value, isSaving: true, formError: null };
			try {
				const sdk = useSdk();
				if (editTarget) {
					const params: UpdateContentPageRequest = {
						body: formData.body,
						ogImageUrl: formData.featuredImage || null,
						seoDescription: formData.seoDescription || null,
						seoTitle: formData.seoTitle || null,
						slug: formData.slug,
						title: formData.title,
					};
					await sdk.content.updatePage(editTarget.id, params);
				} else {
					const params: CreateContentPageRequest = {
						body: formData.body,
						ogImageUrl: formData.featuredImage || null,
						seoDescription: formData.seoDescription || null,
						seoTitle: formData.seoTitle || null,
						slug: formData.slug || generateSlugFromTitle(formData.title),
						title: formData.title,
					};
					await sdk.content.createPage(params);
				}
				state.value = { ...state.value, isSaving: false, showEditor: false };
				await loadPages();
			} catch (err) {
				state.value = {
					...state.value,
					isSaving: false,
					formError: err instanceof Error ? err.message : "Failed to save page",
				};
			}
		}

		async function handleDelete(id: string) {
			try {
				const sdk = useSdk();
				await sdk.content.deletePage(id);
				await loadPages();
			} catch (err) {
				state.value = {
					...state.value,
					error: err instanceof Error ? err.message : "Failed to delete page",
				};
			}
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "admin-page admin-page--loading", role: "status", "data-testid": "pages-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading content pages..."),
				]);
			}

			if (s.showEditor) {
				return renderPageEditor(
					s.formData,
					s.editTarget,
					s.formError,
					s.isSaving,
					updateField,
					savePage,
					closeEditor,
				);
			}

			return h("div", { class: "admin-page", "data-testid": "content-pages-page" }, [
				h("div", { class: "admin-page__header" }, [
					h("h2", { class: "admin-page__title" }, "Content"),
					h("button", {
						class: "btn btn--primary",
						type: "button",
						onClick: openCreate,
						"data-testid": "create-page-btn",
					}, "Add Page"),
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderContentTabBar("pages", () => { /* tab navigation handled by router */ }),
				renderPageCardGrid(s.pages, openEdit, handleDelete),
			]);
		};
	},
});
