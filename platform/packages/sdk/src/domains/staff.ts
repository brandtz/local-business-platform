import type {
	StaffProfileRecord,
	StaffListFilter,
	StaffScheduleWindowRecord,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type StaffListResponse = {
	data: StaffProfileRecord[];
	total: number;
};

export type StaffInviteParams = {
	email: string;
	name: string;
	role: string;
};

export type StaffApi = {
	list(params?: StaffListFilter): Promise<StaffListResponse>;
	get(id: string): Promise<StaffProfileRecord>;
	invite(params: StaffInviteParams): Promise<StaffProfileRecord>;
	update(id: string, params: Partial<StaffProfileRecord>): Promise<StaffProfileRecord>;
	deactivate(id: string): Promise<StaffProfileRecord>;
	getSchedule(id: string): Promise<StaffScheduleWindowRecord[]>;
};

export function createStaffApi(transport: HttpTransport): StaffApi {
	return {
		list: (params) =>
			transport.get("/staff", params),
		get: (id) => transport.get(`/staff/${id}`),
		invite: (params) => transport.post("/staff/invite", params),
		update: (id, params) => transport.put(`/staff/${id}`, params),
		deactivate: (id) => transport.post(`/staff/${id}/deactivate`),
		getSchedule: (id) => transport.get(`/staff/${id}/schedule`),
	};
}
