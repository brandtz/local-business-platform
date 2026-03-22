// E8-S3-T1 + T2: Webhook ingress service.
// Receives raw webhook payloads, verifies signatures, stores events,
// and dispatches to processors. Returns 200 immediately on valid receipt.
//
// SECURITY: Signature verification is mandatory — rejects invalid webhooks.
// RELIABILITY: Events are stored before processing for replay capability.
// RELIABILITY: Duplicate events are detected and skipped (idempotent).

import { Injectable } from "@nestjs/common";
import type {
  PaymentProvider,
  ParsedWebhookPayload,
} from "@platform/types";

import { PaymentConnectionRepository } from "./payment-connection.repository";
import { WebhookEventRepository } from "./webhook-event.repository";
import {
  verifyWebhookSignature,
} from "./webhook-signature.service";
import { decryptCredentials, type EncryptedPayload } from "./credential-encryption.service";
import { WebhookEventProcessorService } from "./webhook-event-processor.service";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

export class WebhookDuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookDuplicateError";
  }
}

// ---------------------------------------------------------------------------
// Ingress result
// ---------------------------------------------------------------------------

export type WebhookIngressResult = {
  accepted: boolean;
  eventId: string | null;
  duplicate: boolean;
  error?: string;
};

// ---------------------------------------------------------------------------
// Stripe payload parser
// ---------------------------------------------------------------------------

function parseStripePayload(rawPayload: string): ParsedWebhookPayload {
  const parsed = JSON.parse(rawPayload);
  const event = parsed as Record<string, unknown>;
  const data = (event.data as Record<string, unknown>) ?? {};
  const object = (data.object as Record<string, unknown>) ?? {};

  return {
    provider: "stripe",
    providerEventId: (event.id as string) ?? "",
    eventType: (event.type as string) ?? "",
    rawPayload,
    providerTransactionId: (object.id as string) ?? null,
    amountCents:
      typeof object.amount === "number" ? (object.amount as number) : null,
    metadata: object.metadata as Record<string, unknown> ?? {},
  };
}

// ---------------------------------------------------------------------------
// Square payload parser
// ---------------------------------------------------------------------------

