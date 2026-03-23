import type { HttpTransport } from "../http-transport";

export type DeploymentRecord = {
	id: string;
	version: string;
	status: "pending" | "in-progress" | "succeeded" | "failed" | "rolled-back";
	triggeredBy: string;
	triggeredAt: string;
	completedAt: string | null;
	environment: string;
	changelog: string | null;
};

export type DeploymentListParams = {
	page?: number;
	pageSize?: number;
	environment?: string;
	status?: string;
};

export type DeploymentListResponse = {
	data: DeploymentRecord[];
	total: number;
};

export type TriggerDeploymentParams = {
	version: string;
	environment: string;
	changelog?: string;
};

export type DeploymentsApi = {
	list(params?: DeploymentListParams): Promise<DeploymentListResponse>;
	get(id: string): Promise<DeploymentRecord>;
	trigger(params: TriggerDeploymentParams): Promise<DeploymentRecord>;
	rollback(id: string): Promise<DeploymentRecord>;
};

export function createDeploymentsApi(transport: HttpTransport): DeploymentsApi {
	return {
		list: (params) =>
			transport.get("/deployments", params),
		get: (id) => transport.get(`/deployments/${id}`),
		trigger: (params) => transport.post("/deployments", params),
		rollback: (id) => transport.post(`/deployments/${id}/rollback`),
	};
}
