import type {
	TenantCustomDomainRecord,
	CustomDomainVerificationState,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type DomainListResponse = {
	data: TenantCustomDomainRecord[];
	total: number;
};

export type CreateDomainParams = {
	domain: string;
	tenantId: string;
};

export type DomainVerifyResponse = {
	domain: TenantCustomDomainRecord;
	verificationState: CustomDomainVerificationState;
};

export type DomainsApi = {
	list(): Promise<DomainListResponse>;
	get(id: string): Promise<TenantCustomDomainRecord>;
	create(params: CreateDomainParams): Promise<TenantCustomDomainRecord>;
	verify(id: string): Promise<DomainVerifyResponse>;
	delete(id: string): Promise<void>;
};

export function createDomainsApi(transport: HttpTransport): DomainsApi {
	return {
		list: () => transport.get("/domains"),
		get: (id) => transport.get(`/domains/${id}`),
		create: (params) => transport.post("/domains", params),
		verify: (id) => transport.post(`/domains/${id}/verify`),
		delete: (id) => transport.delete(`/domains/${id}`),
	};
}
