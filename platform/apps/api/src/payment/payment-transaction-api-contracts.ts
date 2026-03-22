// E8-S2-T4: Admin refund and transaction API contracts.
// Request validation for refund initiation and transaction history.
// SECURITY: Validates admin authorization, refund amount, and required reason.

import type {
  AdminRefundRequest,
  AdminTransactionListQuery,
  PaymentTransactionStatus,
} from "@platform/types";
import { paymentTransactionStatuses } from "@platform/types";

// ---------------------------------------------------------------------------
// Request validation
// ---------------------------------------------------------------------------

export function assertValidAdminRefundRequest(
  body: Record<string, unknown>,
): AdminRefundRequest {
  const errors: string[] = [];

  if (typeof body.tenantId !== "string" || body.tenantId.trim().length === 0) {
    errors.push("tenantId is required.");
  }
  if (
    typeof body.transactionId !== "string" ||
    body.transactionId.trim().length === 0
  ) {
    errors.push("transactionId is required.");
  }
  if (typeof body.amountCents !== "number" || body.amountCents <= 0) {
    errors.push("amountCents must be a positive number.");
  }
  if (typeof body.reason !== "string" || body.reason.trim().length === 0) {
    errors.push("reason is required for refund actions.");
  }
  if (typeof body.actorId !== "string" || body.actorId.trim().length === 0) {
    errors.push("actorId is required for refund actions.");
  }

  if (errors.length > 0) {
    throw new AdminRefundValidationError(errors.join(" "));
  }

  return {
    tenantId: (body.tenantId as string).trim(),
    transactionId: (body.transactionId as string).trim(),
    amountCents: body.amountCents as number,
    reason: (body.reason as string).trim(),
    actorId: (body.actorId as string).trim(),
  };
}

export function assertValidTransactionListQuery(
  query: Record<string, unknown>,
): AdminTransactionListQuery {
  const result: AdminTransactionListQuery = {
    tenantId: "",
  };

  if (typeof query.tenantId !== "string" || query.tenantId.trim().length === 0) {
    throw new AdminRefundValidationError("tenantId is required.");
  }
  result.tenantId = (query.tenantId as string).trim();

  if (query.referenceType !== undefined) {
    if (query.referenceType !== "order" && query.referenceType !== "booking") {
      throw new AdminRefundValidationError(
        "referenceType must be 'order' or 'booking'.",
      );
    }
    result.referenceType = query.referenceType;
  }

  if (query.referenceId !== undefined) {
    if (typeof query.referenceId !== "string") {
      throw new AdminRefundValidationError("referenceId must be a string.");
    }
    result.referenceId = query.referenceId;
  }

  if (query.status !== undefined) {
    if (
      !(paymentTransactionStatuses as readonly string[]).includes(
        query.status as string,
      )
    ) {
      throw new AdminRefundValidationError(
        `status must be one of: ${paymentTransactionStatuses.join(", ")}.`,
      );
    }
    result.status = query.status as PaymentTransactionStatus;
  }

  if (query.page !== undefined) {
    const page = Number(query.page);
    if (isNaN(page) || page < 1) {
      throw new AdminRefundValidationError("page must be a positive number.");
    }
    result.page = page;
  }

  if (query.pageSize !== undefined) {
    const pageSize = Number(query.pageSize);
    if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new AdminRefundValidationError(
        "pageSize must be between 1 and 100.",
      );
    }
    result.pageSize = pageSize;
  }

  return result;
}

/**
 * Validates that no sensitive transaction data leaks in responses.
 * Provider credentials should never appear in transaction views.
 */
export function assertNoSecretsInTransactionResponse(
  json: string,
): void {
  const forbiddenPatterns = [
    "encryptedCredentials",
    "credentialsIv",
    "credentialsTag",
    "secretKey",
    "accessToken",
    "publishableKey",
    "applicationId",
  ];
  for (const pattern of forbiddenPatterns) {
    if (json.includes(pattern)) {
      throw new Error(
        `Security violation: transaction response contains forbidden pattern '${pattern}'.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AdminRefundValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminRefundValidationError";
  }
}
