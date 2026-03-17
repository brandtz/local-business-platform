import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readPrivilegedAuthPolicyDoc(): string {
	return readFileSync(
		path.resolve(__dirname, "..", "..", "..", "..", "docs", "privileged-auth-policy.md"),
		"utf8"
	);
}

describe("privileged auth policy documentation contract", () => {
	it("documents current step-up triggers and non-triggers", () => {
		const document = readPrivilegedAuthPolicyDoc();

		expect(document).toContain("## Current Step-Up Triggers");
		expect(document).toContain("platform:write");
		expect(document).toContain("impersonation:start");
		expect(document).toContain("tenant:payment-write");
		expect(document).toContain("tenant:refund-write");
		expect(document).toContain("## Current Non-Triggers");
		expect(document).toContain("single-factor");
		expect(document).toContain("multifactor");
	});
});