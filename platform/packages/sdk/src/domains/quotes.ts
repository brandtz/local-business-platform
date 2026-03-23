import type {
	QuoteRecord,
	CreateQuoteRequest,
	UpdateQuoteRequest,
	AdminQuoteListQuery,
	AdminQuoteListResponse,
	AdminQuoteDetail,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type QuotesApi = {
	list(params?: AdminQuoteListQuery): Promise<AdminQuoteListResponse>;
	get(id: string): Promise<AdminQuoteDetail>;
	create(params: CreateQuoteRequest): Promise<QuoteRecord>;
	update(id: string, params: UpdateQuoteRequest): Promise<QuoteRecord>;
	delete(id: string): Promise<void>;
	send(id: string): Promise<QuoteRecord>;
	accept(id: string): Promise<QuoteRecord>;
	decline(id: string, params?: { reason?: string }): Promise<QuoteRecord>;
};

export function createQuotesApi(transport: HttpTransport): QuotesApi {
	return {
		list: (params) =>
			transport.get("/quotes", params),
		get: (id) => transport.get(`/quotes/${id}`),
		create: (params) => transport.post("/quotes", params),
		update: (id, params) => transport.put(`/quotes/${id}`, params),
		delete: (id) => transport.delete(`/quotes/${id}`),
		send: (id) => transport.post(`/quotes/${id}/send`),
		accept: (id) => transport.post(`/quotes/${id}/accept`),
		decline: (id, params) => transport.post(`/quotes/${id}/decline`, params),
	};
}
