// E5-S4-T4: Audit event emission for membership and staff mutations.
// Event types: invitation lifecycle, role changes, membership activation,
// staff CRUD — each capturing actor, tenant, target, and old/new values.

import type { TenantActorRole } from "@platform/types";

// ── Membership Event Kinds ───────────────────────────────────────────────────

export const membershipAuditEventKinds = [
	"invitation_created",
	"invitation_accepted",
	"invitation_revoked",
	"invitation_expired",
	"role_changed",
	"user_deactivated",
	"user_reactivated"
] as const;

export type MembershipAuditEventKind =
	(typeof membershipAuditEventKinds)[number];

// ── Staff Event Kinds ────────────────────────────────────────────────────────

export const staffAuditEventKinds = [
	"staff_created",
	"staff_updated",
	"staff_deleted"
] as const;

export type StaffAuditEventKind = (typeof staffAuditEventKinds)[number];

// ── Combined Type ────────────────────────────────────────────────────────────

export type TeamAuditEventKind =
	| MembershipAuditEventKind
	| StaffAuditEventKind;

export const allTeamAuditEventKinds: readonly TeamAuditEventKind[] = [
	...membershipAuditEventKinds,
	...staffAuditEventKinds
];

// ── Audit Event Base ─────────────────────────────────────────────────────────

export type AuditEventBase = {
	id: string;
	tenantId: string;
	actorId: string;
	actorRole: TenantActorRole;
	timestamp: string;
	ipAddress: string;
};

// ── Membership Audit Events ──────────────────────────────────────────────────

export type InvitationCreatedEvent = AuditEventBase & {
	kind: "invitation_created";
	targetEmail: string;
	invitedRole: TenantActorRole;
	invitationId: string;
};

export type InvitationAcceptedEvent = AuditEventBase & {
	kind: "invitation_accepted";
	invitationId: string;
	targetUserId: string;
	assignedRole: TenantActorRole;
};

export type InvitationRevokedEvent = AuditEventBase & {
	kind: "invitation_revoked";
	invitationId: string;
	targetEmail: string;
};

export type InvitationExpiredEvent = AuditEventBase & {
	kind: "invitation_expired";
	invitationId: string;
	targetEmail: string;
};

export type RoleChangedEvent = AuditEventBase & {
	kind: "role_changed";
	targetUserId: string;
	previousRole: TenantActorRole;
	newRole: TenantActorRole;
};

export type UserDeactivatedEvent = AuditEventBase & {
	kind: "user_deactivated";
	targetUserId: string;
	previousRole: TenantActorRole;
};

export type UserReactivatedEvent = AuditEventBase & {
	kind: "user_reactivated";
	targetUserId: string;
	restoredRole: TenantActorRole;
};

export type MembershipAuditEvent =
	| InvitationCreatedEvent
	| InvitationAcceptedEvent
	| InvitationRevokedEvent
	| InvitationExpiredEvent
	| RoleChangedEvent
	| UserDeactivatedEvent
	| UserReactivatedEvent;

// ── Staff Audit Events ───────────────────────────────────────────────────────

export type StaffCreatedEvent = AuditEventBase & {
	kind: "staff_created";
	staffId: string;
	displayName: string;
	locationIds: string[];
};

export type StaffUpdatedEvent = AuditEventBase & {
	kind: "staff_updated";
	staffId: string;
	changes: StaffFieldChange[];
};

export type StaffFieldChange = {
	field: string;
	oldValue: string;
	newValue: string;
};

export type StaffDeletedEvent = AuditEventBase & {
	kind: "staff_deleted";
	staffId: string;
	displayName: string;
};

export type StaffAuditEvent =
	| StaffCreatedEvent
	| StaffUpdatedEvent
	| StaffDeletedEvent;

// ── Union ────────────────────────────────────────────────────────────────────

export type TeamAuditEvent = MembershipAuditEvent | StaffAuditEvent;

// ── Event Builders ───────────────────────────────────────────────────────────

type AuditContext = {
	tenantId: string;
	actorId: string;
	actorRole: TenantActorRole;
	ipAddress: string;
};

let _idCounter = 0;

function generateEventId(): string {
	_idCounter += 1;
	return `evt-${Date.now()}-${_idCounter}`;
}

/** Reset the counter (for testing). */
export function _resetIdCounter(): void {
	_idCounter = 0;
}

function makeBase(ctx: AuditContext): AuditEventBase {
	return {
		id: generateEventId(),
		tenantId: ctx.tenantId,
		actorId: ctx.actorId,
		actorRole: ctx.actorRole,
		timestamp: new Date().toISOString(),
		ipAddress: ctx.ipAddress
	};
}

