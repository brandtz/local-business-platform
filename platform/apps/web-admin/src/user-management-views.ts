// E5-S4-T3: Admin UI views for users, staff, and invitations.
// Render-function-based view models for the Users section of the admin portal.
// Uses types from tenant-membership (E5-S4-T1) and staff-management (E5-S4-T2).

import type { TenantActorRole } from "@platform/types";
import type { TenantMemberView, InvitationStatus } from "./../../api/src/tenant-membership.js";
import type { StaffListItem } from "./../../api/src/staff-management.js";

// ── View States ──────────────────────────────────────────────────────────────

export type UserManagementTab = "members" | "invitations" | "staff";

export type UserManagementViewState = {
	activeTab: UserManagementTab;
	viewerRole: TenantActorRole;
	tenantId: string;
};

// ── Member List View ─────────────────────────────────────────────────────────

export type MemberListViewItem = {
	userId: string;
	displayName: string;
	email: string;
	role: TenantActorRole;
	isActive: boolean;
	joinedAt: string;
	/** Whether the current viewer can change this member's role. */
	canChangeRole: boolean;
	/** Whether the current viewer can deactivate this member. */
	canDeactivate: boolean;
};

export type RoleBadgeVariant = "owner" | "admin" | "manager" | "staff";

export function getRoleBadgeVariant(role: TenantActorRole): RoleBadgeVariant {
	return role;
}

export function getRoleBadgeLabel(role: TenantActorRole): string {
	const labels: Record<TenantActorRole, string> = {
		owner: "Owner",
		admin: "Admin",
		manager: "Manager",
		staff: "Staff"
	};
	return labels[role];
}

/**
 * Determines which role-change options a viewer can offer to a target member.
 * Returns the list of roles the viewer can assign (excludes target's current role).
 */
export function getAvailableRoleChanges(
	viewerRole: TenantActorRole,
	targetRole: TenantActorRole
): TenantActorRole[] {
	const ROLE_RANK: Record<TenantActorRole, number> = {
		owner: 4,
		admin: 3,
		manager: 2,
		staff: 1
	};

	const viewerRank = ROLE_RANK[viewerRole];
	const targetRank = ROLE_RANK[targetRole];

	// Cannot manage equal or higher rank
	if (targetRank >= viewerRank) return [];

	// Can assign any role below own rank, except owner (owner is transferred, not assigned)
	const assignable: TenantActorRole[] = [];
	const roles: TenantActorRole[] = ["admin", "manager", "staff"];
	for (const role of roles) {
		if (role !== targetRole && ROLE_RANK[role] < viewerRank) {
			assignable.push(role);
		}
	}
	return assignable;
}

// ── Invitation List View ─────────────────────────────────────────────────────

export type InvitationListViewItem = {
	invitationId: string;
	email: string;
	role: TenantActorRole;
	status: InvitationStatus;
	invitedBy: string;
	createdAt: string;
	expiresAt: string;
	/** Whether the current viewer can revoke this invitation. */
	canRevoke: boolean;
};

export type InvitationStatusIndicator = {
	label: string;
	variant: "info" | "success" | "warning" | "neutral";
};

export function getInvitationStatusIndicator(
	status: InvitationStatus
): InvitationStatusIndicator {
	switch (status) {
		case "pending":
			return { label: "Pending", variant: "info" };
		case "accepted":
			return { label: "Accepted", variant: "success" };
		case "expired":
			return { label: "Expired", variant: "warning" };
		case "revoked":
			return { label: "Revoked", variant: "neutral" };
	}
}

// ── Invitation Form ──────────────────────────────────────────────────────────

export type InvitationFormState = {
	email: string;
	role: TenantActorRole;
	errors: InvitationFormError[];
	isSubmitting: boolean;
};

export type InvitationFormError = {
	field: "email" | "role";
	message: string;
};

/**
 * Returns the roles a viewer can invite. Owner cannot be invited.
 */
