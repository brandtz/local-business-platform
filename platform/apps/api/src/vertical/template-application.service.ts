import { Injectable } from "@nestjs/common";

import type { BusinessVertical } from "@platform/types";
import { validateVerticalSelection } from "@platform/types";

import type { VerticalSeedPlan } from "./vertical-domain-mapping.service";
import { VerticalDomainMappingService } from "./vertical-domain-mapping.service";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export type TemplateApplicationErrorReason =
	| "already-applied"
	| "unsupported-vertical";

export class TemplateApplicationError extends Error {
	constructor(
		public readonly reason: TemplateApplicationErrorReason,
		message: string
	) {
		super(message);
		this.name = "TemplateApplicationError";
	}
}

// ---------------------------------------------------------------------------
// Application result
// ---------------------------------------------------------------------------

export type TemplateApplicationResult = {
	applied: true;
	categoriesSeeded: number;
	contentPagesSeeded: number;
	hoursApplied: number;
	servicesSeeded: number;
	skipped: readonly string[];
	vertical: BusinessVertical;
};

export type TemplateApplicationSkipResult = {
	applied: false;
	reason: "already-applied";
	vertical: BusinessVertical;
};

export type ApplyTemplateResult =
	| TemplateApplicationResult
	| TemplateApplicationSkipResult;

// ---------------------------------------------------------------------------
// Existing data snapshot (for customization detection)
// ---------------------------------------------------------------------------

export type ExistingTenantData = {
	categoryNames: readonly string[];
	contentPageSlugs: readonly string[];
	hasBusinessHours: boolean;
	serviceSlugs: readonly string[];
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class TemplateApplicationService {
	constructor(
		private readonly domainMapping: VerticalDomainMappingService
	) {}

	/**
	 * Apply a vertical template to a tenant.
	 *
	 * This method is idempotent for initial application — if the tenant already
	 * has data from a previous template application, it returns a skip result
	 * rather than overwriting.
	 *
	 * It respects tenant customizations by checking existing data before seeding.
	 * Only entities that do not already exist will be created.
	 */
	applyTemplate(
		vertical: BusinessVertical,
		tenantId: string,
		existingData: ExistingTenantData
	): ApplyTemplateResult {
		const validation = validateVerticalSelection(vertical);
		if (!validation.valid) {
			throw new TemplateApplicationError(
				"unsupported-vertical",
				`Unsupported vertical: ${vertical}`
			);
		}

		const plan = this.domainMapping.buildSeedPlan(vertical, tenantId);
		const skipped: string[] = [];

		// Determine what needs to be seeded vs. skipped
		const categoriesToSeed = plan.categories.filter((c) => {
			const exists = existingData.categoryNames.some(
				(name) => name.toLowerCase() === c.name.toLowerCase()
			);
			if (exists) {
				skipped.push(`category:${c.name}`);
			}
			return !exists;
		});

		const servicesToSeed = plan.services.filter((s) => {
			const exists = existingData.serviceSlugs.includes(s.slug);
			if (exists) {
				skipped.push(`service:${s.slug}`);
			}
			return !exists;
		});

		const contentPagesToSeed = plan.contentPages.filter((p) => {
			const exists = existingData.contentPageSlugs.includes(p.slug);
			if (exists) {
				skipped.push(`content:${p.slug}`);
			}
			return !exists;
		});

		const hoursToApply = existingData.hasBusinessHours
			? []
			: plan.businessHours;

		if (existingData.hasBusinessHours) {
			skipped.push("businessHours");
		}

		// If everything was skipped, the template was already applied
		if (
			categoriesToSeed.length === 0 &&
			servicesToSeed.length === 0 &&
			contentPagesToSeed.length === 0 &&
			hoursToApply.length === 0
		) {
			return {
				applied: false,
				reason: "already-applied",
				vertical,
			};
		}

		return {
			applied: true,
			vertical,
			categoriesSeeded: categoriesToSeed.length,
			servicesSeeded: servicesToSeed.length,
			contentPagesSeeded: contentPagesToSeed.length,
			hoursApplied: hoursToApply.length,
			skipped,
		};
	}

	/**
	 * Compute the seed plan for a vertical without applying it.
	 * Useful for previewing what template application would do.
	 */
	previewTemplate(
		vertical: BusinessVertical,
		tenantId: string
	): VerticalSeedPlan {
		const validation = validateVerticalSelection(vertical);
		if (!validation.valid) {
			throw new TemplateApplicationError(
				"unsupported-vertical",
				`Unsupported vertical: ${vertical}`
			);
		}
		return this.domainMapping.buildSeedPlan(vertical, tenantId);
	}

	/**
	 * Determine the entities that would be seeded for a tenant, accounting
	 * for existing customizations.
	 */
	computeSeededEntities(
		vertical: BusinessVertical,
		tenantId: string,
		existingData: ExistingTenantData
	): {
		categories: number;
		contentPages: number;
		hours: number;
		services: number;
	} {
		const plan = this.domainMapping.buildSeedPlan(vertical, tenantId);

		const categories = plan.categories.filter(
			(c) =>
				!existingData.categoryNames.some(
					(name) => name.toLowerCase() === c.name.toLowerCase()
				)
		).length;

		const services = plan.services.filter(
			(s) => !existingData.serviceSlugs.includes(s.slug)
		).length;

		const contentPages = plan.contentPages.filter(
			(p) => !existingData.contentPageSlugs.includes(p.slug)
		).length;

		const hours = existingData.hasBusinessHours
			? 0
			: plan.businessHours.length;

		return { categories, services, contentPages, hours };
	}
}
