// E5-S5-T4: User-facing feedback for settings save/validation/publish.
// Inline validation errors, draft/live indicators, publish pre-check,
// revert confirmation, and toast notifications.

import type {
	SettingsSection,
	SettingsValidationError
} from "./../../api/src/settings-validation.js";
import type { StagedStatus } from "./../../api/src/staged-settings.js";

// ── Field-Level Error Display ────────────────────────────────────────────────

export type FieldErrorDisplay = {
	fieldPath: string;
	message: string;
	severity: "error" | "warning";
};

export function toFieldErrors(
	errors: SettingsValidationError[]
): FieldErrorDisplay[] {
	return errors.map((e) => ({
		fieldPath: e.fieldPath,
		message: e.message,
		severity: e.code === "go-live-minimum" ? "warning" : "error"
	}));
}

export function getFieldError(
	errors: FieldErrorDisplay[],
	fieldPath: string
): FieldErrorDisplay | undefined {
	return errors.find((e) => e.fieldPath === fieldPath);
}

export function hasFieldError(
	errors: FieldErrorDisplay[],
	fieldPath: string
): boolean {
	return errors.some((e) => e.fieldPath === fieldPath);
}

// ── Draft/Live Status Indicator ──────────────────────────────────────────────

export type StatusIndicator = {
	label: string;
	variant: "success" | "info" | "warning" | "neutral";
};

export function getStagedStatusIndicator(
	status: StagedStatus
): StatusIndicator {
	switch (status) {
		case "current":
			return { label: "Live", variant: "success" };
		case "draft":
			return { label: "Unsaved Draft", variant: "warning" };
		case "publishing":
			return { label: "Publishing…", variant: "info" };
		case "reverting":
			return { label: "Reverting…", variant: "info" };
	}
}

// ── Section Status Summary ───────────────────────────────────────────────────

export type SectionStatusSummary = {
	section: SettingsSection;
	status: StagedStatus;
	indicator: StatusIndicator;
	errorCount: number;
	hasDraft: boolean;
};

export function buildSectionSummary(
	section: SettingsSection,
	status: StagedStatus,
	errors: SettingsValidationError[]
): SectionStatusSummary {
	const sectionErrors = errors.filter((e) => e.section === section);
	return {
		section,
		status,
		indicator: getStagedStatusIndicator(status),
		errorCount: sectionErrors.length,
		hasDraft: status === "draft"
	};
}

// ── Publish Pre-Check ────────────────────────────────────────────────────────

export type PublishPreCheckResult = {
	canPublish: boolean;
	errorCount: number;
	warningCount: number;
	errors: FieldErrorDisplay[];
	confirmMessage: string;
};

export function runPublishPreCheck(
	section: SettingsSection,
	validationErrors: SettingsValidationError[]
): PublishPreCheckResult {
	const sectionErrors = validationErrors.filter((e) => e.section === section);
	const fieldErrors = toFieldErrors(sectionErrors);
	const errorCount = fieldErrors.filter((e) => e.severity === "error").length;
	const warningCount = fieldErrors.filter(
		(e) => e.severity === "warning"
	).length;

	const canPublish = errorCount === 0;

	let confirmMessage: string;
	if (!canPublish) {
		confirmMessage = `Cannot publish: ${errorCount} error(s) must be fixed.`;
	} else if (warningCount > 0) {
		confirmMessage = `Publish with ${warningCount} warning(s)? Settings will go live.`;
	} else {
		confirmMessage = "Publish these settings? They will go live immediately.";
	}

	return { canPublish, errorCount, warningCount, errors: fieldErrors, confirmMessage };
}

// ── Save Feedback ────────────────────────────────────────────────────────────

export type SaveFeedback = {
	type: "success" | "error";
	title: string;
	message: string;
};

export function buildDraftSaveFeedback(success: boolean): SaveFeedback {
	return success
		? {
				type: "success",
				title: "Draft Saved",
				message: "Your changes have been saved as a draft."
			}
		: {
				type: "error",
				title: "Save Failed",
				message: "Could not save draft. Please try again."
			};
}

export function buildPublishFeedback(success: boolean): SaveFeedback {
	return success
		? {
				type: "success",
				title: "Published",
				message: "Settings are now live."
			}
		: {
				type: "error",
				title: "Publish Failed",
				message:
					"Could not publish settings. Check validation errors and try again."
			};
}

// ── Revert Confirmation ──────────────────────────────────────────────────────

export type RevertConfirmation = {
	section: SettingsSection;
	message: string;
	confirmLabel: string;
	cancelLabel: string;
};

export function buildRevertConfirmation(
	section: SettingsSection
): RevertConfirmation {
	return {
		section,
		message: `Discard draft changes to ${section}? This will revert to the current live settings.`,
		confirmLabel: "Discard Draft",
		cancelLabel: "Keep Editing"
	};
}

// ── Toast Notifications ──────────────────────────────────────────────────────

export type ToastNotification = {
	id: string;
	type: "success" | "error" | "info" | "warning";
	title: string;
	message: string;
	durationMs: number;
};

let _toastCounter = 0;

export function _resetToastCounter(): void {
	_toastCounter = 0;
}

export function createToast(
	type: ToastNotification["type"],
	title: string,
	message: string,
	durationMs = 5000
): ToastNotification {
	_toastCounter += 1;
	return {
		id: `toast-${_toastCounter}`,
		type,
		title,
		message,
		durationMs
	};
}

export function createSettingsSavedToast(): ToastNotification {
	return createToast("success", "Draft Saved", "Changes saved as draft.");
}

export function createSettingsPublishedToast(): ToastNotification {
	return createToast("success", "Published", "Settings are now live.");
}

export function createSettingsRevertedToast(): ToastNotification {
	return createToast("info", "Reverted", "Draft discarded. Live settings restored.");
}

export function createValidationErrorToast(
	errorCount: number
): ToastNotification {
	return createToast(
		"error",
		"Validation Errors",
		`${errorCount} error(s) found. Please fix them before publishing.`
	);
}
