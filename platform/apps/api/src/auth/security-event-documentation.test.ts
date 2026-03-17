import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSecurityEventTaxonomyDoc(): string {
	return readFileSync(
		path.resolve(__dirname, "..", "..", "..", "..", "docs", "security-event-taxonomy.md"),
		"utf8"
	);
}

describe("security event taxonomy documentation contract", () => {
	it("documents the auth security event vocabulary and severity baseline", () => {
		const document = readSecurityEventTaxonomyDoc();

		expect(document).toContain("auth.login_failed");
		expect(document).toContain("auth.impersonation_started");
		expect(document).toContain("auth.mfa_challenge_verified");
		expect(document).toContain("auth.password_reset_completed");
		expect(document).toContain("critical");
		expect(document).toContain("plaintext secrets");
	});
});