export function getInvitableRoles(
	viewerRole: TenantActorRole
): TenantActorRole[] {
	const ROLE_RANK: Record<TenantActorRole, number> = {
		owner: 4,
		admin: 3,
		manager: 2,
		staff: 1
	};
	const viewerRank = ROLE_RANK[viewerRole];
	const roles: TenantActorRole[] = ["admin", "manager", "staff"];
	return roles.filter((r) => ROLE_RANK[r] < viewerRank);
}

export function createEmptyInvitationForm(): InvitationFormState {
	return {
		email: "",
		role: "staff",
		errors: [],
		isSubmitting: false
	};
}

export function validateInvitationForm(
	form: InvitationFormState,
	viewerRole: TenantActorRole
): InvitationFormError[] {
	const errors: InvitationFormError[] = [];
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!form.email.trim()) {
		errors.push({ field: "email", message: "Email is required." });
	} else if (!emailPattern.test(form.email)) {
		errors.push({ field: "email", message: "Enter a valid email address." });
	}

	const invitableRoles = getInvitableRoles(viewerRole);
	if (!invitableRoles.includes(form.role)) {
		errors.push({
			field: "role",
			message: "You cannot invite users to this role."
		});
	}

	return errors;
}

// ── Staff List View ──────────────────────────────────────────────────────────

export type StaffViewItem = StaffListItem & {
	/** Resolved location names for display */
	locationNames: string[];
};

export type StaffStatusBadge = {
	label: string;
	variant: "success" | "neutral";
};

export function getStaffStatusBadge(isActive: boolean): StaffStatusBadge {
	return isActive
		? { label: "Active", variant: "success" }
		: { label: "Inactive", variant: "neutral" };
}

export function getBookableBadge(
	isBookable: boolean
): { label: string; variant: "info" | "neutral" } | null {
	return isBookable ? { label: "Bookable", variant: "info" } : null;
}

// ── Permission-Based Control Visibility ──────────────────────────────────────

export type UserSectionPermissions = {
	canViewMembers: boolean;
	canViewInvitations: boolean;
	canViewStaff: boolean;
	canInviteUsers: boolean;
	canManageRoles: boolean;
	canDeactivateUsers: boolean;
	canManageStaff: boolean;
};

export function resolveUserSectionPermissions(
	viewerRole: TenantActorRole
): UserSectionPermissions {
	const isOwnerOrAdmin =
		viewerRole === "owner" || viewerRole === "admin";

	return {
		canViewMembers: isOwnerOrAdmin,
		canViewInvitations: isOwnerOrAdmin,
		canViewStaff: isOwnerOrAdmin || viewerRole === "manager",
		canInviteUsers: isOwnerOrAdmin,
		canManageRoles: isOwnerOrAdmin,
		canDeactivateUsers: isOwnerOrAdmin,
		canManageStaff: isOwnerOrAdmin
	};
}

/**
 * Resolves the available tabs based on viewer permissions.
 */
export function getAvailableTabs(
	permissions: UserSectionPermissions
): UserManagementTab[] {
	const tabs: UserManagementTab[] = [];
	if (permissions.canViewMembers) tabs.push("members");
	if (permissions.canViewInvitations) tabs.push("invitations");
	if (permissions.canViewStaff) tabs.push("staff");
	return tabs;
}

// ── Deactivation Confirmation ────────────────────────────────────────────────

export type DeactivationConfirmation = {
	userId: string;
	displayName: string;
	message: string;
};

export function buildDeactivationConfirmation(
	userId: string,
	displayName: string
): DeactivationConfirmation {
	return {
		userId,
		displayName,
		message: `Are you sure you want to deactivate ${displayName}? They will lose access to this tenant.`
	};
}

// ── Role Change Confirmation ─────────────────────────────────────────────────

export type RoleChangeConfirmation = {
	userId: string;
	displayName: string;
	currentRole: TenantActorRole;
	newRole: TenantActorRole;
	message: string;
};

export function buildRoleChangeConfirmation(
	userId: string,
	displayName: string,
	currentRole: TenantActorRole,
	newRole: TenantActorRole
): RoleChangeConfirmation {
	return {
		userId,
		displayName,
		currentRole,
		newRole,
		message: `Change ${displayName}'s role from ${getRoleBadgeLabel(currentRole)} to ${getRoleBadgeLabel(newRole)}?`
	};
}
