import type { TenantModuleKey } from "@platform/types";
export type SettingsValidationError = {
    /** Dot-path to the field, e.g. "profile.businessName" or "locations[0].hours" */
    fieldPath: string;
    code: SettingsValidationErrorCode;
    message: string;
    /** Which settings section this error belongs to. */
    section: SettingsSection;
};
export type SettingsValidationErrorCode = "required" | "cross-field-conflict" | "module-requires" | "go-live-minimum" | "invalid-value" | "range-error" | "duplicate";
export type SettingsSection = "profile" | "branding" | "locations" | "hours" | "policies" | "modules" | "fulfillment";
export type SettingsSnapshot = {
    profile: ProfileSettings;
    locations: LocationSettingsSummary[];
    modules: TenantModuleKey[];
    fulfillment: FulfillmentSettings;
};
export type ProfileSettings = {
    businessName: string;
    contactEmail: string;
    contactPhone: string;
    timezone: string;
};
export type LocationSettingsSummary = {
    locationId: string;
    name: string;
    hasAddress: boolean;
    hasTimezone: boolean;
    hasHours: boolean;
    fulfillmentModes: string[];
    isActive: boolean;
};
export type FulfillmentSettings = {
    enabledModes: FulfillmentMode[];
    deliveryConfig: DeliveryConfig | null;
};
export type FulfillmentMode = "pickup" | "delivery" | "dine-in" | "shipping";
export type DeliveryConfig = {
    maxRadiusMiles: number;
    minimumOrderCents: number;
    estimatedMinutes: number;
};
export type SettingsValidationResult = {
    valid: boolean;
    errors: SettingsValidationError[];
    goLiveReady: boolean;
    goLiveBlockers: SettingsValidationError[];
};
export declare function validateSettings(snapshot: SettingsSnapshot): SettingsValidationResult;
export declare function validateProfileSection(profile: ProfileSettings): SettingsValidationError[];
export declare function validateLocationsSection(locations: LocationSettingsSummary[]): SettingsValidationError[];
export declare function validateFulfillmentSection(fulfillment: FulfillmentSettings): SettingsValidationError[];
export declare function getErrorsForSection(errors: SettingsValidationError[], section: SettingsSection): SettingsValidationError[];
export declare function getErrorsForField(errors: SettingsValidationError[], fieldPath: string): SettingsValidationError[];
export declare function hasErrorsInSection(errors: SettingsValidationError[], section: SettingsSection): boolean;
