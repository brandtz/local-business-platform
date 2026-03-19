import type { TenantActorRole } from "@platform/types";
export declare const membershipAuditEventKinds: readonly ["invitation_created", "invitation_accepted", "invitation_revoked", "invitation_expired", "role_changed", "user_deactivated", "user_reactivated"];
export type MembershipAuditEventKind = (typeof membershipAuditEventKinds)[number];
export declare const staffAuditEventKinds: readonly ["staff_created", "staff_updated", "staff_deleted"];
export type StaffAuditEventKind = (typeof staffAuditEventKinds)[number];
export type TeamAuditEventKind = MembershipAuditEventKind | StaffAuditEventKind;
export declare const allTeamAuditEventKinds: readonly TeamAuditEventKind[];
export type AuditEventBase = {
    id: string;
    tenantId: string;
    actorId: string;
    actorRole: TenantActorRole;
    timestamp: string;
    ipAddress: string;
};
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
export type MembershipAuditEvent = InvitationCreatedEvent | InvitationAcceptedEvent | InvitationRevokedEvent | InvitationExpiredEvent | RoleChangedEvent | UserDeactivatedEvent | UserReactivatedEvent;
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
export type StaffAuditEvent = StaffCreatedEvent | StaffUpdatedEvent | StaffDeletedEvent;
export type TeamAuditEvent = MembershipAuditEvent | StaffAuditEvent;
type AuditContext = {
    tenantId: string;
    actorId: string;
    actorRole: TenantActorRole;
    ipAddress: string;
};
/** Reset the counter (for testing). */
export declare function _resetIdCounter(): void;
export declare function buildInvitationCreatedEvent(ctx: AuditContext, invitationId: string, targetEmail: string, invitedRole: TenantActorRole): InvitationCreatedEvent;
export declare function buildInvitationAcceptedEvent(ctx: AuditContext, invitationId: string, targetUserId: string, assignedRole: TenantActorRole): InvitationAcceptedEvent;
export declare function buildInvitationRevokedEvent(ctx: AuditContext, invitationId: string, targetEmail: string): InvitationRevokedEvent;
export declare function buildRoleChangedEvent(ctx: AuditContext, targetUserId: string, previousRole: TenantActorRole, newRole: TenantActorRole): RoleChangedEvent;
export declare function buildUserDeactivatedEvent(ctx: AuditContext, targetUserId: string, previousRole: TenantActorRole): UserDeactivatedEvent;
export declare function buildUserReactivatedEvent(ctx: AuditContext, targetUserId: string, restoredRole: TenantActorRole): UserReactivatedEvent;
export declare function buildStaffCreatedEvent(ctx: AuditContext, staffId: string, displayName: string, locationIds: string[]): StaffCreatedEvent;
export declare function buildStaffUpdatedEvent(ctx: AuditContext, staffId: string, changes: StaffFieldChange[]): StaffUpdatedEvent;
export declare function buildStaffDeletedEvent(ctx: AuditContext, staffId: string, displayName: string): StaffDeletedEvent;
/**
 * Computes field-level changes between two record shapes.
 * Values are stringified for audit storage.
 */
export declare function computeStaffChanges(before: Record<string, unknown>, after: Record<string, unknown>, fields: string[]): StaffFieldChange[];
export declare function describeTeamAuditEvent(event: TeamAuditEvent): string;
export {};
