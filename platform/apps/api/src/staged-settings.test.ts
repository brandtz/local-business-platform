import { describe, it, expect } from "vitest";
import {
	createStagedSection,
	saveDraft,
	hasDraft,
	getActiveValue,
	publishDraft,
	revertDraft,
	createStagedStore,
	registerSection,
	getStagedSection,
	saveSectionDraft,
	revertSectionDraft,
	getSectionsWithDrafts,
	hasAnyDraft,
	type StagedSection
} from "./staged-settings.js";
import type { SettingsValidationError } from "./settings-validation.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

type TestData = { name: string; value: number };

function makeStaged(
	overrides: Partial<StagedSection<TestData>> = {}
): StagedSection<TestData> {
	return {
		section: "profile",
		live: { name: "Live", value: 1 },
		draft: null,
		status: "current",
		lastPublishedAt: null,
		lastDraftSavedAt: null,
		...overrides
	};
}

const noErrors = (): SettingsValidationError[] => [];
const alwaysError = (): SettingsValidationError[] => [
	{
		fieldPath: "test",
		code: "required",
		message: "Validation failed.",
		section: "profile"
	}
];

// ── createStagedSection ──────────────────────────────────────────────────────

describe("createStagedSection", () => {
	it("initializes with live value and no draft", () => {
		const staged = createStagedSection("profile", { name: "Biz", value: 42 });
		expect(staged.live).toEqual({ name: "Biz", value: 42 });
		expect(staged.draft).toBeNull();
		expect(staged.status).toBe("current");
	});
});

// ── saveDraft ────────────────────────────────────────────────────────────────

describe("saveDraft", () => {
	it("sets draft and updates status", () => {
		const staged = makeStaged();
		const updated = saveDraft(staged, { name: "Draft", value: 2 });
		expect(updated.draft).toEqual({ name: "Draft", value: 2 });
		expect(updated.status).toBe("draft");
		expect(updated.lastDraftSavedAt).toBeTruthy();
	});

	it("does not modify live value", () => {
		const staged = makeStaged();
		const updated = saveDraft(staged, { name: "Draft", value: 2 });
		expect(updated.live).toEqual({ name: "Live", value: 1 });
	});
});

// ── hasDraft & getActiveValue ────────────────────────────────────────────────

describe("hasDraft", () => {
	it("returns false when no draft", () => {
		expect(hasDraft(makeStaged())).toBe(false);
	});

	it("returns true when draft exists", () => {
		const staged = saveDraft(makeStaged(), { name: "D", value: 0 });
		expect(hasDraft(staged)).toBe(true);
	});
});

describe("getActiveValue", () => {
	it("returns live when no draft", () => {
		expect(getActiveValue(makeStaged())).toEqual({ name: "Live", value: 1 });
	});

	it("returns draft when present", () => {
		const staged = saveDraft(makeStaged(), { name: "D", value: 99 });
		expect(getActiveValue(staged)).toEqual({ name: "D", value: 99 });
	});
});

// ── publishDraft ─────────────────────────────────────────────────────────────

describe("publishDraft", () => {
	it("promotes draft to live on validation pass", () => {
		const staged = saveDraft(makeStaged(), { name: "New", value: 5 });
		const result = publishDraft(staged, noErrors);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.published.live).toEqual({ name: "New", value: 5 });
			expect(result.published.draft).toBeNull();
			expect(result.published.status).toBe("current");
			expect(result.published.lastPublishedAt).toBeTruthy();
		}
	});

	it("rejects when validation fails", () => {
		const staged = saveDraft(makeStaged(), { name: "Bad", value: -1 });
		const result = publishDraft(staged, alwaysError);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors).toHaveLength(1);
		}
	});

	it("rejects when no draft to publish", () => {
		const result = publishDraft(makeStaged(), noErrors);
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.errors[0]!.message).toContain("No draft");
		}
	});
});

// ── revertDraft ──────────────────────────────────────────────────────────────

describe("revertDraft", () => {
	it("discards draft and returns to current", () => {
		const staged = saveDraft(makeStaged(), { name: "D", value: 9 });
		const reverted = revertDraft(staged);
		expect(reverted.draft).toBeNull();
		expect(reverted.status).toBe("current");
		expect(reverted.live).toEqual({ name: "Live", value: 1 });
	});

	it("is a no-op when already current", () => {
		const staged = makeStaged();
		const reverted = revertDraft(staged);
		expect(reverted.status).toBe("current");
	});
});

// ── Multi-Section Store ──────────────────────────────────────────────────────

describe("StagedSettingsStore", () => {
	it("registers and retrieves sections", () => {
		const store = createStagedStore();
		registerSection(store, "profile", { x: 1 });
		const section = getStagedSection<{ x: number }>(store, "profile");
		expect(section).toBeTruthy();
		expect(section!.live).toEqual({ x: 1 });
	});

	it("saves draft to a section", () => {
		const store = createStagedStore();
		registerSection(store, "profile", { x: 1 });
		const saved = saveSectionDraft(store, "profile", { x: 2 });
		expect(saved).toBe(true);
		const section = getStagedSection<{ x: number }>(store, "profile");
		expect(section!.draft).toEqual({ x: 2 });
	});

	it("returns false for unknown section", () => {
		const store = createStagedStore();
		expect(saveSectionDraft(store, "profile", {})).toBe(false);
	});

	it("reverts a section draft", () => {
		const store = createStagedStore();
		registerSection(store, "locations", []);
		saveSectionDraft(store, "locations", ["loc-1"]);
		expect(revertSectionDraft(store, "locations")).toBe(true);
		const section = getStagedSection(store, "locations");
		expect(section!.draft).toBeNull();
	});

	it("returns false when reverting unknown section", () => {
		const store = createStagedStore();
		expect(revertSectionDraft(store, "hours")).toBe(false);
	});

	it("tracks sections with drafts", () => {
		const store = createStagedStore();
		registerSection(store, "profile", {});
		registerSection(store, "branding", {});
		registerSection(store, "locations", {});
		saveSectionDraft(store, "profile", { updated: true });
		saveSectionDraft(store, "locations", ["x"]);

		const withDrafts = getSectionsWithDrafts(store);
		expect(withDrafts).toContain("profile");
		expect(withDrafts).toContain("locations");
		expect(withDrafts).not.toContain("branding");
	});

	it("hasAnyDraft returns true when drafts exist", () => {
		const store = createStagedStore();
		registerSection(store, "profile", {});
		expect(hasAnyDraft(store)).toBe(false);
		saveSectionDraft(store, "profile", {});
		expect(hasAnyDraft(store)).toBe(true);
	});
});
