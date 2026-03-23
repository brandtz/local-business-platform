// Client factory — assembles all domain APIs into a single typed client.

import type { ApiClientConfig } from "./api-client";
import { createHttpTransport, type HttpTransport, type HttpTransportConfig } from "./http-transport";
import { createAuthApi, type AuthApi } from "./domains/auth";
import { createCatalogApi, type CatalogApi } from "./domains/catalog";
import { createServicesApi, type ServicesApi } from "./domains/services";
import { createOrdersApi, type OrdersApi } from "./domains/orders";
import { createBookingsApi, type BookingsApi } from "./domains/bookings";
import { createCustomersApi, type CustomersApi } from "./domains/customers";
import { createStaffApi, type StaffApi } from "./domains/staff";
import { createPaymentsApi, type PaymentsApi } from "./domains/payments";
import { createNotificationsApi, type NotificationsApi } from "./domains/notifications";
import { createAnalyticsApi, type AnalyticsApi } from "./domains/analytics";
import { createLoyaltyApi, type LoyaltyApi } from "./domains/loyalty";
import { createSearchApi, type SearchApi } from "./domains/search";
import { createContentApi, type ContentApi } from "./domains/content";
import { createLocationsApi, type LocationsApi } from "./domains/locations";
import { createPortfolioApi, type PortfolioApi } from "./domains/portfolio";
import { createQuotesApi, type QuotesApi } from "./domains/quotes";
import { createSubscriptionsApi, type SubscriptionsApi } from "./domains/subscriptions";
import { createTenantsApi, type TenantsApi } from "./domains/tenants";
import { createDomainsApi, type DomainsApi } from "./domains/domains";
import { createConfigApi, type ConfigApi } from "./domains/config";
import { createHealthApi, type HealthApi } from "./domains/health";
import { createAuditApi, type AuditApi } from "./domains/audit";
import { createDeploymentsApi, type DeploymentsApi } from "./domains/deployments";

export type ApiClient = {
	auth: AuthApi;
	catalog: CatalogApi;
	services: ServicesApi;
	orders: OrdersApi;
	bookings: BookingsApi;
	customers: CustomersApi;
	staff: StaffApi;
	payments: PaymentsApi;
	notifications: NotificationsApi;
	analytics: AnalyticsApi;
	loyalty: LoyaltyApi;
	search: SearchApi;
	content: ContentApi;
	locations: LocationsApi;
	portfolio: PortfolioApi;
	quotes: QuotesApi;
	subscriptions: SubscriptionsApi;
	tenants: TenantsApi;
	domains: DomainsApi;
	config: ConfigApi;
	health: HealthApi;
	audit: AuditApi;
	deployments: DeploymentsApi;
	transport: HttpTransport;
};

export function createApiClient(clientConfig: ApiClientConfig): ApiClient {
	const transportConfig: HttpTransportConfig = {
		baseUrl: clientConfig.baseUrl,
		timeout: clientConfig.timeout,
		defaultHeaders: {
			Accept: "application/json",
		},
		requestInterceptors: [],
		responseInterceptors: [],
	};

	const transport = createHttpTransport(transportConfig);

	return {
		auth: createAuthApi(transport),
		catalog: createCatalogApi(transport),
		services: createServicesApi(transport),
		orders: createOrdersApi(transport),
		bookings: createBookingsApi(transport),
		customers: createCustomersApi(transport),
		staff: createStaffApi(transport),
		payments: createPaymentsApi(transport),
		notifications: createNotificationsApi(transport),
		analytics: createAnalyticsApi(transport),
		loyalty: createLoyaltyApi(transport),
		search: createSearchApi(transport),
		content: createContentApi(transport),
		locations: createLocationsApi(transport),
		portfolio: createPortfolioApi(transport),
		quotes: createQuotesApi(transport),
		subscriptions: createSubscriptionsApi(transport),
		tenants: createTenantsApi(transport),
		domains: createDomainsApi(transport),
		config: createConfigApi(transport),
		health: createHealthApi(transport),
		audit: createAuditApi(transport),
		deployments: createDeploymentsApi(transport),
		transport,
	};
}
