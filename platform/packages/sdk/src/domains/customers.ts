import type { CustomerProfile } from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type CustomerListParams = {
	page?: number;
	pageSize?: number;
	search?: string;
	sort?: string;
};

export type CustomerListResponse = {
	data: CustomerProfile[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
};

export type CustomerMetrics = {
	totalCustomers: number;
	activeCustomers: number;
	newCustomersThisMonth: number;
	averageOrderValue: number;
};

export type CustomersApi = {
	list(params?: CustomerListParams): Promise<CustomerListResponse>;
	get(id: string): Promise<CustomerProfile>;
	getMetrics(): Promise<CustomerMetrics>;
};

export function createCustomersApi(transport: HttpTransport): CustomersApi {
	return {
		list: (params) =>
			transport.get("/customers", params),
		get: (id) => transport.get(`/customers/${id}`),
		getMetrics: () => transport.get("/customers/metrics"),
	};
}
