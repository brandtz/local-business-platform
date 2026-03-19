// E5-S5-T3: Staged vs live settings rollout — draft/publish/revert.
// Tracks draft and live states independently per settings section.
// Publishing runs the validation gate before promoting draft to live.
// Reverting discards draft and restores the live state.

import type { SettingsSection, SettingsValidationError } from "./settings-validation.js";

// ── Publish Status ───────────────────────────────────────────────────────────

export type StagedStatus = "current" | "draft" | "publishing" | "reverting";

// ── Staged Section ───────────────────────────────────────────────────────────

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
export function createStagedSection<T>(
	section: SettingsSection,
	liveValue: T
): StagedSection<T> {
	return {
		section,
		live: liveValue,
		draft: null,
		status: "current",
		lastPublishedAt: null,
		lastDraftSavedAt: null
	};
}

// ── Draft Operations ─────────────────────────────────────────────────────────

/**
 * Saves a draft for a staged section.
 */
export function saveDraft<T>(
	staged: StagedSection<T>,
	draftValue: T
): StagedSection<T> {
	return {
		...staged,
		draft: draftValue,
		status: "draft",
		lastDraftSavedAt: new Date().toISOString()
	};
}

/**
 * Returns whether the section has unsaved draft changes.
 */
export function hasDraft<T>(staged: StagedSection<T>): boolean {
	return staged.draft !== null;
}

/**
 * Returns the active value: draft if present, otherwise live.
 */
export function getActiveValue<T>(staged: StagedSection<T>): T {
	return staged.draft ?? staged.live;
}

// ── Publish ──────────────────────────────────────────────────────────────────

export type PublishResult<T> =
	| { success: true; published: StagedSection<T> }
	| { success: false; errors: SettingsValidationError[] };

/**
 * Attempts to publish draft to live.
 * validate is the validation gate that must pass before publishing.
 */
export function publishDraft<T>(
	staged: StagedSection<T>,
	validate: (value: T) => SettingsValidationError[]
): PublishResult<T> {
	if (staged.draft === null) {
		return {
			success: false,
			errors: [
				{
					fieldPath: staged.section,
					code: "invalid-value",
					message: "No draft to publish.",
					section: staged.section
				}
			]
		};
	}

	const errors = validate(staged.draft);
	if (errors.length > 0) {
		return { success: false, errors };
	}

	return {
		success: true,
		published: {
			...staged,
			live: staged.draft,
			draft: null,
			status: "current",
			lastPublishedAt: new Date().toISOString()
		}
	};
}

// ── Revert ───────────────────────────────────────────────────────────────────

/**
 * Discards the draft and reverts to live.
 */
export function revertDraft<T>(staged: StagedSection<T>): StagedSection<T> {
	return {
		...staged,
		draft: null,
		status: "current"
	};
}

// ── Multi-Section Management ─────────────────────────────────────────────────

export type StagedSettingsStore = {
	sections: Map<SettingsSection, StagedSection<unknown>>;
};

export function createStagedStore(): StagedSettingsStore {
	return { sections: new Map() };
}

export function registerSection<T>(
	store: StagedSettingsStore,
	section: SettingsSection,
	liveValue: T
): void {
	store.sections.set(section, createStagedSection(section, liveValue));
}

export function getStagedSection<T>(
	store: StagedSettingsStore,
	section: SettingsSection
): StagedSection<T> | undefined {
	return store.sections.get(section) as StagedSection<T> | undefined;
}

export function saveSectionDraft<T>(
	store: StagedSettingsStore,
	section: SettingsSection,
	draftValue: T
): boolean {
	const existing = store.sections.get(section);
	if (!existing) return false;
	store.sections.set(
		section,
		saveDraft(existing as StagedSection<T>, draftValue)
	);
	return true;
}

export function revertSectionDraft(
	store: StagedSettingsStore,
	section: SettingsSection
): boolean {
	const existing = store.sections.get(section);
	if (!existing) return false;
	store.sections.set(section, revertDraft(existing));
	return true;
}

/**
 * Returns all sections that have unsaved drafts.
 */
export function getSectionsWithDrafts(
	store: StagedSettingsStore
): SettingsSection[] {
	const result: SettingsSection[] = [];
	for (const [section, staged] of store.sections) {
		if (hasDraft(staged)) {
			result.push(section);
		}
	}
	return result;
}

/**
 * Returns true if any section has a draft.
 */
export function hasAnyDraft(store: StagedSettingsStore): boolean {
	for (const staged of store.sections.values()) {
		if (hasDraft(staged)) return true;
	}
	return false;
}
