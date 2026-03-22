import type {
	EntityIndexConfig,
	FilterToolbarDefinition,
	IndexedEntityType,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Entity index configurations (E11-S3-T2)
// ---------------------------------------------------------------------------

export const ENTITY_INDEX_CONFIGS: Record<IndexedEntityType, EntityIndexConfig> = {
	"catalog-item": {
		entityType: "catalog-item",
		searchableFields: ["name", "description"],
		filterableFields: ["status", "visibility", "categoryId"],
		sortableFields: ["name", "price", "sortOrder", "createdAt"],
	},
	service: {
		entityType: "service",
		searchableFields: ["name", "description"],
		filterableFields: ["status", "isBookable"],
		sortableFields: ["name", "price", "sortOrder"],
	},
	order: {
		entityType: "order",
		searchableFields: ["customerName", "customerEmail", "id"],
		filterableFields: ["status", "fulfillmentMode", "createdAt"],
		sortableFields: ["createdAt", "totalCents", "status"],
	},
	booking: {
		entityType: "booking",
		searchableFields: ["customerName", "serviceName", "staffName"],
		filterableFields: ["status", "staffId", "serviceId", "startTime"],
		sortableFields: ["startTime", "createdAt"],
	},
	customer: {
		entityType: "customer",
		searchableFields: ["displayName", "email", "phone"],
		filterableFields: ["createdAt"],
		sortableFields: ["displayName", "email", "createdAt"],
	},
	staff: {
		entityType: "staff",
		searchableFields: ["displayName", "email", "role"],
		filterableFields: ["status", "isBookable"],
		sortableFields: ["displayName", "email"],
	},
	"content-page": {
		entityType: "content-page",
		searchableFields: ["title", "slug"],
		filterableFields: ["status"],
		sortableFields: ["title", "sortOrder", "createdAt"],
	},
};

// ---------------------------------------------------------------------------
// Filter toolbar definitions (E11-S3-T4)
// ---------------------------------------------------------------------------

export const FILTER_TOOLBAR_DEFINITIONS: Partial<
	Record<IndexedEntityType, FilterToolbarDefinition>
> = {
	"catalog-item": {
		entityType: "catalog-item",
		filters: [
			{
				field: "status",
				label: "Status",
				type: "enum",
				options: [
					{ value: "active", label: "Active" },
					{ value: "inactive", label: "Inactive" },
				],
			},
			{
				field: "visibility",
				label: "Visibility",
				type: "enum",
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published" },
				],
			},
			{
				field: "price",
				label: "Price",
				type: "range",
				rangeMin: 0,
				rangeMax: 100000,
			},
		],
		defaultSort: { field: "sortOrder", direction: "asc" },
		sortOptions: [
			{ field: "name", label: "Name" },
			{ field: "price", label: "Price" },
			{ field: "sortOrder", label: "Display Order" },
			{ field: "createdAt", label: "Date Created" },
		],
	},
	order: {
		entityType: "order",
		filters: [
			{
				field: "status",
				label: "Status",
				type: "enum",
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "placed", label: "Placed" },
					{ value: "confirmed", label: "Confirmed" },
					{ value: "preparing", label: "Preparing" },
					{ value: "ready", label: "Ready" },
					{ value: "completed", label: "Completed" },
					{ value: "cancelled", label: "Cancelled" },
				],
			},
			{
				field: "fulfillmentMode",
				label: "Fulfillment",
				type: "enum",
				options: [
					{ value: "delivery", label: "Delivery" },
					{ value: "pickup", label: "Pickup" },
					{ value: "dine-in", label: "Dine-In" },
				],
			},
			{
				field: "createdAt",
				label: "Date",
				type: "date",
			},
		],
		defaultSort: { field: "createdAt", direction: "desc" },
		sortOptions: [
			{ field: "createdAt", label: "Date Created" },
			{ field: "totalCents", label: "Total" },
			{ field: "status", label: "Status" },
		],
	},
	customer: {
		entityType: "customer",
		filters: [
			{
				field: "createdAt",
				label: "Joined Date",
				type: "date",
			},
		],
		defaultSort: { field: "createdAt", direction: "desc" },
		sortOptions: [
			{ field: "displayName", label: "Name" },
			{ field: "email", label: "Email" },
			{ field: "createdAt", label: "Date Joined" },
		],
	},
	service: {
		entityType: "service",
		filters: [
			{
				field: "status",
				label: "Status",
				type: "enum",
				options: [
					{ value: "active", label: "Active" },
					{ value: "inactive", label: "Inactive" },
				],
			},
			{
				field: "isBookable",
				label: "Bookable",
				type: "boolean",
			},
		],
		defaultSort: { field: "sortOrder", direction: "asc" },
		sortOptions: [
			{ field: "name", label: "Name" },
			{ field: "price", label: "Price" },
			{ field: "sortOrder", label: "Display Order" },
		],
	},
	booking: {
		entityType: "booking",
		filters: [
			{
				field: "status",
				label: "Status",
				type: "enum",
				options: [
					{ value: "requested", label: "Requested" },
					{ value: "confirmed", label: "Confirmed" },
					{ value: "checked-in", label: "Checked In" },
					{ value: "completed", label: "Completed" },
					{ value: "cancelled", label: "Cancelled" },
					{ value: "no-show", label: "No Show" },
				],
			},
			{
				field: "startTime",
				label: "Date",
				type: "date",
			},
		],
		defaultSort: { field: "startTime", direction: "asc" },
		sortOptions: [
			{ field: "startTime", label: "Appointment Time" },
			{ field: "createdAt", label: "Date Created" },
		],
	},
	staff: {
		entityType: "staff",
		filters: [
			{
				field: "status",
				label: "Status",
				type: "enum",
				options: [
					{ value: "active", label: "Active" },
					{ value: "inactive", label: "Inactive" },
				],
			},
			{
				field: "isBookable",
				label: "Bookable",
				type: "boolean",
			},
		],
		defaultSort: { field: "displayName", direction: "asc" },
		sortOptions: [
			{ field: "displayName", label: "Name" },
			{ field: "email", label: "Email" },
		],
	},
	"content-page": {
		entityType: "content-page",
		filters: [
			{
				field: "status",
				label: "Status",
				type: "enum",
				options: [
					{ value: "draft", label: "Draft" },
					{ value: "published", label: "Published" },
					{ value: "archived", label: "Archived" },
				],
			},
		],
		defaultSort: { field: "sortOrder", direction: "asc" },
		sortOptions: [
			{ field: "title", label: "Title" },
			{ field: "sortOrder", label: "Display Order" },
			{ field: "createdAt", label: "Date Created" },
		],
	},
};
