import { describe, it, expect } from "vitest";
import type {
  AdminQuoteSummary,
  AdminQuoteDetail,
  QuotePipelineCounts,
} from "@platform/types";
import {
  getQuoteStatusDisplay,
  buildQuotePipelineView,
  buildQuoteListRow,
  buildQuoteDetailView,
  createEmptyLineItem,
  calculateLineItemTotal,
  calculateQuoteTotals,
  toCreateQuoteLineItemInputs,
  buildSendConfirmation,
} from "./quote-management";
import type { LineItemBuilderEntry } from "./quote-management";

// ── Factory Helpers ────────────────────────────────────────────────────────

function sampleQuoteSummary(
  overrides?: Partial<AdminQuoteSummary>
): AdminQuoteSummary {
  return {
    id: "quote-1",
    quoteNumber: "Q-1001",
    createdAt: "2026-04-10T10:00:00.000Z",
    status: "draft",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    totalCents: 15000,
    lineItemCount: 3,
    expiresAt: "2026-05-10T10:00:00.000Z",
    sentAt: null,
    viewedAt: null,
    respondedAt: null,
    ...overrides,
  };
}

function sampleQuoteDetail(
  overrides?: Partial<AdminQuoteDetail>
): AdminQuoteDetail {
  return {
    id: "quote-1",
    tenantId: "tenant-1",
    quoteNumber: "Q-1001",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    customerPhone: "555-9876",
    status: "draft",
    validityDays: 30,
    expiresAt: "2099-05-10T10:00:00.000Z",
    notes: "Internal note",
    customerNotes: null,
    termsAndConditions: "Net 30",
    subtotalCents: 15000,
    taxEstimateCents: 1200,
    totalCents: 16200,
    shareToken: "tok-abc123",
    shareTokenExpiresAt: "2099-06-10T10:00:00.000Z",
    createdAt: "2026-04-10T10:00:00.000Z",
    updatedAt: "2026-04-10T10:05:00.000Z",
    sentAt: null,
    viewedAt: null,
    respondedAt: null,
    acceptedAt: null,
    declinedAt: null,
    revisionRequestedAt: null,
    expiredAt: null,
    convertedOrderId: null,
    respondentEmail: null,
    respondentName: null,
    revisionNotes: null,
    lineItems: [
      {
        id: "li-1",
        quoteId: "quote-1",
        sortOrder: 1,
        catalogItemId: "cat-1",
        serviceId: null,
        description: "Lawn mowing",
        quantity: 2,
        unitPriceCents: 5000,
        lineTotalCents: 10000,
        lineNotes: "Front yard only",
      },
      {
        id: "li-2",
        quoteId: "quote-1",
        sortOrder: 2,
        catalogItemId: null,
        serviceId: "svc-1",
        description: "Hedge trimming",
        quantity: 1,
        unitPriceCents: 5000,
        lineTotalCents: 5000,
        lineNotes: null,
      },
    ],
    allowedTransitions: ["sent"],
    ...overrides,
  };
}

