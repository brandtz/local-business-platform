import type { HttpTransport } from "../http-transport";

export type LocationRecord = {
	id: string;
	name: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	phone: string;
	email: string;
	latitude: number | null;
	longitude: number | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};

export type CreateLocationParams = Omit<LocationRecord, "id" | "createdAt" | "updatedAt">;
export type UpdateLocationParams = Partial<CreateLocationParams>;

export type LocationListParams = {
	page?: number;
	pageSize?: number;
	search?: string;
};

export type LocationListResponse = {
	data: LocationRecord[];
	total: number;
};

export type LocationsApi = {
	list(params?: LocationListParams): Promise<LocationListResponse>;
	get(id: string): Promise<LocationRecord>;
	create(params: CreateLocationParams): Promise<LocationRecord>;
	update(id: string, params: UpdateLocationParams): Promise<LocationRecord>;
	delete(id: string): Promise<void>;
};

export function createLocationsApi(transport: HttpTransport): LocationsApi {
	return {
		list: (params) =>
			transport.get("/locations", params),
		get: (id) => transport.get(`/locations/${id}`),
		create: (params) => transport.post("/locations", params),
		update: (id, params) => transport.put(`/locations/${id}`, params),
		delete: (id) => transport.delete(`/locations/${id}`),
	};
}
