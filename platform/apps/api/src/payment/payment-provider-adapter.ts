// E8-S1-T2: Payment provider adapter contract.
// Adapter pattern: no direct provider SDK calls in domain services.
// Each provider (Stripe, Square) must implement this interface.

import type { PaymentProvider } from "@platform/types";

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
}

// ---------------------------------------------------------------------------
// Stub adapters for initial implementation
// These will be replaced with real SDK integrations in E8-S2.
// ---------------------------------------------------------------------------

/**
 * Stripe adapter stub — validates credential shape only.
 * Real Stripe SDK integration is deferred to E8-S2.
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
}

/**
 * Square adapter stub — validates credential shape only.
 * Real Square SDK integration is deferred to E8-S2.
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
