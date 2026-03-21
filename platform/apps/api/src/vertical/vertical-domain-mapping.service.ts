import { Injectable } from "@nestjs/common";

import type {
	BusinessVertical,
	VerticalTemplateConfig,
} from "@platform/types";
import { verticalConfigs } from "@platform/types";

// ---------------------------------------------------------------------------
// Seed entity types (E6-S5-T2)
// ---------------------------------------------------------------------------

export type CategorySeed = {
	displayOrder: number;
	name: string;
	slug: string;
	tenantId: string;
};

export type ServiceSeed = {
	bufferMinutes: number;
	durationMinutes: number;
	isBookable: boolean;
	name: string;
	price: number;
	slug: string;
	sortOrder: number;
	tenantId: string;
};

export type ContentPageSeed = {
	body: unknown;
	slug: string;
	status: "draft";
	templateRegion: string | null;
	tenantId: string;
	title: string;
};

export type BusinessHoursSeed = {
	closeTime: string;
	dayOfWeek: number;
	openTime: string;
	tenantId: string;
};

export type VerticalSeedPlan = {
	businessHours: readonly BusinessHoursSeed[];
	categories: readonly CategorySeed[];
	contentPages: readonly ContentPageSeed[];
	services: readonly ServiceSeed[];
	theme: VerticalTemplateConfig["theme"];
	vertical: BusinessVertical;
};

// ---------------------------------------------------------------------------
// Slug generation helper
// ---------------------------------------------------------------------------

function toSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// Content page title/body defaults
// ---------------------------------------------------------------------------

const contentPageDefaults: Record<string, { body: unknown; title: string; templateRegion: string | null }> = {
	about: { title: "About Us", body: { blocks: [] }, templateRegion: "about" },
	services: { title: "Our Services", body: { blocks: [] }, templateRegion: "services" },
	menu: { title: "Our Menu", body: { blocks: [] }, templateRegion: null },
	gallery: { title: "Our Work", body: { blocks: [] }, templateRegion: null },
	"shipping-returns": { title: "Shipping & Returns", body: { blocks: [] }, templateRegion: "policies" },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class VerticalDomainMappingService {
	/**
	 * Produce a complete seed plan for a tenant based on a business vertical.
	 * The plan contains all entities needed to initialize the tenant's storefront.
	 */
	buildSeedPlan(vertical: BusinessVertical, tenantId: string): VerticalSeedPlan {
		const config = verticalConfigs[vertical];

		return {
			vertical,
			categories: this.mapCategories(config, tenantId),
			services: this.mapServices(config, tenantId),
			contentPages: this.mapContentPages(config, tenantId),
			businessHours: this.mapBusinessHours(config, tenantId),
			theme: config.theme,
		};
	}

	/**
	 * Map starter categories from a vertical config into category seed entities.
	 */
	mapCategories(config: VerticalTemplateConfig, tenantId: string): CategorySeed[] {
		return config.starterCategories.map((name, index) => ({
			tenantId,
			name,
			slug: toSlug(name),
			displayOrder: index,
		}));
	}

	/**
	 * Map starter services from a vertical config into service seed entities.
	 */
	mapServices(config: VerticalTemplateConfig, tenantId: string): ServiceSeed[] {
		return config.starterServices.map((svc, index) => ({
			tenantId,
			name: svc.name,
			slug: svc.slug,
			durationMinutes: svc.durationMinutes,
			price: svc.price,
			isBookable: svc.isBookable,
			bufferMinutes: 0,
			sortOrder: index,
		}));
	}

	/**
	 * Map starter content pages from a vertical config into content page seed entities.
	 */
	mapContentPages(config: VerticalTemplateConfig, tenantId: string): ContentPageSeed[] {
		return config.starterContentPages.map((pageSlug) => {
			const defaults = contentPageDefaults[pageSlug] ?? {
				title: pageSlug.charAt(0).toUpperCase() + pageSlug.slice(1),
				body: { blocks: [] },
				templateRegion: null,
			};
			return {
				tenantId,
				slug: pageSlug,
				title: defaults.title,
				body: defaults.body,
				templateRegion: defaults.templateRegion,
				status: "draft" as const,
			};
		});
	}

	/**
	 * Map business hours from a vertical config into business hours seed entities.
	 */
	mapBusinessHours(config: VerticalTemplateConfig, tenantId: string): BusinessHoursSeed[] {
		return config.defaultBusinessHours.map((entry) => ({
			tenantId,
			dayOfWeek: entry.dayOfWeek,
			openTime: entry.openTime,
			closeTime: entry.closeTime,
		}));
	}
}
