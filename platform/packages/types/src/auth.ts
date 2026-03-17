export const authActorTypes = ["platform", "tenant", "customer"] as const;

export type AuthActorType = (typeof authActorTypes)[number];

export const platformActorRoles = ["owner", "admin", "support", "analyst"] as const;

export type PlatformActorRole = (typeof platformActorRoles)[number];

export const platformCapabilities = [
	"platform:manage",
	"tenants:read",
	"tenants:write",
	"domains:manage",
	"impersonation:manage",
	"analytics:read"
] as const;

export type PlatformCapability = (typeof platformCapabilities)[number];

export const tenantStatuses = ["draft", "active", "suspended", "archived"] as const;

export type TenantStatus = (typeof tenantStatuses)[number];

export const tenantLifecycleEvents = [
	"activate",
	"suspend",
	"archive"
] as const;

export type TenantLifecycleEvent = (typeof tenantLifecycleEvents)[number];

export const customDomainVerificationStates = [
	"pending",
	"verified",
	"failed",
	"denied"
] as const;

export type CustomDomainVerificationState =
	(typeof customDomainVerificationStates)[number];

export const customDomainPromotionStates = [
	"not-requested",
	"ready",
	"promoted",
	"failed",
	"rollback-pending",
	"rolled-back",
	"denied"
] as const;

export type CustomDomainPromotionState =
	(typeof customDomainPromotionStates)[number];

export const tenantActorRoles = ["owner", "admin", "manager", "staff"] as const;

export type TenantActorRole = (typeof tenantActorRoles)[number];

export const userStatuses = ["invited", "active", "suspended", "archived"] as const;

export type UserStatus = (typeof userStatuses)[number];

export const credentialKinds = ["password"] as const;

export type CredentialKind = (typeof credentialKinds)[number];

export const sessionScopes = ["platform", "tenant", "customer"] as const;

export type SessionScope = (typeof sessionScopes)[number];

export type IdentityUserRecord = {
	actorType: AuthActorType;
	email: string;
	id: string;
	platformRole?: PlatformActorRole;
	status: UserStatus;
};

export type AuthSessionRecord = {
	expiresAt: string;
	id: string;
	idleExpiresAt: string;
	scope: SessionScope;
	userId: string;
};

export type TenantSummary = {
	displayName: string;
	id: string;
	slug: string;
	status: TenantStatus;
};

export type TenantLifecycleTransition = {
	event: TenantLifecycleEvent;
	from: TenantStatus;
	to: TenantStatus;
};

export type TenantMembershipRecord = {
	isPrimary: boolean;
	joinedAt: string;
	role: TenantActorRole;
	revokedAt?: string | null;
	tenant: TenantSummary;
	userId: string;
};

export type AuthUserSummary = {
	actorType: AuthActorType;
	displayName?: string;
	email: string;
	id: string;
	status: UserStatus;
};

export type PasswordLoginRequest = {
	actorType: AuthActorType;
	email: string;
	password: string;
	scope: SessionScope;
};

export type PasswordLoginResponse = {
	session: AuthSessionRecord;
	user: AuthUserSummary;
};

export type SessionRefreshRequest = {
	refreshToken: string;
};

export type SessionRefreshResponse = {
	session: AuthSessionRecord;
	user: AuthUserSummary;
};

export type PasswordResetRequestInitiate = {
	email: string;
};

export type PasswordResetRequestComplete = {
	password: string;
	resetToken: string;
};

export type TenantProvisioningOwner = {
	actorType: "tenant";
	displayName?: string;
	email: string;
	id: string;
	status: Extract<UserStatus, "invited" | "active">;
};

export type TenantProvisioningDefaults = {
	brandPreset: string;
	currency: string;
	navigationPreset: string;
	operatingMode: "ordering" | "booking" | "hybrid";
	taxMode: "exclusive" | "inclusive";
	themePreset: string;
	timezone: string;
};

export const tenantModuleKeys = [
	"catalog",
	"ordering",
	"bookings",
	"content",
	"operations"
] as const;

export type TenantModuleKey = (typeof tenantModuleKeys)[number];

export const moduleCategories = [
	"commerce",
	"scheduling",
	"content",
	"operations"
] as const;

export type ModuleCategory = (typeof moduleCategories)[number];

export type ModuleRegistryEntry = {
	category: ModuleCategory;
	description: string;
	displayName: string;
	key: TenantModuleKey;
	requiredDependencies: readonly TenantModuleKey[];
};

