import type {
  PaymentConnectionRecord,
  PaymentProvider,
  PaymentConnectionStatus,
  PaymentConnectionMode,
} from "@platform/types";

// ---------------------------------------------------------------------------
// In-memory payment connection repository for tenant-scoped CRUD
// ---------------------------------------------------------------------------

const connectionCounter = { value: 0 };

function nextId(): string {
  connectionCounter.value += 1;
  return `pconn-${connectionCounter.value}`;
}

function now(): string {
  return new Date().toISOString();
}

export class PaymentConnectionRepository {
  private connections: PaymentConnectionRecord[] = [];

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  createConnection(
    tenantId: string,
    data: {
      provider: PaymentProvider;
      displayName: string;
      status: PaymentConnectionStatus;
      mode: PaymentConnectionMode;
      encryptedCredentials: string;
      credentialsIv: string;
      credentialsTag: string;
    },
  ): PaymentConnectionRecord {
    // Enforce unique constraint: one connection per provider per tenant
    const existing = this.connections.find(
      (c) => c.tenantId === tenantId && c.provider === data.provider,
    );
    if (existing) {
      throw new Error(
        `A payment connection for provider '${data.provider}' already exists for tenant '${tenantId}'.`,
      );
    }

    const timestamp = now();
    const connection: PaymentConnectionRecord = {
      id: nextId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      tenantId,
      provider: data.provider,
      displayName: data.displayName,
      status: data.status,
      mode: data.mode,
      encryptedCredentials: data.encryptedCredentials,
      credentialsIv: data.credentialsIv,
      credentialsTag: data.credentialsTag,
      lastVerifiedAt: null,
      verificationError: null,
      statusChangedAt: timestamp,
      suspendedReason: null,
    };
    this.connections.push(connection);
    return connection;
  }

  // -----------------------------------------------------------------------
  // Read
  // -----------------------------------------------------------------------

  getConnectionById(
    tenantId: string,
    connectionId: string,
  ): PaymentConnectionRecord | null {
    return (
      this.connections.find(
        (c) => c.tenantId === tenantId && c.id === connectionId,
      ) ?? null
    );
  }

  getConnectionByProvider(
    tenantId: string,
    provider: PaymentProvider,
  ): PaymentConnectionRecord | null {
    return (
      this.connections.find(
        (c) => c.tenantId === tenantId && c.provider === provider,
      ) ?? null
    );
  }

  listConnectionsByTenant(tenantId: string): PaymentConnectionRecord[] {
    return this.connections.filter((c) => c.tenantId === tenantId);
  }

  listAllConnections(): PaymentConnectionRecord[] {
    return [...this.connections];
  }

  // -----------------------------------------------------------------------
  // Update
  // -----------------------------------------------------------------------

  updateConnectionStatus(
    connectionId: string,
    status: PaymentConnectionStatus,
    fields?: {
      lastVerifiedAt?: string;
      verificationError?: string | null;
      suspendedReason?: string | null;
    },
  ): PaymentConnectionRecord | null {
    const conn = this.connections.find((c) => c.id === connectionId);
    if (!conn) return null;

    const timestamp = now();
    conn.status = status;
    conn.statusChangedAt = timestamp;
    conn.updatedAt = timestamp;

    if (fields?.lastVerifiedAt !== undefined) {
      conn.lastVerifiedAt = fields.lastVerifiedAt;
    }
    if (fields?.verificationError !== undefined) {
      conn.verificationError = fields.verificationError;
    }
    if (fields?.suspendedReason !== undefined) {
      conn.suspendedReason = fields.suspendedReason;
    }

    return conn;
  }

  updateConnectionCredentials(
    connectionId: string,
    data: {
      encryptedCredentials: string;
      credentialsIv: string;
      credentialsTag: string;
    },
  ): PaymentConnectionRecord | null {
    const conn = this.connections.find((c) => c.id === connectionId);
    if (!conn) return null;

    conn.encryptedCredentials = data.encryptedCredentials;
    conn.credentialsIv = data.credentialsIv;
    conn.credentialsTag = data.credentialsTag;
    conn.updatedAt = now();

    return conn;
  }

  // -----------------------------------------------------------------------
  // Delete
  // -----------------------------------------------------------------------

  deleteConnection(
    tenantId: string,
    connectionId: string,
  ): boolean {
    const idx = this.connections.findIndex(
      (c) => c.tenantId === tenantId && c.id === connectionId,
    );
    if (idx === -1) return false;
    this.connections.splice(idx, 1);
    return true;
  }
}
