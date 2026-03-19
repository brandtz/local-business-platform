import type { TenantActorRole } from "@platform/types";
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
export type RoleUpdatePayload = {
    tenantId: string;
    targetUserId: string;
    newRole: TenantActorRole;
    actorUserId: string;
};
export type RoleUpdateResult = {
    status: "success";
    previousRole: TenantActorRole;
    newRole: TenantActorRole;
} | {
    status: "error";
    code: RoleUpdateErrorCode;
    message: string;
};
export type RoleUpdateErrorCode = "not-found" | "same-role" | "last-owner" | "insufficient-permissions" | "self-demotion";
export type MembershipStatus = "active" | "deactivated";
export type DeactivationPayload = {
    tenantId: string;
    targetUserId: string;
    actorUserId: string;
};
export type DeactivationResult = {
    status: "success";
    membershipStatus: MembershipStatus;
} | {
    status: "error";
    code: DeactivationErrorCode;
    message: string;
};
export type DeactivationErrorCode = "not-found" | "already-deactivated" | "already-active" | "last-owner" | "self-deactivation";
export type TenantMemberView = {
    userId: string;
    email: string;
    displayName: string;
    role: TenantActorRole;
    membershipStatus: MembershipStatus;
    joinedAt: string;
};
export type InvitationValidationError = {
    field: string;
    code: "required" | "format" | "invalid-role" | "duplicate" | "self-invite";
    message: string;
};
export declare function validateCreateInvitation(payload: CreateInvitationPayload): InvitationValidationError[];
/**
 * Returns true if the actor's role outranks or equals the target role.
 * Owners can manage anyone. Admins can manage manager and staff.
 */
export declare function canManageRole(actorRole: TenantActorRole, targetCurrentRole: TenantActorRole): boolean;
/**
 * Returns true if the actor can assign the new role.
 * Actors can only assign roles below their own rank.
 */
export declare function canAssignRole(actorRole: TenantActorRole, newRole: TenantActorRole): boolean;
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
export declare function evaluateRoleUpdate(actor: MembershipSnapshot, target: MembershipSnapshot, newRole: TenantActorRole, ownerCount: number): RoleUpdateResult;
/**
 * Evaluates whether deactivation or reactivation is permitted.
 */
export declare function evaluateDeactivation(actor: MembershipSnapshot, target: MembershipSnapshot, ownerCount: number, action: "deactivate" | "reactivate"): DeactivationResult;
/**
 * Determines the effective status of an invitation based on current time.
 */
export declare function resolveInvitationStatus(invitation: Pick<TenantInvitation, "status" | "expiresAt">, now: Date): InvitationStatus;
