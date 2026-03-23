import type {
	AnalyticsQueryParams,
	AnalyticsKpiSummary,
	RevenueTimeSeriesResponse,
	ChannelBreakdownResponse,
	TopPerformersResponse,
	DashboardAnalyticsWidgetData,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type AnalyticsApi = {
	dashboard(params?: AnalyticsQueryParams): Promise<DashboardAnalyticsWidgetData>;
	revenue(params: AnalyticsQueryParams): Promise<RevenueTimeSeriesResponse>;
	salesBreakdown(params: AnalyticsQueryParams): Promise<ChannelBreakdownResponse>;
	topPerformers(params: AnalyticsQueryParams): Promise<TopPerformersResponse>;
	kpis(params?: AnalyticsQueryParams): Promise<AnalyticsKpiSummary>;
};

export function createAnalyticsApi(transport: HttpTransport): AnalyticsApi {
	return {
		dashboard: (params) =>
			transport.post("/analytics/dashboard", params),
		revenue: (params) =>
			transport.post("/analytics/revenue", params),
		salesBreakdown: (params) =>
			transport.post("/analytics/sales-breakdown", params),
		topPerformers: (params) =>
			transport.post("/analytics/top-performers", params),
		kpis: (params) =>
			transport.post("/analytics/kpis", params),
	};
}