const moduleRegistry: Record<TenantModuleKey, ModuleRegistryEntry> = {
	catalog: {
		category: "commerce",
		description: "Product and service catalog management",
		displayName: "Catalog",
		key: "catalog",
		requiredDependencies: []
	},
	ordering: {
		category: "commerce",
		description: "Online ordering and checkout",
		displayName: "Ordering",
		key: "ordering",
		requiredDependencies: ["catalog"]
	},
	bookings: {
		category: "scheduling",
		description: "Appointment and reservation scheduling",
		displayName: "Bookings",
		key: "bookings",
		requiredDependencies: ["catalog"]
	},
	content: {
		category: "content",
		description: "Storefront content and page management",
		displayName: "Content",
		key: "content",
		requiredDependencies: []
	},
	operations: {
		category: "operations",
		description: "Business operations, hours, and fulfillment configuration",
		displayName: "Operations",
		key: "operations",
		requiredDependencies: []
	}
};

export function getModuleRegistryEntry(
	key: TenantModuleKey
): ModuleRegistryEntry {
	return moduleRegistry[key];
}

export function getFullModuleRegistry(): readonly ModuleRegistryEntry[] {
	return tenantModuleKeys.map((key) => moduleRegistry[key]);
}

export function isValidModuleKey(
	key: string
): key is TenantModuleKey {
	return (tenantModuleKeys as readonly string[]).includes(key);
}

export function getModuleDependencies(
	key: TenantModuleKey
): readonly TenantModuleKey[] {
	return moduleRegistry[key].requiredDependencies;
}

export type ModuleEnablementValidationResult =
	| { valid: true }
	| { valid: false; reason: "unknown-module"; invalidKey: string }
	| { valid: false; reason: "missing-dependency"; module: TenantModuleKey; missingDependency: TenantModuleKey }
	| { valid: false; reason: "empty-set" };

export function validateModuleEnablementSet(
	modules: readonly string[]
): ModuleEnablementValidationResult {
	if (modules.length === 0) {
		return { valid: false, reason: "empty-set" };
	}

	for (const key of modules) {
		if (!isValidModuleKey(key)) {
			return { valid: false, reason: "unknown-module", invalidKey: key };
		}
	}

	const enabledSet = new Set(modules);

	for (const key of modules) {
		const deps = getModuleDependencies(key as TenantModuleKey);
		for (const dep of deps) {
			if (!enabledSet.has(dep)) {
				return {
					valid: false,
					reason: "missing-dependency",
					module: key as TenantModuleKey,
					missingDependency: dep
				};
			}
		}
	}

	return { valid: true };
}

export type TenantModuleEnablementRecord = {
	enabledModules: readonly TenantModuleKey[];
	tenantId: string;
	verticalTemplate: TenantVerticalTemplateKey;
};

export const tenantVerticalTemplateKeys = [
	"restaurant-core",
	"services-core",
	"hybrid-local-business"
] as const;

export type TenantVerticalTemplateKey =
	(typeof tenantVerticalTemplateKeys)[number];

export type TenantProvisioningRequest = {
	displayName: string;
	owner: TenantProvisioningOwner;
	previewSubdomain: string;
	slug: string;
	verticalTemplate: TenantVerticalTemplateKey;
};

export type TenantProvisioningResult = {
	defaultConfiguration: TenantProvisioningDefaults;
	enabledModules: TenantModuleKey[];
	ownerMembership: TenantMembershipRecord;
	previewMetadata: PreviewEnvironmentMetadata;
	tenant: TenantResolutionTenantRecord;
	verticalTemplate: TenantVerticalTemplateKey;
};

export type TenantProvisioningSummary = {
	defaultConfiguration: TenantProvisioningDefaults;
	enabledModules: TenantModuleKey[];
	ownerUserId: string;
	previewMetadata: PreviewEnvironmentMetadata;
	previewSubdomain: string;
	tenantDisplayName: string;
	tenantId: string;
	tenantSlug: string;
	tenantStatus: TenantStatus;
	verticalTemplate: TenantVerticalTemplateKey;
};

export const platformTenantOperationalPreviewStatuses = [
	"configured",
	"missing"
] as const;

export type PlatformTenantOperationalPreviewStatus =
	(typeof platformTenantOperationalPreviewStatuses)[number];

