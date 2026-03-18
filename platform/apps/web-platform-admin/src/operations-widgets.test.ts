import { describe, expect, it } from "vitest";

import type { PlatformOperationsWidgetSet } from "@platform/types";

import { describeWidgetPanelState, type WidgetPanelViewState } from "./operations-widgets";

function buildWidgetSet(
	overrides: Partial<PlatformOperationsWidgetSet> = {}
): PlatformOperationsWidgetSet {
	return {
		auditSummary: {
			lastAuditAt: null,
			totalDenied: 0,
			totalTransitions: 0
		},
		jobStatus: {
			failedCount: 0,
			pendingCount: 0,
			status: "idle"
		},
		publishSummary: {
			blockedCount: 0,
			commonBlockReasons: [],
			readyCount: 0
		},
		...overrides
	};
}

describe("operations widget panel", () => {
	describe("describeWidgetPanelState", () => {
		it("returns loading message for loading state", () => {
			expect(describeWidgetPanelState({ kind: "loading" })).toBe(
				"Loading operations widgets…"
			);
		});

		it("returns ready message for ready state", () => {
			const state: WidgetPanelViewState = {
				kind: "ready",
				widgets: buildWidgetSet()
			};

			expect(describeWidgetPanelState(state)).toBe(
				"Operations widgets loaded."
			);
		});

		it("returns error message for error state", () => {
			const state: WidgetPanelViewState = {
				kind: "error",
				message: "Failed to load widgets"
			};

			expect(describeWidgetPanelState(state)).toBe("Failed to load widgets");
		});
	});

	describe("widget set data shapes", () => {
		it("audit summary widget has correct shape", () => {
			const widgets = buildWidgetSet({
				auditSummary: {
					lastAuditAt: "2026-03-17T08:00:00.000Z",
					totalDenied: 3,
					totalTransitions: 10
				}
			});

			expect(widgets.auditSummary.totalTransitions).toBe(10);
			expect(widgets.auditSummary.totalDenied).toBe(3);
			expect(widgets.auditSummary.lastAuditAt).toBe("2026-03-17T08:00:00.000Z");
		});

		it("job status widget defaults to idle with zero counts", () => {
			const widgets = buildWidgetSet();

			expect(widgets.jobStatus.status).toBe("idle");
			expect(widgets.jobStatus.pendingCount).toBe(0);
			expect(widgets.jobStatus.failedCount).toBe(0);
		});

		it("job status widget reflects attention-required state", () => {
			const widgets = buildWidgetSet({
				jobStatus: {
					failedCount: 1,
					pendingCount: 2,
					status: "attention-required"
				}
			});

			expect(widgets.jobStatus.status).toBe("attention-required");
		});

		it("publish summary widget tracks ready and blocked counts", () => {
			const widgets = buildWidgetSet({
				publishSummary: {
					blockedCount: 5,
					commonBlockReasons: ["tenant-inactive", "tenant-suspended"],
					readyCount: 10
				}
			});

			expect(widgets.publishSummary.readyCount).toBe(10);
			expect(widgets.publishSummary.blockedCount).toBe(5);
			expect(widgets.publishSummary.commonBlockReasons).toEqual([
				"tenant-inactive",
				"tenant-suspended"
			]);
		});

		it("publish summary widget handles empty block reasons", () => {
			const widgets = buildWidgetSet();

			expect(widgets.publishSummary.commonBlockReasons).toEqual([]);
		});
	});
});
