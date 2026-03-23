import type {
	ServiceRecord,
	ServiceListFilter,
	ServiceAvailabilityQuery,
	ServiceAvailabilitySlot,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type ServiceListResponse = {
	data: ServiceRecord[];
	total: number;
};

export type ServicesApi = {
	list(params?: ServiceListFilter): Promise<ServiceListResponse>;
	get(id: string): Promise<ServiceRecord>;
	create(params: Omit<ServiceRecord, "id" | "createdAt" | "updatedAt">): Promise<ServiceRecord>;
	update(id: string, params: Partial<ServiceRecord>): Promise<ServiceRecord>;
	delete(id: string): Promise<void>;
	getAvailability(query: ServiceAvailabilityQuery): Promise<ServiceAvailabilitySlot[]>;
};

export function createServicesApi(transport: HttpTransport): ServicesApi {
	return {
		list: (params) =>
			transport.get("/services", params),
		get: (id) => transport.get(`/services/${id}`),
		create: (params) => transport.post("/services", params),
		update: (id, params) => transport.put(`/services/${id}`, params),
		delete: (id) => transport.delete(`/services/${id}`),
		getAvailability: (query) =>
			transport.post("/services/availability", query),
	};
}
