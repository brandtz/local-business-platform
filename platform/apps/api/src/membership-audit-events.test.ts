import { describe, it, expect, beforeEach } from "vitest";
import {
	buildInvitationCreatedEvent,
	buildInvitationAcceptedEvent,
	buildInvitationRevokedEvent,
	buildRoleChangedEvent,
	buildUserDeactivatedEvent,
	buildUserReactivatedEvent,
	buildStaffCreatedEvent,
	buildStaffUpdatedEvent,
	buildStaffDeletedEvent,
	computeStaffChanges,
	describeTeamAuditEvent,
	allTeamAuditEventKinds,
	_resetIdCounter,
	type TeamAuditEvent
} from "./membership-audit-events.js";

const ctx = {
	tenantId: "tenant-1",
	actorId: "user-1",
	actorRole: "admin" as const,
	ipAddress: "10.0.0.1"
};

beforeEach(() => {
	_resetIdCounter();
});

// ── Event Kind Registry ──────────────────────────────────────────────────────

describe("allTeamAuditEventKinds", () => {
	it("contains all 10 event kinds", () => {
		expect(allTeamAuditEventKinds).toHaveLength(10);
	});

	it("includes membership event kinds", () => {
		expect(allTeamAuditEventKinds).toContain("invitation_created");
		expect(allTeamAuditEventKinds).toContain("role_changed");
		expect(allTeamAuditEventKinds).toContain("user_deactivated");
	});

	it("includes staff event kinds", () => {
		expect(allTeamAuditEventKinds).toContain("staff_created");
		expect(allTeamAuditEventKinds).toContain("staff_updated");
		expect(allTeamAuditEventKinds).toContain("staff_deleted");
	});
});

// ── Invitation Events ────────────────────────────────────────────────────────

describe("buildInvitationCreatedEvent", () => {
	it("creates event with correct fields", () => {
		const event = buildInvitationCreatedEvent(
			ctx,
			"inv-1",
			"alice@test.com",
			"staff"
		);
		expect(event.kind).toBe("invitation_created");
		expect(event.tenantId).toBe("tenant-1");
		expect(event.actorId).toBe("user-1");
		expect(event.targetEmail).toBe("alice@test.com");
		expect(event.invitedRole).toBe("staff");
		expect(event.invitationId).toBe("inv-1");
		expect(event.id).toMatch(/^evt-/);
		expect(event.timestamp).toBeTruthy();
	});
});

describe("buildInvitationAcceptedEvent", () => {
	it("captures target user and role", () => {
		const event = buildInvitationAcceptedEvent(
			ctx,
			"inv-1",
			"user-2",
			"manager"
		);
		expect(event.kind).toBe("invitation_accepted");
		expect(event.targetUserId).toBe("user-2");
		expect(event.assignedRole).toBe("manager");
	});
});

describe("buildInvitationRevokedEvent", () => {
	it("captures invitation and email", () => {
		const event = buildInvitationRevokedEvent(ctx, "inv-1", "bob@test.com");
		expect(event.kind).toBe("invitation_revoked");
		expect(event.targetEmail).toBe("bob@test.com");
	});
});

// ── Role Change Events ───────────────────────────────────────────────────────

describe("buildRoleChangedEvent", () => {
	it("records previous and new roles", () => {
		const event = buildRoleChangedEvent(ctx, "user-3", "staff", "manager");
		expect(event.kind).toBe("role_changed");
		expect(event.previousRole).toBe("staff");
		expect(event.newRole).toBe("manager");
		expect(event.targetUserId).toBe("user-3");
	});
});

// ── Activation Events ────────────────────────────────────────────────────────

describe("buildUserDeactivatedEvent", () => {
	it("records target and previous role", () => {
		const event = buildUserDeactivatedEvent(ctx, "user-4", "staff");
		expect(event.kind).toBe("user_deactivated");
		expect(event.targetUserId).toBe("user-4");
		expect(event.previousRole).toBe("staff");
	});
});

describe("buildUserReactivatedEvent", () => {
	it("records target and restored role", () => {
		const event = buildUserReactivatedEvent(ctx, "user-4", "staff");
		expect(event.kind).toBe("user_reactivated");
		expect(event.restoredRole).toBe("staff");
	});
});

// ── Staff Events ─────────────────────────────────────────────────────────────

describe("buildStaffCreatedEvent", () => {
	it("captures staff details", () => {
		const event = buildStaffCreatedEvent(ctx, "s1", "Alice", ["loc-1"]);
		expect(event.kind).toBe("staff_created");
		expect(event.staffId).toBe("s1");
		expect(event.displayName).toBe("Alice");
		expect(event.locationIds).toEqual(["loc-1"]);
	});

	it("does not alias locationIds", () => {
		const locs = ["loc-1"];
		const event = buildStaffCreatedEvent(ctx, "s1", "A", locs);
		locs.push("loc-2");
		expect(event.locationIds).toEqual(["loc-1"]);
	});
});

