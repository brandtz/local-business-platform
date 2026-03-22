// E8-S1-T3: Payment connection API contracts.
// SECURITY: Credentials are accepted on input but NEVER returned in responses.
// SECURITY: Raw secrets are never echoed back.

import type {
  PaymentProvider,
  PaymentConnectionMode,
} from "@platform/types";
import {
  isValidPaymentProvider,
  isValidPaymentConnectionMode,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class PaymentConnectionApiContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentConnectionApiContractError";
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Create payment connection request
// ---------------------------------------------------------------------------

export type CreatePaymentConnectionRequest = {
  provider: PaymentProvider;
  displayName: string;
  mode: PaymentConnectionMode;
  credentials: Record<string, unknown>;
};

export function assertValidCreatePaymentConnectionRequest(
  payload: unknown,
): asserts payload is CreatePaymentConnectionRequest {
  if (!isRecord(payload)) {
    throw new PaymentConnectionApiContractError(
      "Request body must be an object.",
    );
  }

  if (
    !isNonEmptyString(payload.provider) ||
    !isValidPaymentProvider(payload.provider as string)
  ) {
    throw new PaymentConnectionApiContractError(
      "provider must be one of: stripe, square.",
    );
  }

  if (!isNonEmptyString(payload.displayName)) {
    throw new PaymentConnectionApiContractError(
      "displayName must be a non-empty string.",
    );
  }

  if (
    !isNonEmptyString(payload.mode) ||
    !isValidPaymentConnectionMode(payload.mode as string)
  ) {
    throw new PaymentConnectionApiContractError(
      "mode must be one of: sandbox, production.",
    );
  }

  if (!isRecord(payload.credentials)) {
    throw new PaymentConnectionApiContractError(
      "credentials must be an object.",
    );
  }

  // Validate provider-specific credential fields
  const creds = payload.credentials as Record<string, unknown>;
  const provider = payload.provider as string;

  if (provider === "stripe") {
    if (!isNonEmptyString(creds.publishableKey)) {
      throw new PaymentConnectionApiContractError(
        "Stripe credentials require publishableKey.",
      );
    }
    if (!isNonEmptyString(creds.secretKey)) {
      throw new PaymentConnectionApiContractError(
        "Stripe credentials require secretKey.",
      );
    }
  } else if (provider === "square") {
    if (!isNonEmptyString(creds.applicationId)) {
      throw new PaymentConnectionApiContractError(
        "Square credentials require applicationId.",
      );
    }
    if (!isNonEmptyString(creds.accessToken)) {
      throw new PaymentConnectionApiContractError(
        "Square credentials require accessToken.",
      );
    }
    if (!isNonEmptyString(creds.locationId)) {
      throw new PaymentConnectionApiContractError(
        "Square credentials require locationId.",
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Verify connection request (no body needed, uses path param)
// ---------------------------------------------------------------------------

export type VerifyPaymentConnectionRequest = {
  connectionId: string;
};

export function assertValidVerifyPaymentConnectionRequest(
  payload: unknown,
): asserts payload is VerifyPaymentConnectionRequest {
  if (!isRecord(payload)) {
    throw new PaymentConnectionApiContractError(
      "Request body must be an object.",
    );
  }
  if (!isNonEmptyString(payload.connectionId)) {
    throw new PaymentConnectionApiContractError(
      "connectionId must be a non-empty string.",
    );
  }
}

// ---------------------------------------------------------------------------
// Deactivate connection request
// ---------------------------------------------------------------------------

export type DeactivatePaymentConnectionRequest = {
  connectionId: string;
};

export function assertValidDeactivatePaymentConnectionRequest(
  payload: unknown,
): asserts payload is DeactivatePaymentConnectionRequest {
  if (!isRecord(payload)) {
    throw new PaymentConnectionApiContractError(
      "Request body must be an object.",
    );
  }
  if (!isNonEmptyString(payload.connectionId)) {
    throw new PaymentConnectionApiContractError(
      "connectionId must be a non-empty string.",
    );
  }
}

// ---------------------------------------------------------------------------
// Response sanitization assertion — SECURITY CRITICAL
// ---------------------------------------------------------------------------

/**
 * Asserts that a response object does not contain any secret fields.
 * This should be called on all API responses before sending.
 */
export function assertNoSecretsInResponse(response: unknown): void {
  const responseStr = JSON.stringify(response);

  // Check for known secret field patterns
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
    if (responseStr.includes(`"${pattern}"`)) {
      throw new PaymentConnectionApiContractError(
        `SECURITY VIOLATION: Response contains secret field '${pattern}'.`,
      );
    }
  }
}
