import { Controller, Post, Body, HttpException, HttpStatus } from "@nestjs/common";

import { AnalyticsService } from "./analytics.service";
import { validateAnalyticsQueryParams, validateTopPerformersParams, AnalyticsApiContractError } from "./analytics-api-contracts";

const DEV_TENANT_ID = "pilot-superior-exteriors";

@Controller("analytics")
export class AnalyticsController {
	private readonly analyticsService = new AnalyticsService();

	@Post("dashboard")
	getDashboard(@Body() body: Record<string, string>) {
		try {
			if (body && body.from && body.to) {
				const params = validateAnalyticsQueryParams(body);
				return this.analyticsService.getDashboardWidgetData({ tenantId: DEV_TENANT_ID, ...params });
			}
			return this.analyticsService.getDashboardWidgetData({ tenantId: DEV_TENANT_ID, from: "", to: "", locationId: null, periodType: "daily" });
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post("revenue")
	getRevenue(@Body() body: Record<string, string>) {
		try {
			const params = validateAnalyticsQueryParams(body);
			return this.analyticsService.getRevenueTimeSeries({ tenantId: DEV_TENANT_ID, ...params }, params.periodType);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post("sales-breakdown")
	getSalesBreakdown(@Body() body: Record<string, string>) {
		try {
			const params = validateAnalyticsQueryParams(body);
			return this.analyticsService.getChannelBreakdown({ tenantId: DEV_TENANT_ID, ...params });
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post("top-performers")
	getTopPerformers(@Body() body: Record<string, string>) {
		try {
			const params = validateTopPerformersParams(body);
			return this.analyticsService.getTopPerformers({ tenantId: DEV_TENANT_ID, ...params }, params.category, params.limit);
		} catch (err) {
			throw mapError(err);
		}
	}

	@Post("kpis")
	getKpis(@Body() body: Record<string, string>) {
		try {
			if (body && body.from && body.to) {
				const params = validateAnalyticsQueryParams(body);
				return this.analyticsService.getKpiSummary({ tenantId: DEV_TENANT_ID, ...params });
			}
			return this.analyticsService.getKpiSummary({ tenantId: DEV_TENANT_ID, from: "", to: "", locationId: null, periodType: "daily" });
		} catch (err) {
			throw mapError(err);
		}
	}
}

function mapError(err: unknown): HttpException {
	if (err instanceof AnalyticsApiContractError) {
		return new HttpException(err.message, HttpStatus.BAD_REQUEST);
	}
	if (err instanceof HttpException) return err;
	return new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
}
