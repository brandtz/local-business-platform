// ---------------------------------------------------------------------------
// Quote status and state machine
// ---------------------------------------------------------------------------

export const quoteStatuses = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "revision_requested",
  "expired",
] as const;
export type QuoteStatus = (typeof quoteStatuses)[number];

/**
 * Valid transitions from each quote status.
 * Accepted, declined, and expired are terminal — no further transitions.
 */
export const quoteStatusTransitions: Record<QuoteStatus, readonly QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["viewed", "expired"],
  viewed: ["accepted", "declined", "revision_requested", "expired"],
  accepted: [],
  declined: [],
  revision_requested: ["draft"],
  expired: [],
};

/**
 * Checks whether a transition from one quote status to another is valid.
 */
export function isValidQuoteTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return (quoteStatusTransitions[from] as readonly string[]).includes(to);
}

/**
 * Returns all valid next statuses from a given quote status.
 */
export function getNextQuoteStatuses(status: QuoteStatus): readonly QuoteStatus[] {
  return quoteStatusTransitions[status];
}

/**
 * Terminal statuses where no further transitions are possible.
 */
export const terminalQuoteStatuses: readonly QuoteStatus[] = ["accepted", "declined", "expired"];

/**
 * Checks whether a quote status is terminal (no further transitions allowed).
 */
export function isTerminalQuoteStatus(status: QuoteStatus): boolean {
  return (terminalQuoteStatuses as readonly string[]).includes(status);
}

/**
 * Checks whether a string is a valid quote status.
 */
export function isValidQuoteStatus(status: string): status is QuoteStatus {
  return (quoteStatuses as readonly string[]).includes(status);
}

// ---------------------------------------------------------------------------
// Quote domain records
// ---------------------------------------------------------------------------

export type QuoteRecord = {
  id: string;
  tenantId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: QuoteStatus;
  validityDays: number;
  expiresAt: string;
  notes: string | null;
  customerNotes: string | null;
  termsAndConditions: string | null;
  subtotalCents: number;
  taxEstimateCents: number;
  totalCents: number;
  shareToken: string;
  shareTokenExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revisionRequestedAt: string | null;
  expiredAt: string | null;
  convertedOrderId: string | null;
  respondentEmail: string | null;
  respondentName: string | null;
  revisionNotes: string | null;
};

export type QuoteLineItemRecord = {
  id: string;
  quoteId: string;
  sortOrder: number;
  catalogItemId: string | null;
  serviceId: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  lineNotes: string | null;
};

// ---------------------------------------------------------------------------
// Quote share token
// ---------------------------------------------------------------------------

export type QuoteShareTokenData = {
  quoteId: string;
  tenantId: string;
  shareToken: string;
  expiresAt: string;
};

