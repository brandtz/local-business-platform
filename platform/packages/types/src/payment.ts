// ---------------------------------------------------------------------------
// Payment providers
// ---------------------------------------------------------------------------

export const paymentProviders = ["stripe", "square"] as const;
export type PaymentProvider = (typeof paymentProviders)[number];

export function isValidPaymentProvider(value: string): value is PaymentProvider {
  return (paymentProviders as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Payment connection status and state machine
// ---------------------------------------------------------------------------

export const paymentConnectionStatuses = [
  "inactive",
  "verifying",
  "active",
  "suspended",
] as const;
export type PaymentConnectionStatus = (typeof paymentConnectionStatuses)[number];

/**
 * Valid transitions from each connection status.
 * inactive → verifying (when credentials submitted)
 * verifying → active (when verification succeeds)
 * verifying → inactive (when verification fails)
 * active → suspended (when admin suspends or health check fails)
 * active → verifying (when re-verification requested)
 * suspended → verifying (when re-verification requested)
 * suspended → inactive (when admin deactivates)
 */
export const paymentConnectionStatusTransitions: Record<
  PaymentConnectionStatus,
  readonly PaymentConnectionStatus[]
> = {
  inactive: ["verifying"],
  verifying: ["active", "inactive"],
  active: ["suspended", "verifying"],
  suspended: ["verifying", "inactive"],
};

export function isValidPaymentConnectionTransition(
  from: PaymentConnectionStatus,
  to: PaymentConnectionStatus,
): boolean {
  return (
    paymentConnectionStatusTransitions[from] as readonly string[]
  ).includes(to);
}

export function isValidPaymentConnectionStatus(
  value: string,
): value is PaymentConnectionStatus {
  return (paymentConnectionStatuses as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Connection mode
// ---------------------------------------------------------------------------

export const paymentConnectionModes = ["sandbox", "production"] as const;
export type PaymentConnectionMode = (typeof paymentConnectionModes)[number];

export function isValidPaymentConnectionMode(
  value: string,
): value is PaymentConnectionMode {
  return (paymentConnectionModes as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Payment connection record (database read model)
// ---------------------------------------------------------------------------

export type PaymentConnectionRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  provider: PaymentProvider;
  displayName: string;
  status: PaymentConnectionStatus;
  mode: PaymentConnectionMode;
  encryptedCredentials: string;
  credentialsIv: string;
  credentialsTag: string;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  statusChangedAt: string | null;
  suspendedReason: string | null;
};

// ---------------------------------------------------------------------------
// Create connection input
// ---------------------------------------------------------------------------

export type CreatePaymentConnectionInput = {
  tenantId: string;
  provider: PaymentProvider;
  displayName: string;
  mode: PaymentConnectionMode;
  credentials: PaymentProviderCredentials;
};

/**
 * Provider-specific credential shapes.
 * These are ONLY accepted on input and are encrypted before storage.
 * They are NEVER returned in any API response.
 */
export type StripeCredentials = {
  provider: "stripe";
  publishableKey: string;
  secretKey: string;
};

export type SquareCredentials = {
  provider: "square";
  applicationId: string;
  accessToken: string;
  locationId: string;
};

export type PaymentProviderCredentials = StripeCredentials | SquareCredentials;

// ---------------------------------------------------------------------------
// Sanitized connection views (NEVER contain secrets)
// ---------------------------------------------------------------------------

/**
 * Tenant-admin view of a payment connection.
 * Shows connection status and provider info but NEVER exposes credentials.
 */
export type AdminPaymentConnectionSummary = {
  id: string;
  provider: PaymentProvider;
  displayName: string;
  status: PaymentConnectionStatus;
  mode: PaymentConnectionMode;
  lastVerifiedAt: string | null;
  verificationError: string | null;
  statusChangedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Tenant-admin detail view. Same as summary for connections
 * since we never expose credentials.
 */
export type AdminPaymentConnectionDetail = AdminPaymentConnectionSummary;

/**
 * Sanitized health view for tenant dashboard.
 * Shows whether the connection is healthy without any secret data.
 */
export type PaymentConnectionHealthView = {
  id: string;
  provider: PaymentProvider;
  displayName: string;
  status: PaymentConnectionStatus;
  mode: PaymentConnectionMode;
  lastVerifiedAt: string | null;
  isHealthy: boolean;
};

/**
 * Platform-admin aggregated health view.
 * Shows per-tenant connection health for operational monitoring.
 * NEVER includes credentials or individual secret values.
 */
export type PlatformPaymentHealthSummary = {
  totalConnections: number;
  activeConnections: number;
  suspendedConnections: number;
  verifyingConnections: number;
  inactiveConnections: number;
  byProvider: Record<PaymentProvider, PlatformPaymentProviderHealth>;
};

export type PlatformPaymentProviderHealth = {
  provider: PaymentProvider;
  total: number;
  active: number;
  suspended: number;
  verifying: number;
  inactive: number;
};

/**
 * Platform-admin per-tenant connection health entry.
 */
export type PlatformTenantPaymentHealth = {
  tenantId: string;
  connections: PaymentConnectionHealthView[];
};

// ---------------------------------------------------------------------------
// Fields that must NEVER appear in any API response
// ---------------------------------------------------------------------------

/**
 * These fields are security-sensitive and must be stripped before
 * returning any connection data in API responses.
 */
export const paymentConnectionSecretFields = [
  "encryptedCredentials",
  "credentialsIv",
  "credentialsTag",
] as const;

/**
 * Strips secret fields from a payment connection record to produce
 * a sanitized admin summary safe for API responses.
 */
export function sanitizePaymentConnection(
  record: PaymentConnectionRecord,
): AdminPaymentConnectionSummary {
  return {
    id: record.id,
    provider: record.provider,
    displayName: record.displayName,
    status: record.status,
    mode: record.mode,
    lastVerifiedAt: record.lastVerifiedAt,
    verificationError: record.verificationError,
    statusChangedAt: record.statusChangedAt,
    suspendedReason: record.suspendedReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/**
 * Builds a health view from a connection record.
 * Healthy = active status with a recent verification.
 */
export function buildConnectionHealthView(
  record: PaymentConnectionRecord,
): PaymentConnectionHealthView {
  return {
    id: record.id,
    provider: record.provider,
    displayName: record.displayName,
    status: record.status,
    mode: record.mode,
    lastVerifiedAt: record.lastVerifiedAt,
    isHealthy: record.status === "active",
  };
}

/**
 * Builds an aggregated platform health summary from a list of connection records.
 */
export function buildPlatformPaymentHealthSummary(
  records: PaymentConnectionRecord[],
): PlatformPaymentHealthSummary {
  const byProvider: Record<PaymentProvider, PlatformPaymentProviderHealth> = {
    stripe: { provider: "stripe", total: 0, active: 0, suspended: 0, verifying: 0, inactive: 0 },
    square: { provider: "square", total: 0, active: 0, suspended: 0, verifying: 0, inactive: 0 },
  };

  let totalConnections = 0;
  let activeConnections = 0;
  let suspendedConnections = 0;
  let verifyingConnections = 0;
  let inactiveConnections = 0;

  for (const record of records) {
    totalConnections++;
    const providerHealth = byProvider[record.provider];
    providerHealth.total++;

    switch (record.status) {
      case "active":
        activeConnections++;
        providerHealth.active++;
        break;
      case "suspended":
        suspendedConnections++;
        providerHealth.suspended++;
        break;
      case "verifying":
        verifyingConnections++;
        providerHealth.verifying++;
        break;
      case "inactive":
        inactiveConnections++;
        providerHealth.inactive++;
        break;
    }
  }

  return {
    totalConnections,
    activeConnections,
    suspendedConnections,
    verifyingConnections,
    inactiveConnections,
    byProvider,
  };
}
