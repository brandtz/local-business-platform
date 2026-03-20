import { Injectable } from "@nestjs/common";

import type { AnnouncementRecord } from "@platform/types";
import { validateAnnouncementInput } from "@platform/types";

export class AnnouncementError extends Error {
	constructor(
		public readonly reason: "not-found" | "validation-failed",
		message: string
	) {
		super(message);
		this.name = "AnnouncementError";
	}
}

export type CreateAnnouncementInput = {
	body: string;
	displayPriority?: number;
	endDate?: string | null;
	placement?: "banner" | "inline" | "popup";
	startDate?: string | null;
	tenantId: string;
	title: string;
};

@Injectable()
export class AnnouncementService {
	validateCreate(input: CreateAnnouncementInput) {
		return validateAnnouncementInput(input);
	}

	/**
	 * Filter announcements that should be active right now, sorted by priority.
	 */
	filterActive(
		announcements: readonly AnnouncementRecord[],
		tenantId: string,
		now: Date = new Date()
	): AnnouncementRecord[] {
		return announcements
			.filter((a) => {
				if (a.tenantId !== tenantId) return false;
				if (!a.isActive) return false;
				if (a.startDate && new Date(a.startDate) > now) return false;
				if (a.endDate && new Date(a.endDate) < now) return false;
				return true;
			})
			.sort((a, b) => b.displayPriority - a.displayPriority);
	}

	/**
	 * Filter announcements by placement type for storefront consumption.
	 */
	filterByPlacement(
		announcements: readonly AnnouncementRecord[],
		tenantId: string,
		placement: "banner" | "inline" | "popup",
		now: Date = new Date()
	): AnnouncementRecord[] {
		return this.filterActive(announcements, tenantId, now).filter(
			(a) => a.placement === placement
		);
	}

	/**
	 * Check if an announcement should be active given the current date.
	 */
	isWithinDateRange(
		announcement: AnnouncementRecord,
		now: Date = new Date()
	): boolean {
		if (announcement.startDate && new Date(announcement.startDate) > now) {
			return false;
		}
		if (announcement.endDate && new Date(announcement.endDate) < now) {
			return false;
		}
		return true;
	}
}
