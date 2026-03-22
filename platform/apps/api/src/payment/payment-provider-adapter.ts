// E8-S1-T2 + E8-S2-T1: Payment provider adapter contract.
// Adapter pattern: no direct provider SDK calls in domain services.
// Each provider (Stripe, Square) must implement this interface.
// E8-S2-T1 extends with createIntent, capturePayment, voidPayment, refundPayment.

import type {
  PaymentProvider,
  ProviderCreateIntentRequest,
  ProviderCreateIntentResponse,
  ProviderCaptureRequest,
  ProviderCaptureResponse,
  ProviderVoidRequest,
  ProviderVoidResponse,
  ProviderRefundRequest,
  ProviderRefundResponse,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Provider adapter interface
// ---------------------------------------------------------------------------

/**
 * Result of a credential verification attempt against a payment provider.
 */
export type ProviderVerificationResult = {
  success: boolean;
  providerAccountId?: string;
  error?: string;
};

/**
 * Connection status as reported by the provider.
 */
export type ProviderConnectionStatus = {
  reachable: boolean;
  accountActive: boolean;
  error?: string;
};

/**
 * Provider adapter interface.
 * Each payment provider must implement this contract.
 * Domain services call ONLY this interface — never provider SDKs directly.
 */
export interface PaymentProviderAdapter {
  /** The provider this adapter handles. */
  readonly provider: PaymentProvider;

  /**
   * Verifies that the provided credentials are valid by making a
   * lightweight API call to the provider. Does NOT store any raw response.
   */
  verifyCredentials(
    credentials: Record<string, unknown>,
  ): Promise<ProviderVerificationResult>;

  /**
   * Checks the current connection health by pinging the provider API.
   */
  checkConnectionStatus(
    credentials: Record<string, unknown>,
  ): Promise<ProviderConnectionStatus>;

  // -------------------------------------------------------------------------
  // E8-S2-T1: Payment operation methods
  // -------------------------------------------------------------------------

  /**
   * Creates a payment intent with the provider.
   * Returns a provider-side transaction identifier on success.
   */
  createIntent(
    credentials: Record<string, unknown>,
    request: ProviderCreateIntentRequest,
  ): Promise<ProviderCreateIntentResponse>;

  /**
   * Captures a previously authorized payment.
   */
  capturePayment(
    credentials: Record<string, unknown>,
    request: ProviderCaptureRequest,
  ): Promise<ProviderCaptureResponse>;

  /**
   * Voids a previously authorized (but not captured) payment.
   */
  voidPayment(
    credentials: Record<string, unknown>,
    request: ProviderVoidRequest,
  ): Promise<ProviderVoidResponse>;

  /**
   * Issues a refund against a captured payment.
   */
  refundPayment(
    credentials: Record<string, unknown>,
    request: ProviderRefundRequest,
  ): Promise<ProviderRefundResponse>;
}

// ---------------------------------------------------------------------------
// Stub adapters for initial implementation
// These will be replaced with real SDK integrations in E8-S2.
// ---------------------------------------------------------------------------

/**
 * Stripe adapter stub — validates credential shape only.
 * Real Stripe SDK integration is deferred.
 */
export class StripeProviderAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "stripe";

  async verifyCredentials(
    credentials: Record<string, unknown>,
  ): Promise<ProviderVerificationResult> {
    if (
      typeof credentials.publishableKey !== "string" ||
      typeof credentials.secretKey !== "string"
    ) {
      return { success: false, error: "Missing required Stripe credentials." };
    }
    // Stub: accept if keys have expected prefixes
    const pk = credentials.publishableKey as string;
    const sk = credentials.secretKey as string;
    if (!pk.startsWith("pk_") || !sk.startsWith("sk_")) {
      return {
        success: false,
        error: "Invalid Stripe key format.",
      };
    }
    return { success: true, providerAccountId: "acct_stub" };
  }

  async checkConnectionStatus(
    credentials: Record<string, unknown>,
  ): Promise<ProviderConnectionStatus> {
    const result = await this.verifyCredentials(credentials);
    return {
      reachable: result.success,
      accountActive: result.success,
      error: result.error,
    };
  }

  async createIntent(
    credentials: Record<string, unknown>,
    request: ProviderCreateIntentRequest,
  ): Promise<ProviderCreateIntentResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    return {
      success: true,
      providerTransactionId: `pi_stripe_${request.idempotencyKey}`,
    };
  }

  async capturePayment(
    credentials: Record<string, unknown>,
    request: ProviderCaptureRequest,
  ): Promise<ProviderCaptureResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    if (!request.providerTransactionId) {
      return { success: false, error: "Missing provider transaction ID." };
    }
    return { success: true };
  }

  async voidPayment(
    credentials: Record<string, unknown>,
    request: ProviderVoidRequest,
  ): Promise<ProviderVoidResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    if (!request.providerTransactionId) {
      return { success: false, error: "Missing provider transaction ID." };
    }
    return { success: true };
  }

  async refundPayment(
    credentials: Record<string, unknown>,
    request: ProviderRefundRequest,
  ): Promise<ProviderRefundResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    if (!request.providerTransactionId) {
      return { success: false, error: "Missing provider transaction ID." };
    }
    return {
      success: true,
      providerRefundId: `re_stripe_${request.idempotencyKey}`,
    };
  }
}

