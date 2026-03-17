import { describe, expect, it } from "vitest";

import { ManagedSubdomainService } from "./managed-subdomain.service";

const service = new ManagedSubdomainService();

describe("managed subdomain service", () => {
	it("uses the preferred slug when available and normalizes it to a valid managed subdomain", () => {
		expect(
			service.generateSubdomain({
				displayName: "Alpha Fitness",
				existingSubdomains: [],
				preferredSlug: " Alpha Fitness! "
			})
		).toBe("alpha-fitness");
	});

	it("normalizes unicode and punctuation-heavy display names into deterministic fallback subdomains", () => {
		expect(
			service.generateSubdomain({
				displayName: "Café Déjà Vu & Spa",
				existingSubdomains: []
			})
		).toBe("cafe-deja-vu-spa");
	});

	it("handles collisions by appending numeric suffixes deterministically", () => {
		expect(
			service.generateSubdomain({
				displayName: "Alpha Fitness",
				existingSubdomains: ["alpha-fitness", "alpha-fitness-2"]
			})
		).toBe("alpha-fitness-3");
	});

	it("falls back to a safe default token when normalization would otherwise be empty", () => {
		expect(
			service.generateSubdomain({
				displayName: "!!!",
				existingSubdomains: ["tenant"]
			})
		).toBe("tenant-2");
	});
});