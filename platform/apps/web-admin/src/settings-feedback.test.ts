import { describe, it, expect, beforeEach } from "vitest";
import {
	toFieldErrors,
	getFieldError,
	hasFieldError,
	getStagedStatusIndicator,
	buildSectionSummary,
	runPublishPreCheck,
	buildDraftSaveFeedback,
	buildPublishFeedback,
	buildRevertConfirmation,
	createToast,
	createSettingsSavedToast,
	createSettingsPublishedToast,
	createSettingsRevertedToast,
	createValidationErrorToast,
	_resetToastCounter
} from "./settings-feedback.js";
import type { SettingsValidationError } from "./../../api/src/settings-validation.js";

beforeEach(() => {
	_resetToastCounter();
});

// ── Field Error Display ──────────────────────────────────────────────────────

describe("toFieldErrors", () => {
	it("maps validation errors to display errors", () => {
		const errors: SettingsValidationError[] = [
			{
				fieldPath: "profile.businessName",
				code: "required",
				message: "Required.",
				section: "profile"
			}
		];
		const display = toFieldErrors(errors);
		expect(display).toHaveLength(1);
		expect(display[0]!.severity).toBe("error");
	});

	it("marks go-live-minimum as warning", () => {
		const errors: SettingsValidationError[] = [
			{
				fieldPath: "locations",
				code: "go-live-minimum",
				message: "Need a location.",
				section: "locations"
			}
		];
		const display = toFieldErrors(errors);
		expect(display[0]!.severity).toBe("warning");
	});
});

describe("getFieldError", () => {
	it("finds error for a specific field", () => {
		const errors = toFieldErrors([
			{
				fieldPath: "profile.businessName",
				code: "required",
				message: "Required.",
				section: "profile"
			}
		]);
		expect(getFieldError(errors, "profile.businessName")).toBeTruthy();
		expect(getFieldError(errors, "profile.email")).toBeUndefined();
	});
});

describe("hasFieldError", () => {
	it("returns true when error exists", () => {
		const errors = toFieldErrors([
			{
				fieldPath: "x",
				code: "required",
				message: "X",
				section: "profile"
			}
		]);
		expect(hasFieldError(errors, "x")).toBe(true);
		expect(hasFieldError(errors, "y")).toBe(false);
	});
});

// ── Status Indicators ────────────────────────────────────────────────────────

describe("getStagedStatusIndicator", () => {
	it("returns Live/success for current", () => {
		const ind = getStagedStatusIndicator("current");
		expect(ind.label).toBe("Live");
		expect(ind.variant).toBe("success");
	});

	it("returns Unsaved Draft/warning for draft", () => {
		const ind = getStagedStatusIndicator("draft");
		expect(ind.label).toContain("Draft");
		expect(ind.variant).toBe("warning");
	});

	it("returns Publishing/info for publishing", () => {
		expect(getStagedStatusIndicator("publishing").variant).toBe("info");
	});

	it("returns Reverting/info for reverting", () => {
		expect(getStagedStatusIndicator("reverting").variant).toBe("info");
	});
});

// ── Section Summary ──────────────────────────────────────────────────────────

describe("buildSectionSummary", () => {
	it("builds summary with error count", () => {
		const errors: SettingsValidationError[] = [
			{
				fieldPath: "profile.name",
				code: "required",
				message: "R",
				section: "profile"
			},
			{
				fieldPath: "locations[0]",
				code: "required",
				message: "R",
				section: "locations"
			}
		];
		const summary = buildSectionSummary("profile", "draft", errors);
		expect(summary.errorCount).toBe(1); // only profile errors
		expect(summary.hasDraft).toBe(true);
		expect(summary.indicator.label).toContain("Draft");
	});
});

// ── Publish Pre-Check ────────────────────────────────────────────────────────

describe("runPublishPreCheck", () => {
	it("allows publish when no errors", () => {
		const result = runPublishPreCheck("profile", []);
		expect(result.canPublish).toBe(true);
		expect(result.errorCount).toBe(0);
		expect(result.confirmMessage).toContain("go live");
	});

	it("blocks publish when errors exist", () => {
		const errors: SettingsValidationError[] = [
			{
				fieldPath: "profile.name",
				code: "required",
				message: "Req",
				section: "profile"
			}
		];
		const result = runPublishPreCheck("profile", errors);
		expect(result.canPublish).toBe(false);
		expect(result.errorCount).toBe(1);
		expect(result.confirmMessage).toContain("error");
	});

	it("allows publish with warnings only", () => {
		const errors: SettingsValidationError[] = [
			{
				fieldPath: "profile.x",
				code: "go-live-minimum",
				message: "W",
				section: "profile"
			}
		];
		const result = runPublishPreCheck("profile", errors);
		expect(result.canPublish).toBe(true);
		expect(result.warningCount).toBe(1);
		expect(result.confirmMessage).toContain("warning");
	});
});

// ── Save Feedback ────────────────────────────────────────────────────────────

describe("buildDraftSaveFeedback", () => {
	it("returns success feedback", () => {
		const fb = buildDraftSaveFeedback(true);
		expect(fb.type).toBe("success");
		expect(fb.title).toContain("Draft");
	});

	it("returns error feedback on failure", () => {
		const fb = buildDraftSaveFeedback(false);
		expect(fb.type).toBe("error");
	});
});

describe("buildPublishFeedback", () => {
	it("returns success when published", () => {
		expect(buildPublishFeedback(true).type).toBe("success");
	});

	it("returns error when failed", () => {
		expect(buildPublishFeedback(false).type).toBe("error");
	});
});

// ── Revert Confirmation ──────────────────────────────────────────────────────

describe("buildRevertConfirmation", () => {
	it("builds confirmation with section name", () => {
		const conf = buildRevertConfirmation("branding");
		expect(conf.section).toBe("branding");
		expect(conf.message).toContain("branding");
		expect(conf.confirmLabel).toContain("Discard");
	});
});

// ── Toast Notifications ──────────────────────────────────────────────────────

describe("createToast", () => {
	it("creates toast with unique ID", () => {
		const t1 = createToast("info", "T", "M");
		const t2 = createToast("info", "T", "M");
		expect(t1.id).not.toBe(t2.id);
	});

	it("defaults to 5s duration", () => {
		expect(createToast("info", "T", "M").durationMs).toBe(5000);
	});

	it("accepts custom duration", () => {
		expect(createToast("info", "T", "M", 3000).durationMs).toBe(3000);
	});
});

describe("preset toasts", () => {
	it("createSettingsSavedToast is success", () => {
		expect(createSettingsSavedToast().type).toBe("success");
	});

	it("createSettingsPublishedToast is success", () => {
		expect(createSettingsPublishedToast().type).toBe("success");
	});

	it("createSettingsRevertedToast is info", () => {
		expect(createSettingsRevertedToast().type).toBe("info");
	});

	it("createValidationErrorToast includes count", () => {
		const toast = createValidationErrorToast(3);
		expect(toast.type).toBe("error");
		expect(toast.message).toContain("3");
	});
});
