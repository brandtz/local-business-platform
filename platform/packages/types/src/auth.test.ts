import { describe, expect, it } from "vitest";

import {
	adminRouteAccessResults,
	adminRouteSpaces,
	attachImpersonationToAuthViewerState,
	attachImpersonationToRequestViewerContext,
	authActorTypes,
	authAssuranceLevels,
	authViewerStatuses,
	canTransitionCustomDomainPromotionState,
	canTransitionCustomDomainVerificationState,
	canTransitionTenantStatus,
	canTenantAccessLifecycleMode,
	createAnonymousRequestViewerContext,
	createAnonymousAuthViewerState,
	createAuthenticatedRequestViewerContext,
	createAuthenticatedAuthViewerState,
	credentialKinds,
	customDomainPromotionStates,
	customDomainVerificationStates,
	describeImpersonationIndicator,
	getAllowedCustomDomainPromotionStates,
	getAllowedCustomDomainVerificationStates,
	getAllowedTenantLifecycleTransitions,
	getAllowedTenantStatusesForAccessMode,
	getTenantRequestFailureReasonForAccessMode,
	hasResolvedTenant,
	impersonationSessionStates,
	logoutReasons,
	type PasswordResetRequestComplete,
	type PasswordResetRequestInitiate,
	platformTenantOperationalHealthReasons,
	platformTenantOperationalHealthStatuses,
	platformTenantOperationalLiveRoutingStatuses,
	platformTenantOperationalPreviewStatuses,
	platformTenantOperationalPublishStatuses,
	type PlatformTenantOperationalSummary,
	type PlatformTenantOperationalSummaryQueryRequest,
	tenantModuleKeys,
	tenantVerticalTemplateKeys,
	type TenantProvisioningRequest,
	type TenantProvisioningResult,
	type TenantProvisioningSummary,
	platformActorRoles,
	privilegedOperations,
	resolveTenantLifecycleEvent,
	resolveAdminRouteAccess,
	securityEventKinds,
	securityEventSeverities,
	sessionScopes,
	stepUpAuthReasons,
	tenantActorRoles,
	tenantLifecycleAccessModes,
	tenantLifecycleEvents,
	tenantRequestFailureReasons,
	tenantResolutionRouteSpaces,
	tenantResolutionSources,
	tenantStatuses,
	userStatuses
} from "./auth";

