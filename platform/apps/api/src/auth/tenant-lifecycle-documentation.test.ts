import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readTenantLifecycleDoc(): string {
	return readFileSync(
		path.resolve(
			__dirname,
			"..",
			"..",
			"..",
			"..",
			"docs",
			"tenant-lifecycle-state-machine.md"
		),
		"utf8"
	);
}

describe("tenant lifecycle documentation contract", () => {
	it("documents the lifecycle states, allowed transitions, and archived terminal rule", () => {
		const document = readTenantLifecycleDoc();

		expect(document).toContain("## States");
		expect(document).toContain("## Allowed Transitions");
		expect(document).toContain("draft -> active");
		expect(document).toContain("active -> suspended");
		expect(document).toContain("suspended -> active");
		expect(document).toContain("archived is terminal");
		expect(document).toContain("tenants:write");
		expect(document).toContain("tenant.lifecycle_transitioned");
		expect(document).toContain("tenant.lifecycle_denied");
	});
});