export const platformTenantOperationalLiveRoutingStatuses = [
	"managed-subdomain-only",
	"custom-domain-configured"
] as const;

export type PlatformTenantOperationalLiveRoutingStatus =
	(typeof platformTenantOperationalLiveRoutingStatuses)[number];

export const platformTenantOperationalPublishStatuses = [
	"ready",
	"blocked"
] as const;

export type PlatformTenantOperationalPublishStatus =
	(typeof platformTenantOperationalPublishStatuses)[number];

export const platformTenantOperationalHealthStatuses = [
	"healthy",
	"attention-required"
] as const;

export type PlatformTenantOperationalHealthStatus =
	(typeof platformTenantOperationalHealthStatuses)[number];

export const platformTenantOperationalHealthReasons = [
	"tenant-inactive",
	"tenant-suspended",
	"tenant-archived",
	"preview-route-missing"
] as const;

export type PlatformTenantOperationalHealthReason =
	(typeof platformTenantOperationalHealthReasons)[number];

export type PlatformTenantOperationalSummaryQueryTenant = {
	customDomains?: readonly string[];
	displayName: string;
	id: string;
	lastLifecycleAuditAt?: string | null;
	previewSubdomain?: string | null;
	slug: string;
	status: TenantStatus;
};

export type PlatformTenantOperationalSummaryQueryRequest = {
	tenants: PlatformTenantOperationalSummaryQueryTenant[];
};

export type PlatformTenantOperationalSummary = {
	customDomainCount: number;
	healthReasons: PlatformTenantOperationalHealthReason[];
	healthStatus: PlatformTenantOperationalHealthStatus;
	lastLifecycleAuditAt: string | null;
	lifecycleStatus: TenantStatus;
	liveRoutingStatus: PlatformTenantOperationalLiveRoutingStatus;
	previewStatus: PlatformTenantOperationalPreviewStatus;
	previewSubdomain: string | null;
	publishBlockedReason: Exclude<TenantRequestFailureReason, "tenant-unresolved"> | null;
	publishStatus: PlatformTenantOperationalPublishStatus;
	tenantDisplayName: string;
	tenantId: string;
	tenantSlug: string;
};

export type CustomDomainVerificationEvidence = {
	checkedAt: string;
	details?: string | null;
	method: "dns-cname" | "dns-txt" | "http-token" | "manual";
	observedValue?: string | null;
	providerReference?: string | null;
};

export type TenantCustomDomainRecord = {
	createdAt: string;
	hostname: string;
	id: string;
	promotionFailureReason?: string | null;
	promotionState: CustomDomainPromotionState;
	promotionStateChangedAt?: string | null;
	promotedAt?: string | null;
	rollbackCompletedAt?: string | null;
	tenantId: string;
	updatedAt: string;
	verificationEvidence?: CustomDomainVerificationEvidence | null;
	verificationFailureReason?: string | null;
	verificationState: CustomDomainVerificationState;
	verificationStateChangedAt?: string | null;
};

export const logoutReasons = ["user_logout", "security_event"] as const;

export type LogoutReason = (typeof logoutReasons)[number];

export type LogoutRequest = {
	reason?: LogoutReason;
	sessionId: string;
	terminateAllSessions?: boolean;
};

export type LogoutResponse = {
	revokedSessionIds: string[];
	revokedSessionsCount: number;
};

export const authViewerStatuses = ["anonymous", "authenticated"] as const;

export type AuthViewerStatus = (typeof authViewerStatuses)[number];

export const adminRouteSpaces = ["platform-admin", "tenant-admin"] as const;

export type AdminRouteSpace = (typeof adminRouteSpaces)[number];

export const adminRouteAccessResults = [
	"allow",
	"auth-required",
	"access-denied"
] as const;

export type AdminRouteAccessResult = (typeof adminRouteAccessResults)[number];

export const tenantResolutionRouteSpaces = [
	"customer",
	"tenant-admin",
	"platform-admin"
] as const;

export type TenantResolutionRouteSpace =
	(typeof tenantResolutionRouteSpaces)[number];

export const tenantResolutionSources = [
	"platform-admin-domain",
	"tenant-admin-context",
	"custom-domain",
	"preview-subdomain",
	"unresolved"
] as const;

export type TenantResolutionSource = (typeof tenantResolutionSources)[number];

