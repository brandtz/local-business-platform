import { describe, expect, it } from "vitest";

import { PlatformAccessDeniedError, PlatformAccessService } from "./platform-access.service";
import { PlatformTenantWidgetService } from "./platform-tenant-widget.service";

import type { PlatformTenantOperationalSummary } from "@platform/types";

const service = new PlatformTenantWidgetService(new PlatformAccessService());

function buildSummary(
	overrides: Partial<PlatformTenantOperationalSummary> = {}
): PlatformTenantOperationalSummary {
	return {
		customDomainCount: 0,
		healthReasons: [],
		healthStatus: "healthy",
		lastLifecycleAuditAt: null,
		lifecycleStatus: "active",
		liveRoutingStatus: "managed-subdomain-only",
		previewStatus: "configured",
		previewSubdomain: "alpha.preview.example.com",
		publishBlockedReason: null,
		publishStatus: "ready",
		tenantDisplayName: "Alpha Restaurant",
		tenantId: "tenant-1",
		tenantSlug: "alpha-restaurant",
		...overrides
	};
}

describe("platform tenant widget service", () => {
	it("denies non-platform actors", () => {
		expect(() =>
			service.createWidgets(
				{ actorType: "tenant", platformRole: null, userId: "user-1" },
				[]
			)
		).toThrow(PlatformAccessDeniedError);
	});

	it("returns empty widget set for no tenants", () => {
		const widgets = service.createWidgets(
			{ actorType: "platform", platformRole: "support", userId: "user-1" },
			[]
		);

		expect(widgets).toEqual({
			auditSummary: {
				lastAuditAt: null,
				totalDenied: 0,
				totalTransitions: 0
			},
			jobStatus: {
				failedCount: 0,
				pendingCount: 0,
				status: "idle"
			},
			publishSummary: {
				blockedCount: 0,
				commonBlockReasons: [],
				readyCount: 0
			}
		});
	});

	it("computes audit summary from tenant summaries", () => {
		const widgets = service.createWidgets(
			{ actorType: "platform", platformRole: "admin", userId: "user-1" },
			[
				buildSummary({ lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z" }),
				buildSummary({
					tenantId: "tenant-2",
					lastLifecycleAuditAt: "2026-03-17T06:00:00.000Z"
				}),
				buildSummary({ tenantId: "tenant-3" })
			]
		);

		expect(widgets.auditSummary).toEqual({
			lastAuditAt: "2026-03-17T06:00:00.000Z",
			totalDenied: 0,
			totalTransitions: 2
		});
	});

	it("computes publish summary with block reasons", () => {
		const widgets = service.createWidgets(
			{ actorType: "platform", platformRole: "support", userId: "user-1" },
			[
				buildSummary({ publishStatus: "ready" }),
				buildSummary({
					tenantId: "tenant-2",
					publishBlockedReason: "tenant-inactive",
					publishStatus: "blocked"
				}),
				buildSummary({
					tenantId: "tenant-3",
					publishBlockedReason: "tenant-inactive",
					publishStatus: "blocked"
				}),
				buildSummary({
					tenantId: "tenant-4",
					publishBlockedReason: "tenant-suspended",
					publishStatus: "blocked"
				})
			]
		);

		expect(widgets.publishSummary).toEqual({
			blockedCount: 3,
			commonBlockReasons: ["tenant-inactive", "tenant-suspended"],
			readyCount: 1
		});
	});

	it("sets job status to attention-required when any tenant has health attention", () => {
		const widgets = service.createWidgets(
			{ actorType: "platform", platformRole: "owner", userId: "user-1" },
			[
				buildSummary({ healthStatus: "healthy" }),
				buildSummary({
					tenantId: "tenant-2",
					healthStatus: "attention-required",
					healthReasons: ["preview-route-missing"]
				})
			]
		);

		expect(widgets.jobStatus.status).toBe("attention-required");
	});

	it("sets job status to idle when all tenants are healthy", () => {
		const widgets = service.createWidgets(
			{ actorType: "platform", platformRole: "owner", userId: "user-1" },
			[
				buildSummary({ healthStatus: "healthy" }),
				buildSummary({ tenantId: "tenant-2", healthStatus: "healthy" })
			]
		);

		expect(widgets.jobStatus.status).toBe("idle");
	});
});
