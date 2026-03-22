import { Injectable } from "@nestjs/common";

import type {
	PortfolioProjectMediaRecord,
	PortfolioValidationResult
} from "@platform/types";
import { validatePortfolioMediaInput } from "@platform/types";

export class PortfolioMediaError extends Error {
	constructor(
		public readonly reason: "not-found" | "validation-failed" | "invalid-reorder",
		message: string
	) {
		super(message);
		this.name = "PortfolioMediaError";
	}
}

export type CreatePortfolioMediaInput = {
	altText?: string | null;
	caption?: string | null;
	projectId: string;
	sortOrder?: number;
	tag?: string;
	url: string;
};

@Injectable()
export class PortfolioMediaService {
	validateCreate(input: CreatePortfolioMediaInput): PortfolioValidationResult {
		return validatePortfolioMediaInput(input);
	}

	computeSortOrderForAppend(
		existing: readonly PortfolioProjectMediaRecord[]
	): number {
		if (existing.length === 0) return 0;
		return Math.max(...existing.map((m) => m.sortOrder)) + 1;
	}

	validateReorder(
		mediaIds: readonly string[],
		existingMedia: readonly PortfolioProjectMediaRecord[]
	): boolean {
		if (mediaIds.length !== existingMedia.length) return false;
		const existingIds = new Set(existingMedia.map((m) => m.id));
		return mediaIds.every((id) => existingIds.has(id));
	}

	requireValidReorder(
		mediaIds: readonly string[],
		existingMedia: readonly PortfolioProjectMediaRecord[]
	): void {
		if (!this.validateReorder(mediaIds, existingMedia)) {
			throw new PortfolioMediaError(
				"invalid-reorder",
				"Reorder request must include all existing media IDs exactly once"
			);
		}
	}

	applyReorder(
		mediaIds: readonly string[],
		existingMedia: readonly PortfolioProjectMediaRecord[]
	): PortfolioProjectMediaRecord[] {
		return mediaIds.map((id, index) => {
			const media = existingMedia.find((m) => m.id === id)!;
			return { ...media, sortOrder: index };
		});
	}

	sortMedia(
		media: readonly PortfolioProjectMediaRecord[]
	): PortfolioProjectMediaRecord[] {
		return [...media].sort((a, b) => a.sortOrder - b.sortOrder);
	}
}
