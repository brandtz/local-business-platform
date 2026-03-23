// E13-S2-T4: Services Browse page — service cards with category filter,
// and Service Detail page with full description, duration, pricing, book CTA.
// Fetches data via SDK services API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute } from "vue-router";

import type { ServiceRecord } from "@platform/types";
import type { ServiceListResponse } from "@platform/sdk";

import { useSdk } from "../composables/use-sdk";

// ── Render Helpers — Services Browse ─────────────────────────────────────────

function renderServiceCard(service: ServiceRecord): VNode {
	return h(RouterLink, {
		to: `/services/${service.id}`,
		class: "service-card",
		key: service.id,
	}, {
		default: () => [
			h("div", { class: "service-card__content" }, [
				h("h3", { class: "service-card__name" }, service.name),
				h("div", { class: "service-card__meta" }, [
					h("span", { class: "service-card__duration" }, `${service.durationMinutes} min`),
					h("span", { class: "service-card__price" },
						`$${(service.price / 100).toFixed(2)}`
					),
				]),
				service.description
					? h("p", { class: "service-card__description" }, service.description)
					: null,
				h("span", { class: "service-card__cta" }, "Book"),
			]),
		],
	});
}

function renderServicesGrid(services: ServiceRecord[]): VNode {
	if (services.length === 0) {
		return h("div", { class: "services-empty", "data-testid": "services-empty" }, [
			h("h3", "No services available"),
			h("p", "Check back soon for new services."),
		]);
	}

	return h("div", { class: "services-grid", "data-testid": "services-grid" },
		services.map(renderServiceCard)
	);
}

function renderCategoryFilter(
	categories: string[],
	selected: string,
	onChange: (value: string) => void,
): VNode | null {
	if (categories.length === 0) return null;

	return h("div", { class: "services-filter", "data-testid": "services-filter" }, [
		h("select", {
			class: "services-filter__select",
			value: selected,
			"aria-label": "Filter by category",
			onChange: (e: Event) => onChange((e.target as HTMLSelectElement).value),
		}, [
			h("option", { value: "" }, "All Categories"),
			...categories.map((cat) =>
				h("option", { value: cat, key: cat }, cat)
			),
		]),
	]);
}

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
	]);
}

// ── Services Browse Page ─────────────────────────────────────────────────────

export const ServicesPage = defineComponent({
	name: "ServicesPage",
	setup() {
		const sdk = useSdk();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const services = ref<ServiceRecord[]>([]);
		const allServices = ref<ServiceRecord[]>([]);

		onMounted(async () => {
			try {
				const result: ServiceListResponse = await sdk.services.list();
				allServices.value = result.data ?? [];
				services.value = allServices.value;
			} catch {
				error.value = "Failed to load services. Please try again.";
			} finally {
				loading.value = false;
			}
		});

		return () => {
			if (loading.value) return renderLoading("Loading services...");
			if (error.value) return renderError(error.value);

			return h("div", { class: "services-page", "data-testid": "services-page" }, [
				h("h1", { class: "services-page__title" }, "Services"),
				renderServicesGrid(services.value),
			]);
		};
	},
});

// ── Service Detail Render Helpers ────────────────────────────────────────────

function renderServiceDetail(service: ServiceRecord): VNode {
	return h("div", { class: "service-detail", "data-testid": "service-detail" }, [
		h("nav", { class: "service-detail__breadcrumb", "aria-label": "Breadcrumb" }, [
			h(RouterLink, { to: "/services" }, { default: () => "Services" }),
			h("span", " / "),
			h("span", service.name),
		]),
		h("div", { class: "service-detail__layout" }, [
			h("div", { class: "service-detail__info" }, [
				h("h1", { class: "service-detail__name", "data-testid": "service-name" }, service.name),
				service.description
					? h("p", { class: "service-detail__description" }, service.description)
					: null,
				h("div", { class: "service-detail__meta" }, [
					h("div", { class: "service-detail__duration" }, [
						h("span", { class: "service-detail__label" }, "Duration: "),
						h("span", `${service.durationMinutes} minutes`),
					]),
					h("div", { class: "service-detail__price" }, [
						h("span", { class: "service-detail__label" }, "Price: "),
						h("span", { "data-testid": "service-price" }, `$${(service.price / 100).toFixed(2)}`),
					]),
				]),
				h(RouterLink, {
					to: `/services/${service.id}/book`,
					class: "service-detail__book-cta",
					"data-testid": "book-now-cta",
				}, {
					default: () => "Book Now",
				}),
			]),
		]),
	]);
}

// ── Service Detail Page ──────────────────────────────────────────────────────

export const ServiceDetailPage = defineComponent({
	name: "ServiceDetailPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const service = ref<ServiceRecord | null>(null);

		onMounted(async () => {
			const serviceId = route.params.serviceId as string;
			if (!serviceId) {
				error.value = "No service specified.";
				loading.value = false;
				return;
			}

			try {
				service.value = await sdk.services.get(serviceId);
			} catch {
				error.value = "This service could not be found.";
			} finally {
				loading.value = false;
			}
		});

		return () => {
			if (loading.value) return renderLoading("Loading service details...");
			if (error.value || !service.value) {
				return h("div", { class: "page-error", role: "alert", "data-testid": "error-state" }, [
					h("h2", "Service not found"),
					h("p", error.value ?? "This service could not be found."),
					h(RouterLink, { to: "/services", class: "page-error__back" }, {
						default: () => "Back to Services",
					}),
				]);
			}

			return renderServiceDetail(service.value);
		};
	},
});
