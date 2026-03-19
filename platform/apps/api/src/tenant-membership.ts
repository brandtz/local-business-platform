// E5-S4-T1: Tenant-user invitation, role update, and deactivation.
// Invitation flow, role management, and soft-disable for tenant memberships.
// Security: invitations and role changes are strictly tenant-scoped.
// Downstream: E5-S4-T3 admin UI, E5-S4-T4 audit events.

import type { TenantActorRole } from "@platform/types";

// ── Invitation ───────────────────────────────────────────────────────────────

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type TenantInvitation = {
	id: string;
	tenantId: string;
	email: string;
	role: TenantActorRole;
	status: InvitationStatus;
	invitedByUserId: string;
	tokenHash: string;
	createdAt: string;
	expiresAt: string;
	acceptedAt: string | null;
	revokedAt: string | null;
};

export type CreateInvitationPayload = {
	tenantId: string;
	email: string;
	role: TenantActorRole;
	invitedByUserId: string;
};

export type AcceptInvitationPayload = {
	token: string;
	userId: string;
};

// ── Role Management ──────────────────────────────────────────────────────────

export type RoleUpdatePayload = {
	tenantId: string;
	targetUserId: string;
	newRole: TenantActorRole;
	actorUserId: string;
};

export type RoleUpdateResult =
	| { status: "success"; previousRole: TenantActorRole; newRole: TenantActorRole }
	| { status: "error"; code: RoleUpdateErrorCode; message: string };

export type RoleUpdateErrorCode =
	| "not-found"
	| "same-role"
	| "last-owner"
	| "insufficient-permissions"
	| "self-demotion";

// ── Deactivation ─────────────────────────────────────────────────────────────

export type MembershipStatus = "active" | "deactivated";

export type DeactivationPayload = {
	tenantId: string;
	targetUserId: string;
	actorUserId: string;
};

export type DeactivationResult =
	| { status: "success"; membershipStatus: MembershipStatus }
	| { status: "error"; code: DeactivationErrorCode; message: string };

export type DeactivationErrorCode =
	| "not-found"
	| "already-deactivated"
	| "already-active"
	| "last-owner"
	| "self-deactivation";

// ── Tenant Member View ───────────────────────────────────────────────────────

export type TenantMemberView = {
	userId: string;
	email: string;
	displayName: string;
	role: TenantActorRole;
	membershipStatus: MembershipStatus;
	joinedAt: string;
};

// ── Validation ───────────────────────────────────────────────────────────────

export type InvitationValidationError = {
	field: string;
	code: "required" | "format" | "invalid-role" | "duplicate" | "self-invite";
	message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_INVITE_ROLES: readonly TenantActorRole[] = [
	"admin",
	"manager",
	"staff"
];

export function validateCreateInvitation(
	payload: CreateInvitationPayload
): InvitationValidationError[] {
	const errors: InvitationValidationError[] = [];

	if (!payload.email.trim()) {
		errors.push({
			field: "email",
			code: "required",
			message: "Email is required."
		});
	} else if (!EMAIL_PATTERN.test(payload.email)) {
		errors.push({
			field: "email",
			code: "format",
			message: "Email format is invalid."
		});
	}

	if (!payload.role) {
		errors.push({
			field: "role",
			code: "required",
			message: "Role is required."
		});
	} else if (
		!(VALID_INVITE_ROLES as readonly string[]).includes(payload.role)
	) {
		errors.push({
			field: "role",
			code: "invalid-role",
			message: "Cannot invite users with owner role."
		});
	}

	return errors;
}

// ── Role Hierarchy ───────────────────────────────────────────────────────────

const ROLE_RANK: Record<TenantActorRole, number> = {
	owner: 4,
	admin: 3,
	manager: 2,
	staff: 1
};

/**
 * Returns true if the actor's role outranks or equals the target role.
 * Owners can manage anyone. Admins can manage manager and staff.
 */
export function canManageRole(
	actorRole: TenantActorRole,
	targetCurrentRole: TenantActorRole
): boolean {
	return ROLE_RANK[actorRole] > ROLE_RANK[targetCurrentRole];
}

/**
 * Returns true if the actor can assign the new role.
 * Actors can only assign roles below their own rank.
 */
export function canAssignRole(
	actorRole: TenantActorRole,
	newRole: TenantActorRole
): boolean {
	return ROLE_RANK[actorRole] > ROLE_RANK[newRole];
}

// ── Role Update Logic ────────────────────────────────────────────────────────

export type MembershipSnapshot = {
	userId: string;
	role: TenantActorRole;
	isActive: boolean;
};

/**
 * Evaluates whether a role update is permitted.
 * Rules:
 * - Cannot change own role (self-demotion prevention)
 * - Cannot demote last owner
 * - Actor must outrank both current and new role
 * - New role must differ from current
 */
export function evaluateRoleUpdate(
	actor: MembershipSnapshot,
	target: MembershipSnapshot,
	newRole: TenantActorRole,
	ownerCount: number
): RoleUpdateResult {
	if (actor.userId === target.userId) {
		return {
			status: "error",
			code: "self-demotion",
			message: "Cannot change your own role."
		};
	}

	if (target.role === newRole) {
		return {
			status: "error",
			code: "same-role",
			message: "User already has this role."
		};
	}

	if (target.role === "owner" && ownerCount <= 1) {
		return {
			status: "error",
			code: "last-owner",
			message: "Cannot change the role of the last owner."
		};
	}

	if (!canManageRole(actor.role, target.role)) {
		return {
			status: "error",
			code: "insufficient-permissions",
			message: "You do not have permission to manage this user's role."
		};
	}

	if (!canAssignRole(actor.role, newRole)) {
		return {
			status: "error",
			code: "insufficient-permissions",
			message: "You cannot assign a role at or above your own level."
		};
	}

	return {
		status: "success",
		previousRole: target.role,
		newRole
	};
}

// ── Deactivation Logic ───────────────────────────────────────────────────────

/**
 * Evaluates whether deactivation or reactivation is permitted.
 */
export function evaluateDeactivation(
	actor: MembershipSnapshot,
	target: MembershipSnapshot,
	ownerCount: number,
	action: "deactivate" | "reactivate"
): DeactivationResult {
	if (actor.userId === target.userId) {
		return {
			status: "error",
			code: "self-deactivation",
			message: "Cannot deactivate yourself."
		};
	}

	if (action === "deactivate" && !target.isActive) {
		return {
			status: "error",
			code: "already-deactivated",
			message: "User is already deactivated."
		};
	}

	if (action === "reactivate" && target.isActive) {
		return {
			status: "error",
			code: "already-active",
			message: "User is already active."
		};
	}

	if (
		action === "deactivate" &&
		target.role === "owner" &&
		ownerCount <= 1
	) {
		return {
			status: "error",
			code: "last-owner",
			message: "Cannot deactivate the last owner."
		};
	}

	if (!canManageRole(actor.role, target.role)) {
		return {
			status: "error",
			code: "not-found",
			message: "You do not have permission to manage this user."
		};
	}

	return {
		status: "success",
		membershipStatus: action === "deactivate" ? "deactivated" : "active"
	};
}

// ── Invitation Status Logic ──────────────────────────────────────────────────

/**
 * Determines the effective status of an invitation based on current time.
 */
export function resolveInvitationStatus(
	invitation: Pick<TenantInvitation, "status" | "expiresAt">,
	now: Date
): InvitationStatus {
	if (invitation.status === "accepted" || invitation.status === "revoked") {
		return invitation.status;
	}

	if (new Date(invitation.expiresAt) < now) {
		return "expired";
	}

	return "pending";
}
