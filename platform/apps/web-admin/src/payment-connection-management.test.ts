import { describe, it, expect } from "vitest";
import type {
  AdminPaymentConnectionSummary,
  PaymentConnectionHealthView,
} from "@platform/types";
import { paymentConnectionSecretFields } from "@platform/types";
import {
  getConnectionStatusBadge,
  getProviderLabel,
  getProviderIcon,
  getModeBadge,
  buildConnectionListRow,
  getProviderFormFields,
  validateConnectionForm,
  isConnectionFormValid,
  getHealthIndicator,
} from "./payment-connection-management";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function sampleConnection(
  overrides?: Partial<AdminPaymentConnectionSummary>,
): AdminPaymentConnectionSummary {
  return {
    id: "conn-1",
    provider: "stripe",
    displayName: "Stripe Production",
    status: "active",
    mode: "production",
    lastVerifiedAt: "2026-01-15T10:30:00.000Z",
    verificationError: null,
    statusChangedAt: "2026-01-15T10:30:00.000Z",
    suspendedReason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-15T10:30:00.000Z",
    ...overrides,
  };
}

function sampleHealthView(
  overrides?: Partial<PaymentConnectionHealthView>,
): PaymentConnectionHealthView {
  return {
    id: "conn-1",
    provider: "stripe",
    displayName: "Stripe Production",
    status: "active",
    mode: "production",
    lastVerifiedAt: "2026-01-15T10:30:00.000Z",
    isHealthy: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Payment Connection Management Views", () => {
  // -----------------------------------------------------------------------
  // Status badges
  // -----------------------------------------------------------------------

  describe("getConnectionStatusBadge", () => {
    it("returns badge for active status", () => {
      const badge = getConnectionStatusBadge("active");
      expect(badge.label).toBe("Active");
      expect(badge.colorClass).toBe("badge-success");
    });

    it("returns badge for inactive status", () => {
      const badge = getConnectionStatusBadge("inactive");
      expect(badge.label).toBe("Inactive");
      expect(badge.colorClass).toBe("badge-neutral");
    });

    it("returns badge for verifying status", () => {
      const badge = getConnectionStatusBadge("verifying");
      expect(badge.label).toBe("Verifying");
      expect(badge.colorClass).toBe("badge-warning");
    });

    it("returns badge for suspended status", () => {
      const badge = getConnectionStatusBadge("suspended");
      expect(badge.label).toBe("Suspended");
      expect(badge.colorClass).toBe("badge-danger");
    });
  });

  // -----------------------------------------------------------------------
  // Provider display
  // -----------------------------------------------------------------------

  describe("getProviderLabel", () => {
    it("returns Stripe label", () => {
      expect(getProviderLabel("stripe")).toBe("Stripe");
    });

    it("returns Square label", () => {
      expect(getProviderLabel("square")).toBe("Square");
    });
  });

  describe("getProviderIcon", () => {
    it("returns Stripe icon", () => {
      expect(getProviderIcon("stripe")).toBe("stripe-icon");
    });

    it("returns Square icon", () => {
      expect(getProviderIcon("square")).toBe("square-icon");
    });
  });

  // -----------------------------------------------------------------------
  // Mode badge
  // -----------------------------------------------------------------------

  describe("getModeBadge", () => {
    it("returns sandbox badge", () => {
      const badge = getModeBadge("sandbox");
      expect(badge.label).toBe("Sandbox");
      expect(badge.colorClass).toBe("badge-info");
    });

    it("returns production badge", () => {
      const badge = getModeBadge("production");
      expect(badge.label).toBe("Production");
      expect(badge.colorClass).toBe("badge-primary");
    });
  });

  // -----------------------------------------------------------------------
  // Connection list row
  // -----------------------------------------------------------------------

  describe("buildConnectionListRow", () => {
    it("builds row from active connection", () => {
      const row = buildConnectionListRow(sampleConnection());
      expect(row.id).toBe("conn-1");
      expect(row.providerLabel).toBe("Stripe");
      expect(row.statusBadge.label).toBe("Active");
      expect(row.modeBadge.label).toBe("Production");
      expect(row.canVerify).toBe(true);
      expect(row.canDeactivate).toBe(true);
    });

    it("disables verify for verifying connections", () => {
      const row = buildConnectionListRow(
        sampleConnection({ status: "verifying" }),
      );
      expect(row.canVerify).toBe(false);
    });

    it("disables deactivate for inactive connections", () => {
      const row = buildConnectionListRow(
        sampleConnection({ status: "inactive" }),
      );
      expect(row.canDeactivate).toBe(false);
    });

    it("shows 'Never verified' when lastVerifiedAt is null", () => {
      const row = buildConnectionListRow(
        sampleConnection({ lastVerifiedAt: null }),
      );
      expect(row.lastVerifiedLabel).toBe("Never verified");
    });

    it("shows formatted date when lastVerifiedAt is set", () => {
      const row = buildConnectionListRow(sampleConnection());
      expect(row.lastVerifiedLabel).not.toBe("Never verified");
    });

    it("NEVER includes secret fields in row", () => {
      const row = buildConnectionListRow(sampleConnection());
      const rowStr = JSON.stringify(row);
      for (const field of paymentConnectionSecretFields) {
        expect(rowStr).not.toContain(field);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Provider form fields
  // -----------------------------------------------------------------------

  describe("getProviderFormFields", () => {
    it("returns Stripe fields with password type for secrets", () => {
      const fields = getProviderFormFields("stripe");
      const secretField = fields.find((f) => f.name === "secretKey");
      expect(secretField).toBeDefined();
      expect(secretField!.type).toBe("password");
      const pkField = fields.find((f) => f.name === "publishableKey");
      expect(pkField).toBeDefined();
      expect(pkField!.type).toBe("password");
    });

    it("returns Square fields with password type for secrets", () => {
      const fields = getProviderFormFields("square");
      const tokenField = fields.find((f) => f.name === "accessToken");
      expect(tokenField).toBeDefined();
      expect(tokenField!.type).toBe("password");
      const appField = fields.find((f) => f.name === "applicationId");
      expect(appField).toBeDefined();
      expect(appField!.type).toBe("password");
    });

    it("includes common fields for all providers", () => {
      for (const provider of ["stripe", "square"] as const) {
        const fields = getProviderFormFields(provider);
        expect(fields.find((f) => f.name === "displayName")).toBeDefined();
        expect(fields.find((f) => f.name === "mode")).toBeDefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // Form validation
  // -----------------------------------------------------------------------

  describe("validateConnectionForm", () => {
    it("returns no errors for valid Stripe form", () => {
      const errors = validateConnectionForm("stripe", {
        displayName: "My Stripe",
        mode: "sandbox",
        publishableKey: "pk_test_123",
        secretKey: "sk_test_456",
      });
      expect(isConnectionFormValid(errors)).toBe(true);
    });

    it("returns no errors for valid Square form", () => {
      const errors = validateConnectionForm("square", {
        displayName: "My Square",
        mode: "production",
        applicationId: "sq-app-123",
        accessToken: "sq-token-456",
        locationId: "sq-loc-789",
      });
      expect(isConnectionFormValid(errors)).toBe(true);
    });

    it("requires display name", () => {
      const errors = validateConnectionForm("stripe", {
        displayName: "",
        mode: "sandbox",
        publishableKey: "pk_test_123",
        secretKey: "sk_test_456",
      });
      expect(errors.displayName).toBeDefined();
    });

    it("requires mode", () => {
      const errors = validateConnectionForm("stripe", {
        displayName: "My Stripe",
        mode: "",
        publishableKey: "pk_test_123",
        secretKey: "sk_test_456",
      });
      expect(errors.mode).toBeDefined();
    });

    it("requires Stripe publishable key", () => {
      const errors = validateConnectionForm("stripe", {
        displayName: "My Stripe",
        mode: "sandbox",
        publishableKey: "",
        secretKey: "sk_test_456",
      });
      expect(errors.publishableKey).toBeDefined();
    });

    it("requires Stripe secret key", () => {
      const errors = validateConnectionForm("stripe", {
        displayName: "My Stripe",
        mode: "sandbox",
        publishableKey: "pk_test_123",
        secretKey: "",
      });
      expect(errors.secretKey).toBeDefined();
    });

    it("requires Square application ID", () => {
      const errors = validateConnectionForm("square", {
        displayName: "My Square",
        mode: "sandbox",
        applicationId: "",
        accessToken: "sq-token-456",
        locationId: "sq-loc-789",
      });
      expect(errors.applicationId).toBeDefined();
    });

    it("requires Square access token", () => {
      const errors = validateConnectionForm("square", {
        displayName: "My Square",
        mode: "sandbox",
        applicationId: "sq-app-123",
        accessToken: "",
        locationId: "sq-loc-789",
      });
      expect(errors.accessToken).toBeDefined();
    });

    it("requires Square location ID", () => {
      const errors = validateConnectionForm("square", {
        displayName: "My Square",
        mode: "sandbox",
        applicationId: "sq-app-123",
        accessToken: "sq-token-456",
        locationId: "",
      });
      expect(errors.locationId).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Health indicator
  // -----------------------------------------------------------------------

  describe("getHealthIndicator", () => {
    it("returns healthy indicator for healthy connection", () => {
      const indicator = getHealthIndicator(sampleHealthView());
      expect(indicator.label).toBe("Healthy");
      expect(indicator.colorClass).toBe("text-success");
    });

    it("returns verifying indicator", () => {
      const indicator = getHealthIndicator(
        sampleHealthView({ status: "verifying", isHealthy: false }),
      );
      expect(indicator.label).toBe("Verifying");
      expect(indicator.colorClass).toBe("text-warning");
    });

    it("returns suspended indicator", () => {
      const indicator = getHealthIndicator(
        sampleHealthView({ status: "suspended", isHealthy: false }),
      );
      expect(indicator.label).toBe("Suspended");
      expect(indicator.colorClass).toBe("text-danger");
    });

    it("returns inactive indicator", () => {
      const indicator = getHealthIndicator(
        sampleHealthView({ status: "inactive", isHealthy: false }),
      );
      expect(indicator.label).toBe("Inactive");
      expect(indicator.colorClass).toBe("text-muted");
    });
  });
});