/**
 * Generates a cryptographically random, URL-safe share token.
 * Requires `crypto.getRandomValues` — throws if unavailable.
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const tokenLength = 48;
  const array = new Uint8Array(tokenLength);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    throw new Error(
      'generateShareToken requires crypto.getRandomValues — ' +
      'no cryptographically secure RNG is available in this environment'
    );
  }
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

// ---------------------------------------------------------------------------
// Admin quote API request types
// ---------------------------------------------------------------------------

export type CreateQuoteLineItemInput = {
  catalogItemId?: string;
  serviceId?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineNotes?: string;
};

export type CreateQuoteRequest = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  validityDays?: number;
  notes?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  lineItems: CreateQuoteLineItemInput[];
};

export type UpdateQuoteRequest = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  validityDays?: number;
  notes?: string;
  customerNotes?: string;
  termsAndConditions?: string;
  lineItems?: CreateQuoteLineItemInput[];
};

// ---------------------------------------------------------------------------
// Admin quote list / detail response types
// ---------------------------------------------------------------------------

export type AdminQuoteListQuery = {
  tenantId: string;
  status?: QuoteStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export type AdminQuoteSummary = {
  id: string;
  quoteNumber: string;
  createdAt: string;
  status: QuoteStatus;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  lineItemCount: number;
  expiresAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
};

export type AdminQuoteListResponse = {
  quotes: AdminQuoteSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminQuoteDetail = {
  id: string;
  tenantId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: QuoteStatus;
  validityDays: number;
  expiresAt: string;
  notes: string | null;
  customerNotes: string | null;
  termsAndConditions: string | null;
  subtotalCents: number;
  taxEstimateCents: number;
  totalCents: number;
  shareToken: string;
  shareTokenExpiresAt: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  revisionRequestedAt: string | null;
  expiredAt: string | null;
  convertedOrderId: string | null;
  respondentEmail: string | null;
  respondentName: string | null;
  revisionNotes: string | null;
  lineItems: QuoteLineItemRecord[];
  allowedTransitions: readonly QuoteStatus[];
};

// ---------------------------------------------------------------------------
// Pipeline / status count aggregation
// ---------------------------------------------------------------------------

export type QuoteStatusCount = {
  status: QuoteStatus;
  count: number;
};

export type QuotePipelineCounts = {
  counts: QuoteStatusCount[];
  total: number;
};

// ---------------------------------------------------------------------------
// Customer-facing quote types
// ---------------------------------------------------------------------------

export type CustomerQuoteLineItemView = {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  lineNotes: string | null;
};

export type CustomerQuoteView = {
  quoteNumber: string;
  businessName: string;
  customerName: string;
  customerEmail: string;
  status: QuoteStatus;
  validityDays: number;
  expiresAt: string;
  customerNotes: string | null;
  termsAndConditions: string | null;
  lineItems: CustomerQuoteLineItemView[];
  subtotalCents: number;
  taxEstimateCents: number;
  totalCents: number;
  createdAt: string;
  sentAt: string | null;
};

export type CustomerQuoteAcceptRequest = {
  respondentEmail: string;
  respondentName?: string;
};

export type CustomerQuoteDeclineRequest = {
  respondentEmail: string;
  respondentName?: string;
  reason?: string;
};

export type CustomerQuoteRevisionRequest = {
  respondentEmail: string;
  respondentName?: string;
  revisionNotes: string;
};

// ---------------------------------------------------------------------------
// Quote-to-order conversion types
// ---------------------------------------------------------------------------

export type QuoteToOrderConversionInput = {
  quoteId: string;
  tenantId: string;
  preserveQuotedPrices: boolean;
};

export type QuoteToOrderConversionResult = {
  success: boolean;
  orderId: string | null;
  error: string | null;
};

// ---------------------------------------------------------------------------
// Quote notification types
// ---------------------------------------------------------------------------

export const quoteNotificationEventTypes = [
  "quote.sent",
  "quote.viewed",
  "quote.accepted",
  "quote.declined",
  "quote.revision_requested",
  "quote.expiring_soon",
  "quote.expired",
] as const;
export type QuoteNotificationEventType = (typeof quoteNotificationEventTypes)[number];

export type QuoteNotificationPayload = {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  tenantId: string;
  shareLink: string | null;
  expiresAt: string | null;
};

// ---------------------------------------------------------------------------
// Quote tracking pipeline
// ---------------------------------------------------------------------------

export const quoteTrackingSteps = [
  "created",
  "sent",
  "viewed",
  "responded",
] as const;
export type QuoteTrackingStep = (typeof quoteTrackingSteps)[number];

export type QuoteTrackingStepState = "completed" | "current" | "upcoming" | "skipped";

export type QuoteTrackingStepInfo = {
  step: QuoteTrackingStep;
  label: string;
  state: QuoteTrackingStepState;
  timestamp: string | null;
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

/**
 * Formats a quote ID into a human-readable quote number.
 *
 * @param id - The quote UUID or identifier (must be at least 8 characters)
 * @returns Display-friendly quote number (e.g. "Q-1A2B3C4D")
 */
export function formatQuoteNumber(id: string): string {
  if (id.length < 8) {
    return "Q-" + id.toUpperCase();
  }
  return "Q-" + id.substring(0, 8).toUpperCase();
}

/**
 * Computes the expiration date for a quote based on creation date and validity period.
 *
 * @param createdAt - ISO 8601 creation timestamp
 * @param validityDays - Number of days the quote remains valid
 * @returns ISO 8601 expiration timestamp
 */
export function computeQuoteExpiresAt(createdAt: string, validityDays: number): string {
  const date = new Date(createdAt);
  date.setDate(date.getDate() + validityDays);
  return date.toISOString();
}

/**
 * Checks whether a quote has expired based on its expiration date.
 *
 * @param expiresAt - ISO 8601 expiration timestamp
 * @param now - Current time as ISO 8601 string (defaults to current time)
 * @returns Whether the quote is expired
 */
export function isQuoteExpired(expiresAt: string, now?: string): boolean {
  const expiresMs = new Date(expiresAt).getTime();
  const nowMs = now ? new Date(now).getTime() : Date.now();
  return nowMs >= expiresMs;
}

/**
 * Returns the most relevant timestamp for display in admin pipeline views.
 * Prioritizes the most recent state-change timestamp.
 */
export function getQuoteDisplayTimestamp(
  quote: Pick<QuoteRecord, "sentAt" | "viewedAt" | "respondedAt" | "createdAt">
): string {
  return (
    quote.respondedAt ??
    quote.viewedAt ??
    quote.sentAt ??
    quote.createdAt
  );
}
