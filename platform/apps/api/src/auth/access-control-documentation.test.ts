import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readAccessControlDoc(): string {
	return readFileSync(
		path.resolve(__dirname, "..", "..", "..", "..", "docs", "access-control-model.md"),
		"utf8"
	);
}

describe("access control documentation contract", () => {
	it("documents role-based and module-based capability boundaries", () => {
		const document = readAccessControlDoc();

		expect(document).toContain("## Order of Evaluation");
		expect(document).toContain("## Platform-Admin Evaluation Path");
		expect(document).toContain("## Role-Based Baseline Capabilities");
		expect(document).toContain("## Platform Role-Based Capabilities");
		expect(document).toContain("## Module-Based Capability Narrowing");
		expect(document).toContain("## Platform-Only Operations and Escalation Rules");
		expect(document).toContain("## Failure Behavior");
		expect(document).toContain("tenant:manage");
		expect(document).toContain("tenant-unresolved");
		expect(document).toContain("tenant-inactive");
		expect(document).toContain("tenant-suspended");
		expect(document).toContain("tenant-archived");
		expect(document).toContain("orders:manage");
		expect(document).toContain("platform:manage");
		expect(document).toContain("impersonation:manage");
	});
});