function sampleLineItem(
  overrides?: Partial<LineItemBuilderEntry>
): LineItemBuilderEntry {
  return {
    tempId: "temp-test-1",
    description: "Test item",
    quantity: 2,
    unitPriceCents: 3000,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Quote Management Views", () => {
  // -----------------------------------------------------------------------
  // Status display
  // -----------------------------------------------------------------------

  describe("getQuoteStatusDisplay", () => {
    it("returns display for draft status", () => {
      const display = getQuoteStatusDisplay("draft");
      expect(display.label).toBe("Draft");
      expect(display.color).toBe("gray");
      expect(display.icon).toBe("pencil");
    });

    it("returns display for sent status", () => {
      const display = getQuoteStatusDisplay("sent");
      expect(display.label).toBe("Sent");
      expect(display.color).toBe("blue");
      expect(display.icon).toBe("send");
    });

    it("returns display for accepted status", () => {
      const display = getQuoteStatusDisplay("accepted");
      expect(display.label).toBe("Accepted");
      expect(display.color).toBe("green");
      expect(display.icon).toBe("check-circle");
    });

    it("returns display for expired status", () => {
      const display = getQuoteStatusDisplay("expired");
      expect(display.label).toBe("Expired");
      expect(display.color).toBe("slate");
      expect(display.icon).toBe("clock");
    });
  });

  // -----------------------------------------------------------------------
  // Pipeline view
  // -----------------------------------------------------------------------

  describe("buildQuotePipelineView", () => {
    it("maps counts to view data with correct labels and colors", () => {
      const pipeline: QuotePipelineCounts = {
        counts: [
          { status: "draft", count: 4 },
          { status: "sent", count: 10 },
          { status: "viewed", count: 6 },
          { status: "accepted", count: 3 },
          { status: "declined", count: 1 },
          { status: "revision_requested", count: 2 },
          { status: "expired", count: 0 },
        ],
        total: 26,
      };

      const view = buildQuotePipelineView(pipeline);
      expect(view.counts).toHaveLength(7);
      expect(view.total).toBe(26);

      expect(view.counts[0]).toEqual({
        status: "draft",
        label: "Draft",
        count: 4,
        color: "gray",
      });
      expect(view.counts[1]).toEqual({
        status: "sent",
        label: "Sent",
        count: 10,
        color: "blue",
      });
      expect(view.counts[3]).toEqual({
        status: "accepted",
        label: "Accepted",
        count: 3,
        color: "green",
      });
    });

    it("calculates total from pipeline data", () => {
      const pipeline: QuotePipelineCounts = {
        counts: [{ status: "draft", count: 1 }],
        total: 1,
      };

      const view = buildQuotePipelineView(pipeline);
      expect(view.total).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // Quote list row
  // -----------------------------------------------------------------------

  describe("buildQuoteListRow", () => {
    it("converts AdminQuoteSummary to row data", () => {
      const row = buildQuoteListRow(sampleQuoteSummary());
      expect(row.id).toBe("quote-1");
      expect(row.quoteNumber).toBe("Q-1001");
      expect(row.customerName).toBe("Alice Smith");
      expect(row.customerEmail).toBe("alice@example.com");
      expect(row.status).toBe("draft");
      expect(row.statusLabel).toBe("Draft");
      expect(row.statusColor).toBe("gray");
      expect(row.lineItemCount).toBe(3);
      expect(row.canClone).toBe(true);
    });

    it("formats total as dollar string", () => {
      const row = buildQuoteListRow(sampleQuoteSummary({ totalCents: 15000 }));
      expect(row.totalFormatted).toBe("$150.00");
    });

    it("sets canSend and canEdit true for draft status", () => {
      const row = buildQuoteListRow(sampleQuoteSummary({ status: "draft" }));
      expect(row.canSend).toBe(true);
      expect(row.canEdit).toBe(true);
      expect(row.canConvert).toBe(false);
    });

    it("sets canConvert true for accepted status", () => {
      const row = buildQuoteListRow(sampleQuoteSummary({ status: "accepted" }));
      expect(row.canConvert).toBe(true);
      expect(row.canSend).toBe(false);
      expect(row.canEdit).toBe(false);
    });

    it("sets canEdit true for revision_requested status", () => {
      const row = buildQuoteListRow(
        sampleQuoteSummary({ status: "revision_requested" })
      );
      expect(row.canEdit).toBe(true);
      expect(row.canSend).toBe(false);
      expect(row.canConvert).toBe(false);
    });

    it("sets canSend, canEdit, canConvert false for expired status", () => {
      const row = buildQuoteListRow(sampleQuoteSummary({ status: "expired" }));
      expect(row.canSend).toBe(false);
      expect(row.canEdit).toBe(false);
      expect(row.canConvert).toBe(false);
    });

    it("uses most relevant display timestamp", () => {
      const row = buildQuoteListRow(
        sampleQuoteSummary({
          sentAt: "2026-04-11T10:00:00.000Z",
          viewedAt: "2026-04-12T10:00:00.000Z",
          respondedAt: null,
        })
      );
      expect(row.displayTimestamp).toBe("2026-04-12T10:00:00.000Z");
    });
  });

  // -----------------------------------------------------------------------
  // Quote detail view
  // -----------------------------------------------------------------------

  describe("buildQuoteDetailView", () => {
    it("maps AdminQuoteDetail to view data", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.id).toBe("quote-1");
      expect(view.quoteNumber).toBe("Q-1001");
      expect(view.status).toBe("draft");
      expect(view.statusDisplay.label).toBe("Draft");
      expect(view.customerName).toBe("Alice Smith");
      expect(view.customerEmail).toBe("alice@example.com");
      expect(view.customerPhone).toBe("555-9876");
      expect(view.validityDays).toBe(30);
      expect(view.notes).toBe("Internal note");
      expect(view.termsAndConditions).toBe("Net 30");
    });

    it("includes line items with formatted prices", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.lineItems).toHaveLength(2);
      expect(view.lineItems[0].description).toBe("Lawn mowing");
      expect(view.lineItems[0].quantity).toBe(2);
      expect(view.lineItems[0].unitPriceFormatted).toBe("$50.00");
      expect(view.lineItems[0].lineTotalFormatted).toBe("$100.00");
      expect(view.lineItems[0].lineNotes).toBe("Front yard only");
      expect(view.lineItems[0].catalogItemId).toBe("cat-1");
      expect(view.lineItems[1].description).toBe("Hedge trimming");
      expect(view.lineItems[1].unitPriceFormatted).toBe("$50.00");
      expect(view.lineItems[1].lineTotalFormatted).toBe("$50.00");
      expect(view.lineItems[1].serviceId).toBe("svc-1");
    });

    it("formats subtotal, tax, and total", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.subtotalFormatted).toBe("$150.00");
      expect(view.taxEstimateFormatted).toBe("$12.00");
      expect(view.totalFormatted).toBe("$162.00");
    });

    it("sets share link with base URL", () => {
      const view = buildQuoteDetailView(
        sampleQuoteDetail(),
        "https://quotes.example.com"
      );
      expect(view.shareLink).toBe("https://quotes.example.com/tok-abc123");
      expect(view.shareToken).toBe("tok-abc123");
    });

    it("uses share token as link when no base URL provided", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.shareLink).toBe("tok-abc123");
    });

    it("generates timestamps list", () => {
      const view = buildQuoteDetailView(
        sampleQuoteDetail({
          sentAt: "2026-04-11T10:00:00.000Z",
          viewedAt: "2026-04-12T10:00:00.000Z",
        })
      );
      const labels = view.timestamps.map((t) => t.label);
      expect(labels).toContain("Created");
      expect(labels).toContain("Sent");
      expect(labels).toContain("Viewed");
      expect(labels).toContain("Last Updated");
      expect(labels).not.toContain("Accepted");
    });

    it("includes only Created and Last Updated when no events", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.timestamps).toHaveLength(2);
      expect(view.timestamps[0].label).toBe("Created");
      expect(view.timestamps[1].label).toBe("Last Updated");
    });

    it("sets canSend and canEdit for draft", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.canSend).toBe(true);
      expect(view.canEdit).toBe(true);
      expect(view.canConvert).toBe(false);
    });

    it("sets canConvert for accepted with no converted order", () => {
      const view = buildQuoteDetailView(
        sampleQuoteDetail({
          status: "accepted",
          allowedTransitions: [],
          convertedOrderId: null,
        })
      );
      expect(view.canConvert).toBe(true);
      expect(view.canSend).toBe(false);
      expect(view.canEdit).toBe(false);
    });

    it("sets canConvert false when already converted", () => {
      const view = buildQuoteDetailView(
        sampleQuoteDetail({
          status: "accepted",
          allowedTransitions: [],
          convertedOrderId: "order-99",
        })
      );
      expect(view.canConvert).toBe(false);
    });

    it("sets isExpired based on expiresAt", () => {
      const view = buildQuoteDetailView(
        sampleQuoteDetail({ expiresAt: "2020-01-01T00:00:00.000Z" })
      );
      expect(view.isExpired).toBe(true);
    });

    it("sets isExpired false for future date", () => {
      const view = buildQuoteDetailView(sampleQuoteDetail());
      expect(view.isExpired).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Line Item Builder
  // -----------------------------------------------------------------------

  describe("Line Item Builder", () => {
    describe("createEmptyLineItem", () => {
      it("returns entry with empty description, quantity 1, 0 price", () => {
        const item = createEmptyLineItem();
        expect(item.description).toBe("");
        expect(item.quantity).toBe(1);
        expect(item.unitPriceCents).toBe(0);
      });

      it("generates unique temp IDs", () => {
        const a = createEmptyLineItem();
        const b = createEmptyLineItem();
        expect(a.tempId).not.toBe(b.tempId);
        expect(a.tempId).toMatch(/^temp-/);
      });
    });

    describe("calculateLineItemTotal", () => {
      it("returns quantity * unitPriceCents", () => {
        const total = calculateLineItemTotal(
          sampleLineItem({ quantity: 3, unitPriceCents: 2500 })
        );
        expect(total).toBe(7500);
      });

      it("returns 0 for zero quantity", () => {
        const total = calculateLineItemTotal(
          sampleLineItem({ quantity: 0, unitPriceCents: 5000 })
        );
        expect(total).toBe(0);
      });

      it("returns 0 for zero price", () => {
        const total = calculateLineItemTotal(
          sampleLineItem({ quantity: 5, unitPriceCents: 0 })
        );
        expect(total).toBe(0);
      });
    });

    describe("calculateQuoteTotals", () => {
      it("sums all line totals", () => {
        const items: LineItemBuilderEntry[] = [
          sampleLineItem({ quantity: 2, unitPriceCents: 5000 }),
          sampleLineItem({ tempId: "temp-2", quantity: 1, unitPriceCents: 3000 }),
        ];

        const totals = calculateQuoteTotals(items);
        expect(totals.subtotalCents).toBe(13000);
        expect(totals.totalCents).toBe(13000);
      });

      it("returns 0 for empty items", () => {
        const totals = calculateQuoteTotals([]);
        expect(totals.subtotalCents).toBe(0);
        expect(totals.totalCents).toBe(0);
      });
    });

    describe("toCreateQuoteLineItemInputs", () => {
      it("maps builder entries to create inputs", () => {
        const items: LineItemBuilderEntry[] = [
          {
            tempId: "temp-1",
            description: "Service A",
            quantity: 2,
            unitPriceCents: 5000,
            catalogItemId: "cat-1",
            serviceId: "svc-1",
            lineNotes: "Note A",
          },
        ];

        const inputs = toCreateQuoteLineItemInputs(items);
        expect(inputs).toHaveLength(1);
        expect(inputs[0]).toEqual({
          description: "Service A",
          quantity: 2,
          unitPriceCents: 5000,
          catalogItemId: "cat-1",
          serviceId: "svc-1",
          lineNotes: "Note A",
        });
      });

      it("omits optional fields when not set", () => {
        const items: LineItemBuilderEntry[] = [
          sampleLineItem({ catalogItemId: undefined, serviceId: undefined, lineNotes: undefined }),
        ];

        const inputs = toCreateQuoteLineItemInputs(items);
        expect(inputs[0]).toEqual({
          description: "Test item",
          quantity: 2,
          unitPriceCents: 3000,
        });
        expect(inputs[0]).not.toHaveProperty("catalogItemId");
        expect(inputs[0]).not.toHaveProperty("serviceId");
        expect(inputs[0]).not.toHaveProperty("lineNotes");
      });
    });
  });

  // -----------------------------------------------------------------------
  // Send confirmation
  // -----------------------------------------------------------------------

  describe("buildSendConfirmation", () => {
    it("returns confirmation with formatted data", () => {
      const confirmation = buildSendConfirmation(sampleQuoteDetail());
      expect(confirmation.quoteNumber).toBe("Q-1001");
      expect(confirmation.customerName).toBe("Alice Smith");
      expect(confirmation.customerEmail).toBe("alice@example.com");
      expect(confirmation.totalFormatted).toBe("$162.00");
      expect(confirmation.expiresAt).toBe("2099-05-10T10:00:00.000Z");
    });

    it("includes correct message", () => {
      const confirmation = buildSendConfirmation(sampleQuoteDetail());
      expect(confirmation.message).toBe(
        "Quote Q-1001 for $162.00 will be sent to alice@example.com."
      );
    });
  });
});
