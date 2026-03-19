import type { SettingsSection, SettingsValidationError } from "./settings-validation.js";
export type StagedStatus = "current" | "draft" | "publishing" | "reverting";
export type StagedSection<T> = {
    section: SettingsSection;
    live: T;
    draft: T | null;
    status: StagedStatus;
    lastPublishedAt: string | null;
    lastDraftSavedAt: string | null;
};
/**
 * Creates a staged section from its live value (no draft yet).
 */
export declare function createStagedSection<T>(section: SettingsSection, liveValue: T): StagedSection<T>;
/**
 * Saves a draft for a staged section.
 */
export declare function saveDraft<T>(staged: StagedSection<T>, draftValue: T): StagedSection<T>;
/**
 * Returns whether the section has unsaved draft changes.
 */
export declare function hasDraft<T>(staged: StagedSection<T>): boolean;
/**
 * Returns the active value: draft if present, otherwise live.
 */
export declare function getActiveValue<T>(staged: StagedSection<T>): T;
export type PublishResult<T> = {
    success: true;
    published: StagedSection<T>;
} | {
    success: false;
    errors: SettingsValidationError[];
};
/**
 * Attempts to publish draft to live.
 * validate is the validation gate that must pass before publishing.
 */
export declare function publishDraft<T>(staged: StagedSection<T>, validate: (value: T) => SettingsValidationError[]): PublishResult<T>;
/**
 * Discards the draft and reverts to live.
 */
export declare function revertDraft<T>(staged: StagedSection<T>): StagedSection<T>;
export type StagedSettingsStore = {
    sections: Map<SettingsSection, StagedSection<unknown>>;
};
export declare function createStagedStore(): StagedSettingsStore;
export declare function registerSection<T>(store: StagedSettingsStore, section: SettingsSection, liveValue: T): void;
export declare function getStagedSection<T>(store: StagedSettingsStore, section: SettingsSection): StagedSection<T> | undefined;
export declare function saveSectionDraft<T>(store: StagedSettingsStore, section: SettingsSection, draftValue: T): boolean;
export declare function revertSectionDraft(store: StagedSettingsStore, section: SettingsSection): boolean;
/**
 * Returns all sections that have unsaved drafts.
 */
export declare function getSectionsWithDrafts(store: StagedSettingsStore): SettingsSection[];
/**
 * Returns true if any section has a draft.
 */
export declare function hasAnyDraft(store: StagedSettingsStore): boolean;
