// ---------------------------------------------------------------------------
// Domain contract stabilization — event hooks (E6-S6)
// ---------------------------------------------------------------------------

/**
 * Stable domain event names for downstream consumers (E7+).
 * Consumers subscribe to these string keys; payloads are typed per-event.
 */
export const domainEvents = {
	announcementActivated: "announcement.activated",
	announcementDeactivated: "announcement.deactivated",
	catalogCategoryCreated: "catalog.category.created",
	catalogCategoryStatusChanged: "catalog.category.status-changed",
	catalogItemCreated: "catalog.item.created",
	catalogItemStatusChanged: "catalog.item.status-changed",
	catalogItemVisibilityChanged: "catalog.item.visibility-changed",
	contentPageArchived: "content.page.archived",
	contentPagePublished: "content.page.published",
	serviceCreated: "service.created",
	serviceStatusChanged: "service.status-changed",
	staffAssignmentChanged: "staff.assignment-changed",
	staffProfileCreated: "staff.profile.created",
	staffStatusChanged: "staff.status-changed",
	verticalApplied: "vertical.applied",
} as const;

export type DomainEventName =
	(typeof domainEvents)[keyof typeof domainEvents];

// ---------------------------------------------------------------------------
// Domain event payload types
// ---------------------------------------------------------------------------

export type DomainEventEnvelope<T = unknown> = {
	data: T;
	eventName: DomainEventName;
	occurredAt: string; // ISO 8601
	tenantId: string;
};

export type CatalogItemEventPayload = {
	categoryId: string;
	itemId: string;
	newStatus?: string;
	newVisibility?: string;
	previousStatus?: string;
	previousVisibility?: string;
};

export type ContentPageEventPayload = {
	pageId: string;
	slug: string;
	status: string;
};

export type ServiceEventPayload = {
	newStatus?: string;
	previousStatus?: string;
	serviceId: string;
};

export type StaffEventPayload = {
	newStatus?: string;
	previousStatus?: string;
	staffId: string;
};

export type VerticalAppliedPayload = {
	enabledModules: readonly string[];
	vertical: string;
};

// ---------------------------------------------------------------------------
// Contract versioning
// ---------------------------------------------------------------------------

/**
 * Current domain contract version. Increment the minor version for
 * backwards-compatible additions; increment the major version for
 * breaking changes that require downstream migration.
 */
export const DOMAIN_CONTRACT_VERSION = "1.0.0" as const;

/**
 * Stable domain package re-exports. Downstream consumers should import
 * domain types exclusively through @platform/types to ensure a single
 * source of truth.
 */
export const stableDomainExports = [
	"catalog",
	"content",
	"service",
	"staff",
	"vertical",
	"domain-events",
] as const;
