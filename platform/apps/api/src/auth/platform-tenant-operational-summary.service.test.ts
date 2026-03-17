import { describe, expect, it } from "vitest";

import {
	PlatformAccessDeniedError,
	PlatformAccessService
} from "./platform-access.service";
import { PlatformTenantOperationalSummaryService } from "./platform-tenant-operational-summary.service";
import { TenantPublishPolicyService } from "./tenant-publish-policy.service";

const service = new PlatformTenantOperationalSummaryService(
	new PlatformAccessService(),
	new TenantPublishPolicyService()
);

describe("platform tenant operational summary service", () => {
	it("creates cross-tenant operational summaries for authorized platform viewers", () => {
		expect(
			service.createSummaries(
				{
					actorType: "platform",
					platformRole: "support",
					userId: "platform-user-1"
				},
				[
					{
						customDomains: ["alpha.example.com"],
						displayName: "Alpha Fitness",
						id: "tenant-1",
						lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
						previewSubdomain: "alpha",
						slug: "alpha-fitness",
						status: "active"
					},
					{
						displayName: "Bravo Cafe",
						id: "tenant-2",
						previewSubdomain: "bravo",
						slug: "bravo-cafe",
						status: "draft"
					}
				]
			)
		).toEqual([
			{
				customDomainCount: 1,
				healthReasons: [],
				healthStatus: "healthy",
				lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
				lifecycleStatus: "active",
				liveRoutingStatus: "custom-domain-configured",
				previewStatus: "configured",
				previewSubdomain: "alpha",
				publishBlockedReason: null,
				publishStatus: "ready",
				tenantDisplayName: "Alpha Fitness",
				tenantId: "tenant-1",
				tenantSlug: "alpha-fitness"
			},
			{
				customDomainCount: 0,
				healthReasons: ["tenant-inactive"],
				healthStatus: "attention-required",
				lastLifecycleAuditAt: null,
				lifecycleStatus: "draft",
				liveRoutingStatus: "managed-subdomain-only",
				previewStatus: "configured",
				previewSubdomain: "bravo",
				publishBlockedReason: "tenant-inactive",
				publishStatus: "blocked",
				tenantDisplayName: "Bravo Cafe",
				tenantId: "tenant-2",
				tenantSlug: "bravo-cafe"
			}
		]);
	});

	it("flags missing preview routes as operator attention items", () => {
		expect(
			service.createSummaries(
				{
					actorType: "platform",
					platformRole: "analyst",
					userId: "platform-user-2"
				},
				[
					{
						displayName: "Charlie Spa",
						id: "tenant-3",
						previewSubdomain: null,
						slug: "charlie-spa",
						status: "active"
					}
				]
			)
		).toEqual([
			{
				customDomainCount: 0,
				healthReasons: ["preview-route-missing"],
				healthStatus: "attention-required",
				lastLifecycleAuditAt: null,
				lifecycleStatus: "active",
				liveRoutingStatus: "managed-subdomain-only",
				previewStatus: "missing",
				previewSubdomain: null,
				publishBlockedReason: null,
				publishStatus: "ready",
				tenantDisplayName: "Charlie Spa",
				tenantId: "tenant-3",
				tenantSlug: "charlie-spa"
			}
		]);
	});

	it("rejects non-platform or unauthorized viewers", () => {
		expect(() =>
			service.createSummaries(
				{
					actorType: "tenant",
					platformRole: null,
					userId: "tenant-user-1"
				},
				[]
			)
		).toThrow(PlatformAccessDeniedError);
	});
});