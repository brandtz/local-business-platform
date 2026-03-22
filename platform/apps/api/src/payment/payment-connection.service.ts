// E8-S1-T2: Payment connection management service.
// Handles creation, verification, status checks, and deactivation of
// tenant payment gateway connections. All credentials are encrypted.
// Provider-specific logic is delegated to adapters (no SDK leaks).

import { Injectable } from "@nestjs/common";
import type {
  PaymentConnectionRecord,
  PaymentConnectionStatus,
  CreatePaymentConnectionInput,
  AdminPaymentConnectionSummary,
  AdminPaymentConnectionDetail,
  PaymentConnectionHealthView,
  PlatformPaymentHealthSummary,
  PlatformTenantPaymentHealth,
} from "@platform/types";
import {
  isValidPaymentConnectionTransition,
  sanitizePaymentConnection,
  buildConnectionHealthView,
  buildPlatformPaymentHealthSummary,
} from "@platform/types";

import { PaymentConnectionRepository } from "./payment-connection.repository";
import {
  encryptCredentials,
  decryptCredentials,
} from "./credential-encryption.service";
import { getProviderAdapter } from "./payment-provider-adapter";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class PaymentConnectionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConnectionNotFoundError";
  }
}

export class PaymentConnectionTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConnectionTransitionError";
  }
}

export class PaymentConnectionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConnectionValidationError";
  }
}

