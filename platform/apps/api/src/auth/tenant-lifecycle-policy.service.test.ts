import { describe, expect, it } from "vitest";

import {
	TenantLifecyclePolicyError,
	TenantLifecyclePolicyService
} from "./tenant-lifecycle-policy.service";

const service = new TenantLifecyclePolicyService();

describe("tenant lifecycle policy service", () => {
	it("returns the allowed transition set for each tenant lifecycle status", () => {
		expect(service.getAllowedTransitions("draft")).toEqual([
			{
				event: "activate",
				from: "draft",
				to: "active"
			},
			{
				event: "archive",
				from: "draft",
				to: "archived"
			}
		]);

		expect(service.getAllowedTransitions("archived")).toEqual([]);
	});

	it("allows activation, suspension, and archival transitions that match the state machine", () => {
		expect(service.requireTransition("draft", "active")).toEqual({
			event: "activate",
			from: "draft",
			to: "active"
		});

		expect(service.requireTransition("active", "suspended")).toEqual({
			event: "suspend",
			from: "active",
			to: "suspended"
		});

		expect(service.requireTransition("suspended", "archived")).toEqual({
			event: "archive",
			from: "suspended",
			to: "archived"
		});
	});

	it("rejects already-applied, unsupported, and archived-terminal transitions", () => {
		expect(() => service.requireTransition("active", "active")).toThrow(
			TenantLifecyclePolicyError
		);

		try {
			service.requireTransition("draft", "suspended");
		} catch (error) {
			expect((error as TenantLifecyclePolicyError).reason).toBe("invalid-transition");
		}

		try {
			service.requireTransition("archived", "active");
		} catch (error) {
			expect((error as TenantLifecyclePolicyError).reason).toBe("terminal-status");
		}
	});
});