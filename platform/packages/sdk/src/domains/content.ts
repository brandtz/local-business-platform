import type {
	ContentPageRecord,
	CreateContentPageRequest,
	UpdateContentPageRequest,
	AnnouncementRecord,
	CreateAnnouncementRequest,
	UpdateAnnouncementRequest,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type ContentListParams = {
	page?: number;
	pageSize?: number;
	status?: string;
};

export type ContentListResponse<T> = {
	data: T[];
	total: number;
};

export type ContentApi = {
	listPages(params?: ContentListParams): Promise<ContentListResponse<ContentPageRecord>>;
	getPage(id: string): Promise<ContentPageRecord>;
	createPage(params: CreateContentPageRequest): Promise<ContentPageRecord>;
	updatePage(id: string, params: UpdateContentPageRequest): Promise<ContentPageRecord>;
	deletePage(id: string): Promise<void>;
	listAnnouncements(params?: ContentListParams): Promise<ContentListResponse<AnnouncementRecord>>;
	getAnnouncement(id: string): Promise<AnnouncementRecord>;
	createAnnouncement(params: CreateAnnouncementRequest): Promise<AnnouncementRecord>;
	updateAnnouncement(id: string, params: UpdateAnnouncementRequest): Promise<AnnouncementRecord>;
	deleteAnnouncement(id: string): Promise<void>;
};

export function createContentApi(transport: HttpTransport): ContentApi {
	return {
		listPages: (params) =>
			transport.get("/content/pages", params),
		getPage: (id) => transport.get(`/content/pages/${id}`),
		createPage: (params) => transport.post("/content/pages", params),
		updatePage: (id, params) => transport.put(`/content/pages/${id}`, params),
		deletePage: (id) => transport.delete(`/content/pages/${id}`),
		listAnnouncements: (params) =>
			transport.get("/content/announcements", params),
		getAnnouncement: (id) => transport.get(`/content/announcements/${id}`),
		createAnnouncement: (params) => transport.post("/content/announcements", params),
		updateAnnouncement: (id, params) => transport.put(`/content/announcements/${id}`, params),
		deleteAnnouncement: (id) => transport.delete(`/content/announcements/${id}`),
	};
}