export class PaymentConnectionDuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConnectionDuplicateError";
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class PaymentConnectionService {
  constructor(
    private readonly repository: PaymentConnectionRepository = new PaymentConnectionRepository(),
  ) {}

  // -----------------------------------------------------------------------
  // Create connection (E8-S1-T2)
  // -----------------------------------------------------------------------

  /**
   * Creates a new payment connection for a tenant.
   * Credentials are encrypted before storage.
   * Enforces one connection per provider per tenant.
   */
  createConnection(
    input: CreatePaymentConnectionInput,
  ): AdminPaymentConnectionSummary {
    // Validate no duplicate
    const existing = this.repository.getConnectionByProvider(
      input.tenantId,
      input.provider,
    );
    if (existing) {
      throw new PaymentConnectionDuplicateError(
        `Tenant already has a connection for provider '${input.provider}'.`,
      );
    }

    // Validate display name
    if (!input.displayName || input.displayName.trim().length === 0) {
      throw new PaymentConnectionValidationError(
        "Display name is required.",
      );
    }

    // Encrypt credentials before storage
    const encrypted = encryptCredentials(
      input.credentials as unknown as Record<string, unknown>,
    );

    const record = this.repository.createConnection(input.tenantId, {
      provider: input.provider,
      displayName: input.displayName.trim(),
      status: "inactive",
      mode: input.mode,
      encryptedCredentials: encrypted.ciphertext,
      credentialsIv: encrypted.iv,
      credentialsTag: encrypted.tag,
    });

    return sanitizePaymentConnection(record);
  }

  // -----------------------------------------------------------------------
  // Verify connection (E8-S1-T2)
  // -----------------------------------------------------------------------

  /**
   * Initiates verification of a payment connection by calling the
   * provider adapter. Updates status based on verification result.
   * Status transitions: inactive/active/suspended → verifying → active/inactive
   */
  async verifyConnection(
    tenantId: string,
    connectionId: string,
  ): Promise<AdminPaymentConnectionSummary> {
    const record = this.requireConnection(tenantId, connectionId);

    // Transition to verifying
    this.transitionStatus(record, "verifying");
    this.repository.updateConnectionStatus(connectionId, "verifying", {
      verificationError: null,
    });

    // Decrypt credentials for provider verification
    const credentials = decryptCredentials({
      ciphertext: record.encryptedCredentials,
      iv: record.credentialsIv,
      tag: record.credentialsTag,
    });

    // Call provider adapter (no SDK leaks in domain logic)
    const adapter = getProviderAdapter(record.provider);
    const result = await adapter.verifyCredentials(credentials);

    if (result.success) {
      const updated = this.repository.updateConnectionStatus(
        connectionId,
        "active",
        {
          lastVerifiedAt: new Date().toISOString(),
          verificationError: null,
        },
      );
      return sanitizePaymentConnection(updated!);
    } else {
      const updated = this.repository.updateConnectionStatus(
        connectionId,
        "inactive",
        {
          verificationError: result.error ?? "Verification failed.",
        },
      );
      return sanitizePaymentConnection(updated!);
    }
  }

  // -----------------------------------------------------------------------
  // Check connection status (E8-S1-T2)
  // -----------------------------------------------------------------------

  /**
   * Checks the current health of a connection by pinging the provider.
   * If the provider is unreachable, the connection is suspended.
   */
  async checkConnectionHealth(
    tenantId: string,
    connectionId: string,
  ): Promise<AdminPaymentConnectionSummary> {
    const record = this.requireConnection(tenantId, connectionId);

    if (record.status !== "active") {
      return sanitizePaymentConnection(record);
    }

    // Decrypt credentials for health check
    const credentials = decryptCredentials({
      ciphertext: record.encryptedCredentials,
      iv: record.credentialsIv,
      tag: record.credentialsTag,
    });

    const adapter = getProviderAdapter(record.provider);
    const status = await adapter.checkConnectionStatus(credentials);

    if (!status.reachable || !status.accountActive) {
      const updated = this.repository.updateConnectionStatus(
        connectionId,
        "suspended",
        {
          suspendedReason: status.error ?? "Provider health check failed.",
        },
      );
      return sanitizePaymentConnection(updated!);
    }

    // Update last verified timestamp
    const updated = this.repository.updateConnectionStatus(
      connectionId,
      "active",
      {
        lastVerifiedAt: new Date().toISOString(),
      },
    );
    return sanitizePaymentConnection(updated!);
  }

  // -----------------------------------------------------------------------
  // Deactivate connection (E8-S1-T2)
  // -----------------------------------------------------------------------

  /**
   * Deactivates a payment connection. Sets status to inactive.
   */
  deactivateConnection(
    tenantId: string,
    connectionId: string,
  ): AdminPaymentConnectionSummary {
    const record = this.requireConnection(tenantId, connectionId);

    if (record.status === "inactive") {
      return sanitizePaymentConnection(record);
    }

    // Validate transition to inactive
    if (!isValidPaymentConnectionTransition(record.status, "inactive")) {
      // Active → inactive is not a direct transition; must go through suspended first
      // But for admin deactivation, we allow active → suspended → inactive
      if (record.status === "active") {
        this.repository.updateConnectionStatus(connectionId, "suspended", {
          suspendedReason: "Deactivated by admin.",
        });
      }
    }

    const updated = this.repository.updateConnectionStatus(
      connectionId,
      "inactive",
      {
        suspendedReason: null,
        verificationError: null,
      },
    );
    return sanitizePaymentConnection(updated!);
  }

  // -----------------------------------------------------------------------
  // Admin queries (E8-S1-T3)
  // -----------------------------------------------------------------------

  /**
   * Lists all payment connections for a tenant.
   * Returns sanitized summaries (no credentials).
   */
  listConnections(tenantId: string): AdminPaymentConnectionSummary[] {
    const records = this.repository.listConnectionsByTenant(tenantId);
    return records.map(sanitizePaymentConnection);
  }

  /**
   * Gets a single payment connection detail.
   * Returns sanitized detail (no credentials).
   */
  getConnectionDetail(
    tenantId: string,
    connectionId: string,
  ): AdminPaymentConnectionDetail {
    const record = this.requireConnection(tenantId, connectionId);
    return sanitizePaymentConnection(record);
  }

  // -----------------------------------------------------------------------
  // Health read models (E8-S1-T4)
  // -----------------------------------------------------------------------

  /**
   * Returns health views for all connections of a tenant.
   * NEVER includes credentials.
   */
  getTenantConnectionHealth(tenantId: string): PaymentConnectionHealthView[] {
    const records = this.repository.listConnectionsByTenant(tenantId);
    return records.map(buildConnectionHealthView);
  }

  /**
   * Returns aggregated platform-wide payment health summary.
   * For platform admin dashboards. NEVER includes credentials.
   */
  getPlatformPaymentHealth(): PlatformPaymentHealthSummary {
    const records = this.repository.listAllConnections();
    return buildPlatformPaymentHealthSummary(records);
  }

  /**
   * Returns per-tenant connection health for platform admin.
   * Groups connections by tenant. NEVER includes credentials.
   */
  getPlatformTenantPaymentHealth(): PlatformTenantPaymentHealth[] {
    const records = this.repository.listAllConnections();
    const byTenant = new Map<string, PaymentConnectionRecord[]>();

    for (const record of records) {
      const list = byTenant.get(record.tenantId) ?? [];
      list.push(record);
      byTenant.set(record.tenantId, list);
    }

    const result: PlatformTenantPaymentHealth[] = [];
    for (const [tenantId, connections] of byTenant) {
      result.push({
        tenantId,
        connections: connections.map(buildConnectionHealthView),
      });
    }
    return result;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private requireConnection(
    tenantId: string,
    connectionId: string,
  ): PaymentConnectionRecord {
    const record = this.repository.getConnectionById(tenantId, connectionId);
    if (!record) {
      throw new PaymentConnectionNotFoundError(
        `Payment connection '${connectionId}' not found for tenant '${tenantId}'.`,
      );
    }
    return record;
  }

  private transitionStatus(
    record: PaymentConnectionRecord,
    targetStatus: PaymentConnectionStatus,
  ): void {
    if (!isValidPaymentConnectionTransition(record.status, targetStatus)) {
      throw new PaymentConnectionTransitionError(
        `Cannot transition payment connection from '${record.status}' to '${targetStatus}'.`,
      );
    }
  }
}
