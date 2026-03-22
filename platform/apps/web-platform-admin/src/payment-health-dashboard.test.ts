import { describe, it, expect } from "vitest";
import type {
  PlatformPaymentHealthSummary,
  PlatformTenantPaymentHealth,
} from "@platform/types";
import {
  buildPaymentHealthOverview,
  buildProviderHealthRows,
  buildTenantHealthRows,
  describePaymentHealthState,
  assertNoSecretsInHealthView,
} from "./payment-health-dashboard";
import type { PaymentHealthViewState } from "./payment-health-dashboard";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function sampleSummary(
  overrides?: Partial<PlatformPaymentHealthSummary>,
): PlatformPaymentHealthSummary {
  return {
    totalConnections: 10,
    activeConnections: 8,
    suspendedConnections: 1,
    verifyingConnections: 0,
    inactiveConnections: 1,
    byProvider: {
      stripe: {
        provider: "stripe",
        total: 6,
        active: 5,
        suspended: 1,
        verifying: 0,
        inactive: 0,
      },
      square: {
        provider: "square",
        total: 4,
        active: 3,
        suspended: 0,
        verifying: 0,
        inactive: 1,
      },
    },
    ...overrides,
  };
}

function sampleTenantHealth(): PlatformTenantPaymentHealth[] {
  return [
    {
      tenantId: "tenant-1",
      connections: [
        {
          id: "c1",
          provider: "stripe",
          displayName: "Stripe",
          status: "active",
          mode: "production",
          lastVerifiedAt: "2026-01-01T00:00:00.000Z",
          isHealthy: true,
        },
      ],
    },
    {
      tenantId: "tenant-2",
      connections: [
        {
          id: "c2",
          provider: "square",
          displayName: "Square",
          status: "suspended",
          mode: "sandbox",
          lastVerifiedAt: null,
          isHealthy: false,
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Payment Health Dashboard", () => {
  // -----------------------------------------------------------------------
  // Health overview
  // -----------------------------------------------------------------------

  describe("buildPaymentHealthOverview", () => {
    it("calculates health percentage from active connections", () => {
      const overview = buildPaymentHealthOverview(sampleSummary());
      expect(overview.healthPercentage).toBe(80);
      expect(overview.healthColorClass).toBe("text-success");
    });

    it("returns 0% for empty platform", () => {
      const overview = buildPaymentHealthOverview(
        sampleSummary({
          totalConnections: 0,
          activeConnections: 0,
          suspendedConnections: 0,
          verifyingConnections: 0,
          inactiveConnections: 0,
        }),
      );
      expect(overview.healthPercentage).toBe(0);
    });

    it("returns warning color for 50-79% health", () => {
      const overview = buildPaymentHealthOverview(
        sampleSummary({
          totalConnections: 10,
          activeConnections: 5,
        }),
      );
      expect(overview.healthColorClass).toBe("text-warning");
    });

    it("returns danger color for < 50% health", () => {
      const overview = buildPaymentHealthOverview(
        sampleSummary({
          totalConnections: 10,
          activeConnections: 3,
        }),
      );
      expect(overview.healthColorClass).toBe("text-danger");
    });

    it("includes count labels", () => {
      const overview = buildPaymentHealthOverview(sampleSummary());
      expect(overview.totalLabel).toBe("10 total");
      expect(overview.activeLabel).toBe("8 active");
      expect(overview.suspendedLabel).toBe("1 suspended");
    });
  });

  // -----------------------------------------------------------------------
  // Provider health rows
  // -----------------------------------------------------------------------

  describe("buildProviderHealthRows", () => {
    it("returns one row per provider", () => {
      const rows = buildProviderHealthRows(sampleSummary());
      expect(rows).toHaveLength(2);
    });

    it("includes provider label", () => {
      const rows = buildProviderHealthRows(sampleSummary());
      const stripe = rows.find((r) => r.provider === "stripe");
      expect(stripe?.providerLabel).toBe("Stripe");
    });

    it("calculates per-provider health percentage", () => {
      const rows = buildProviderHealthRows(sampleSummary());
      const stripe = rows.find((r) => r.provider === "stripe");
      expect(stripe?.healthPercentage).toBe(83); // 5/6
    });

    it("handles zero-total provider", () => {
      const summary = sampleSummary();
      summary.byProvider.square = {
        provider: "square",
        total: 0,
        active: 0,
        suspended: 0,
        verifying: 0,
        inactive: 0,
      };
      const rows = buildProviderHealthRows(summary);
      const square = rows.find((r) => r.provider === "square");
      expect(square?.healthPercentage).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Tenant health rows
  // -----------------------------------------------------------------------

  describe("buildTenantHealthRows", () => {
    it("returns one row per tenant", () => {
      const rows = buildTenantHealthRows(sampleTenantHealth());
      expect(rows).toHaveLength(2);
    });

    it("counts healthy and unhealthy connections", () => {
      const rows = buildTenantHealthRows(sampleTenantHealth());
      const tenant1 = rows.find((r) => r.tenantId === "tenant-1");
      expect(tenant1?.healthyCount).toBe(1);
      expect(tenant1?.unhealthyCount).toBe(0);
    });

    it("reports status summary for healthy tenants", () => {
      const rows = buildTenantHealthRows(sampleTenantHealth());
      const tenant1 = rows.find((r) => r.tenantId === "tenant-1");
      expect(tenant1?.statusSummary).toBe("All connections healthy");
    });

    it("reports status summary for unhealthy tenants", () => {
      const rows = buildTenantHealthRows(sampleTenantHealth());
      const tenant2 = rows.find((r) => r.tenantId === "tenant-2");
      expect(tenant2?.statusSummary).toContain("need attention");
    });
  });

  // -----------------------------------------------------------------------
  // View state
  // -----------------------------------------------------------------------

  describe("describePaymentHealthState", () => {
    it("describes loading state", () => {
      expect(describePaymentHealthState({ kind: "loading" })).toContain(
        "Loading",
      );
    });

    it("describes ready state", () => {
      const state: PaymentHealthViewState = {
        kind: "ready",
        overview: buildPaymentHealthOverview(sampleSummary()),
        providerRows: buildProviderHealthRows(sampleSummary()),
        tenantRows: buildTenantHealthRows(sampleTenantHealth()),
      };
      expect(describePaymentHealthState(state)).toContain("loaded");
    });

    it("describes error state", () => {
      expect(
        describePaymentHealthState({ kind: "error", message: "Network error" }),
      ).toBe("Network error");
    });
  });

  // -----------------------------------------------------------------------
  // SECURITY: No secrets in views
  // -----------------------------------------------------------------------

  describe("assertNoSecretsInHealthView", () => {
    it("passes for clean health overview", () => {
      const overview = buildPaymentHealthOverview(sampleSummary());
      expect(assertNoSecretsInHealthView(overview)).toBe(true);
    });

    it("passes for clean provider row", () => {
      const rows = buildProviderHealthRows(sampleSummary());
      for (const row of rows) {
        expect(assertNoSecretsInHealthView(row)).toBe(true);
      }
    });

    it("passes for clean tenant row", () => {
      const rows = buildTenantHealthRows(sampleTenantHealth());
      for (const row of rows) {
        expect(assertNoSecretsInHealthView(row)).toBe(true);
      }
    });
  });
});
