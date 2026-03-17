import { describe, expect, it } from "vitest";

import { attachImpersonationToRequestViewerContext } from "@platform/types";

import { AuditAttributionService } from "./audit-attribution.service";

const service = new AuditAttributionService();

describe("audit attribution service", () => {
	it("preserves original platform operator attribution during impersonated actions", () => {
		const record = service.createRecord(
			"catalog.item_updated",
			{
				memberships: [],
				routeSpace: "tenant-admin",
				tenantResolution: {
					kind: "tenant",
					normalizedHost: "admin.local",
					source: "tenant-admin-context",
					tenant: {
						displayName: "Alpha Fitness",
						id: "tenant-1",
						previewSubdomain: "alpha",
						slug: "alpha-fitness",
						status: "active"
					}
				},
				viewer: attachImpersonationToRequestViewerContext(
					{
						actorType: "tenant",
						isAuthenticated: true,
						platformRole: null,
						sessionScope: "tenant",
						userId: "tenant-user-1"
					},
					{
						expiresAt: "2026-03-16T21:30:00.000Z",
						impersonatorUserId: "platform-user-1",
						platformRole: "support",
						sessionId: "impersonation-1",
						startedAt: "2026-03-16T21:00:00.000Z",
						targetTenantId: "tenant-1",
						targetTenantName: "Alpha Fitness"
					}
				)
			},
			new Date("2026-03-16T21:05:00.000Z")
		);

		expect(record).toEqual({
			action: "catalog.item_updated",
			effectiveActorType: "tenant",
			effectiveUserId: "tenant-user-1",
			impersonationSessionId: "impersonation-1",
			originalActorType: "platform",
			originalUserId: "platform-user-1",
			occurredAt: "2026-03-16T21:05:00.000Z",
			tenantId: "tenant-1"
		});
	});
});