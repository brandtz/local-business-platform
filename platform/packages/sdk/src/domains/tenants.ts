import type {
	TenantSummary,
	TenantProvisioningRequest,
	TenantProvisioningResult,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type TenantListParams = {
	page?: number;
	pageSize?: number;
	status?: string;
	search?: string;
};

export type TenantListResponse = {
	data: TenantSummary[];
	total: number;
};

export type ImpersonateResponse = {
	token: string;
	tenantId: string;
	expiresAt: string;
};

export type TenantsApi = {
	list(params?: TenantListParams): Promise<TenantListResponse>;
	get(id: string): Promise<TenantSummary>;
	create(params: TenantProvisioningRequest): Promise<TenantProvisioningResult>;
	update(id: string, params: Partial<TenantSummary>): Promise<TenantSummary>;
	impersonate(id: string): Promise<ImpersonateResponse>;
};

export function createTenantsApi(transport: HttpTransport): TenantsApi {
	return {
		list: (params) =>
			transport.get("/tenants", params),
		get: (id) => transport.get(`/tenants/${id}`),
		create: (params) => transport.post("/tenants", params),
		update: (id, params) => transport.put(`/tenants/${id}`, params),
		impersonate: (id) => transport.post(`/tenants/${id}/impersonate`),
	};
}
