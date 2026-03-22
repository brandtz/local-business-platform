import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import {
  PaymentConnectionService,
  PaymentConnectionNotFoundError,
  PaymentConnectionDuplicateError,
  PaymentConnectionValidationError,
} from "./payment-connection.service";
import type {
  CreatePaymentConnectionInput,
} from "@platform/types";
import { paymentConnectionSecretFields } from "@platform/types";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";
const TEST_KEY = randomBytes(32).toString("hex");

function sampleStripeInput(
  overrides?: Partial<CreatePaymentConnectionInput>,
): CreatePaymentConnectionInput {
  return {
    tenantId: TENANT_A,
    provider: "stripe",
    displayName: "Stripe Production",
    mode: "production",
    credentials: {
      provider: "stripe",
      publishableKey: "pk_test_123",
      secretKey: "sk_test_456",
    },
    ...overrides,
  };
}

function sampleSquareInput(
  overrides?: Partial<CreatePaymentConnectionInput>,
): CreatePaymentConnectionInput {
  return {
    tenantId: TENANT_A,
    provider: "square",
    displayName: "Square Sandbox",
    mode: "sandbox",
    credentials: {
      provider: "square",
      applicationId: "sq-app-123",
      accessToken: "sq-token-456",
      locationId: "sq-loc-789",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PaymentConnectionService", () => {
  let service: PaymentConnectionService;

  beforeEach(() => {
    // Set test encryption key
    process.env.PAYMENT_ENCRYPTION_KEY = TEST_KEY;
    service = new PaymentConnectionService();
  });

  // -----------------------------------------------------------------------
  // E8-S1-T1: Schema validation and constraints
  // -----------------------------------------------------------------------

  describe("createConnection", () => {
    it("creates a Stripe connection with inactive status", () => {
      const result = service.createConnection(sampleStripeInput());
      expect(result.provider).toBe("stripe");
      expect(result.displayName).toBe("Stripe Production");
      expect(result.status).toBe("inactive");
      expect(result.mode).toBe("production");
      expect(result.id).toBeDefined();
    });

    it("creates a Square connection with inactive status", () => {
      const result = service.createConnection(sampleSquareInput());
      expect(result.provider).toBe("square");
      expect(result.displayName).toBe("Square Sandbox");
      expect(result.status).toBe("inactive");
      expect(result.mode).toBe("sandbox");
    });

    it("enforces unique constraint: one connection per provider per tenant", () => {
      service.createConnection(sampleStripeInput());
      expect(() =>
        service.createConnection(sampleStripeInput()),
      ).toThrow(PaymentConnectionDuplicateError);
    });

    it("allows different providers for the same tenant", () => {
      service.createConnection(sampleStripeInput());
      const square = service.createConnection(sampleSquareInput());
      expect(square.provider).toBe("square");
    });

    it("allows same provider for different tenants", () => {
      service.createConnection(sampleStripeInput());
      const other = service.createConnection(
        sampleStripeInput({ tenantId: TENANT_B }),
      );
      expect(other.provider).toBe("stripe");
    });

    it("throws on empty display name", () => {
      expect(() =>
        service.createConnection(sampleStripeInput({ displayName: "" })),
      ).toThrow(PaymentConnectionValidationError);
    });

    it("trims display name", () => {
      const result = service.createConnection(
        sampleStripeInput({ displayName: "  My Stripe  " }),
      );
      expect(result.displayName).toBe("My Stripe");
    });
  });

  // -----------------------------------------------------------------------
  // SECURITY: Credentials encryption (E8-S1-T1)
  // -----------------------------------------------------------------------

  describe("credential encryption", () => {
    it("never returns credentials in create response", () => {
      const result = service.createConnection(sampleStripeInput());
      const resultObj = result as Record<string, unknown>;
      for (const field of paymentConnectionSecretFields) {
        expect(resultObj[field]).toBeUndefined();
      }
    });

    it("never returns credentials in list response", () => {
      service.createConnection(sampleStripeInput());
      const list = service.listConnections(TENANT_A);
      for (const item of list) {
        const itemObj = item as Record<string, unknown>;
        for (const field of paymentConnectionSecretFields) {
          expect(itemObj[field]).toBeUndefined();
        }
      }
    });

    it("never returns credentials in detail response", () => {
      const created = service.createConnection(sampleStripeInput());
      const detail = service.getConnectionDetail(TENANT_A, created.id);
      const detailObj = detail as Record<string, unknown>;
      for (const field of paymentConnectionSecretFields) {
        expect(detailObj[field]).toBeUndefined();
      }
    });

    it("never returns raw credential values in any response", () => {
      const result = service.createConnection(sampleStripeInput());
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain("pk_test_123");
      expect(resultStr).not.toContain("sk_test_456");
    });

    it("never returns Square credentials in responses", () => {
      const result = service.createConnection(sampleSquareInput());
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain("sq-app-123");
      expect(resultStr).not.toContain("sq-token-456");
      expect(resultStr).not.toContain("sq-loc-789");
    });
  });

  // -----------------------------------------------------------------------
  // E8-S1-T2: Verification
  // -----------------------------------------------------------------------

  describe("verifyConnection", () => {
    it("transitions to active on successful verification", async () => {
      const created = service.createConnection(sampleStripeInput());
      const result = await service.verifyConnection(TENANT_A, created.id);
      expect(result.status).toBe("active");
      expect(result.lastVerifiedAt).not.toBeNull();
      expect(result.verificationError).toBeNull();
    });

    it("transitions to inactive on failed verification", async () => {
      const created = service.createConnection(
        sampleStripeInput({
          credentials: {
            provider: "stripe",
            publishableKey: "invalid_key",
            secretKey: "invalid_secret",
          },
        }),
      );
      const result = await service.verifyConnection(TENANT_A, created.id);
      expect(result.status).toBe("inactive");
      expect(result.verificationError).toBeDefined();
    });

    it("never returns credentials in verification response", async () => {
      const created = service.createConnection(sampleStripeInput());
      const result = await service.verifyConnection(TENANT_A, created.id);
      const resultObj = result as Record<string, unknown>;
      for (const field of paymentConnectionSecretFields) {
        expect(resultObj[field]).toBeUndefined();
      }
    });

    it("throws for non-existent connection", async () => {
      await expect(
        service.verifyConnection(TENANT_A, "nonexistent"),
      ).rejects.toThrow(PaymentConnectionNotFoundError);
    });

    it("throws for wrong tenant", async () => {
      const created = service.createConnection(sampleStripeInput());
      await expect(
        service.verifyConnection(TENANT_B, created.id),
      ).rejects.toThrow(PaymentConnectionNotFoundError);
    });

    it("allows re-verification of active connection", async () => {
      const created = service.createConnection(sampleStripeInput());
      await service.verifyConnection(TENANT_A, created.id);
      const reVerified = await service.verifyConnection(TENANT_A, created.id);
      expect(reVerified.status).toBe("active");
    });
  });

  // -----------------------------------------------------------------------
  // E8-S1-T2: Health check
  // -----------------------------------------------------------------------

  describe("checkConnectionHealth", () => {
    it("keeps active connection active when healthy", async () => {
      const created = service.createConnection(sampleStripeInput());
      await service.verifyConnection(TENANT_A, created.id);
      const health = await service.checkConnectionHealth(TENANT_A, created.id);
      expect(health.status).toBe("active");
    });

    it("returns current state for inactive connections", async () => {
      const created = service.createConnection(sampleStripeInput());
      const health = await service.checkConnectionHealth(TENANT_A, created.id);
      expect(health.status).toBe("inactive");
    });

    it("never returns credentials in health response", async () => {
      const created = service.createConnection(sampleStripeInput());
      const health = await service.checkConnectionHealth(TENANT_A, created.id);
      const healthObj = health as Record<string, unknown>;
      for (const field of paymentConnectionSecretFields) {
        expect(healthObj[field]).toBeUndefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // E8-S1-T2: Deactivation
  // -----------------------------------------------------------------------

  describe("deactivateConnection", () => {
    it("deactivates an active connection", async () => {
      const created = service.createConnection(sampleStripeInput());
      await service.verifyConnection(TENANT_A, created.id);
      const result = service.deactivateConnection(TENANT_A, created.id);
      expect(result.status).toBe("inactive");
    });

    it("is idempotent for already inactive connections", () => {
      const created = service.createConnection(sampleStripeInput());
      const result = service.deactivateConnection(TENANT_A, created.id);
      expect(result.status).toBe("inactive");
    });

    it("throws for non-existent connection", () => {
      expect(() =>
        service.deactivateConnection(TENANT_A, "nonexistent"),
      ).toThrow(PaymentConnectionNotFoundError);
    });

    it("throws for wrong tenant", () => {
      const created = service.createConnection(sampleStripeInput());
      expect(() =>
        service.deactivateConnection(TENANT_B, created.id),
      ).toThrow(PaymentConnectionNotFoundError);
    });

    it("never returns credentials in deactivation response", async () => {
      const created = service.createConnection(sampleStripeInput());
      await service.verifyConnection(TENANT_A, created.id);
      const result = service.deactivateConnection(TENANT_A, created.id);
      const resultObj = result as Record<string, unknown>;
      for (const field of paymentConnectionSecretFields) {
        expect(resultObj[field]).toBeUndefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // E8-S1-T3: Admin queries
  // -----------------------------------------------------------------------

  describe("listConnections", () => {
    it("returns empty list for tenant with no connections", () => {
      const list = service.listConnections(TENANT_A);
      expect(list).toEqual([]);
    });

    it("returns all connections for a tenant", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(sampleSquareInput());
      const list = service.listConnections(TENANT_A);
      expect(list).toHaveLength(2);
    });

    it("does not return connections from other tenants", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(
        sampleStripeInput({ tenantId: TENANT_B }),
      );
      const list = service.listConnections(TENANT_A);
      expect(list).toHaveLength(1);
      expect(list[0].provider).toBe("stripe");
    });

    it("never exposes credentials in list", () => {
      service.createConnection(sampleStripeInput());
      const list = service.listConnections(TENANT_A);
      const listStr = JSON.stringify(list);
      expect(listStr).not.toContain("pk_test_123");
      expect(listStr).not.toContain("sk_test_456");
      expect(listStr).not.toContain("encryptedCredentials");
      expect(listStr).not.toContain("credentialsIv");
      expect(listStr).not.toContain("credentialsTag");
    });
  });

  describe("getConnectionDetail", () => {
    it("returns connection detail by id", () => {
      const created = service.createConnection(sampleStripeInput());
      const detail = service.getConnectionDetail(TENANT_A, created.id);
      expect(detail.id).toBe(created.id);
      expect(detail.provider).toBe("stripe");
    });

    it("throws for non-existent connection", () => {
      expect(() =>
        service.getConnectionDetail(TENANT_A, "nonexistent"),
      ).toThrow(PaymentConnectionNotFoundError);
    });

    it("enforces tenant isolation", () => {
      const created = service.createConnection(sampleStripeInput());
      expect(() =>
        service.getConnectionDetail(TENANT_B, created.id),
      ).toThrow(PaymentConnectionNotFoundError);
    });
  });

  // -----------------------------------------------------------------------
  // E8-S1-T4: Health read models
  // -----------------------------------------------------------------------

  describe("getTenantConnectionHealth", () => {
    it("returns empty array for tenant with no connections", () => {
      const health = service.getTenantConnectionHealth(TENANT_A);
      expect(health).toEqual([]);
    });

    it("returns health views for tenant connections", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(sampleSquareInput());
      const health = service.getTenantConnectionHealth(TENANT_A);
      expect(health).toHaveLength(2);
    });

    it("marks inactive connections as not healthy", () => {
      service.createConnection(sampleStripeInput());
      const health = service.getTenantConnectionHealth(TENANT_A);
      expect(health[0].isHealthy).toBe(false);
    });

    it("marks active connections as healthy", async () => {
      const created = service.createConnection(sampleStripeInput());
      await service.verifyConnection(TENANT_A, created.id);
      const health = service.getTenantConnectionHealth(TENANT_A);
      expect(health[0].isHealthy).toBe(true);
    });

    it("never exposes credentials in health views", () => {
      service.createConnection(sampleStripeInput());
      const health = service.getTenantConnectionHealth(TENANT_A);
      const healthStr = JSON.stringify(health);
      expect(healthStr).not.toContain("pk_test_123");
      expect(healthStr).not.toContain("sk_test_456");
      expect(healthStr).not.toContain("encryptedCredentials");
      expect(healthStr).not.toContain("credentialsIv");
      expect(healthStr).not.toContain("credentialsTag");
    });

    it("does not return health for other tenants", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(
        sampleStripeInput({ tenantId: TENANT_B }),
      );
      const health = service.getTenantConnectionHealth(TENANT_A);
      expect(health).toHaveLength(1);
    });
  });

  describe("getPlatformPaymentHealth", () => {
    it("returns zeros for empty platform", () => {
      const health = service.getPlatformPaymentHealth();
      expect(health.totalConnections).toBe(0);
      expect(health.activeConnections).toBe(0);
    });

    it("aggregates across all tenants", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(
        sampleStripeInput({ tenantId: TENANT_B }),
      );
      const health = service.getPlatformPaymentHealth();
      expect(health.totalConnections).toBe(2);
      expect(health.inactiveConnections).toBe(2);
    });

    it("counts active connections after verification", async () => {
      const created = service.createConnection(sampleStripeInput());
      await service.verifyConnection(TENANT_A, created.id);
      const health = service.getPlatformPaymentHealth();
      expect(health.activeConnections).toBe(1);
    });

    it("breaks down by provider", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(sampleSquareInput());
      const health = service.getPlatformPaymentHealth();
      expect(health.byProvider.stripe.total).toBe(1);
      expect(health.byProvider.square.total).toBe(1);
    });

    it("never exposes credentials in platform health", () => {
      service.createConnection(sampleStripeInput());
      const health = service.getPlatformPaymentHealth();
      const healthStr = JSON.stringify(health);
      expect(healthStr).not.toContain("pk_test_123");
      expect(healthStr).not.toContain("sk_test_456");
      expect(healthStr).not.toContain("encryptedCredentials");
    });
  });

  describe("getPlatformTenantPaymentHealth", () => {
    it("returns empty array for no connections", () => {
      const health = service.getPlatformTenantPaymentHealth();
      expect(health).toEqual([]);
    });

    it("groups connections by tenant", () => {
      service.createConnection(sampleStripeInput());
      service.createConnection(sampleSquareInput());
      service.createConnection(
        sampleStripeInput({ tenantId: TENANT_B }),
      );
      const health = service.getPlatformTenantPaymentHealth();
      expect(health).toHaveLength(2);
      const tenantAHealth = health.find((h) => h.tenantId === TENANT_A);
      expect(tenantAHealth?.connections).toHaveLength(2);
    });

    it("never exposes credentials in per-tenant health", () => {
      service.createConnection(sampleStripeInput());
      const health = service.getPlatformTenantPaymentHealth();
      const healthStr = JSON.stringify(health);
      expect(healthStr).not.toContain("pk_test_123");
      expect(healthStr).not.toContain("encryptedCredentials");
    });
  });
});
