// E11-S4-T6: Customer-Facing Quote View — display state mapping,
// line-item formatting, and response form validation for the secure
// share-link quote page (no login required).

import type {
  QuoteStatus,
  CustomerQuoteView,
  CustomerQuoteLineItemView,
} from "@platform/types";

// ---------------------------------------------------------------------------
// Quote display state
// ---------------------------------------------------------------------------

export const quoteViewStates = [
  "loading",
  "ready",
  "expired",
  "accepted",
  "declined",
  "revision_requested",
  "error",
  "not_found",
] as const;
export type QuoteViewState = (typeof quoteViewStates)[number];

// ---------------------------------------------------------------------------
// Customer quote display data
// ---------------------------------------------------------------------------

export type CustomerQuoteDisplayData = {
  quoteNumber: string;
  businessName: string;
  customerName: string;
  status: QuoteStatus;
  statusLabel: string;
  statusDescription: string;
  isActionable: boolean;
  expiresAt: string;
  expiresInDays: number;
  isExpiringSoon: boolean;
  customerNotes: string | null;
  termsAndConditions: string | null;
  lineItems: CustomerQuoteLineItemDisplay[];
  subtotalFormatted: string;
  taxEstimateFormatted: string;
  totalFormatted: string;
  createdAt: string;
  sentAt: string | null;
};

export type CustomerQuoteLineItemDisplay = {
  description: string;
  quantity: number;
  unitPriceFormatted: string;
  lineTotalFormatted: string;
  lineNotes: string | null;
};

// ---------------------------------------------------------------------------
// Status labels and descriptions
// ---------------------------------------------------------------------------

const statusLabels: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Awaiting Response",
  viewed: "Awaiting Response",
  accepted: "Accepted",
  declined: "Declined",
  revision_requested: "Revision Requested",
  expired: "Expired",
};

const statusDescriptions: Record<QuoteStatus, string> = {
  sent: "This quote is awaiting your response.",
  viewed: "This quote is awaiting your response.",
  accepted: "You have accepted this quote.",
  declined: "You have declined this quote.",
  revision_requested: "You have requested a revision to this quote.",
  expired: "This quote has expired and is no longer valid.",
  draft: "This quote is being prepared.",
};

// ---------------------------------------------------------------------------
// Transformation functions
// ---------------------------------------------------------------------------

/**
 * Returns a user-friendly description for a given quote status.
 */
export function getQuoteStatusDescription(status: QuoteStatus): string {
  return statusDescriptions[status] ?? "Quote status unknown.";
}

/**
 * Determines the overall view state from a customer quote view (or lack thereof).
 */
export function getQuoteViewState(
  view: CustomerQuoteView | null,
  error?: string,
): QuoteViewState {
  if (view === null) return "not_found";
  if (error) return "error";

  const stateMap: Partial<Record<QuoteStatus, QuoteViewState>> = {
    accepted: "accepted",
    declined: "declined",
    revision_requested: "revision_requested",
    expired: "expired",
  };

  return stateMap[view.status] ?? "ready";
}

/**
 * Builds a complete display model for the customer-facing quote page.
 */
export function buildCustomerQuoteDisplay(
  view: CustomerQuoteView,
  now?: string,
): CustomerQuoteDisplayData {
  const expiresInDays = computeDaysUntil(view.expiresAt, now);

  return {
    quoteNumber: view.quoteNumber,
    businessName: view.businessName,
    customerName: view.customerName,
    status: view.status,
    statusLabel: statusLabels[view.status] ?? "Unknown",
    statusDescription: getQuoteStatusDescription(view.status),
    isActionable: view.status === "sent" || view.status === "viewed",
    expiresAt: view.expiresAt,
    expiresInDays,
    isExpiringSoon: expiresInDays <= 3,
    customerNotes: view.customerNotes,
    termsAndConditions: view.termsAndConditions,
    lineItems: view.lineItems.map((item) => buildLineItemDisplay(item)),
    subtotalFormatted: formatCentsToDollars(view.subtotalCents),
    taxEstimateFormatted: formatCentsToDollars(view.taxEstimateCents),
    totalFormatted: formatCentsToDollars(view.totalCents),
    createdAt: view.createdAt,
    sentAt: view.sentAt,
  };
}

function buildLineItemDisplay(
  item: CustomerQuoteLineItemView,
): CustomerQuoteLineItemDisplay {
  return {
    description: item.description,
    quantity: item.quantity,
    unitPriceFormatted: formatCentsToDollars(item.unitPriceCents),
    lineTotalFormatted: formatCentsToDollars(item.lineTotalCents),
    lineNotes: item.lineNotes,
  };
}

// ---------------------------------------------------------------------------
// Quote response form
// ---------------------------------------------------------------------------

export type QuoteResponseFormState = {
  respondentEmail: string;
  respondentName: string;
  action: "accept" | "decline" | "revision" | null;
  declineReason: string;
  revisionNotes: string;
  isSubmitting: boolean;
  error: string | null;
  isComplete: boolean;
};

/**
 * Creates the initial (empty) state for the quote response form.
 */
export function createInitialResponseFormState(): QuoteResponseFormState {
  return {
    respondentEmail: "",
    respondentName: "",
    action: null,
    declineReason: "",
    revisionNotes: "",
    isSubmitting: false,
    error: null,
    isComplete: false,
  };
}

/**
 * Validates the response form and returns an array of error messages.
 * An empty array indicates a valid form.
 */
export function validateResponseForm(state: QuoteResponseFormState): string[] {
  const errors: string[] = [];

  if (!state.respondentEmail.trim()) {
    errors.push("Email address is required.");
  } else if (!state.respondentEmail.includes("@")) {
    errors.push("Please enter a valid email address.");
  }

  if (state.action === null) {
    errors.push("Please select a response action.");
  }

  if (state.action === "revision" && !state.revisionNotes.trim()) {
    errors.push("Please describe the changes you would like.");
  }

  return errors;
}

/**
 * Returns true when the response form has no validation errors.
 */
export function isResponseFormValid(state: QuoteResponseFormState): boolean {
  return validateResponseForm(state).length === 0;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Formats cents as a dollar amount (e.g. 2500 → "$25.00").
 */
function formatCentsToDollars(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = `$${dollars.toFixed(2)}`;
  return cents < 0 ? `-${formatted}` : formatted;
}

/**
 * Computes the number of whole days between now and a target date.
 * Returns 0 when the target is in the past.
 */
function computeDaysUntil(targetDate: string, now?: string): number {
  const targetMs = new Date(targetDate).getTime();
  const nowMs = now ? new Date(now).getTime() : Date.now();
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