export type TenantResolutionTenantRecord = TenantSummary & {
	customDomainRecords?: readonly TenantCustomDomainRecord[];
	customDomains?: readonly string[];
	previewSubdomain: string;
};

export type TenantResolutionRequest = {
	adminTenantId?: string | null;
	host?: string | null;
	routeSpace: TenantResolutionRouteSpace;
	tenants: TenantResolutionTenantRecord[];
};

export type TenantResolutionResult =
	| {
		kind: "platform-admin";
		normalizedHost: string | null;
		source: "platform-admin-domain";
	  }
	| {
		kind: "tenant";
		normalizedHost: string | null;
		source: Exclude<TenantResolutionSource, "platform-admin-domain" | "unresolved">;
		tenant: TenantResolutionTenantRecord;
	  }
	| {
		kind: "unresolved";
		normalizedHost: string | null;
		source: "unresolved";
	  };

export function hasResolvedTenant(
	resolution: TenantResolutionResult
): resolution is Extract<TenantResolutionResult, { kind: "tenant" }> {
	return resolution.kind === "tenant";
}

const tenantLifecycleTransitionsByStatus: Record<
	TenantStatus,
	readonly TenantLifecycleTransition[]
> = {
	draft: [
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
	],
	active: [
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
	],
	suspended: [
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
	],
	archived: []
};

export function getAllowedTenantLifecycleTransitions(
	status: TenantStatus
): readonly TenantLifecycleTransition[] {
	return tenantLifecycleTransitionsByStatus[status];
}

export function canTransitionTenantStatus(
	from: TenantStatus,
	to: TenantStatus
): boolean {
	return getAllowedTenantLifecycleTransitions(from).some(
		(transition) => transition.to === to
	);
}

export function resolveTenantLifecycleEvent(
	from: TenantStatus,
	to: TenantStatus
): TenantLifecycleEvent | null {
	return (
		getAllowedTenantLifecycleTransitions(from).find(
			(transition) => transition.to === to
		)?.event || null
	);
}

const customDomainVerificationTransitionsByState: Record<
	CustomDomainVerificationState,
	readonly CustomDomainVerificationState[]
> = {
	pending: ["verified", "failed", "denied"],
	verified: ["failed", "denied"],
	failed: ["pending", "verified", "denied"],
	denied: ["pending"]
};

export function getAllowedCustomDomainVerificationStates(
	state: CustomDomainVerificationState
): readonly CustomDomainVerificationState[] {
	return customDomainVerificationTransitionsByState[state];
}

export function canTransitionCustomDomainVerificationState(
	from: CustomDomainVerificationState,
	to: CustomDomainVerificationState
): boolean {
	return getAllowedCustomDomainVerificationStates(from).includes(to);
}

const customDomainPromotionTransitionsByState: Record<
	CustomDomainPromotionState,
	readonly CustomDomainPromotionState[]
> = {
	"not-requested": ["ready", "denied"],
	ready: ["promoted", "failed", "denied"],
	promoted: ["rollback-pending"],
	failed: ["ready", "denied"],
	"rollback-pending": ["rolled-back", "failed"],
	"rolled-back": ["ready", "denied"],
	denied: ["ready"]
};

export function getAllowedCustomDomainPromotionStates(
	state: CustomDomainPromotionState
): readonly CustomDomainPromotionState[] {
	return customDomainPromotionTransitionsByState[state];
}

export function canTransitionCustomDomainPromotionState(
	from: CustomDomainPromotionState,
	to: CustomDomainPromotionState
): boolean {
	return getAllowedCustomDomainPromotionStates(from).includes(to);
}

export const tenantRequestFailureReasons = [
	"tenant-unresolved",
	"tenant-inactive",
	"tenant-suspended",
	"tenant-archived"
] as const;

export type TenantRequestFailureReason =
	(typeof tenantRequestFailureReasons)[number];

export const tenantLifecycleAccessModes = [
	"tenant-admin",
	"preview-routing",
	"live-routing",
	"publish-control"
] as const;

export type TenantLifecycleAccessMode =
	(typeof tenantLifecycleAccessModes)[number];

const tenantLifecycleAccessByMode: Record<
	TenantLifecycleAccessMode,
	readonly TenantStatus[]
> = {
	"tenant-admin": ["draft", "active"],
	"preview-routing": ["draft", "active"],
	"live-routing": ["active"],
	"publish-control": ["active"]
};

