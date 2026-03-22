import { Injectable } from "@nestjs/common";

import type {
	PortfolioProjectRecord,
	PortfolioProjectStatus,
	PortfolioValidationResult
} from "@platform/types";
import { validatePortfolioProjectInput } from "@platform/types";

export class PortfolioProjectError extends Error {
	constructor(
		public readonly reason:
			| "not-found"
			| "validation-failed"
			| "invalid-transition"
			| "featured-limit-exceeded",
		message: string
	) {
		super(message);
		this.name = "PortfolioProjectError";
	}
}

export type CreatePortfolioProjectInput = {
	description: unknown;
	isFeatured?: boolean;
	location?: string | null;
	projectDate?: string | null;
	serviceCategories?: readonly string[];
	tenantId: string;
	testimonialAttribution?: string | null;
	testimonialQuote?: string | null;
	testimonialRating?: number | null;
	title: string;
};

const MAX_FEATURED_PROJECTS = 6;

const allowedStatusTransitions: Record<
	PortfolioProjectStatus,
	readonly PortfolioProjectStatus[]
> = {
	draft: ["published"],
	published: ["draft"],
};

@Injectable()
export class PortfolioProjectService {
	validateCreate(input: CreatePortfolioProjectInput): PortfolioValidationResult {
		return validatePortfolioProjectInput(input);
	}

	validateStatusTransition(
		current: PortfolioProjectStatus,
		target: PortfolioProjectStatus
	): boolean {
		return allowedStatusTransitions[current]?.includes(target) ?? false;
	}

	requireStatusTransition(
		current: PortfolioProjectStatus,
		target: PortfolioProjectStatus
	): void {
		if (!this.validateStatusTransition(current, target)) {
			throw new PortfolioProjectError(
				"invalid-transition",
				`Cannot transition status from ${current} to ${target}`
			);
		}
	}

	computeSortOrderForAppend(
		existing: readonly PortfolioProjectRecord[]
	): number {
		if (existing.length === 0) return 0;
		return Math.max(...existing.map((p) => p.sortOrder)) + 1;
	}

	validateFeaturedDesignation(
		currentFeaturedCount: number,
		isAlreadyFeatured: boolean
	): boolean {
		if (isAlreadyFeatured) return true;
		return currentFeaturedCount < MAX_FEATURED_PROJECTS;
	}

	requireFeaturedDesignation(
		currentFeaturedCount: number,
		isAlreadyFeatured: boolean
	): void {
		if (!this.validateFeaturedDesignation(currentFeaturedCount, isAlreadyFeatured)) {
			throw new PortfolioProjectError(
				"featured-limit-exceeded",
				`Cannot exceed ${MAX_FEATURED_PROJECTS} featured projects`
			);
		}
	}

	getMaxFeaturedProjects(): number {
		return MAX_FEATURED_PROJECTS;
	}

	filterProjects(
		projects: readonly PortfolioProjectRecord[],
		tenantId: string,
		filter?: { search?: string; status?: PortfolioProjectStatus }
	): PortfolioProjectRecord[] {
		let result = projects.filter((p) => p.tenantId === tenantId);

		if (filter?.status) {
			result = result.filter((p) => p.status === filter.status);
		}
		if (filter?.search) {
			const searchLower = filter.search.toLowerCase();
			result = result.filter(
				(p) => p.title.toLowerCase().includes(searchLower)
			);
		}

		return result;
	}

	sortProjects(
		projects: PortfolioProjectRecord[]
	): PortfolioProjectRecord[] {
		return [...projects].sort((a, b) => a.sortOrder - b.sortOrder);
	}
}
