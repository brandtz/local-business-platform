import type {
	Category,
	CreateCategoryRequest,
	UpdateCategoryRequest,
	CatalogItemRecord,
	CreateItemRequest,
	UpdateItemRequest,
	CatalogListQuery,
	CatalogListResponse,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type CatalogApi = {
	listCategories(params?: CatalogListQuery): Promise<CatalogListResponse<Category>>;
	getCategory(id: string): Promise<Category>;
	createCategory(params: CreateCategoryRequest): Promise<Category>;
	updateCategory(id: string, params: UpdateCategoryRequest): Promise<Category>;
	deleteCategory(id: string): Promise<void>;
	listItems(params?: CatalogListQuery): Promise<CatalogListResponse<CatalogItemRecord>>;
	getItem(id: string): Promise<CatalogItemRecord>;
	createItem(params: CreateItemRequest): Promise<CatalogItemRecord>;
	updateItem(id: string, params: UpdateItemRequest): Promise<CatalogItemRecord>;
	deleteItem(id: string): Promise<void>;
};

export function createCatalogApi(transport: HttpTransport): CatalogApi {
	return {
		listCategories: (params) =>
			transport.get("/catalog/categories", params),
		getCategory: (id) => transport.get(`/catalog/categories/${id}`),
		createCategory: (params) => transport.post("/catalog/categories", params),
		updateCategory: (id, params) => transport.put(`/catalog/categories/${id}`, params),
		deleteCategory: (id) => transport.delete(`/catalog/categories/${id}`),
		listItems: (params) =>
			transport.get("/catalog/items", params),
		getItem: (id) => transport.get(`/catalog/items/${id}`),
		createItem: (params) => transport.post("/catalog/items", params),
		updateItem: (id, params) => transport.put(`/catalog/items/${id}`, params),
		deleteItem: (id) => transport.delete(`/catalog/items/${id}`),
	};
}
