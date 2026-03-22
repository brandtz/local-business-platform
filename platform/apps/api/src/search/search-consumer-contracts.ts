import type {
	IndexedDocument,
	IndexedEntityType,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Search consumer integration contracts (E11-S3-T5)
//
// These functions transform domain entities into IndexedDocument format
// for the search service. Each domain module calls these to build
// search-indexable documents on create/update/delete.
// ---------------------------------------------------------------------------

/**
 * Build an IndexedDocument from a catalog item record.
 */
export function buildCatalogItemDocument(item: {
	id: string;
	tenantId: string;
	name: string;
	description?: string | null;
	slug: string;
	status: string;
	visibility: string;
	categoryId: string;
	price: number;
	sortOrder: number;
}): IndexedDocument {
	return {
		id: item.id,
		tenantId: item.tenantId,
		entityType: "catalog-item",
		searchableText: [
			item.name,
			...(item.description ? [item.description] : []),
		],
		facets: {
			status: item.status,
			visibility: item.visibility,
			categoryId: item.categoryId,
			price: item.price,
			name: item.name,
		},
		sortFields: {
			name: item.name.toLowerCase(),
			price: item.price,
			sortOrder: item.sortOrder,
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Build an IndexedDocument from an order record.
 */
export function buildOrderDocument(order: {
	id: string;
	tenantId: string;
	customerName: string | null;
	customerEmail: string | null;
	status: string;
	fulfillmentMode: string;
	totalCents: number;
	createdAt: string;
}): IndexedDocument {
	return {
		id: order.id,
		tenantId: order.tenantId,
		entityType: "order",
		searchableText: [
			order.id,
			...(order.customerName ? [order.customerName] : []),
			...(order.customerEmail ? [order.customerEmail] : []),
		],
		facets: {
			status: order.status,
			fulfillmentMode: order.fulfillmentMode,
			createdAt: order.createdAt,
			totalCents: order.totalCents,
		},
		sortFields: {
			createdAt: order.createdAt,
			totalCents: order.totalCents,
			status: order.status,
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Build an IndexedDocument from a customer profile.
 */
export function buildCustomerDocument(customer: {
	id: string;
	tenantId: string;
	email: string;
	displayName: string | null;
	phone: string | null;
	createdAt: string;
}): IndexedDocument {
	return {
		id: customer.id,
		tenantId: customer.tenantId,
		entityType: "customer",
		searchableText: [
			...(customer.displayName ? [customer.displayName] : []),
			customer.email,
			...(customer.phone ? [customer.phone] : []),
		],
		facets: {
			createdAt: customer.createdAt,
			displayName: customer.displayName,
			email: customer.email,
		},
		sortFields: {
			displayName: (customer.displayName ?? "").toLowerCase(),
			email: customer.email.toLowerCase(),
			createdAt: customer.createdAt,
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Build an IndexedDocument from a service record.
 */
export function buildServiceDocument(service: {
	id: string;
	tenantId: string;
	name: string;
	description?: string | null;
	status: string;
	isBookable: boolean;
	price: number;
	sortOrder: number;
}): IndexedDocument {
	return {
		id: service.id,
		tenantId: service.tenantId,
		entityType: "service",
		searchableText: [
			service.name,
			...(service.description ? [service.description] : []),
		],
		facets: {
			status: service.status,
			isBookable: service.isBookable,
			price: service.price,
			name: service.name,
		},
		sortFields: {
			name: service.name.toLowerCase(),
			price: service.price,
			sortOrder: service.sortOrder,
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Build an IndexedDocument from a booking record.
 */
export function buildBookingDocument(booking: {
	id: string;
	tenantId: string;
	customerName: string | null;
	serviceName: string;
	staffName: string;
	status: string;
	staffId: string;
	serviceId: string;
	startTime: string;
	createdAt: string;
}): IndexedDocument {
	return {
		id: booking.id,
		tenantId: booking.tenantId,
		entityType: "booking",
		searchableText: [
			...(booking.customerName ? [booking.customerName] : []),
			booking.serviceName,
			booking.staffName,
		],
		facets: {
			status: booking.status,
			staffId: booking.staffId,
			serviceId: booking.serviceId,
			startTime: booking.startTime,
		},
		sortFields: {
			startTime: booking.startTime,
			createdAt: booking.createdAt,
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Build an IndexedDocument from a staff profile.
 */
export function buildStaffDocument(staff: {
	id: string;
	tenantId: string;
	displayName: string;
	email?: string | null;
	role?: string | null;
	status: string;
	isBookable: boolean;
}): IndexedDocument {
	return {
		id: staff.id,
		tenantId: staff.tenantId,
		entityType: "staff",
		searchableText: [
			staff.displayName,
			...(staff.email ? [staff.email] : []),
			...(staff.role ? [staff.role] : []),
		],
		facets: {
			status: staff.status,
			isBookable: staff.isBookable,
			displayName: staff.displayName,
			email: staff.email ?? null,
		},
		sortFields: {
			displayName: staff.displayName.toLowerCase(),
			email: (staff.email ?? "").toLowerCase(),
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Build an IndexedDocument from a content page.
 */
export function buildContentPageDocument(page: {
	id: string;
	tenantId: string;
	title: string;
	slug: string;
	status: string;
	sortOrder: number;
	createdAt: string;
}): IndexedDocument {
	return {
		id: page.id,
		tenantId: page.tenantId,
		entityType: "content-page",
		searchableText: [page.title, page.slug],
		facets: {
			status: page.status,
			title: page.title,
		},
		sortFields: {
			title: page.title.toLowerCase(),
			sortOrder: page.sortOrder,
			createdAt: page.createdAt,
		},
		indexedAt: new Date().toISOString(),
	};
}

/**
 * Generic builder that dispatches to the appropriate document builder.
 * Convenience wrapper for index trigger handlers.
 */
export function buildIndexedDocument(
	entityType: IndexedEntityType,
	entity: Record<string, unknown>
): IndexedDocument {
	switch (entityType) {
		case "catalog-item":
			return buildCatalogItemDocument(entity as Parameters<typeof buildCatalogItemDocument>[0]);
		case "service":
			return buildServiceDocument(entity as Parameters<typeof buildServiceDocument>[0]);
		case "order":
			return buildOrderDocument(entity as Parameters<typeof buildOrderDocument>[0]);
		case "booking":
			return buildBookingDocument(entity as Parameters<typeof buildBookingDocument>[0]);
		case "customer":
			return buildCustomerDocument(entity as Parameters<typeof buildCustomerDocument>[0]);
		case "staff":
			return buildStaffDocument(entity as Parameters<typeof buildStaffDocument>[0]);
		case "content-page":
			return buildContentPageDocument(entity as Parameters<typeof buildContentPageDocument>[0]);
		default:
			throw new Error(`Unknown entity type for indexing: ${entityType as string}`);
	}
}