/**
 * Square adapter stub — validates credential shape only.
 * Real Square SDK integration is deferred.
 */
export class SquareProviderAdapter implements PaymentProviderAdapter {
  readonly provider: PaymentProvider = "square";

  async verifyCredentials(
    credentials: Record<string, unknown>,
  ): Promise<ProviderVerificationResult> {
    if (
      typeof credentials.applicationId !== "string" ||
      typeof credentials.accessToken !== "string" ||
      typeof credentials.locationId !== "string"
    ) {
      return { success: false, error: "Missing required Square credentials." };
    }
    return { success: true, providerAccountId: "loc_stub" };
  }

  async checkConnectionStatus(
    credentials: Record<string, unknown>,
  ): Promise<ProviderConnectionStatus> {
    const result = await this.verifyCredentials(credentials);
    return {
      reachable: result.success,
      accountActive: result.success,
      error: result.error,
    };
  }

  async createIntent(
    credentials: Record<string, unknown>,
    request: ProviderCreateIntentRequest,
  ): Promise<ProviderCreateIntentResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    return {
      success: true,
      providerTransactionId: `sq_pay_${request.idempotencyKey}`,
    };
  }

  async capturePayment(
    credentials: Record<string, unknown>,
    request: ProviderCaptureRequest,
  ): Promise<ProviderCaptureResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    if (!request.providerTransactionId) {
      return { success: false, error: "Missing provider transaction ID." };
    }
    return { success: true };
  }

  async voidPayment(
    credentials: Record<string, unknown>,
    request: ProviderVoidRequest,
  ): Promise<ProviderVoidResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    if (!request.providerTransactionId) {
      return { success: false, error: "Missing provider transaction ID." };
    }
    return { success: true };
  }

  async refundPayment(
    credentials: Record<string, unknown>,
    request: ProviderRefundRequest,
  ): Promise<ProviderRefundResponse> {
    const verifyResult = await this.verifyCredentials(credentials);
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error };
    }
    if (!request.providerTransactionId) {
      return { success: false, error: "Missing provider transaction ID." };
    }
    return {
      success: true,
      providerRefundId: `sq_refund_${request.idempotencyKey}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Adapter registry
// ---------------------------------------------------------------------------

/**
 * Returns the provider adapter for a given provider type.
 * Throws if the provider is not supported.
 */
export function getProviderAdapter(
  provider: PaymentProvider,
): PaymentProviderAdapter {
  switch (provider) {
    case "stripe":
      return new StripeProviderAdapter();
    case "square":
      return new SquareProviderAdapter();
    default:
      throw new Error(`Unsupported payment provider: ${provider as string}`);
  }
}
