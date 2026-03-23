// E11-S4-T8: Admin quote management views — pipeline status display,
// quote list with pipeline counts, detail view, line item builder,
// and send confirmation.

import type {
  QuoteStatus,
  AdminQuoteSummary,
  AdminQuoteDetail,
  QuotePipelineCounts,
  CreateQuoteLineItemInput,
} from "@platform/types";
import {
  getNextQuoteStatuses,
  isQuoteExpired,
  getQuoteDisplayTimestamp,
} from "@platform/types";

// ── Quote Pipeline Status Display ──────────────────────────────────────────

export const quoteStatusDisplayMap: Record<
  QuoteStatus,
  { label: string; color: string; icon: string }
> = {
  draft: { label: "Draft", color: "gray", icon: "pencil" },
  sent: { label: "Sent", color: "blue", icon: "send" },
  viewed: { label: "Viewed", color: "indigo", icon: "eye" },
  accepted: { label: "Accepted", color: "green", icon: "check-circle" },
  declined: { label: "Declined", color: "red", icon: "x-circle" },
  revision_requested: { label: "Revision Requested", color: "amber", icon: "refresh" },
  expired: { label: "Expired", color: "slate", icon: "clock" },
};

/**
 * Returns the display configuration for a quote status badge.
 */
export function getQuoteStatusDisplay(
  status: QuoteStatus
): { label: string; color: string; icon: string } {
  return quoteStatusDisplayMap[status];
}

// ── Pipeline View Data ─────────────────────────────────────────────────────

export type QuotePipelineViewData = {
  counts: { status: QuoteStatus; label: string; count: number; color: string }[];
  total: number;
};

/**
 * Builds a pipeline view from raw pipeline counts for rendering
 * status badges with counts (e.g., "Sent 12", "Viewed 5").
 */
export function buildQuotePipelineView(
  pipeline: QuotePipelineCounts
): QuotePipelineViewData {
  return {
    counts: pipeline.counts.map((c) => {
      const display = getQuoteStatusDisplay(c.status);
      return {
        status: c.status,
        label: display.label,
        count: c.count,
        color: display.color,
      };
    }),
    total: pipeline.total,
  };
}

// ── Quote List View ────────────────────────────────────────────────────────

export type QuoteListRowData = {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  status: QuoteStatus;
  statusLabel: string;
  statusColor: string;
  totalFormatted: string;
  lineItemCount: number;
  createdAt: string;
  expiresAt: string;
  displayTimestamp: string;
  canSend: boolean;
  canEdit: boolean;
  canConvert: boolean;
  canClone: boolean;
};

/**
 * Maps an admin quote summary to a list row view model for rendering.
 */
export function buildQuoteListRow(summary: AdminQuoteSummary): QuoteListRowData {
  const display = getQuoteStatusDisplay(summary.status);
  const transitions = getNextQuoteStatuses(summary.status);

  return {
    id: summary.id,
    quoteNumber: summary.quoteNumber,
    customerName: summary.customerName,
    customerEmail: summary.customerEmail,
    status: summary.status,
    statusLabel: display.label,
    statusColor: display.color,
    totalFormatted: formatCentsToDollars(summary.totalCents),
    lineItemCount: summary.lineItemCount,
    createdAt: summary.createdAt,
    expiresAt: summary.expiresAt,
    displayTimestamp: getQuoteDisplayTimestamp({
      sentAt: summary.sentAt,
      viewedAt: summary.viewedAt,
      respondedAt: summary.respondedAt,
      createdAt: summary.createdAt,
    }),
    canSend: transitions.includes("sent"),
    canEdit: summary.status === "draft" || summary.status === "revision_requested",
    canConvert: summary.status === "accepted",
    canClone: true,
  };
}

// ── Quote Detail View ──────────────────────────────────────────────────────

export type QuoteLineItemViewData = {
  id: string;
  sortOrder: number;
  description: string;
  quantity: number;
  unitPriceFormatted: string;
  lineTotalFormatted: string;
  lineNotes: string | null;
  catalogItemId: string | null;
  serviceId: string | null;
};

export type QuoteDetailViewData = {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  statusDisplay: { label: string; color: string; icon: string };
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  validityDays: number;
  expiresAt: string;
  isExpired: boolean;
  notes: string | null;
  customerNotes: string | null;
  termsAndConditions: string | null;
  lineItems: QuoteLineItemViewData[];
  subtotalFormatted: string;
  taxEstimateFormatted: string;
  totalFormatted: string;
  shareToken: string;
  shareLink: string;
  timestamps: { label: string; value: string }[];
  allowedTransitions: readonly QuoteStatus[];
  respondentEmail: string | null;
  respondentName: string | null;
  revisionNotes: string | null;
  convertedOrderId: string | null;
  canSend: boolean;
  canEdit: boolean;
  canConvert: boolean;
};

/**
 * Builds display timestamps for the detail view timeline.
 */
function buildTimestamps(
  detail: AdminQuoteDetail
): { label: string; value: string }[] {
  const entries: { label: string; value: string }[] = [];

  entries.push({ label: "Created", value: detail.createdAt });

  if (detail.sentAt) entries.push({ label: "Sent", value: detail.sentAt });
  if (detail.viewedAt) entries.push({ label: "Viewed", value: detail.viewedAt });
  if (detail.respondedAt) entries.push({ label: "Responded", value: detail.respondedAt });
  if (detail.acceptedAt) entries.push({ label: "Accepted", value: detail.acceptedAt });
  if (detail.declinedAt) entries.push({ label: "Declined", value: detail.declinedAt });
  if (detail.revisionRequestedAt)
    entries.push({ label: "Revision Requested", value: detail.revisionRequestedAt });
  if (detail.expiredAt) entries.push({ label: "Expired", value: detail.expiredAt });

  entries.push({ label: "Last Updated", value: detail.updatedAt });

  return entries;
}