describe("buildStaffUpdatedEvent", () => {
	it("captures changes list", () => {
		const changes = [
			{ field: "displayName", oldValue: "A", newValue: "B" }
		];
		const event = buildStaffUpdatedEvent(ctx, "s1", changes);
		expect(event.kind).toBe("staff_updated");
		expect(event.changes).toHaveLength(1);
		expect(event.changes[0]!.field).toBe("displayName");
	});
});

describe("buildStaffDeletedEvent", () => {
	it("records deleted staff info", () => {
		const event = buildStaffDeletedEvent(ctx, "s1", "Alice");
		expect(event.kind).toBe("staff_deleted");
		expect(event.displayName).toBe("Alice");
	});
});

// ── Diff Helper ──────────────────────────────────────────────────────────────

describe("computeStaffChanges", () => {
	it("detects changed fields", () => {
		const before = { displayName: "Old", phone: "111" };
		const after = { displayName: "New", phone: "111" };
		const changes = computeStaffChanges(before, after, [
			"displayName",
			"phone"
		]);
		expect(changes).toHaveLength(1);
		expect(changes[0]!.field).toBe("displayName");
	});

	it("returns empty when nothing changed", () => {
		const obj = { a: "1", b: "2" };
		expect(computeStaffChanges(obj, obj, ["a", "b"])).toEqual([]);
	});

	it("handles array fields via JSON comparison", () => {
		const before = { locs: ["a"] };
		const after = { locs: ["a", "b"] };
		const changes = computeStaffChanges(before, after, ["locs"]);
		expect(changes).toHaveLength(1);
	});

	it("handles missing fields", () => {
		const changes = computeStaffChanges({}, { x: "val" }, ["x"]);
		expect(changes).toHaveLength(1);
		expect(changes[0]!.oldValue).toBe("null");
	});
});

// ── Description ──────────────────────────────────────────────────────────────

describe("describeTeamAuditEvent", () => {
	it("describes invitation_created", () => {
		const event = buildInvitationCreatedEvent(
			ctx,
			"inv-1",
			"a@b.com",
			"staff"
		);
		expect(describeTeamAuditEvent(event)).toContain("a@b.com");
		expect(describeTeamAuditEvent(event)).toContain("staff");
	});

	it("describes role_changed", () => {
		const event = buildRoleChangedEvent(ctx, "u1", "staff", "admin");
		const desc = describeTeamAuditEvent(event);
		expect(desc).toContain("staff");
		expect(desc).toContain("admin");
	});

	it("describes staff_updated with change count", () => {
		const event = buildStaffUpdatedEvent(ctx, "s1", [
			{ field: "a", oldValue: "1", newValue: "2" },
			{ field: "b", oldValue: "3", newValue: "4" }
		]);
		expect(describeTeamAuditEvent(event)).toContain("2 field(s)");
	});

	it("describes all event kinds without throwing", () => {
		const events: TeamAuditEvent[] = [
			buildInvitationCreatedEvent(ctx, "i1", "a@b.com", "staff"),
			buildInvitationAcceptedEvent(ctx, "i1", "u2", "staff"),
			buildInvitationRevokedEvent(ctx, "i1", "a@b.com"),
			{
				...buildInvitationRevokedEvent(ctx, "i1", "a@b.com"),
				kind: "invitation_expired" as const
			},
			buildRoleChangedEvent(ctx, "u1", "staff", "admin"),
			buildUserDeactivatedEvent(ctx, "u1", "staff"),
			buildUserReactivatedEvent(ctx, "u1", "staff"),
			buildStaffCreatedEvent(ctx, "s1", "A", []),
			buildStaffUpdatedEvent(ctx, "s1", []),
			buildStaffDeletedEvent(ctx, "s1", "A")
		];
		for (const event of events) {
			expect(() => describeTeamAuditEvent(event)).not.toThrow();
			expect(describeTeamAuditEvent(event)).toBeTruthy();
		}
	});
});

// ── Unique IDs ───────────────────────────────────────────────────────────────

describe("event ID generation", () => {
	it("generates unique IDs across events", () => {
		const e1 = buildStaffCreatedEvent(ctx, "s1", "A", []);
		const e2 = buildStaffDeletedEvent(ctx, "s2", "B");
		expect(e1.id).not.toBe(e2.id);
	});
});
