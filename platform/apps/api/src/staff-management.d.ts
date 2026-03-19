export type StaffMemberData = {
    id: string;
    tenantId: string;
    displayName: string;
    jobTitle: string;
    email: string;
    phone: string;
    locationIds: string[];
    isBookable: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};
export type CreateStaffPayload = {
    tenantId: string;
    displayName: string;
    jobTitle: string;
    email: string;
    phone: string;
    locationIds: string[];
    isBookable: boolean;
};
export type UpdateStaffPayload = {
    displayName?: string;
    jobTitle?: string;
    email?: string;
    phone?: string;
    locationIds?: string[];
    isBookable?: boolean;
    isActive?: boolean;
};
export type StaffListItem = {
    id: string;
    displayName: string;
    jobTitle: string;
    locationIds: string[];
    isBookable: boolean;
    isActive: boolean;
};
export declare function toStaffListItem(staff: StaffMemberData): StaffListItem;
export type StaffValidationError = {
    field: string;
    code: "required" | "max-length" | "format" | "invalid-location";
    message: string;
};
export declare function validateCreateStaff(payload: CreateStaffPayload): StaffValidationError[];
export declare function validateUpdateStaff(payload: UpdateStaffPayload): StaffValidationError[];
/**
 * Validates that all assigned location IDs belong to the same tenant.
 * tenantLocationIds is the set of valid location IDs for the tenant.
 */
export declare function validateLocationAssignments(assignedLocationIds: string[], tenantLocationIds: string[]): StaffValidationError[];
export declare function createEmptyStaffPayload(tenantId: string): CreateStaffPayload;
/**
 * Filters a list of staff members to only those assigned to a given location.
 */
export declare function filterStaffByLocation(staff: StaffMemberData[], locationId: string): StaffMemberData[];
/**
 * Returns bookable staff members that are active.
 */
export declare function getBookableStaff(staff: StaffMemberData[]): StaffMemberData[];