export function buildInvitationCreatedEvent(
	ctx: AuditContext,
	invitationId: string,
	targetEmail: string,
	invitedRole: TenantActorRole
): InvitationCreatedEvent {
	return {
		...makeBase(ctx),
		kind: "invitation_created",
		targetEmail,
		invitedRole,
		invitationId
	};
}

export function buildInvitationAcceptedEvent(
	ctx: AuditContext,
	invitationId: string,
	targetUserId: string,
	assignedRole: TenantActorRole
): InvitationAcceptedEvent {
	return {
		...makeBase(ctx),
		kind: "invitation_accepted",
		invitationId,
		targetUserId,
		assignedRole
	};
}

export function buildInvitationRevokedEvent(
	ctx: AuditContext,
	invitationId: string,
	targetEmail: string
): InvitationRevokedEvent {
	return {
		...makeBase(ctx),
		kind: "invitation_revoked",
		invitationId,
		targetEmail
	};
}

export function buildRoleChangedEvent(
	ctx: AuditContext,
	targetUserId: string,
	previousRole: TenantActorRole,
	newRole: TenantActorRole
): RoleChangedEvent {
	return {
		...makeBase(ctx),
		kind: "role_changed",
		targetUserId,
		previousRole,
		newRole
	};
}

export function buildUserDeactivatedEvent(
	ctx: AuditContext,
	targetUserId: string,
	previousRole: TenantActorRole
): UserDeactivatedEvent {
	return {
		...makeBase(ctx),
		kind: "user_deactivated",
		targetUserId,
		previousRole
	};
}

export function buildUserReactivatedEvent(
	ctx: AuditContext,
	targetUserId: string,
	restoredRole: TenantActorRole
): UserReactivatedEvent {
	return {
		...makeBase(ctx),
		kind: "user_reactivated",
		targetUserId,
		restoredRole
	};
}

export function buildStaffCreatedEvent(
	ctx: AuditContext,
	staffId: string,
	displayName: string,
	locationIds: string[]
): StaffCreatedEvent {
	return {
		...makeBase(ctx),
		kind: "staff_created",
		staffId,
		displayName,
		locationIds: [...locationIds]
	};
}

export function buildStaffUpdatedEvent(
	ctx: AuditContext,
	staffId: string,
	changes: StaffFieldChange[]
): StaffUpdatedEvent {
	return {
		...makeBase(ctx),
		kind: "staff_updated",
		staffId,
		changes: [...changes]
	};
}

export function buildStaffDeletedEvent(
	ctx: AuditContext,
	staffId: string,
	displayName: string
): StaffDeletedEvent {
	return {
		...makeBase(ctx),
		kind: "staff_deleted",
		staffId,
		displayName
	};
}

// ── Diff Helper ──────────────────────────────────────────────────────────────

/**
 * Computes field-level changes between two record shapes.
 * Values are stringified for audit storage.
 */
export function computeStaffChanges(
	before: Record<string, unknown>,
	after: Record<string, unknown>,
	fields: string[]
): StaffFieldChange[] {
	const changes: StaffFieldChange[] = [];
	for (const field of fields) {
		const oldVal = JSON.stringify(before[field] ?? null);
		const newVal = JSON.stringify(after[field] ?? null);
		if (oldVal !== newVal) {
			changes.push({ field, oldValue: oldVal, newValue: newVal });
		}
	}
	return changes;
}

// ── Event Description (for UI rendering) ─────────────────────────────────────

export function describeTeamAuditEvent(event: TeamAuditEvent): string {
	switch (event.kind) {
		case "invitation_created":
			return `Invited ${event.targetEmail} as ${event.invitedRole}`;
		case "invitation_accepted":
			return `Invitation accepted by user ${event.targetUserId}`;
		case "invitation_revoked":
			return `Revoked invitation for ${event.targetEmail}`;
		case "invitation_expired":
			return `Invitation for ${event.targetEmail} expired`;
		case "role_changed":
			return `Changed role from ${event.previousRole} to ${event.newRole} for user ${event.targetUserId}`;
		case "user_deactivated":
			return `Deactivated user ${event.targetUserId}`;
		case "user_reactivated":
			return `Reactivated user ${event.targetUserId}`;
		case "staff_created":
			return `Created staff member ${event.displayName}`;
		case "staff_updated":
			return `Updated staff member ${event.staffId} (${event.changes.length} field(s))`;
		case "staff_deleted":
			return `Deleted staff member ${event.displayName}`;
	}
}
