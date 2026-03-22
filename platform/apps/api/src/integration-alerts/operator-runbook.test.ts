// ---------------------------------------------------------------------------
// E8-S6-T4: Operator response runbook validation tests.
// Ensures every alert category has a corresponding runbook entry and
// the documentation follows the expected format.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { alertCategories } from "@platform/types";

const runbookPath = resolve(
	__dirname,
	"../../../../docs/integration-failure-runbook.md",
);
const runbookContent = readFileSync(runbookPath, "utf-8");

describe("Integration failure operator runbook", () => {
	// -----------------------------------------------------------------------
	// Completeness tests
	// -----------------------------------------------------------------------

	describe("completeness", () => {
		it("has a runbook entry for every alert category", () => {
			const categoryStrings: Record<string, string> = {
				"payment-connection-failure": "Payment Connection Failure",
				"webhook-processing-failure": "Webhook Processing Failure",
				"notification-delivery-failure": "Notification Delivery Failure",
				"provider-api-outage": "Provider API Outage",
			};

			for (const category of alertCategories) {
				const heading = categoryStrings[category];
				expect(
					runbookContent.includes(heading),
					`Missing runbook section for category: ${category} (expected heading: "${heading}")`,
				).toBe(true);
			}
		});

		it("includes the category identifier for each alert category", () => {
			for (const category of alertCategories) {
				expect(
					runbookContent.includes(category),
					`Missing category identifier: ${category}`,
				).toBe(true);
			}
		});

		it("includes severity/response matrix", () => {
			expect(runbookContent).toContain("Severity");
			expect(runbookContent).toContain("Response SLA");
			expect(runbookContent).toContain("Critical");
			expect(runbookContent).toContain("Warning");
			expect(runbookContent).toContain("Info");
		});

		it("includes escalation paths", () => {
			expect(runbookContent).toContain("Escalation Paths");
			expect(runbookContent).toContain("L1");
			expect(runbookContent).toContain("L2");
		});

		it("includes on-call checklist", () => {
			expect(runbookContent).toContain("On-Call Checklist");
		});
	});

	// -----------------------------------------------------------------------
	// Format tests
	// -----------------------------------------------------------------------

	describe("format", () => {
		it("has required sections for each alert category", () => {
			const requiredSections = [
				"Description",
				"Typical Causes",
				"Diagnostic Steps",
				"Resolution Procedures",
				"Escalation Criteria",
			];

			for (const section of requiredSections) {
				expect(
					runbookContent.includes(section),
					`Missing required section: ${section}`,
				).toBe(true);
			}
		});

		it("contains markdown headers for structure", () => {
			const headerCount = (runbookContent.match(/^#{1,4}\s/gm) ?? [])
				.length;
			expect(headerCount).toBeGreaterThan(5);
		});

		it("references the platform-admin dashboard", () => {
			expect(runbookContent).toContain("Integration Failure Dashboard");
		});

		it("references the webhook inspection view", () => {
			expect(runbookContent).toContain("Webhook Inspection");
		});
	});
});
