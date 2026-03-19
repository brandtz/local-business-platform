import { describe, it, expect } from "vitest";
import {
	validateSettings,
	validateProfileSection,
	validateLocationsSection,
	validateFulfillmentSection,
	getErrorsForSection,
	getErrorsForField,
	hasErrorsInSection,
	type SettingsSnapshot,
	type ProfileSettings,
	type LocationSettingsSummary,
	type FulfillmentSettings
} from "./settings-validation.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<ProfileSettings> = {}): ProfileSettings {
	return {
		businessName: "Test Biz",
		contactEmail: "test@example.com",
		contactPhone: "555-0100",
		timezone: "America/New_York",
		...overrides
	};
}

function makeLocation(
	overrides: Partial<LocationSettingsSummary> = {}
): LocationSettingsSummary {
	return {
		locationId: "loc-1",
		name: "Main Location",
		hasAddress: true,
		hasTimezone: true,
		hasHours: true,
		fulfillmentModes: ["pickup"],
		isActive: true,
		...overrides
	};
}

function makeFulfillment(
	overrides: Partial<FulfillmentSettings> = {}
): FulfillmentSettings {
	return {
		enabledModes: ["pickup"],
		deliveryConfig: null,
		...overrides
	};
}

function makeSnapshot(
	overrides: Partial<SettingsSnapshot> = {}
): SettingsSnapshot {
	return {
		profile: makeProfile(),
		locations: [makeLocation()],
		modules: [],
		fulfillment: makeFulfillment(),
		...overrides
	};
}

// ── Full Validation ──────────────────────────────────────────────────────────

describe("validateSettings", () => {
	it("passes for a valid complete snapshot", () => {
		const result = validateSettings(makeSnapshot());
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.goLiveReady).toBe(true);
		expect(result.goLiveBlockers).toEqual([]);
	});

	it("fails when profile is incomplete", () => {
		const result = validateSettings(
			makeSnapshot({ profile: makeProfile({ businessName: "" }) })
		);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.fieldPath === "profile.businessName")).toBe(true);
	});

	it("is not go-live ready without active locations", () => {
		const result = validateSettings(
			makeSnapshot({ locations: [makeLocation({ isActive: false })] })
		);
		expect(result.goLiveReady).toBe(false);
		expect(result.goLiveBlockers.some((e) => e.code === "go-live-minimum")).toBe(true);
	});
});

// ── Profile Validation ───────────────────────────────────────────────────────

describe("validateProfileSection", () => {
	it("returns no errors for complete profile", () => {
		expect(validateProfileSection(makeProfile())).toEqual([]);
	});

	it("requires business name", () => {
		const errors = validateProfileSection(makeProfile({ businessName: "" }));
		expect(errors).toHaveLength(1);
		expect(errors[0]!.code).toBe("required");
	});

	it("requires contact email", () => {
		const errors = validateProfileSection(makeProfile({ contactEmail: "  " }));
		expect(errors[0]!.fieldPath).toBe("profile.contactEmail");
	});

	it("requires timezone", () => {
		const errors = validateProfileSection(makeProfile({ timezone: "" }));
		expect(errors[0]!.fieldPath).toBe("profile.timezone");
	});
});

// ── Location Validation ──────────────────────────────────────────────────────

describe("validateLocationsSection", () => {
	it("passes for valid locations", () => {
		expect(validateLocationsSection([makeLocation()])).toEqual([]);
	});

	it("requires location name", () => {
		const errors = validateLocationsSection([makeLocation({ name: "" })]);
		expect(errors[0]!.code).toBe("required");
	});

	it("active location requires address", () => {
		const errors = validateLocationsSection([
			makeLocation({ isActive: true, hasAddress: false })
		]);
		expect(errors[0]!.code).toBe("cross-field-conflict");
		expect(errors[0]!.message).toContain("address");
	});

	it("active location requires timezone", () => {
		const errors = validateLocationsSection([
			makeLocation({ isActive: true, hasTimezone: false })
		]);
		expect(errors.some((e) => e.message.includes("timezone"))).toBe(true);
	});

	it("inactive location skips address/timezone check", () => {
		const errors = validateLocationsSection([
			makeLocation({ isActive: false, hasAddress: false, hasTimezone: false })
		]);
		expect(errors).toEqual([]);
	});

	it("detects duplicate location names", () => {
		const errors = validateLocationsSection([
			makeLocation({ locationId: "l1", name: "Main" }),
			makeLocation({ locationId: "l2", name: "Main" })
		]);
		expect(errors.some((e) => e.code === "duplicate")).toBe(true);
	});
});

// ── Fulfillment Validation ───────────────────────────────────────────────────

