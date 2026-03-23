// E13-S6-T4/T5/T6: Content view-model helpers — location display rows,
// content page cards, announcement rows, status badges, and slug generation.

import type {
	ContentPageRecord,
	ContentPageStatus,
	AnnouncementRecord,
	AnnouncementPlacement,
} from "@platform/types";
import type { LocationRecord } from "@platform/sdk";

// ── Display types ────────────────────────────────────────────────────────────

export type StatusBadge = {
	colorClass: string;
	label: string;
};

export type LocationDisplayRow = {
	address: string;
	city: string;
	email: string;
	fullAddress: string;
	id: string;
	isActive: boolean;
	name: string;
	phone: string;
	state: string;
	statusBadge: StatusBadge;
	zip: string;
};

export type ContentPageDisplayCard = {
	excerpt: string;
	id: string;
	slug: string;
	status: ContentPageStatus;
	statusBadge: StatusBadge;
	title: string;
	updatedAt: string;
};

export type AnnouncementDisplayRow = {
	body: string;
	endDate: string;
	id: string;
	isActive: boolean;
	placement: AnnouncementPlacement;
	placementLabel: string;
	startDate: string;
	statusBadge: StatusBadge;
	statusLabel: string;
	title: string;
};

// ── Content section tabs ─────────────────────────────────────────────────────

export const contentTabs = ["pages", "announcements", "locations"] as const;
export type ContentTab = (typeof contentTabs)[number];

export function getContentTabLabel(tab: ContentTab): string {
	switch (tab) {
		case "pages":
			return "Pages";
		case "announcements":
			return "Announcements";
		case "locations":
			return "Locations";
	}
}

// ── Slug generation ──────────────────────────────────────────────────────────

export function generateSlugFromTitle(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 128);
}

// ── Status badges ────────────────────────────────────────────────────────────

export function getLocationStatusBadge(isActive: boolean): StatusBadge {
	return isActive
		? { label: "Active", colorClass: "success" }
		: { label: "Inactive", colorClass: "muted" };
}

export function getContentPageStatusBadge(status: ContentPageStatus): StatusBadge {
	switch (status) {
		case "draft":
			return { label: "Draft", colorClass: "warning" };
		case "published":
			return { label: "Published", colorClass: "success" };
		case "archived":
			return { label: "Archived", colorClass: "muted" };
	}
}

export function getAnnouncementPlacementLabel(placement: AnnouncementPlacement): string {
	switch (placement) {
		case "banner":
			return "Banner";
		case "popup":
			return "Popup";
		case "inline":
			return "In-feed";
	}
}

export function getAnnouncementStatusLabel(ann: { isActive: boolean; startDate?: string | null; endDate?: string | null }): string {
	if (!ann.isActive) {
		return "Inactive";
	}
	const now = new Date();
	if (ann.startDate && new Date(ann.startDate) > now) {
		return "Scheduled";
	}
	if (ann.endDate && new Date(ann.endDate) < now) {
		return "Expired";
	}
	return "Active";
}

export function getAnnouncementStatusBadge(statusLabel: string): StatusBadge {
	switch (statusLabel) {
		case "Active":
			return { label: "Active", colorClass: "success" };
		case "Scheduled":
			return { label: "Scheduled", colorClass: "info" };
		case "Expired":
			return { label: "Expired", colorClass: "muted" };
		default:
			return { label: "Inactive", colorClass: "muted" };
	}
}

// ── Display row builders ─────────────────────────────────────────────────────

export function buildLocationDisplayRow(loc: LocationRecord): LocationDisplayRow {
	const parts = [loc.address, loc.city, loc.state, loc.zip].filter(Boolean);
	return {
		address: loc.address,
		city: loc.city,
		email: loc.email,
		fullAddress: parts.join(", "),
		id: loc.id,
		isActive: loc.isActive,
		name: loc.name,
		phone: loc.phone,
		state: loc.state,
		statusBadge: getLocationStatusBadge(loc.isActive),
		zip: loc.zip,
	};
}

export function buildContentPageDisplayCard(page: ContentPageRecord): ContentPageDisplayCard {
	let excerpt = "";
	if (page.body && typeof page.body === "string") {
		excerpt = page.body.slice(0, 120);
	} else if (page.seoDescription) {
		excerpt = page.seoDescription.slice(0, 120);
	}

	return {
		excerpt,
		id: page.id,
		slug: page.slug,
		status: page.status,
		statusBadge: getContentPageStatusBadge(page.status),
		title: page.title,
		updatedAt: page.updatedAt,
	};
}

export function buildAnnouncementDisplayRow(ann: AnnouncementRecord): AnnouncementDisplayRow {
	const statusLabel = getAnnouncementStatusLabel(ann);
	return {
		body: ann.body,
		endDate: ann.endDate ?? "",
		id: ann.id,
		isActive: ann.isActive,
		placement: ann.placement,
		placementLabel: getAnnouncementPlacementLabel(ann.placement),
		startDate: ann.startDate ?? "",
		statusBadge: getAnnouncementStatusBadge(statusLabel),
		statusLabel,
		title: ann.title,
	};
}

// ── Operating hours helpers ──────────────────────────────────────────────────

export const weekdays = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
] as const;

export type DayHours = {
	closeTime: string;
	day: string;
	isClosed: boolean;
	openTime: string;
};

export function buildDefaultWeekHours(): DayHours[] {
	return weekdays.map((day) => ({
		closeTime: "17:00",
		day,
		isClosed: day === "Saturday" || day === "Sunday",
		openTime: "09:00",
	}));
}
