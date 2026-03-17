import { Injectable } from "@nestjs/common";

export type ManagedSubdomainGenerationInput = {
	displayName?: string | null;
	existingSubdomains: readonly string[];
	preferredSlug?: string | null;
};

const DEFAULT_SUBDOMAIN = "tenant";
const MAX_SUBDOMAIN_LENGTH = 32;

@Injectable()
export class ManagedSubdomainService {
	generateSubdomain(input: ManagedSubdomainGenerationInput): string {
		const normalizedExisting = new Set(
			input.existingSubdomains.map((subdomain) => subdomain.trim().toLowerCase())
		);
		const baseCandidate = this.normalizeCandidate(
			input.preferredSlug || input.displayName || DEFAULT_SUBDOMAIN
		);

		if (!normalizedExisting.has(baseCandidate)) {
			return baseCandidate;
		}

		for (let suffix = 2; suffix < 10_000; suffix += 1) {
			const suffixToken = `-${suffix}`;
			const truncatedBase = baseCandidate.slice(
				0,
				MAX_SUBDOMAIN_LENGTH - suffixToken.length
			).replace(/-+$/g, "");
			const candidate = `${truncatedBase || DEFAULT_SUBDOMAIN}${suffixToken}`;

			if (!normalizedExisting.has(candidate)) {
				return candidate;
			}
		}

		throw new Error("Managed subdomain generation exhausted available suffix space.");
	}

	private normalizeCandidate(value: string): string {
		const asciiValue = value
			.normalize("NFKD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase();
		const normalized = asciiValue
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.replace(/-+/g, "-")
			.slice(0, MAX_SUBDOMAIN_LENGTH)
			.replace(/-+$/g, "");

		return normalized || DEFAULT_SUBDOMAIN;
	}
}