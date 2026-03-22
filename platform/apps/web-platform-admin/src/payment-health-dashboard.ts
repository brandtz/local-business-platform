// E8-S1-T4: Platform payment health dashboard.
// Displays aggregated payment connection health for platform administrators.
// SECURITY: NEVER shows individual credentials or secret values.

import type {
  PlatformPaymentHealthSummary,
  PlatformTenantPaymentHealth,
  PaymentProvider,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Health summary display
// ---------------------------------------------------------------------------

export type PaymentHealthOverview = {
  totalLabel: string;
  activeLabel: string;
  suspendedLabel: string;
  verifyingLabel: string;
  inactiveLabel: string;
  healthPercentage: number;
  healthColorClass: string;
};

export function buildPaymentHealthOverview(
  summary: PlatformPaymentHealthSummary,
): PaymentHealthOverview {
  const healthPercentage =
    summary.totalConnections > 0
      ? Math.round(
          (summary.activeConnections / summary.totalConnections) * 100,
        )
      : 0;

  let healthColorClass: string;
  if (healthPercentage >= 80) {
    healthColorClass = "text-success";
  } else if (healthPercentage >= 50) {
    healthColorClass = "text-warning";
  } else {
    healthColorClass = "text-danger";
  }

  return {
    totalLabel: `${summary.totalConnections} total`,
    activeLabel: `${summary.activeConnections} active`,
    suspendedLabel: `${summary.suspendedConnections} suspended`,
    verifyingLabel: `${summary.verifyingConnections} verifying`,
    inactiveLabel: `${summary.inactiveConnections} inactive`,
    healthPercentage,
    healthColorClass,
  };
}

// ---------------------------------------------------------------------------
// Provider health breakdown
// ---------------------------------------------------------------------------

export type ProviderHealthRow = {
  provider: PaymentProvider;
  providerLabel: string;
  total: number;
  active: number;
  suspended: number;
  verifying: number;
  inactive: number;
  healthPercentage: number;
};

const providerLabels: Record<PaymentProvider, string> = {
  stripe: "Stripe",
  square: "Square",
};

export function buildProviderHealthRows(
  summary: PlatformPaymentHealthSummary,
): ProviderHealthRow[] {
  return Object.values(summary.byProvider).map((ph) => ({
    provider: ph.provider,
    providerLabel: providerLabels[ph.provider],
    total: ph.total,
    active: ph.active,
    suspended: ph.suspended,
    verifying: ph.verifying,
    inactive: ph.inactive,
    healthPercentage:
      ph.total > 0 ? Math.round((ph.active / ph.total) * 100) : 0,
  }));
}

// ---------------------------------------------------------------------------
// Tenant health list
// ---------------------------------------------------------------------------

export type TenantHealthRow = {
  tenantId: string;
  connectionCount: number;
  healthyCount: number;
  unhealthyCount: number;
  statusSummary: string;
};

export function buildTenantHealthRows(
  tenantHealthList: PlatformTenantPaymentHealth[],
): TenantHealthRow[] {
  return tenantHealthList.map((th) => {
    const healthyCount = th.connections.filter((c) => c.isHealthy).length;
    const unhealthyCount = th.connections.length - healthyCount;
    return {
      tenantId: th.tenantId,
      connectionCount: th.connections.length,
      healthyCount,
      unhealthyCount,
      statusSummary:
        unhealthyCount === 0
          ? "All connections healthy"
          : `${unhealthyCount} connection(s) need attention`,
    };
  });
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------

export type PaymentHealthViewState =
  | { kind: "loading" }
  | {
      kind: "ready";
      overview: PaymentHealthOverview;
      providerRows: ProviderHealthRow[];
      tenantRows: TenantHealthRow[];
    }
  | { kind: "error"; message: string };

export function describePaymentHealthState(
  state: PaymentHealthViewState,
): string {
  switch (state.kind) {
    case "loading":
      return "Loading payment health data…";
    case "ready":
      return "Payment health data loaded.";
    case "error":
      return state.message;
  }
}

// ---------------------------------------------------------------------------
// SECURITY: Assert no secrets in view data
// ---------------------------------------------------------------------------

/**
 * Validates that a tenant health row does not contain any credential data.
 * This is a defensive check for platform admin views.
 */
export function assertNoSecretsInHealthView(
  data: TenantHealthRow | PaymentHealthOverview | ProviderHealthRow,
): boolean {
  const str = JSON.stringify(data);
  const forbidden = [
    "encryptedCredentials",
    "credentialsIv",
    "credentialsTag",
    "secretKey",
    "accessToken",
    "publishableKey",
  ];
  return !forbidden.some((f) => str.includes(f));
}