function parseSquarePayload(rawPayload: string): ParsedWebhookPayload {
  const parsed = JSON.parse(rawPayload);
  const event = parsed as Record<string, unknown>;
  const data = (event.data as Record<string, unknown>) ?? {};
  const object = (data.object as Record<string, unknown>) ?? {};
  const innerObj = (object.payment ?? object.refund ?? object) as Record<string, unknown>;

  return {
    provider: "square",
    providerEventId: (event.event_id as string) ?? "",
    eventType: (event.type as string) ?? "",
    rawPayload,
    providerTransactionId: (innerObj.id as string) ?? null,
    amountCents: null,
    metadata: {},
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class WebhookIngressService {
  constructor(
    private readonly connectionRepo: PaymentConnectionRepository = new PaymentConnectionRepository(),
    private readonly eventRepo: WebhookEventRepository = new WebhookEventRepository(),
    private readonly processor: WebhookEventProcessorService = new WebhookEventProcessorService(),
  ) {}

  /**
   * Receives a raw webhook from a payment provider, verifies the signature,
   * stores the event, and dispatches to processors.
   *
   * Returns immediately after storage — processing happens inline but
   * failures do not reject the webhook (event is stored for retry).
   */
  async handleWebhook(input: {
    provider: PaymentProvider;
    rawBody: string;
    signatureHeader: string;
    /** Tenant ID, if known from the URL path. */
    tenantId?: string;
    /** Square notification URL for signature verification. */
    notificationUrl?: string;
    /** Override current time for testing. */
    nowSeconds?: number;
  }): Promise<WebhookIngressResult> {
    // 1. Resolve webhook signing secret from the payment connection
    const secret = this.resolveWebhookSecret(input.provider, input.tenantId);
    if (!secret) {
      return {
        accepted: false,
        eventId: null,
        duplicate: false,
        error: "No payment connection found for webhook verification.",
      };
    }

    // 2. Verify signature — SECURITY CRITICAL
    const verification = verifyWebhookSignature({
      provider: input.provider,
      rawBody: input.rawBody,
      signatureHeader: input.signatureHeader,
      secret: secret.webhookSecret,
      notificationUrl: input.notificationUrl,
      nowSeconds: input.nowSeconds,
    });

    if (!verification.valid) {
      return {
        accepted: false,
        eventId: null,
        duplicate: false,
        error: verification.error ?? "Signature verification failed.",
      };
    }

    // 3. Parse the webhook payload
    const parsed = this.parsePayload(input.provider, input.rawBody);

    // 4. Store event — returns null on duplicate (idempotent)
    const storedEvent = this.eventRepo.createEvent({
      provider: parsed.provider,
      eventType: parsed.eventType,
      providerEventId: parsed.providerEventId,
      rawPayload: parsed.rawPayload,
      tenantId: secret.tenantId,
      connectionId: secret.connectionId,
    });

    if (!storedEvent) {
      // Duplicate — already received this event
      return {
        accepted: true,
        eventId: null,
        duplicate: true,
      };
    }

    // 5. Process the event (inline, but failures don't reject the webhook)
    try {
      await this.processor.processEvent(storedEvent, parsed);
    } catch {
      // Processing failed — event is stored for retry via replay
      // Status updated to "failed" by the processor
    }

    return {
      accepted: true,
      eventId: storedEvent.id,
      duplicate: false,
    };
  }

  /**
   * Returns the webhook event repository for direct access by
   * the admin tooling layer.
   */
  getEventRepository(): WebhookEventRepository {
    return this.eventRepo;
  }

  /**
   * Returns the event processor for replay operations.
   */
  getProcessor(): WebhookEventProcessorService {
    return this.processor;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private resolveWebhookSecret(
    provider: PaymentProvider,
    tenantId?: string,
  ): {
    webhookSecret: string;
    tenantId: string;
    connectionId: string;
  } | null {
    // If tenantId is specified, look up that specific connection
    if (tenantId) {
      const conn = this.connectionRepo.getConnectionByProvider(
        tenantId,
        provider,
      );
      if (!conn || conn.status !== "active") return null;

      try {
        const payload: EncryptedPayload = {
          ciphertext: conn.encryptedCredentials,
          iv: conn.credentialsIv,
          tag: conn.credentialsTag,
        };
        const credentials = decryptCredentials(payload);

        const webhookSecret =
          (credentials.webhookSecret as string) ??
          (credentials.signatureKey as string) ??
          "";
        if (!webhookSecret) return null;

        return { webhookSecret, tenantId: conn.tenantId, connectionId: conn.id };
      } catch {
        return null;
      }
    }

    // If no tenantId, try all active connections for this provider
    const allConnections = this.connectionRepo.listAllConnections();
    const providerConnections = allConnections.filter(
      (c) => c.provider === provider && c.status === "active",
    );

    for (const conn of providerConnections) {
      try {
        const payload: EncryptedPayload = {
          ciphertext: conn.encryptedCredentials,
          iv: conn.credentialsIv,
          tag: conn.credentialsTag,
        };
        const credentials = decryptCredentials(payload);

        const webhookSecret =
          (credentials.webhookSecret as string) ??
          (credentials.signatureKey as string) ??
          "";
        if (webhookSecret) {
          return {
            webhookSecret,
            tenantId: conn.tenantId,
            connectionId: conn.id,
          };
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private parsePayload(
    provider: PaymentProvider,
    rawBody: string,
  ): ParsedWebhookPayload {
    switch (provider) {
      case "stripe":
        return parseStripePayload(rawBody);
      case "square":
        return parseSquarePayload(rawBody);
      default:
        throw new Error(`Unsupported provider: ${provider as string}`);
    }
  }
}
