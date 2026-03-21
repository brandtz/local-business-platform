import { Injectable } from "@nestjs/common";

import type {
	ContentPageEventPayload,
	ContentPageRecord,
	ContentPageStatus,
	DomainEventEnvelope,
	StorefrontContentPage,
} from "@platform/types";
import { domainEvents } from "@platform/types";

// ---------------------------------------------------------------------------
// Template regions
// ---------------------------------------------------------------------------

export const templateRegions = [
	"hero",
	"about",
	"services",
	"contact",
	"policies",
	"faq",
	"footer",
] as const;

export type TemplateRegion = (typeof templateRegions)[number];

// ---------------------------------------------------------------------------
// Content readiness
// ---------------------------------------------------------------------------

export type ContentReadinessIssue = {
	region: string;
	severity: "error" | "warning";
	message: string;
};

export type ContentReadinessResult = {
	ready: boolean;
	issues: readonly ContentReadinessIssue[];
};

// ---------------------------------------------------------------------------
// Preview data
// ---------------------------------------------------------------------------

export type StorefrontPreviewData = {
	pages: readonly StorefrontContentPage[];
	missingRegions: readonly string[];
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class ContentTemplateHooksService {
	/**
	 * Build a domain event envelope for a content page publish action.
	 */
	buildPublishEvent(
		tenantId: string,
		page: ContentPageRecord
	): DomainEventEnvelope<ContentPageEventPayload> {
		return {
			eventName: domainEvents.contentPagePublished,
			tenantId,
			occurredAt: new Date().toISOString(),
			data: {
				pageId: page.id,
				slug: page.slug,
				status: "published",
			},
		};
	}

	/**
	 * Build a domain event envelope for a content page archive action.
	 */
	buildArchiveEvent(
		tenantId: string,
		page: ContentPageRecord
	): DomainEventEnvelope<ContentPageEventPayload> {
		return {
			eventName: domainEvents.contentPageArchived,
			tenantId,
			occurredAt: new Date().toISOString(),
			data: {
				pageId: page.id,
				slug: page.slug,
				status: "archived",
			},
		};
	}

	/**
	 * Check content readiness for storefront publishing.
	 * Verifies that required template regions have published content.
	 */
	checkContentReadiness(
		pages: readonly ContentPageRecord[],
		tenantId: string,
		requiredRegions: readonly string[]
	): ContentReadinessResult {
		const issues: ContentReadinessIssue[] = [];

		const publishedPages = pages.filter(
			(p) => p.tenantId === tenantId && p.status === "published"
		);

		for (const region of requiredRegions) {
			const hasContent = publishedPages.some(
				(p) => p.templateRegion === region
			);
			if (!hasContent) {
				issues.push({
					region,
					severity: "error",
					message: `Required template region "${region}" has no published content.`,
				});
			}
		}

		return {
			ready: issues.length === 0,
			issues,
		};
	}

	/**
	 * Collect published content for all template regions for storefront consumption.
	 * Returns pages mapped to their template regions plus a list of missing regions.
	 */
	buildStorefrontPreview(
		pages: readonly ContentPageRecord[],
		tenantId: string,
		expectedRegions: readonly string[]
	): StorefrontPreviewData {
		const publishedPages = pages.filter(
			(p) => p.tenantId === tenantId && p.status === "published"
		);

		const storefrontPages: StorefrontContentPage[] = publishedPages.map(
			(p) => ({
				body: p.body,
				ogImageUrl: p.ogImageUrl,
				seoDescription: p.seoDescription,
				seoTitle: p.seoTitle,
				slug: p.slug,
				templateRegion: p.templateRegion,
				title: p.title,
			})
		);

		const coveredRegions = new Set(
			publishedPages
				.map((p) => p.templateRegion)
				.filter((r): r is string => r !== null && r !== undefined)
		);

		const missingRegions = expectedRegions.filter(
			(r) => !coveredRegions.has(r)
		);

		return {
			pages: storefrontPages,
			missingRegions,
		};
	}

	/**
	 * Map a content page record to its storefront representation.
	 * Only published pages should be mapped.
	 */
	toStorefrontPage(page: ContentPageRecord): StorefrontContentPage | null {
		if (page.status !== "published") {
			return null;
		}
		return {
			body: page.body,
			ogImageUrl: page.ogImageUrl,
			seoDescription: page.seoDescription,
			seoTitle: page.seoTitle,
			slug: page.slug,
			templateRegion: page.templateRegion,
			title: page.title,
		};
	}

	/**
	 * Determine the content lifecycle event name for a given status transition.
	 */
	getEventNameForTransition(
		fromStatus: ContentPageStatus,
		toStatus: ContentPageStatus
	): string | null {
		if (toStatus === "published") {
			return domainEvents.contentPagePublished;
		}
		if (toStatus === "archived") {
			return domainEvents.contentPageArchived;
		}
		return null;
	}

	/**
	 * Get the list of known template regions.
	 */
	getTemplateRegions(): readonly string[] {
		return templateRegions;
	}
}