describe("auth types contract", () => {
	it("defines the supported actor, role, and session values", () => {
		expect(authActorTypes).toEqual(["platform", "tenant", "customer"]);
		expect(platformActorRoles).toContain("support");
		expect(tenantActorRoles).toEqual(["owner", "admin", "manager", "staff"]);
		expect(tenantStatuses).toEqual(["draft", "active", "suspended", "archived"]);
		expect(tenantLifecycleEvents).toEqual(["activate", "suspend", "archive"]);
		expect(userStatuses).toContain("suspended");
		expect(credentialKinds).toEqual(["password"]);
		expect(sessionScopes).toEqual(["platform", "tenant", "customer"]);
		expect(logoutReasons).toEqual(["user_logout", "security_event"]);
		expect(authViewerStatuses).toEqual(["anonymous", "authenticated"]);
		expect(adminRouteSpaces).toEqual(["platform-admin", "tenant-admin"]);
		expect(tenantResolutionRouteSpaces).toEqual([
			"customer",
			"tenant-admin",
			"platform-admin"
		]);
		expect(tenantResolutionSources).toEqual([
			"platform-admin-domain",
			"tenant-admin-context",
			"custom-domain",
			"preview-subdomain",
			"unresolved"
		]);
		expect(tenantRequestFailureReasons).toEqual([
			"tenant-unresolved",
			"tenant-inactive",
			"tenant-suspended",
			"tenant-archived"
		]);
		expect(tenantLifecycleAccessModes).toEqual([
			"tenant-admin",
			"preview-routing",
			"live-routing",
			"publish-control"
		]);
		expect(authAssuranceLevels).toEqual(["single-factor", "multi-factor"]);
		expect(privilegedOperations).toEqual([
			"platform:read",
			"platform:write",
			"impersonation:start",
			"tenant:settings-write",
			"tenant:staff-write",
			"tenant:payment-write",
			"tenant:refund-write"
		]);
		expect(stepUpAuthReasons).toEqual([
			"platform-write",
			"platform-impersonation",
			"tenant-admin-sensitive-write",
			"payment-credential-write",
			"refund-write"
		]);
		expect(securityEventSeverities).toEqual(["info", "warning", "critical"]);
		expect(securityEventKinds).toEqual([
			"auth.login_succeeded",
			"auth.login_failed",
			"auth.impersonation_started",
			"auth.impersonation_revoked",
			"auth.mfa_challenge_issued",
			"auth.mfa_challenge_verified",
			"auth.mfa_challenge_failed",
			"auth.password_reset_requested",
			"auth.password_reset_completed",
			"auth.password_reset_failed"
		]);
		expect(impersonationSessionStates).toEqual(["active", "expired", "revoked"]);
		const resetRequest: PasswordResetRequestInitiate = {
			email: "owner@example.com"
		};
		const resetComplete: PasswordResetRequestComplete = {
			password: "new-secret",
			resetToken: "reset-token"
		};
		expect(resetRequest.email).toBe("owner@example.com");
		expect(resetComplete.resetToken).toBe("reset-token");
		expect(adminRouteAccessResults).toEqual([
			"allow",
			"auth-required",
			"access-denied"
		]);
		const provisioningRequest: TenantProvisioningRequest = {
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
		};
		const provisioningResult: TenantProvisioningResult = {
			defaultConfiguration: {
				brandPreset: "starter-brand",
				currency: "USD",
				navigationPreset: "service-default",
				operatingMode: "hybrid",
				taxMode: "exclusive",
				themePreset: "starter-light",
				timezone: "UTC"
			},
			ownerMembership: {
				isPrimary: true,
				joinedAt: "2026-03-16T23:00:00.000Z",
				role: "owner",
				tenant: {
					displayName: "Alpha Fitness",
					id: "tenant-1",
					slug: "alpha-fitness",
					status: "draft"
				},
				userId: "tenant-user-1"
			},
			enabledModules: ["catalog", "ordering", "bookings", "content", "operations"],
			tenant: {
				displayName: provisioningRequest.displayName,
				id: "tenant-1",
				previewSubdomain: provisioningRequest.previewSubdomain,
				slug: provisioningRequest.slug,
				status: "draft"
			},
			verticalTemplate: provisioningRequest.verticalTemplate
		};
		const provisioningSummary: TenantProvisioningSummary = {
			defaultConfiguration: provisioningResult.defaultConfiguration,
			enabledModules: provisioningResult.enabledModules,
			ownerUserId: provisioningResult.ownerMembership.userId,
			previewSubdomain: provisioningResult.tenant.previewSubdomain,
			tenantDisplayName: provisioningResult.tenant.displayName,
			tenantId: provisioningResult.tenant.id,
			tenantSlug: provisioningResult.tenant.slug,
			tenantStatus: provisioningResult.tenant.status,
			verticalTemplate: provisioningResult.verticalTemplate
		};
		expect(provisioningRequest.owner.status).toBe("invited");
		expect(tenantModuleKeys).toContain("ordering");
		expect(tenantVerticalTemplateKeys).toContain("restaurant-core");
		expect(provisioningResult.tenant.previewSubdomain).toBe("alpha");
		expect(provisioningSummary.tenantStatus).toBe("draft");
		expect(platformTenantOperationalPreviewStatuses).toEqual([
			"configured",
			"missing"
		]);
		expect(platformTenantOperationalLiveRoutingStatuses).toEqual([
			"managed-subdomain-only",
			"custom-domain-configured"
		]);
		expect(platformTenantOperationalPublishStatuses).toEqual(["ready", "blocked"]);
		expect(platformTenantOperationalHealthStatuses).toEqual([
			"healthy",
			"attention-required"
		]);
		expect(platformTenantOperationalHealthReasons).toEqual([
			"tenant-inactive",
			"tenant-suspended",
			"tenant-archived",
			"preview-route-missing"
		]);
		const operationalSummaryQuery: PlatformTenantOperationalSummaryQueryRequest = {
			tenants: [
				{
					customDomains: ["alpha.example.com"],
					displayName: "Alpha Fitness",
					id: "tenant-1",
					lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "active"
				}
			]
		};
		const operationalSummary: PlatformTenantOperationalSummary = {
			customDomainCount: 1,
			healthReasons: [],
			healthStatus: "healthy",
			lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
			lifecycleStatus: "active",
			liveRoutingStatus: "custom-domain-configured",
			previewStatus: "configured",
			previewSubdomain: "alpha",
			publishBlockedReason: null,
			publishStatus: "ready",
			tenantDisplayName: "Alpha Fitness",
			tenantId: "tenant-1",
			tenantSlug: "alpha-fitness"
		};
		expect(operationalSummaryQuery.tenants[0]?.status).toBe("active");
		expect(operationalSummary.publishStatus).toBe("ready");
		expect(customDomainVerificationStates).toEqual([
			"pending",
			"verified",
			"failed",
			"denied"
		]);
		expect(customDomainPromotionStates).toEqual([
			"not-requested",
			"ready",
			"promoted",
			"failed",
			"rollback-pending",
			"rolled-back",
			"denied"
		]);
	});

	it("defines the allowed tenant lifecycle transitions without reopening archived tenants", () => {
		expect(getAllowedTenantLifecycleTransitions("draft")).toEqual([
			{
				event: "activate",
				from: "draft",
				to: "active"
			},
			{
				event: "archive",
				from: "draft",
				to: "archived"
			}
		]);
		expect(getAllowedTenantLifecycleTransitions("active")).toEqual([
			{
				event: "suspend",
				from: "active",
				to: "suspended"
			},
			{
				event: "archive",
				from: "active",
				to: "archived"
			}
		]);
		expect(getAllowedTenantLifecycleTransitions("suspended")).toEqual([
			{
				event: "activate",
				from: "suspended",
				to: "active"
			},
			{
				event: "archive",
				from: "suspended",
				to: "archived"
			}
		]);
		expect(getAllowedTenantLifecycleTransitions("archived")).toEqual([]);
		expect(canTransitionTenantStatus("draft", "active")).toBe(true);
		expect(canTransitionTenantStatus("active", "draft")).toBe(false);
		expect(canTransitionTenantStatus("archived", "active")).toBe(false);
		expect(resolveTenantLifecycleEvent("suspended", "active")).toBe("activate");
		expect(resolveTenantLifecycleEvent("active", "draft")).toBeNull();
	});

	it("defines custom domain verification and promotion transitions without conflating routing behavior", () => {
		expect(getAllowedCustomDomainVerificationStates("pending")).toEqual([
			"verified",
			"failed",
			"denied"
		]);
		expect(getAllowedCustomDomainPromotionStates("ready")).toEqual([
			"promoted",
			"failed",
			"denied"
		]);
		expect(getAllowedCustomDomainPromotionStates("promoted")).toEqual([
			"rollback-pending"
		]);
		expect(canTransitionCustomDomainVerificationState("failed", "pending")).toBe(true);
		expect(canTransitionCustomDomainVerificationState("denied", "verified")).toBe(false);
		expect(canTransitionCustomDomainPromotionState("ready", "promoted")).toBe(true);
		expect(canTransitionCustomDomainPromotionState("not-requested", "promoted")).toBe(false);
	});

	it("defines lifecycle access modes for admin, preview, live routing, and publish control", () => {
		expect(getAllowedTenantStatusesForAccessMode("tenant-admin")).toEqual([
			"draft",
			"active"
		]);
		expect(getAllowedTenantStatusesForAccessMode("publish-control")).toEqual([
			"active"
		]);
		expect(canTenantAccessLifecycleMode("draft", "preview-routing")).toBe(true);
		expect(canTenantAccessLifecycleMode("draft", "live-routing")).toBe(false);
		expect(getTenantRequestFailureReasonForAccessMode("draft", "publish-control")).toBe(
			"tenant-inactive"
		);
		expect(getTenantRequestFailureReasonForAccessMode("archived", "tenant-admin")).toBe(
			"tenant-archived"
		);
	});

	it("creates minimal auth viewer states without privileged fields", () => {
		const anonymousState = createAnonymousAuthViewerState("tenant");
		const authenticatedState = createAuthenticatedAuthViewerState(
			{
				actorType: "platform",
				displayName: "Operator",
				id: "user-1"
			},
			"platform"
		);

		expect(anonymousState).toEqual({
			actorType: null,
			displayName: null,
			isAuthenticated: false,
			sessionScope: "tenant",
			status: "anonymous",
			userId: null
		});
		expect(authenticatedState).toEqual({
			actorType: "platform",
			displayName: "Operator",
			isAuthenticated: true,
			sessionScope: "platform",
			status: "authenticated",
			userId: "user-1"
		});
		expect("platformRole" in authenticatedState).toBe(false);
	});

	it("creates backend request viewer contexts with minimal trusted identity fields", () => {
		const anonymousViewer = createAnonymousRequestViewerContext();
		const platformViewer = createAuthenticatedRequestViewerContext({
			actorType: "platform",
			platformRole: "support",
			sessionScope: "platform",
			userId: "platform-user-1"
		});
		const tenantViewer = createAuthenticatedRequestViewerContext({
			actorType: "tenant",
			platformRole: "owner",
			sessionScope: "tenant",
			userId: "tenant-user-1"
		});

		expect(anonymousViewer).toEqual({
			actorType: null,
			isAuthenticated: false,
			platformRole: null,
			sessionScope: null,
			userId: null
		});
		expect(platformViewer).toEqual({
			actorType: "platform",
			isAuthenticated: true,
			platformRole: "support",
			sessionScope: "platform",
			userId: "platform-user-1"
		});
		expect(tenantViewer).toEqual({
			actorType: "tenant",
			isAuthenticated: true,
			platformRole: null,
			sessionScope: "tenant",
			userId: "tenant-user-1"
		});
	});

	it("attaches impersonation metadata and describes active impersonation state", () => {
		const authViewerState = attachImpersonationToAuthViewerState(
			createAuthenticatedAuthViewerState(
				{
					actorType: "tenant",
					displayName: "Tenant Admin",
					id: "tenant-user-1"
				},
				"tenant"
			),
			{
				expiresAt: "2026-03-16T20:30:00.000Z",
				impersonatorUserId: "platform-user-1",
				platformRole: "support",
				sessionId: "impersonation-1",
				startedAt: "2026-03-16T20:00:00.000Z",
				targetTenantId: "tenant-1",
				targetTenantName: "Alpha Fitness"
			}
		);
		const requestViewerContext = attachImpersonationToRequestViewerContext(
			createAuthenticatedRequestViewerContext({
				actorType: "tenant",
				sessionScope: "tenant",
				userId: "tenant-user-1"
			}),
			authViewerState.impersonationSession!
		);

		expect(authViewerState.impersonationSession?.sessionId).toBe("impersonation-1");
		expect(requestViewerContext.impersonationSession?.platformRole).toBe("support");
		expect(describeImpersonationIndicator(authViewerState)).toContain(
			"Impersonation active for Alpha Fitness"
		);
	});

	it("resolves admin route access by authentication and route-space scope", () => {
		const anonymousState = createAnonymousAuthViewerState("platform");
		const platformState = createAuthenticatedAuthViewerState(
			{
				actorType: "platform",
				displayName: "Operator",
				id: "platform-user-1"
			},
			"platform"
		);
		const tenantState = createAuthenticatedAuthViewerState(
			{
				actorType: "tenant",
				displayName: "Tenant Admin",
				id: "tenant-user-1"
			},
			"tenant"
		);

		expect(resolveAdminRouteAccess(anonymousState, "platform-admin")).toBe(
			"auth-required"
		);
		expect(resolveAdminRouteAccess(platformState, "platform-admin")).toBe("allow");
		expect(resolveAdminRouteAccess(platformState, "tenant-admin")).toBe(
			"access-denied"
		);
		expect(resolveAdminRouteAccess(tenantState, "tenant-admin")).toBe("allow");
		expect(resolveAdminRouteAccess(tenantState, "platform-admin")).toBe(
			"access-denied"
		);
	});

	it("identifies when tenant resolution produced a tenant context", () => {
		expect(
			hasResolvedTenant({
				kind: "tenant",
				normalizedHost: "alpha.preview.local",
				source: "preview-subdomain",
				tenant: {
					customDomains: ["alpha.example.com"],
					displayName: "Alpha Fitness",
					id: "tenant-1",
					previewSubdomain: "alpha",
					slug: "alpha-fitness",
					status: "active"
				}
			})
		).toBe(true);
		expect(
			hasResolvedTenant({
				kind: "unresolved",
				normalizedHost: null,
				source: "unresolved"
			})
		).toBe(false);
	});
});