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
	tenant: TenantResolutionTenantRecord;
	verticalTemplate: TenantVerticalTemplateKey;
};

export type TenantProvisioningSummary = {
	defaultConfiguration: TenantProvisioningDefaults;
	enabledModules: TenantModuleKey[];
	ownerUserId: string;
	previewSubdomain: string;
	tenantDisplayName: string;
	tenantId: string;
	tenantSlug: string;
	tenantStatus: TenantStatus;
	verticalTemplate: TenantVerticalTemplateKey;
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