describe("validateFulfillmentSection", () => {
	it("passes for pickup only", () => {
		expect(validateFulfillmentSection(makeFulfillment())).toEqual([]);
	});

	it("requires delivery config when delivery is enabled", () => {
		const errors = validateFulfillmentSection(
			makeFulfillment({ enabledModes: ["delivery"], deliveryConfig: null })
		);
		expect(errors[0]!.code).toBe("cross-field-conflict");
	});

	it("validates delivery radius > 0", () => {
		const errors = validateFulfillmentSection(
			makeFulfillment({
				enabledModes: ["delivery"],
				deliveryConfig: {
					maxRadiusMiles: 0,
					minimumOrderCents: 0,
					estimatedMinutes: 30
				}
			})
		);
		expect(errors.some((e) => e.code === "range-error")).toBe(true);
	});

	it("validates estimated minutes > 0", () => {
		const errors = validateFulfillmentSection(
			makeFulfillment({
				enabledModes: ["delivery"],
				deliveryConfig: {
					maxRadiusMiles: 5,
					minimumOrderCents: 0,
					estimatedMinutes: 0
				}
			})
		);
		expect(errors.some((e) => e.fieldPath.includes("estimatedMinutes"))).toBe(true);
	});

	it("passes with valid delivery config", () => {
		const errors = validateFulfillmentSection(
			makeFulfillment({
				enabledModes: ["delivery"],
				deliveryConfig: {
					maxRadiusMiles: 10,
					minimumOrderCents: 1500,
					estimatedMinutes: 45
				}
			})
		);
		expect(errors).toEqual([]);
	});

	it("detects duplicate fulfillment modes", () => {
		const errors = validateFulfillmentSection(
			makeFulfillment({ enabledModes: ["pickup", "pickup"] })
		);
		expect(errors.some((e) => e.code === "duplicate")).toBe(true);
	});
});

// ── Module-Aware Validation ──────────────────────────────────────────────────

describe("module requirements", () => {
	it("ordering module requires at least one fulfillment mode", () => {
		const result = validateSettings(
			makeSnapshot({
				modules: ["ordering"],
				fulfillment: makeFulfillment({ enabledModes: [] })
			})
		);
		expect(result.errors.some((e) => e.code === "module-requires")).toBe(true);
	});

	it("ordering module passes with pickup", () => {
		const result = validateSettings(
			makeSnapshot({
				modules: ["ordering"],
				fulfillment: makeFulfillment({ enabledModes: ["pickup"] })
			})
		);
		expect(result.errors.filter((e) => e.code === "module-requires")).toEqual([]);
	});

	it("bookings module requires active location with hours", () => {
		const result = validateSettings(
			makeSnapshot({
				modules: ["bookings"],
				locations: [makeLocation({ isActive: true, hasHours: false })]
			})
		);
		expect(result.errors.some((e) => e.code === "module-requires")).toBe(true);
	});

	it("bookings module passes with configured location", () => {
		const result = validateSettings(
			makeSnapshot({
				modules: ["bookings"],
				locations: [makeLocation({ isActive: true, hasHours: true })]
			})
		);
		expect(result.errors.filter((e) => e.code === "module-requires")).toEqual([]);
	});
});

// ── Go-Live Readiness ────────────────────────────────────────────────────────

describe("go-live readiness", () => {
	it("blocks go-live without active location", () => {
		const result = validateSettings(
			makeSnapshot({ locations: [] })
		);
		expect(result.goLiveReady).toBe(false);
		expect(result.goLiveBlockers.length).toBeGreaterThan(0);
	});

	it("blocks go-live when active location missing hours", () => {
		const result = validateSettings(
			makeSnapshot({
				locations: [makeLocation({ hasHours: false })]
			})
		);
		expect(result.goLiveBlockers.some((e) => e.section === "hours")).toBe(true);
	});

	it("blocks go-live without business name", () => {
		const result = validateSettings(
			makeSnapshot({ profile: makeProfile({ businessName: "" }) })
		);
		expect(result.goLiveBlockers.some((e) => e.fieldPath === "profile.businessName")).toBe(true);
	});

	it("blocks go-live without contact email", () => {
		const result = validateSettings(
			makeSnapshot({ profile: makeProfile({ contactEmail: "" }) })
		);
		expect(result.goLiveBlockers.some((e) => e.fieldPath === "profile.contactEmail")).toBe(true);
	});

	it("blocks go-live with ordering but no fulfillment modes", () => {
		const result = validateSettings(
			makeSnapshot({
				modules: ["ordering"],
				fulfillment: makeFulfillment({ enabledModes: [] })
			})
		);
		expect(result.goLiveBlockers.some((e) => e.section === "fulfillment")).toBe(true);
	});
});

// ── Error Filtering Helpers ──────────────────────────────────────────────────

describe("getErrorsForSection", () => {
	it("filters errors by section", () => {
		const result = validateSettings(
			makeSnapshot({
				profile: makeProfile({ businessName: "" }),
				locations: [makeLocation({ name: "" })]
			})
		);
		expect(getErrorsForSection(result.errors, "profile").length).toBeGreaterThan(0);
		expect(getErrorsForSection(result.errors, "locations").length).toBeGreaterThan(0);
	});
});

describe("getErrorsForField", () => {
	it("filters errors by field path", () => {
		const result = validateSettings(
			makeSnapshot({ profile: makeProfile({ businessName: "" }) })
		);
		const fieldErrors = getErrorsForField(result.errors, "profile.businessName");
		expect(fieldErrors).toHaveLength(1);
	});
});

describe("hasErrorsInSection", () => {
	it("returns true when section has errors", () => {
		const result = validateSettings(
			makeSnapshot({ profile: makeProfile({ businessName: "" }) })
		);
		expect(hasErrorsInSection(result.errors, "profile")).toBe(true);
		expect(hasErrorsInSection(result.errors, "locations")).toBe(false);
	});
});