/**
 * Maps an admin quote detail to a view model for rendering.
 */
export function buildQuoteDetailView(
  detail: AdminQuoteDetail,
  baseShareUrl?: string
): QuoteDetailViewData {
  const transitions = detail.allowedTransitions;

  return {
    id: detail.id,
    quoteNumber: detail.quoteNumber,
    status: detail.status,
    statusDisplay: getQuoteStatusDisplay(detail.status),
    customerName: detail.customerName,
    customerEmail: detail.customerEmail,
    customerPhone: detail.customerPhone,
    validityDays: detail.validityDays,
    expiresAt: detail.expiresAt,
    isExpired: isQuoteExpired(detail.expiresAt),
    notes: detail.notes,
    customerNotes: detail.customerNotes,
    termsAndConditions: detail.termsAndConditions,
    lineItems: detail.lineItems.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      description: item.description,
      quantity: item.quantity,
      unitPriceFormatted: formatCentsToDollars(item.unitPriceCents),
      lineTotalFormatted: formatCentsToDollars(item.lineTotalCents),
      lineNotes: item.lineNotes,
      catalogItemId: item.catalogItemId,
      serviceId: item.serviceId,
    })),
    subtotalFormatted: formatCentsToDollars(detail.subtotalCents),
    taxEstimateFormatted: formatCentsToDollars(detail.taxEstimateCents),
    totalFormatted: formatCentsToDollars(detail.totalCents),
    shareToken: detail.shareToken,
    shareLink: baseShareUrl
      ? `${baseShareUrl}/${detail.shareToken}`
      : detail.shareToken,
    timestamps: buildTimestamps(detail),
    allowedTransitions: transitions,
    respondentEmail: detail.respondentEmail,
    respondentName: detail.respondentName,
    revisionNotes: detail.revisionNotes,
    convertedOrderId: detail.convertedOrderId,
    canSend: transitions.includes("sent"),
    canEdit: detail.status === "draft" || detail.status === "revision_requested",
    canConvert: detail.status === "accepted" && detail.convertedOrderId === null,
  };
}

// ── Line Item Builder ──────────────────────────────────────────────────────

export type LineItemBuilderEntry = {
  tempId: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  catalogItemId?: string;
  serviceId?: string;
  lineNotes?: string;
};

let lineItemIdCounter = 0;

/**
 * Creates an empty line item with a unique temp ID for the builder form.
 */
export function createEmptyLineItem(): LineItemBuilderEntry {
  lineItemIdCounter += 1;
  const rand = Math.random().toString(36).substring(2, 8);
  return {
    tempId: `temp-${Date.now()}-${lineItemIdCounter}-${rand}`,
    description: "",
    quantity: 1,
    unitPriceCents: 0,
  };
}

/**
 * Calculates the total for a single line item in cents.
 */
export function calculateLineItemTotal(item: LineItemBuilderEntry): number {
  return item.quantity * item.unitPriceCents;
}

/**
 * Calculates subtotal and total from a list of line items.
 */
export function calculateQuoteTotals(
  items: LineItemBuilderEntry[]
): { subtotalCents: number; totalCents: number } {
  const subtotalCents = items.reduce(
    (sum, item) => sum + calculateLineItemTotal(item),
    0
  );
  return { subtotalCents, totalCents: subtotalCents };
}

/**
 * Converts builder entries into the API input format for creating quotes.
 */
export function toCreateQuoteLineItemInputs(
  items: LineItemBuilderEntry[]
): CreateQuoteLineItemInput[] {
  return items.map((item) => {
    const input: CreateQuoteLineItemInput = {
      description: item.description,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    };
    if (item.catalogItemId) input.catalogItemId = item.catalogItemId;
    if (item.serviceId) input.serviceId = item.serviceId;
    if (item.lineNotes) input.lineNotes = item.lineNotes;
    return input;
  });
}

// ── Send Confirmation ──────────────────────────────────────────────────────

export type QuoteSendConfirmation = {
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  totalFormatted: string;
  expiresAt: string;
  message: string;
};

/**
 * Builds the confirmation data shown before sending a quote to a customer.
 */
export function buildSendConfirmation(
  detail: AdminQuoteDetail
): QuoteSendConfirmation {
  return {
    quoteNumber: detail.quoteNumber,
    customerName: detail.customerName,
    customerEmail: detail.customerEmail,
    totalFormatted: formatCentsToDollars(detail.totalCents),
    expiresAt: detail.expiresAt,
    message:
      `Quote ${detail.quoteNumber} for ${formatCentsToDollars(detail.totalCents)}` +
      ` will be sent to ${detail.customerEmail}.`,
  };
}

// ── Formatting Helpers ─────────────────────────────────────────────────────

/**
 * Formats cents as a dollar amount (e.g. 12345 → "$123.45").
 */
function formatCentsToDollars(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = `$${dollars.toFixed(2)}`;
  return cents < 0 ? `-${formatted}` : formatted;
}
