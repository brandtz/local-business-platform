import type {
	PortfolioProjectRecord,
	CreatePortfolioProjectRequest,
	UpdatePortfolioProjectRequest,
	PortfolioAdminListQuery,
	PortfolioAdminListResponse,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type PortfolioApi = {
	list(params?: PortfolioAdminListQuery): Promise<PortfolioAdminListResponse>;
	get(id: string): Promise<PortfolioProjectRecord>;
	create(params: CreatePortfolioProjectRequest): Promise<PortfolioProjectRecord>;
	update(id: string, params: UpdatePortfolioProjectRequest): Promise<PortfolioProjectRecord>;
	delete(id: string): Promise<void>;
};

export function createPortfolioApi(transport: HttpTransport): PortfolioApi {
	return {
		list: (params) =>
			transport.get("/portfolio", params),
		get: (id) => transport.get(`/portfolio/${id}`),
		create: (params) => transport.post("/portfolio", params),
		update: (id, params) => transport.put(`/portfolio/${id}`, params),
		delete: (id) => transport.delete(`/portfolio/${id}`),
	};
}
