import type { HttpTransport } from "../http-transport";

export type HealthStatus = {
	status: "healthy" | "degraded" | "down";
	version: string;
	uptime: number;
	checks: Record<string, { status: string; message?: string }>;
};

export type JobStatus = {
	id: string;
	name: string;
	status: "running" | "idle" | "failed";
	lastRunAt: string | null;
	nextRunAt: string | null;
};

export type HealthApi = {
	status(): Promise<HealthStatus>;
	jobs(): Promise<JobStatus[]>;
};

export function createHealthApi(transport: HttpTransport): HealthApi {
	return {
		status: () => transport.get("/health"),
		jobs: () => transport.get("/health/jobs"),
	};
}
