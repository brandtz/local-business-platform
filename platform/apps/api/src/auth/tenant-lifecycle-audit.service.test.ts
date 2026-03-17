import { describe, expect, it } from "vitest";

import { TenantLifecycleAuditService } from "./tenant-lifecycle-audit.service";

const service = new TenantLifecycleAuditService();

describe("tenant lifecycle audit service", () => {
	it("creates queryable transition records with actor and timestamp context", () => {
		const record = service.createTransitionRecord({
			actorType: "platform",
			fromStatus: "draft",
			now: new Date("2026-03-16T22:00:00.000Z"),
			platformRole: "admin",
			tenantId: "tenant-1",
			toStatus: "active",
			userId: "platform-user-1"
		});

		expect(record).toEqual({
			action: "tenant.lifecycle_transitioned",
			actorType: "platform",
			fromStatus: "draft",
			occurredAt: "2026-03-16T22:00:00.000Z",
			path: "lifecycle-transition",
			platformRole: "admin",
			reason: null,
			tenantId: "tenant-1",
			toStatus: "active",
			userId: "platform-user-1"
		});
	});

	it("creates queryable denial records with lifecycle path and machine-readable reason", () => {
		const record = service.createDeniedRecord({
			actorType: "tenant",
			now: new Date("2026-03-16T22:05:00.000Z"),
			path: "publish-control",
			reason: "tenant-inactive",
			status: "draft",
			tenantId: "tenant-2",
			userId: "tenant-user-1"
		});

		expect(record).toEqual({
			action: "tenant.lifecycle_denied",
			actorType: "tenant",
			fromStatus: "draft",
			occurredAt: "2026-03-16T22:05:00.000Z",
			path: "publish-control",
			platformRole: null,
			reason: "tenant-inactive",
			tenantId: "tenant-2",
			toStatus: null,
			userId: "tenant-user-1"
		});
	});
});