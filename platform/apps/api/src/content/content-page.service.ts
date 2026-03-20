import { Injectable } from "@nestjs/common";

import type { ContentPageRecord, ContentPageStatus } from "@platform/types";
import { validateContentPageInput } from "@platform/types";

export class ContentPageError extends Error {
	constructor(
		public readonly reason:
			| "invalid-transition"
			| "not-found"
			| "validation-failed",
		message: string
	) {
		super(message);
		this.name = "ContentPageError";
	}
}

export type CreateContentPageInput = {
	body: unknown;
	ogImageUrl?: string | null;
	seoDescription?: string | null;
	seoTitle?: string | null;
	slug: string;
	templateRegion?: string | null;
	tenantId: string;
	title: string;
};

const allowedStatusTransitions: Record<
	ContentPageStatus,
	readonly ContentPageStatus[]
> = {
	archived: [],
	draft: ["published"],
	published: ["archived", "draft"],
};

@Injectable()
export class ContentPageService {
	validateCreate(
		input: CreateContentPageInput,
		existingSlugs: readonly string[]
	) {
		const result = validateContentPageInput(input);
		if (!result.valid) return result;

		if (existingSlugs.includes(input.slug)) {
			return {
				valid: false as const,
				errors: [
					{ field: "slug" as const, reason: "duplicate" as const },
				],
			};
		}

		return { valid: true as const };
	}

	validateStatusTransition(
		current: ContentPageStatus,
		target: ContentPageStatus
	): boolean {
		return allowedStatusTransitions[current]?.includes(target) ?? false;
	}

	requireStatusTransition(
		current: ContentPageStatus,
		target: ContentPageStatus
	): void {
		if (!this.validateStatusTransition(current, target)) {
			throw new ContentPageError(
				"invalid-transition",
				`Cannot transition content page from ${current} to ${target}`
			);
		}
	}

	computeSortOrderForAppend(existing: readonly ContentPageRecord[]): number {
		if (existing.length === 0) return 0;
		return Math.max(...existing.map((p) => p.sortOrder)) + 1;
	}

	filterByStatus(
		pages: readonly ContentPageRecord[],
		tenantId: string,
		status?: ContentPageStatus
	): ContentPageRecord[] {
		let result = pages.filter((p) => p.tenantId === tenantId);
		if (status) {
			result = result.filter((p) => p.status === status);
		}
		return result;
	}

	filterPublishedBySlug(
		pages: readonly ContentPageRecord[],
		tenantId: string,
		slug: string
	): ContentPageRecord | undefined {
		return pages.find(
			(p) =>
				p.tenantId === tenantId &&
				p.slug === slug &&
				p.status === "published"
		);
	}

	filterByTemplateRegion(
		pages: readonly ContentPageRecord[],
		tenantId: string,
		region: string
	): ContentPageRecord[] {
		return pages.filter(
			(p) =>
				p.tenantId === tenantId &&
				p.templateRegion === region &&
				p.status === "published"
		);
	}
}
