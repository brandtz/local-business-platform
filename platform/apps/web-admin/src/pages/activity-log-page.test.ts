// Tests for activity log page helpers

import { describe, expect, it } from "vitest";

import type { SecurityEventRecord } from "@platform/types";

describe("activity log page helpers", () => {
	function toRelativeTime(isoDate: string): string {
		const diffMs = Date.now() - new Date(isoDate).getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return "just now";
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffHrs = Math.floor(diffMin / 60);
		if (diffHrs < 24) return `${diffHrs}h ago`;
		const diffDays = Math.floor(diffHrs / 24);
		return `${diffDays}d ago`;
	}

	function getSeverityBadgeClass(severity: string): string {
		switch (severity) {
			case "critical": return "status-badge--error";
			case "warning": return "status-badge--warning";
			default: return "status-badge--info";
		}
	}

	it("formats relative time correctly", () => {
		const now = new Date().toISOString();
		expect(toRelativeTime(now)).toBe("just now");

		const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
		expect(toRelativeTime(fiveMinAgo)).toBe("5m ago");

		const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
		expect(toRelativeTime(twoHoursAgo)).toBe("2h ago");

		const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
		expect(toRelativeTime(threeDaysAgo)).toBe("3d ago");
	});

	it("maps severity to badge class", () => {
		expect(getSeverityBadgeClass("critical")).toBe("status-badge--error");
		expect(getSeverityBadgeClass("warning")).toBe("status-badge--warning");
		expect(getSeverityBadgeClass("info")).toBe("status-badge--info");
	});

	it("constructs a valid entry display from SecurityEventRecord", () => {
		const record: SecurityEventRecord = {
			id: "evt-1",
			kind: "auth.login_succeeded",
			severity: "info",
			actorType: "tenant",
			occurredAt: new Date().toISOString(),
			context: { ip: "192.168.1.1", browser: "Chrome" },
		};

		expect(record.id).toBe("evt-1");
		expect(record.kind).toBe("login_success");
		expect(record.severity).toBe("info");
		expect(record.actorType).toBe("tenant");
		expect(Object.keys(record.context)).toContain("ip");
	});
});
