export function normalizeRequestHost(rawHost: string | null | undefined): string | null {
	if (!rawHost) {
		return null;
	}

	const primaryHostValue = rawHost.split(",")[0]?.trim();

	if (!primaryHostValue) {
		return null;
	}

	const hostValue = readHostValue(primaryHostValue);

	if (!hostValue) {
		return null;
	}

	const withoutTrailingDot = hostValue.replace(/\.$/, "").toLowerCase();

	if (!withoutTrailingDot) {
		return null;
	}

	return withoutTrailingDot.replace(/:\d+$/, "");
}

export function resolveManagedSubdomain(
	host: string,
	managedDomains: readonly string[]
): string | null {
	for (const managedDomain of managedDomains) {
		const normalizedManagedDomain = normalizeRequestHost(managedDomain);

		if (!normalizedManagedDomain || host === normalizedManagedDomain) {
			continue;
		}

		const managedDomainSuffix = `.${normalizedManagedDomain}`;

		if (!host.endsWith(managedDomainSuffix)) {
			continue;
		}

		const subdomain = host.slice(0, -managedDomainSuffix.length);

		if (subdomain && !subdomain.includes(".")) {
			return subdomain;
		}
	}

	return null;
}

export type RequestHostHeaders = {
	host?: string | readonly string[] | null;
	"x-forwarded-host"?: string | readonly string[] | null;
};

export function readPreferredRequestHost(headers: RequestHostHeaders): string | null {
	return (
		normalizeRequestHost(readSingleHeaderValue(headers["x-forwarded-host"])) ||
		normalizeRequestHost(readSingleHeaderValue(headers.host))
	);
}

function readHostValue(rawValue: string): string | null {
	if (rawValue.includes("://")) {
		try {
			return new URL(rawValue).host;
		} catch {
			return null;
		}
	}

	return rawValue;
}

function readSingleHeaderValue(
	value: string | readonly string[] | null | undefined
): string | null {
	if (Array.isArray(value)) {
		return value[0] || null;
	}

	if (typeof value === "string") {
		return value;
	}

	return null;
}