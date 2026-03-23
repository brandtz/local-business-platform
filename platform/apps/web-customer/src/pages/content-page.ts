// E13-S2-T6: Content Pages — CMS page renderer that fetches page by slug
// and renders rich text HTML content with title and breadcrumb.

import { defineComponent, h, ref, onMounted, watch, type VNode } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { ContentPageRecord } from "@platform/types";

import { useSdk } from "../composables/use-sdk";

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderBreadcrumb(title: string): VNode {
	return h("nav", { class: "content-page__breadcrumb", "aria-label": "Breadcrumb" }, [
		h(RouterLink, { to: "/" }, { default: () => "Home" }),
		h("span", " / "),
		h("span", title),
	]);
}

function renderPageContent(page: ContentPageRecord): VNode {
	return h("article", { class: "content-page__article", "data-testid": "content-article" }, [
		h("h1", { class: "content-page__title", "data-testid": "content-title" }, page.title),
		h("div", {
			class: "content-page__body",
			innerHTML: page.body,
		}),
	]);
}

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading page..."),
	]);
}

function renderNotFound(): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "content-not-found",
	}, [
		h("h2", "Page Not Found"),
		h("p", "The page you are looking for does not exist."),
		h(RouterLink, { to: "/", class: "page-error__back" }, {
			default: () => "Go Home",
		}),
	]);
}

// ── Page Component ───────────────────────────────────────────────────────────

export const ContentPage = defineComponent({
	name: "ContentPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const page = ref<ContentPageRecord | null>(null);
		const notFound = ref(false);

		async function fetchPage(slug: string): Promise<void> {
			loading.value = true;
			notFound.value = false;
			page.value = null;

			try {
				const result = await sdk.content.getPage(slug);
				page.value = result;
			} catch {
				notFound.value = true;
			} finally {
				loading.value = false;
			}
		}

		onMounted(() => {
			const slug = route.params.slug as string;
			if (slug) {
				fetchPage(slug);
			} else {
				notFound.value = true;
				loading.value = false;
			}
		});

		// Watch for slug changes (same route, different page)
		watch(
			() => route.params.slug,
			(newSlug) => {
				if (newSlug && typeof newSlug === "string") {
					fetchPage(newSlug);
				}
			}
		);

		return () => {
			if (loading.value) return renderLoading();
			if (notFound.value || !page.value) return renderNotFound();

			return h("div", { class: "content-page", "data-testid": "content-page" }, [
				renderBreadcrumb(page.value.title),
				renderPageContent(page.value),
			]);
		};
	},
});
