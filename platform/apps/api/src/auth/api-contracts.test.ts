import { describe, expect, it } from "vitest";

import {
	assertValidPasswordResetCompleteRequest,
	assertValidPasswordResetInitiateRequest,
	assertValidTenantProvisioningRequest,
	assertValidLogoutRequest,
	assertValidPasswordLoginRequest,
	assertValidSessionRefreshRequest,
	AuthApiContractError
} from "./api-contracts";

describe("auth api contracts", () => {
	it("accepts password login requests for each supported actor class", () => {
		expect(() =>
			assertValidPasswordLoginRequest({
				actorType: "platform",
				email: "owner@example.com",
				password: "secret",
				scope: "platform"
			})
		).not.toThrow();

		expect(() =>
			assertValidPasswordLoginRequest({
				actorType: "tenant",
				email: "manager@example.com",
				password: "secret",
				scope: "tenant"
			})
		).not.toThrow();

		expect(() =>
			assertValidPasswordLoginRequest({
				actorType: "customer",
				email: "customer@example.com",
				password: "secret",
				scope: "customer"
			})
		).not.toThrow();
	});

	it("rejects login requests with missing fields or mismatched actor and scope", () => {
		expect(() => assertValidPasswordLoginRequest(null)).toThrow(AuthApiContractError);
		expect(() =>
			assertValidPasswordLoginRequest({
				actorType: "tenant",
				email: "",
				password: "secret",
				scope: "tenant"
			})
		).toThrow("Login payload requires a non-empty email.");
		expect(() =>
			assertValidPasswordLoginRequest({
				actorType: "platform",
				email: "owner@example.com",
				password: "secret",
				scope: "tenant"
			})
		).toThrow("Login actor type and session scope must align.");
	});

	it("accepts and rejects refresh requests correctly", () => {
		expect(() =>
			assertValidSessionRefreshRequest({
				refreshToken: "refresh-token"
			})
		).not.toThrow();
		expect(() => assertValidSessionRefreshRequest({ refreshToken: "  " })).toThrow(
			"Refresh payload requires a non-empty refresh token."
		);
	});

	it("accepts and rejects logout requests correctly", () => {
		expect(() =>
			assertValidLogoutRequest({
				reason: "user_logout",
				sessionId: "session-1",
				terminateAllSessions: true
			})
		).not.toThrow();

		expect(() =>
			assertValidLogoutRequest({
				reason: "bad-reason",
				sessionId: "session-1"
			})
		).toThrow("Logout payload reason is invalid.");

		expect(() =>
			assertValidLogoutRequest({
				sessionId: "session-1",
				terminateAllSessions: "yes"
			})
		).toThrow("Logout payload terminateAllSessions must be a boolean when provided.");
	});

	it("accepts and rejects password reset requests correctly", () => {
		expect(() =>
			assertValidPasswordResetInitiateRequest({
				email: "owner@example.com"
			})
		).not.toThrow();
		expect(() =>
			assertValidPasswordResetCompleteRequest({
				password: "new-secret",
				resetToken: "reset-token"
			})
		).not.toThrow();

		expect(() => assertValidPasswordResetInitiateRequest({ email: "   " })).toThrow(
			"Password reset request payload requires a non-empty email."
		);
		expect(() =>
			assertValidPasswordResetCompleteRequest({
				password: "new-secret",
				resetToken: "   "
			})
		).toThrow("Password reset completion payload requires a non-empty reset token.");
		expect(() =>
			assertValidPasswordResetCompleteRequest({
				password: "   ",
				resetToken: "reset-token"
			})
		).toThrow("Password reset completion payload requires a non-empty password.");
		expect(() => assertValidPasswordResetCompleteRequest(null)).toThrow(
			AuthApiContractError
		);
	});

	it("accepts and rejects tenant provisioning requests correctly", () => {
		expect(() =>
			assertValidTenantProvisioningRequest({
				displayName: "Alpha Fitness",
				owner: {
					actorType: "tenant",
					email: "owner@alpha.example.com",
					id: "tenant-user-1",
					status: "invited"
				},
				previewSubdomain: "alpha",
				slug: "alpha-fitness",
				verticalTemplate: "hybrid-local-business"
			})
		).not.toThrow();

		expect(() =>
			assertValidTenantProvisioningRequest({
				displayName: "Alpha Fitness",
				owner: {
					actorType: "platform",
					email: "owner@alpha.example.com",
					id: "tenant-user-1",
					status: "invited"
				},
				previewSubdomain: "alpha",
				slug: "alpha-fitness",
				verticalTemplate: "hybrid-local-business"
			})
		).toThrow("Tenant provisioning owner must use the tenant actor type.");

		expect(() =>
			assertValidTenantProvisioningRequest({
				displayName: "Alpha Fitness",
				owner: {
					actorType: "tenant",
					email: "owner@alpha.example.com",
					id: "tenant-user-1",
					status: "suspended"
				},
				previewSubdomain: "alpha",
				slug: "alpha-fitness",
				verticalTemplate: "hybrid-local-business"
			})
		).toThrow("Tenant provisioning owner status must be invited or active.");

		expect(() =>
			assertValidTenantProvisioningRequest({
				displayName: "Alpha Fitness",
				owner: null,
				previewSubdomain: "alpha",
				slug: "alpha-fitness",
				verticalTemplate: "hybrid-local-business"
			})
		).toThrow("Tenant provisioning payload requires an owner object.");

		expect(() =>
			assertValidTenantProvisioningRequest({
				displayName: "Alpha Fitness",
				owner: {
					actorType: "tenant",
					email: "owner@alpha.example.com",
					id: "tenant-user-1",
					status: "invited"
				},
				previewSubdomain: "alpha",
				slug: "alpha-fitness",
				verticalTemplate: "unsupported-template"
			})
		).toThrow("Tenant provisioning payload requires a supported verticalTemplate.");
	});
});
