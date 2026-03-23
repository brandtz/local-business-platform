import type { SecurityEventRecord } from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type AuditListParams = {
	page?: number;
	pageSize?: number;
	actorId?: string;
	action?: string;
	startDate?: string;
	endDate?: string;
};

export type AuditListResponse = {
	data: SecurityEventRecord[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
};

export type AuditApi = {
	list(params?: AuditListParams): Promise<AuditListResponse>;
	get(id: string): Promise<SecurityEventRecord>;
};

export function createAuditApi(transport: HttpTransport): AuditApi {
	return {
		list: (params) =>
			transport.get("/audit", params),
		get: (id) => transport.get(`/audit/${id}`),
	};
}