export function getAllowedTenantStatusesForAccessMode(
	mode: TenantLifecycleAccessMode
): readonly TenantStatus[] {
	return tenantLifecycleAccessByMode[mode];
}

export function canTenantAccessLifecycleMode(
	status: TenantStatus,
	mode: TenantLifecycleAccessMode
): boolean {
	return getAllowedTenantStatusesForAccessMode(mode).includes(status);
}

export function getTenantRequestFailureReasonForAccessMode(
	status: TenantStatus,
	mode: TenantLifecycleAccessMode
): TenantRequestFailureReason | null {
	if (canTenantAccessLifecycleMode(status, mode)) {
		return null;
	}

	if (status === "draft") {
		return "tenant-inactive";
	}

	if (status === "suspended") {
		return "tenant-suspended";
	}

	if (status === "archived") {
		return "tenant-archived";
	}

	return null;
}

export const previewSurfaceTypes = ["storefront", "admin"] as const;

export type PreviewSurfaceType = (typeof previewSurfaceTypes)[number];

export const previewEnvironmentStatuses = ["configured", "not-configured"] as const;

export type PreviewEnvironmentStatus = (typeof previewEnvironmentStatuses)[number];

export type PreviewSurfaceMetadata = {
	available: boolean;
	previewUrl: string | null;
	surface: PreviewSurfaceType;
};

export type PreviewEnvironmentMetadata = {
	environmentStatus: PreviewEnvironmentStatus;
	previewSubdomain: string;
	surfaces: readonly PreviewSurfaceMetadata[];
	tenantId: string;
};

export type PreviewEnvironmentMetadataOptions = {
	managedPreviewAdminDomain?: string | null;
	managedPreviewStorefrontDomain?: string | null;
};

export function buildPreviewSurfaceUrl(
	previewSubdomain: string,
	managedDomain: string | null | undefined
): string | null {
	if (!managedDomain || !previewSubdomain) {
		return null;
	}

	return `${previewSubdomain}.${managedDomain}`;
}

export function derivePreviewEnvironmentStatus(
	surfaces: readonly PreviewSurfaceMetadata[]
): PreviewEnvironmentStatus {
	return surfaces.some((s) => s.available) ? "configured" : "not-configured";
}

export function buildPreviewEnvironmentMetadata(
	tenantId: string,
	previewSubdomain: string,
	options: PreviewEnvironmentMetadataOptions = {}
): PreviewEnvironmentMetadata {
	const storefrontUrl = buildPreviewSurfaceUrl(
		previewSubdomain,
		options.managedPreviewStorefrontDomain
	);
	const adminUrl = buildPreviewSurfaceUrl(
		previewSubdomain,
		options.managedPreviewAdminDomain
	);

	const surfaces: PreviewSurfaceMetadata[] = [
		{
			available: storefrontUrl !== null,
			previewUrl: storefrontUrl,
			surface: "storefront"
		},
		{
			available: adminUrl !== null,
			previewUrl: adminUrl,
			surface: "admin"
		}
	];

	return {
		environmentStatus: derivePreviewEnvironmentStatus(surfaces),
		previewSubdomain,
		surfaces,
		tenantId
	};
}

export const authAssuranceLevels = ["single-factor", "multi-factor"] as const;

export type AuthAssuranceLevel = (typeof authAssuranceLevels)[number];

export const privilegedOperations = [
	"platform:read",
	"platform:write",
	"impersonation:start",
	"tenant:settings-write",
	"tenant:staff-write",
	"tenant:payment-write",
	"tenant:refund-write"
] as const;

export type PrivilegedOperation = (typeof privilegedOperations)[number];

export const stepUpAuthReasons = [
	"platform-write",
	"platform-impersonation",
	"tenant-admin-sensitive-write",
	"payment-credential-write",
	"refund-write"
] as const;

export type StepUpAuthReason = (typeof stepUpAuthReasons)[number];

export type StepUpAuthDecision = {
	maxAgeSeconds: number | null;
	reason: StepUpAuthReason | null;
	required: boolean;
	requiredLevel: AuthAssuranceLevel | null;
};

export const securityEventSeverities = ["info", "warning", "critical"] as const;

export type SecurityEventSeverity = (typeof securityEventSeverities)[number];

export const securityEventKinds = [
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
] as const;

export type SecurityEventKind = (typeof securityEventKinds)[number];

