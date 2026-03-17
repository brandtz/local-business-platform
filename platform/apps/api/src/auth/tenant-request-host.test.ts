import { describe, expect, it } from "vitest";

import {
	normalizeRequestHost,
	readPreferredRequestHost,
	resolveManagedSubdomain
} from "./tenant-request-host";

describe("tenant request host helpers", () => {
	it("normalizes host header values deterministically", () => {
		expect(normalizeRequestHost(" Alpha.Preview.Local:3000 ")).toBe(
			"alpha.preview.local"
		);
		expect(normalizeRequestHost("https://beta.example.com:8443")).toBe(
			"beta.example.com"
		);
		expect(normalizeRequestHost("gamma.example.com, proxy.local")).toBe(
			"gamma.example.com"
		);
	});

	it("extracts a preview subdomain only for matching managed domains", () => {
		expect(
			resolveManagedSubdomain("alpha.preview.local", ["preview.local"])
		).toBe("alpha");
		expect(
			resolveManagedSubdomain("alpha.preview.local", ["tenant-admin.local"])
		).toBeNull();
	});

	it("rejects base domains and nested subdomain chains", () => {
		expect(resolveManagedSubdomain("preview.local", ["preview.local"])).toBeNull();
		expect(
			resolveManagedSubdomain("deep.alpha.preview.local", ["preview.local"])
		).toBeNull();
	});

	it("prefers forwarded host headers over direct host headers", () => {
		expect(
			readPreferredRequestHost({
				host: "fallback.preview.local",
				"x-forwarded-host": ["alpha.example.com", "proxy.local"]
			})
		).toBe("alpha.example.com");
	});
});