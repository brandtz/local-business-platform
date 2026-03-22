import { Injectable } from "@nestjs/common";

import type {
	PortfolioProjectMediaRecord,
	PortfolioProjectRecord,
	StorefrontFeaturedProject,
	StorefrontPortfolioListResponse,
	StorefrontPortfolioMedia,
	StorefrontPortfolioProject,
	StorefrontPortfolioTestimonial
} from "@platform/types";

@Injectable()
export class PortfolioStorefrontService {
	/**
	 * Assemble a paginated list of published portfolio projects for the storefront.
	 * Supports optional category filter.
	 */
	assemblePublishedProjects(
		projects: readonly PortfolioProjectRecord[],
		media: readonly PortfolioProjectMediaRecord[],
		tenantId: string,
		options?: { category?: string; page?: number; pageSize?: number }
	): StorefrontPortfolioListResponse {
		const page = options?.page ?? 1;
		const pageSize = options?.pageSize ?? 12;

		let published = projects
			.filter((p) => p.tenantId === tenantId && p.status === "published")
			.sort((a, b) => a.sortOrder - b.sortOrder);

		if (options?.category) {
			const categoryLower = options.category.toLowerCase();
			published = published.filter((p) =>
				p.serviceCategories.some((c) => c.toLowerCase() === categoryLower)
			);
		}

		const total = published.length;
		const startIndex = (page - 1) * pageSize;
		const paged = published.slice(startIndex, startIndex + pageSize);

		return {
			items: paged.map((p) => this.toStorefrontProject(p, media)),
			page,
			pageSize,
			total,
		};
	}

	/**
	 * Assemble featured projects for homepage display.
	 */
	assembleFeaturedProjects(
		projects: readonly PortfolioProjectRecord[],
		media: readonly PortfolioProjectMediaRecord[],
		tenantId: string
	): StorefrontFeaturedProject[] {
		return projects
			.filter(
				(p) =>
					p.tenantId === tenantId &&
					p.status === "published" &&
					p.isFeatured
			)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((p) => ({
				description: p.description,
				id: p.id,
				media: this.assembleMediaForProject(p.id, media),
				serviceCategories: p.serviceCategories,
				title: p.title,
			}));
	}

	/**
	 * Assemble a single published project detail with full media gallery.
	 */
	assembleProjectDetail(
		project: PortfolioProjectRecord,
		media: readonly PortfolioProjectMediaRecord[]
	): StorefrontPortfolioProject | null {
		if (project.status !== "published") return null;

		return this.toStorefrontProject(project, media);
	}

	private toStorefrontProject(
		project: PortfolioProjectRecord,
		media: readonly PortfolioProjectMediaRecord[]
	): StorefrontPortfolioProject {
		const testimonial = this.assembleTestimonial(project);

		return {
			description: project.description,
			id: project.id,
			location: project.location,
			media: this.assembleMediaForProject(project.id, media),
			projectDate: project.projectDate,
			serviceCategories: project.serviceCategories,
			testimonial,
			title: project.title,
		};
	}

	private assembleMediaForProject(
		projectId: string,
		media: readonly PortfolioProjectMediaRecord[]
	): StorefrontPortfolioMedia[] {
		return media
			.filter((m) => m.projectId === projectId)
			.sort((a, b) => a.sortOrder - b.sortOrder)
			.map((m) => ({
				altText: m.altText,
				caption: m.caption,
				id: m.id,
				sortOrder: m.sortOrder,
				tag: m.tag,
				url: m.url,
			}));
	}

	private assembleTestimonial(
		project: PortfolioProjectRecord
	): StorefrontPortfolioTestimonial | null {
		if (!project.testimonialQuote || !project.testimonialAttribution) {
			return null;
		}
		return {
			attribution: project.testimonialAttribution,
			quote: project.testimonialQuote,
			rating: project.testimonialRating,
		};
	}
}
