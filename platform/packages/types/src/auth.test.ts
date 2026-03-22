import { describe, expect, it } from "vitest";

import {
	adminRouteAccessResults,
	adminRouteSpaces,
	attachImpersonationToAuthViewerState,
	attachImpersonationToRequestViewerContext,
	authActorTypes,
	authAssuranceLevels,
	authViewerStatuses,
	buildPreviewEnvironmentMetadata,
	buildPreviewSurfaceUrl,
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
	derivePreviewEnvironmentStatus,
	describeImpersonationIndicator,
	getAllowedCustomDomainPromotionStates,
	getAllowedCustomDomainVerificationStates,
	getAllowedTenantLifecycleTransitions,
	getAllowedTenantStatusesForAccessMode,
	getTenantRequestFailureReasonForAccessMode,
	getFullModuleRegistry,
	getFullTemplateRegistry,
	getModuleDependencies,
	getModuleRegistryEntry,
	getTemplateRegistryEntry,
	isValidModuleKey,
	isValidTemplateKey,
	moduleCategories,
	previewEnvironmentStatuses,
	previewSurfaceTypes,
	validateModuleEnablementSet,
	validateTemplateModuleCompatibility,
	type PreviewEnvironmentMetadata,
	type TemplateRegistryEntry,
	type TenantModuleEnablementRecord,
	type TenantTemplateAssociation,
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
	derivePlatformOperationsWidgets,
	applyTenantFilterCriteria,
	tenantModuleKeys,
	tenantVerticalTemplateKeys,
	operatingModes,
	transactionFlows,
	resolveOperatingMode,
	getOperatingModeRules,
	isTransactionFlowAllowed,
	getBlockedFlows,
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
			previewMetadata: buildPreviewEnvironmentMetadata(
				"tenant-1",
				provisioningRequest.previewSubdomain,
				{
					managedPreviewAdminDomain: "admin.preview.local",
					managedPreviewStorefrontDomain: "preview.local"
				}
			),
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
			previewMetadata: provisioningResult.previewMetadata,
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

	it("defines a stable module registry with categories, dependencies, and enablement validation", () => {
		expect(moduleCategories).toEqual(["commerce", "scheduling", "content", "operations"]);
		expect(isValidModuleKey("catalog")).toBe(true);
		expect(isValidModuleKey("nonexistent")).toBe(false);

		const registry = getFullModuleRegistry();
		expect(registry).toHaveLength(6);
		expect(registry.map((e) => e.key)).toEqual([
			"catalog", "ordering", "bookings", "content", "operations", "portfolio"
		]);

		const ordering = getModuleRegistryEntry("ordering");
		expect(ordering.category).toBe("commerce");
		expect(ordering.requiredDependencies).toEqual(["catalog"]);

		expect(getModuleDependencies("bookings")).toEqual(["catalog"]);
		expect(getModuleDependencies("content")).toEqual([]);

		expect(validateModuleEnablementSet(["catalog", "ordering"])).toEqual({ valid: true });
		expect(validateModuleEnablementSet(["ordering"])).toEqual({
			valid: false,
			reason: "missing-dependency",
			module: "ordering",
			missingDependency: "catalog"
		});
		expect(validateModuleEnablementSet([])).toEqual({ valid: false, reason: "empty-set" });
		expect(validateModuleEnablementSet(["catalog", "invalid"])).toEqual({
			valid: false,
			reason: "unknown-module",
			invalidKey: "invalid"
		});

		const enablementRecord: TenantModuleEnablementRecord = {
			enabledModules: ["catalog", "content"],
			tenantId: "tenant-1",
			verticalTemplate: "restaurant-core"
		};
		expect(enablementRecord.tenantId).toBe("tenant-1");
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

	it("defines preview environment metadata types and builder functions", () => {
		expect(previewSurfaceTypes).toEqual(["storefront", "admin"]);
		expect(previewEnvironmentStatuses).toEqual(["configured", "not-configured"]);
	});

	it("builds preview surface URLs from subdomain and managed domain", () => {
		expect(buildPreviewSurfaceUrl("alpha", "preview.local")).toBe("alpha.preview.local");
		expect(buildPreviewSurfaceUrl("alpha", "admin.preview.local")).toBe("alpha.admin.preview.local");
		expect(buildPreviewSurfaceUrl("alpha", null)).toBeNull();
		expect(buildPreviewSurfaceUrl("alpha", undefined)).toBeNull();
		expect(buildPreviewSurfaceUrl("alpha", "")).toBeNull();
		expect(buildPreviewSurfaceUrl("", "preview.local")).toBeNull();
	});

	it("derives preview environment status from surface availability", () => {
		expect(
			derivePreviewEnvironmentStatus([
				{ available: true, previewUrl: "alpha.preview.local", surface: "storefront" },
				{ available: true, previewUrl: "alpha.admin.preview.local", surface: "admin" }
			])
		).toBe("configured");
		expect(
			derivePreviewEnvironmentStatus([
				{ available: false, previewUrl: null, surface: "storefront" },
				{ available: false, previewUrl: null, surface: "admin" }
			])
		).toBe("not-configured");
		expect(
			derivePreviewEnvironmentStatus([
				{ available: true, previewUrl: "alpha.preview.local", surface: "storefront" },
				{ available: false, previewUrl: null, surface: "admin" }
			])
		).toBe("configured");
	});

	it("builds complete preview environment metadata with both surfaces configured", () => {
		const metadata: PreviewEnvironmentMetadata = buildPreviewEnvironmentMetadata(
			"tenant-1",
			"alpha",
			{
				managedPreviewAdminDomain: "admin.preview.local",
				managedPreviewStorefrontDomain: "preview.local"
			}
		);

		expect(metadata).toEqual({
			environmentStatus: "configured",
			previewSubdomain: "alpha",
			surfaces: [
				{
					available: true,
					previewUrl: "alpha.preview.local",
					surface: "storefront"
				},
				{
					available: true,
					previewUrl: "alpha.admin.preview.local",
					surface: "admin"
				}
			],
			tenantId: "tenant-1"
		});
	});

	it("builds preview environment metadata with not-configured status when no domains present", () => {
		const metadata = buildPreviewEnvironmentMetadata("tenant-1", "alpha");

		expect(metadata.environmentStatus).toBe("not-configured");
		expect(metadata.surfaces.every((s) => !s.available)).toBe(true);
		expect(metadata.surfaces.every((s) => s.previewUrl === null)).toBe(true);
	});

	it("builds preview environment metadata with partial surface availability", () => {
		const metadata = buildPreviewEnvironmentMetadata("tenant-1", "alpha", {
			managedPreviewStorefrontDomain: "preview.local"
		});

		expect(metadata.environmentStatus).toBe("configured");
		const storefront = metadata.surfaces.find((s) => s.surface === "storefront");
		const admin = metadata.surfaces.find((s) => s.surface === "admin");
		expect(storefront?.available).toBe(true);
		expect(storefront?.previewUrl).toBe("alpha.preview.local");
		expect(admin?.available).toBe(false);
		expect(admin?.previewUrl).toBeNull();
	});

	it("ensures preview metadata is tenant-scoped and does not cross tenant boundaries", () => {
		const metadata1 = buildPreviewEnvironmentMetadata("tenant-1", "alpha", {
			managedPreviewStorefrontDomain: "preview.local"
		});
		const metadata2 = buildPreviewEnvironmentMetadata("tenant-2", "bravo", {
			managedPreviewStorefrontDomain: "preview.local"
		});

		expect(metadata1.tenantId).toBe("tenant-1");
		expect(metadata2.tenantId).toBe("tenant-2");
		expect(metadata1.previewSubdomain).toBe("alpha");
		expect(metadata2.previewSubdomain).toBe("bravo");
		expect(metadata1.surfaces[0]?.previewUrl).not.toBe(metadata2.surfaces[0]?.previewUrl);
	});

	it("defines a stable template registry with display metadata and required modules", () => {
		const registry = getFullTemplateRegistry();
		expect(registry).toHaveLength(3);
		expect(registry.map((e) => e.key)).toEqual([
			"restaurant-core",
			"services-core",
			"hybrid-local-business"
		]);

		const restaurant: TemplateRegistryEntry = getTemplateRegistryEntry("restaurant-core");
		expect(restaurant.displayName).toBe("Restaurant");
		expect(restaurant.operatingMode).toBe("ordering");
		expect(restaurant.requiredModules).toEqual(["catalog", "ordering", "content", "operations"]);
		expect(restaurant.description).toBeTruthy();

		const services = getTemplateRegistryEntry("services-core");
		expect(services.displayName).toBe("Services");
		expect(services.operatingMode).toBe("booking");
		expect(services.requiredModules).toContain("bookings");

		const hybrid = getTemplateRegistryEntry("hybrid-local-business");
		expect(hybrid.displayName).toBe("Local Business");
		expect(hybrid.operatingMode).toBe("hybrid");
		expect(hybrid.requiredModules).toContain("ordering");
		expect(hybrid.requiredModules).toContain("bookings");
	});

	it("validates template key recognition", () => {
		expect(isValidTemplateKey("restaurant-core")).toBe(true);
		expect(isValidTemplateKey("services-core")).toBe(true);
		expect(isValidTemplateKey("hybrid-local-business")).toBe(true);
		expect(isValidTemplateKey("nonexistent")).toBe(false);
		expect(isValidTemplateKey("")).toBe(false);
	});

	it("validates template-module compatibility for complete module sets", () => {
		expect(
			validateTemplateModuleCompatibility(
				"restaurant-core",
				["catalog", "ordering", "content", "operations"]
			)
		).toEqual({ compatible: true });

		expect(
			validateTemplateModuleCompatibility(
				"services-core",
				["catalog", "bookings", "content", "operations"]
			)
		).toEqual({ compatible: true });

		expect(
			validateTemplateModuleCompatibility(
				"hybrid-local-business",
				["catalog", "ordering", "bookings", "content", "operations"]
			)
		).toEqual({ compatible: true });
	});

	it("rejects template-module compatibility for missing required modules", () => {
		expect(
			validateTemplateModuleCompatibility("restaurant-core", ["catalog", "content"])
		).toEqual({
			compatible: false,
			reason: "missing-required-module",
			missingModule: "ordering"
		});
	});

	it("rejects template-module compatibility for unknown templates", () => {
		expect(
			validateTemplateModuleCompatibility("nonexistent", ["catalog"])
		).toEqual({
			compatible: false,
			reason: "unknown-template",
			templateKey: "nonexistent"
		});
	});

	it("allows superset module sets for template compatibility", () => {
		expect(
			validateTemplateModuleCompatibility(
				"restaurant-core",
				["catalog", "ordering", "bookings", "content", "operations"]
			)
		).toEqual({ compatible: true });
	});

	it("defines tenant-template association shape", () => {
		const association: TenantTemplateAssociation = {
			assignedAt: "2026-03-17T10:00:00.000Z",
			templateKey: "restaurant-core",
			tenantId: "tenant-1"
		};

		expect(association.tenantId).toBe("tenant-1");
		expect(association.templateKey).toBe("restaurant-core");
		expect(association.assignedAt).toBeTruthy();
	});

	it("ensures each template declares configuration defaults consistent with its operating mode", () => {
		const registry = getFullTemplateRegistry();

		for (const entry of registry) {
			expect(entry.configurationDefaults.operatingMode).toBe(entry.operatingMode);
		}
	});

	describe("platform operations widget derivation", () => {
		it("returns empty widget set for no summaries", () => {
			const widgets = derivePlatformOperationsWidgets([]);

			expect(widgets.auditSummary).toEqual({
				lastAuditAt: null,
				totalDenied: 0,
				totalTransitions: 0
			});
			expect(widgets.publishSummary).toEqual({
				blockedCount: 0,
				commonBlockReasons: [],
				readyCount: 0
			});
			expect(widgets.jobStatus).toEqual({
				failedCount: 0,
				pendingCount: 0,
				status: "idle"
			});
		});

		it("tracks audit transitions and latest audit timestamp", () => {
			const widgets = derivePlatformOperationsWidgets([
				{
					customDomainCount: 0,
					healthReasons: [],
					healthStatus: "healthy",
					lastLifecycleAuditAt: "2026-03-17T05:00:00.000Z",
					lifecycleStatus: "active",
					liveRoutingStatus: "managed-subdomain-only",
					previewStatus: "configured",
					previewSubdomain: "alpha",
					publishBlockedReason: null,
					publishStatus: "ready",
					tenantDisplayName: "Alpha",
					tenantId: "t-1",
					tenantSlug: "alpha"
				},
				{
					customDomainCount: 0,
					healthReasons: [],
					healthStatus: "healthy",
					lastLifecycleAuditAt: "2026-03-17T08:00:00.000Z",
					lifecycleStatus: "active",
					liveRoutingStatus: "managed-subdomain-only",
					previewStatus: "configured",
					previewSubdomain: "bravo",
					publishBlockedReason: null,
					publishStatus: "ready",
					tenantDisplayName: "Bravo",
					tenantId: "t-2",
					tenantSlug: "bravo"
				}
			]);

			expect(widgets.auditSummary.totalTransitions).toBe(2);
			expect(widgets.auditSummary.lastAuditAt).toBe("2026-03-17T08:00:00.000Z");
		});

		it("counts publish-ready and blocked tenants with common reasons", () => {
			const widgets = derivePlatformOperationsWidgets([
				{
					customDomainCount: 0,
					healthReasons: [],
					healthStatus: "healthy",
					lastLifecycleAuditAt: null,
					lifecycleStatus: "active",
					liveRoutingStatus: "managed-subdomain-only",
					previewStatus: "configured",
					previewSubdomain: "a",
					publishBlockedReason: null,
					publishStatus: "ready",
					tenantDisplayName: "A",
					tenantId: "t-1",
					tenantSlug: "a"
				},
				{
					customDomainCount: 0,
					healthReasons: ["tenant-inactive"],
					healthStatus: "attention-required",
					lastLifecycleAuditAt: null,
					lifecycleStatus: "suspended",
					liveRoutingStatus: "managed-subdomain-only",
					previewStatus: "configured",
					previewSubdomain: "b",
					publishBlockedReason: "tenant-inactive",
					publishStatus: "blocked",
					tenantDisplayName: "B",
					tenantId: "t-2",
					tenantSlug: "b"
				}
			]);

			expect(widgets.publishSummary.readyCount).toBe(1);
			expect(widgets.publishSummary.blockedCount).toBe(1);
			expect(widgets.publishSummary.commonBlockReasons).toContain("tenant-inactive");
		});

		it("marks job status as attention-required when any tenant needs attention", () => {
			const widgets = derivePlatformOperationsWidgets([
				{
					customDomainCount: 0,
					healthReasons: ["preview-route-missing"],
					healthStatus: "attention-required",
					lastLifecycleAuditAt: null,
					lifecycleStatus: "active",
					liveRoutingStatus: "managed-subdomain-only",
					previewStatus: "missing",
					previewSubdomain: null,
					publishBlockedReason: null,
					publishStatus: "ready",
					tenantDisplayName: "C",
					tenantId: "t-3",
					tenantSlug: "c"
				}
			]);

			expect(widgets.jobStatus.status).toBe("attention-required");
		});
	});

	describe("platform tenant filter criteria", () => {
		const summaries: PlatformTenantOperationalSummary[] = [
			{
				customDomainCount: 0,
				healthReasons: [],
				healthStatus: "healthy",
				lastLifecycleAuditAt: null,
				lifecycleStatus: "active",
				liveRoutingStatus: "managed-subdomain-only",
				previewStatus: "configured",
				previewSubdomain: "alpha",
				publishBlockedReason: null,
				publishStatus: "ready",
				tenantDisplayName: "Alpha",
				tenantId: "t-1",
				tenantSlug: "alpha"
			},
			{
				customDomainCount: 0,
				healthReasons: ["tenant-inactive"],
				healthStatus: "attention-required",
				lastLifecycleAuditAt: null,
				lifecycleStatus: "suspended",
				liveRoutingStatus: "managed-subdomain-only",
				previewStatus: "configured",
				previewSubdomain: "bravo",
				publishBlockedReason: "tenant-inactive",
				publishStatus: "blocked",
				tenantDisplayName: "Bravo",
				tenantId: "t-2",
				tenantSlug: "bravo"
			}
		];

		it("returns all summaries with empty criteria", () => {
			expect(applyTenantFilterCriteria(summaries, {})).toHaveLength(2);
		});

		it("filters by lifecycle status", () => {
			const result = applyTenantFilterCriteria(summaries, { lifecycleStatus: "suspended" });

			expect(result).toHaveLength(1);
			expect(result[0].tenantId).toBe("t-2");
		});

		it("filters by publish status", () => {
			const result = applyTenantFilterCriteria(summaries, { publishStatus: "blocked" });

			expect(result).toHaveLength(1);
			expect(result[0].tenantId).toBe("t-2");
		});

		it("searches by display name case-insensitively", () => {
			const result = applyTenantFilterCriteria(summaries, { searchText: "ALPHA" });

			expect(result).toHaveLength(1);
			expect(result[0].tenantId).toBe("t-1");
		});

		it("returns empty for non-matching criteria", () => {
			expect(
				applyTenantFilterCriteria(summaries, { lifecycleStatus: "archived" })
			).toHaveLength(0);
		});

		it("applies compound filters", () => {
			const result = applyTenantFilterCriteria(summaries, {
				healthStatus: "attention-required",
				publishStatus: "blocked"
			});

			expect(result).toHaveLength(1);
			expect(result[0].tenantId).toBe("t-2");
		});
	});

	// ── Operating Mode Rules ─────────────────────────────────────────────────

	describe("operating mode rules", () => {
		it("defines three operating modes", () => {
			expect(operatingModes).toEqual(["ordering", "booking", "hybrid"]);
		});

		it("defines three transaction flows", () => {
			expect(transactionFlows).toEqual(["cart", "order", "booking"]);
		});

		describe("resolveOperatingMode", () => {
			it("resolves to ordering when only ordering module is enabled", () => {
				expect(resolveOperatingMode(["catalog", "ordering", "content"])).toBe("ordering");
			});

			it("resolves to booking when only bookings module is enabled", () => {
				expect(resolveOperatingMode(["catalog", "bookings", "content"])).toBe("booking");
			});

			it("resolves to hybrid when both ordering and bookings are enabled", () => {
				expect(resolveOperatingMode(["catalog", "ordering", "bookings", "content", "operations"])).toBe("hybrid");
			});

			it("defaults to ordering when neither ordering nor bookings is enabled", () => {
				expect(resolveOperatingMode(["catalog", "content"])).toBe("ordering");
			});
		});

		describe("getOperatingModeRules", () => {
			it("returns rules for ordering mode", () => {
				const rules = getOperatingModeRules("ordering");
				expect(rules.mode).toBe("ordering");
				expect(rules.allowedFlows).toEqual(["cart", "order"]);
				expect(rules.requiredModules).toContain("ordering");
			});

			it("returns rules for booking mode", () => {
				const rules = getOperatingModeRules("booking");
				expect(rules.mode).toBe("booking");
				expect(rules.allowedFlows).toEqual(["booking"]);
				expect(rules.requiredModules).toContain("bookings");
			});

			it("returns rules for hybrid mode", () => {
				const rules = getOperatingModeRules("hybrid");
				expect(rules.mode).toBe("hybrid");
				expect(rules.allowedFlows).toEqual(["cart", "order", "booking"]);
				expect(rules.requiredModules).toContain("ordering");
				expect(rules.requiredModules).toContain("bookings");
			});
		});

		describe("isTransactionFlowAllowed", () => {
			it("allows cart and order in ordering mode", () => {
				expect(isTransactionFlowAllowed("ordering", "cart")).toBe(true);
				expect(isTransactionFlowAllowed("ordering", "order")).toBe(true);
			});

			it("blocks booking in ordering mode", () => {
				expect(isTransactionFlowAllowed("ordering", "booking")).toBe(false);
			});

			it("allows booking in booking mode", () => {
				expect(isTransactionFlowAllowed("booking", "booking")).toBe(true);
			});

			it("blocks cart and order in booking mode", () => {
				expect(isTransactionFlowAllowed("booking", "cart")).toBe(false);
				expect(isTransactionFlowAllowed("booking", "order")).toBe(false);
			});

			it("allows all flows in hybrid mode", () => {
				expect(isTransactionFlowAllowed("hybrid", "cart")).toBe(true);
				expect(isTransactionFlowAllowed("hybrid", "order")).toBe(true);
				expect(isTransactionFlowAllowed("hybrid", "booking")).toBe(true);
			});
		});

		describe("getBlockedFlows", () => {
			it("returns booking as blocked for ordering mode", () => {
				expect(getBlockedFlows("ordering")).toEqual(["booking"]);
			});

			it("returns cart and order as blocked for booking mode", () => {
				expect(getBlockedFlows("booking")).toEqual(["cart", "order"]);
			});

			it("returns empty for hybrid mode", () => {
				expect(getBlockedFlows("hybrid")).toEqual([]);
			});
		});
	});
});