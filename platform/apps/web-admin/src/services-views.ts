// E13-S6-T3: Services view-model helpers — service display rows,
// duration formatting, status badges, and booking config display.

import type {
	ServiceRecord,
	ServiceStatus,
} from "@platform/types";

// ── Display types ────────────────────────────────────────────────────────────

export type StatusBadge = {
	colorClass: string;
	label: string;
};

export type ServiceDisplayRow = {
	bufferMinutes: number;
	durationFormatted: string;
	durationMinutes: number;
	id: string;
	isBookable: boolean;
	maxAdvanceDays: number;
	minAdvanceHours: number;
	name: string;
	price: number;
	priceFormatted: string;
	slug: string;
	status: ServiceStatus;
	statusBadge: StatusBadge;
};

// ── Duration formatting ──────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}min`;
	}
	const hours = Math.floor(minutes / 60);
	const remaining = minutes % 60;
	if (remaining === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${remaining}min`;
}

// ── Price formatting ─────────────────────────────────────────────────────────

export function formatPrice(cents: number): string {
	const dollars = cents / 100;
	return `$${dollars.toFixed(2)}`;
}

// ── Status badges ────────────────────────────────────────────────────────────

export function getServiceStatusBadge(status: ServiceStatus): StatusBadge {
	switch (status) {
		case "active":
			return { label: "Active", colorClass: "success" };
		case "inactive":
			return { label: "Inactive", colorClass: "muted" };
	}
}

// ── Display row builder ──────────────────────────────────────────────────────

export function buildServiceDisplayRow(svc: ServiceRecord): ServiceDisplayRow {
	return {
		bufferMinutes: svc.bufferMinutes,
		durationFormatted: formatDuration(svc.durationMinutes),
		durationMinutes: svc.durationMinutes,
		id: svc.id,
		isBookable: svc.isBookable,
		maxAdvanceDays: svc.maxAdvanceDays,
		minAdvanceHours: svc.minAdvanceHours,
		name: svc.name,
		price: svc.price,
		priceFormatted: formatPrice(svc.price),
		slug: svc.slug,
		status: svc.status,
		statusBadge: getServiceStatusBadge(svc.status),
	};
}

// ── Booking config summary ───────────────────────────────────────────────────

export function buildBookingConfigSummary(svc: ServiceRecord): string {
	const parts: string[] = [];
	parts.push(`${svc.durationMinutes}min duration`);
	if (svc.bufferMinutes > 0) {
		parts.push(`${svc.bufferMinutes}min buffer`);
	}
	parts.push(`book up to ${svc.maxAdvanceDays}d ahead`);
	if (svc.minAdvanceHours > 0) {
		parts.push(`min ${svc.minAdvanceHours}h notice`);
	}
	return parts.join(" · ");
}