export type SecurityEventRecord = {
	actorType: AuthActorType | null;
	context: Record<string, string | null>;
	id: string;
	kind: SecurityEventKind;
	occurredAt: string;
	severity: SecurityEventSeverity;
	tenantId?: string | null;
	userId?: string | null;
};

export const impersonationSessionStates = ["active", "expired", "revoked"] as const;

export type ImpersonationSessionState = (typeof impersonationSessionStates)[number];

export type ImpersonationSessionSummary = {
	expiresAt: string;
	impersonatorUserId: string;
	platformRole: PlatformActorRole;
	sessionId: string;
	startedAt: string;
	targetTenantId: string;
	targetTenantName: string;
};

export type RequestViewerContext = {
	actorType: AuthActorType | null;
	impersonationSession?: ImpersonationSessionSummary | null;
	isAuthenticated: boolean;
	platformRole: PlatformActorRole | null;
	sessionScope: SessionScope | null;
	userId: string | null;
};

export function createAnonymousRequestViewerContext(): RequestViewerContext {
	return {
		actorType: null,
		isAuthenticated: false,
		platformRole: null,
		sessionScope: null,
		userId: null
	};
}

export function createAuthenticatedRequestViewerContext(
	viewer: {
		actorType: AuthActorType;
		platformRole?: PlatformActorRole | null;
		sessionScope: SessionScope;
		userId: string;
	}
): RequestViewerContext {
	return {
		actorType: viewer.actorType,
		isAuthenticated: true,
		platformRole: viewer.actorType === "platform" ? viewer.platformRole || null : null,
		sessionScope: viewer.sessionScope,
		userId: viewer.userId
	};
}

export type AuthViewerState = {
	actorType: AuthActorType | null;
	displayName: string | null;
	impersonationSession?: ImpersonationSessionSummary | null;
	isAuthenticated: boolean;
	sessionScope: SessionScope | null;
	status: AuthViewerStatus;
	userId: string | null;
};

export function attachImpersonationToAuthViewerState(
	authViewerState: AuthViewerState,
	impersonationSession: ImpersonationSessionSummary
): AuthViewerState {
	return {
		...authViewerState,
		impersonationSession
	};
}

export function attachImpersonationToRequestViewerContext(
	requestViewerContext: RequestViewerContext,
	impersonationSession: ImpersonationSessionSummary
): RequestViewerContext {
	return {
		...requestViewerContext,
		impersonationSession
	};
}

export function describeImpersonationIndicator(
	viewer:
		| Pick<AuthViewerState, "impersonationSession">
		| Pick<RequestViewerContext, "impersonationSession">
): string | null {
	if (!viewer.impersonationSession) {
		return null;
	}

	return `Impersonation active for ${viewer.impersonationSession.targetTenantName} until ${viewer.impersonationSession.expiresAt}.`;
}

export function createAnonymousAuthViewerState(
	sessionScope: SessionScope
): AuthViewerState {
	return {
		actorType: null,
		displayName: null,
		isAuthenticated: false,
		sessionScope,
		status: "anonymous",
		userId: null
	};
}

export function createAuthenticatedAuthViewerState(
	user: Pick<AuthUserSummary, "actorType" | "displayName" | "id">,
	sessionScope: SessionScope
): AuthViewerState {
	return {
		actorType: user.actorType,
		displayName: user.displayName || null,
		isAuthenticated: true,
		sessionScope,
		status: "authenticated",
		userId: user.id
	};
}

const adminRouteSpaceRequirements: Record<
	AdminRouteSpace,
	{ actorType: AuthActorType; sessionScope: SessionScope }
> = {
	"platform-admin": {
		actorType: "platform",
		sessionScope: "platform"
	},
	"tenant-admin": {
		actorType: "tenant",
		sessionScope: "tenant"
	}
};

export function resolveAdminRouteAccess(
	authViewerState: Pick<AuthViewerState, "actorType" | "isAuthenticated" | "sessionScope">,
	routeSpace: AdminRouteSpace
): AdminRouteAccessResult {
	if (!authViewerState.isAuthenticated) {
		return "auth-required";
	}

	const requirement = adminRouteSpaceRequirements[routeSpace];

	if (
		authViewerState.actorType !== requirement.actorType ||
		authViewerState.sessionScope !== requirement.sessionScope
	) {
		return "access-denied";
	}

	return "allow";
}
