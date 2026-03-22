// E8-S3-T4: Platform-admin webhook inspection and replay API contracts.
// Validates requests for listing, viewing, and replaying webhook events.
// SECURITY: Only platform-admin role can access webhook operational tooling.
// SECURITY: Raw payloads are visible only to platform admins for debugging.

import type {
  WebhookEventRecord,
  WebhookEventListQuery,
  WebhookEventSummary,
  WebhookEventDetail,
  WebhookEventStatus,
  PaymentProvider,
} from "@platform/types";
import { isValidPaymentProvider, isValidWebhookEventStatus } from "@platform/types";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type WebhookListValidationResult = {
  valid: boolean;
  error?: string;
  query?: WebhookEventListQuery;
};

export function validateWebhookListQuery(
  input: Record<string, unknown>,
): WebhookListValidationResult {
  const query: WebhookEventListQuery = {};

  if (input.provider !== undefined) {
    if (
      typeof input.provider !== "string" ||
      !isValidPaymentProvider(input.provider)
    ) {
      return { valid: false, error: "Invalid provider." };
    }
    query.provider = input.provider as PaymentProvider;
  }

  if (input.eventType !== undefined) {
    if (typeof input.eventType !== "string" || input.eventType.length === 0) {
      return { valid: false, error: "Invalid eventType." };
    }
    query.eventType = input.eventType;
  }

  if (input.status !== undefined) {
    if (
      typeof input.status !== "string" ||
      !isValidWebhookEventStatus(input.status)
    ) {
      return { valid: false, error: "Invalid status." };
    }
    query.status = input.status as WebhookEventStatus;
  }

  if (input.tenantId !== undefined) {
    if (typeof input.tenantId !== "string" || input.tenantId.length === 0) {
      return { valid: false, error: "Invalid tenantId." };
    }
    query.tenantId = input.tenantId;
  }

  if (input.startDate !== undefined) {
    if (typeof input.startDate !== "string") {
      return { valid: false, error: "Invalid startDate." };
    }
    query.startDate = input.startDate;
  }

  if (input.endDate !== undefined) {
    if (typeof input.endDate !== "string") {
      return { valid: false, error: "Invalid endDate." };
    }
    query.endDate = input.endDate;
  }

  if (input.page !== undefined) {
    const page = Number(input.page);
    if (!Number.isInteger(page) || page < 1) {
      return { valid: false, error: "Page must be a positive integer." };
    }
    query.page = page;
  }

  if (input.pageSize !== undefined) {
    const pageSize = Number(input.pageSize);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return {
        valid: false,
        error: "Page size must be between 1 and 100.",
      };
    }
    query.pageSize = pageSize;
  }

  return { valid: true, query };
}

// ---------------------------------------------------------------------------
// View model builders
// ---------------------------------------------------------------------------

export function toWebhookEventSummary(
  record: WebhookEventRecord,
): WebhookEventSummary {
  return {
    id: record.id,
    provider: record.provider,
    eventType: record.eventType,
    providerEventId: record.providerEventId,
    status: record.status,
    tenantId: record.tenantId,
    attempts: record.attempts,
    createdAt: record.createdAt,
    lastProcessedAt: record.lastProcessedAt,
  };
}

export function toWebhookEventDetail(
  record: WebhookEventRecord,
): WebhookEventDetail {
  return {
    ...toWebhookEventSummary(record),
    rawPayload: record.rawPayload,
    connectionId: record.connectionId,
    lastError: record.lastError,
    updatedAt: record.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Authorization check
// ---------------------------------------------------------------------------

/**
 * Validates that the requesting actor has platform-admin access.
 * Webhook operational tooling is restricted to platform-admin role.
 */
export function assertPlatformAdminAccess(actorType: string): void {
  if (actorType !== "platform") {
    throw new Error("Access denied: webhook tooling requires platform-admin role.");
  }
}

// ---------------------------------------------------------------------------
// Replay request validation
// ---------------------------------------------------------------------------

export type ReplayRequestValidationResult = {
  valid: boolean;
  error?: string;
  eventId?: string;
};

export function validateReplayRequest(
  input: Record<string, unknown>,
): ReplayRequestValidationResult {
  if (typeof input.eventId !== "string" || input.eventId.length === 0) {
    return { valid: false, error: "eventId is required." };
  }
  return { valid: true, eventId: input.eventId };
}
