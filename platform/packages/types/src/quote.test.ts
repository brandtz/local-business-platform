import { describe, it, expect } from "vitest";
import {
  quoteStatuses,
  quoteStatusTransitions,
  isValidQuoteTransition,
  getNextQuoteStatuses,
  terminalQuoteStatuses,
  isTerminalQuoteStatus,
  isValidQuoteStatus,
  generateShareToken,
  formatQuoteNumber,
  computeQuoteExpiresAt,
  isQuoteExpired,
  getQuoteDisplayTimestamp,
  quoteNotificationEventTypes,
  quoteTrackingSteps,
} from "./quote";
import type {
  QuoteRecord,
  QuoteLineItemRecord,
  AdminQuoteSummary,
  CustomerQuoteView,
  CreateQuoteRequest,
  UpdateQuoteRequest,
  CustomerQuoteAcceptRequest,
  CustomerQuoteDeclineRequest,
  CustomerQuoteRevisionRequest,
  QuoteToOrderConversionInput,
  QuoteToOrderConversionResult,
} from "./quote";

describe("Quote types", () => {
  // -----------------------------------------------------------------------
  // State machine tests
  // -----------------------------------------------------------------------

  describe("quoteStatuses", () => {
    it("defines all 7 expected statuses", () => {
      expect(quoteStatuses).toEqual([
        "draft",
        "sent",
        "viewed",
        "accepted",
        "declined",
        "revision_requested",
        "expired",
      ]);
      expect(quoteStatuses).toHaveLength(7);
    });

    it("isValidQuoteStatus accepts valid statuses", () => {
      for (const status of quoteStatuses) {
        expect(isValidQuoteStatus(status)).toBe(true);
      }
    });

    it("isValidQuoteStatus rejects invalid statuses", () => {
      expect(isValidQuoteStatus("unknown")).toBe(false);
      expect(isValidQuoteStatus("")).toBe(false);
      expect(isValidQuoteStatus("DRAFT")).toBe(false);
      expect(isValidQuoteStatus("pending")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // State machine transitions
  // -----------------------------------------------------------------------

  describe("quoteStatusTransitions", () => {
    it("draft can only transition to sent", () => {
      expect(quoteStatusTransitions.draft).toEqual(["sent"]);
    });

    it("sent can transition to viewed or expired", () => {
      expect(quoteStatusTransitions.sent).toEqual(["viewed", "expired"]);
    });

    it("viewed can transition to accepted, declined, revision_requested, or expired", () => {
      expect(quoteStatusTransitions.viewed).toEqual([
        "accepted",
        "declined",
        "revision_requested",
        "expired",
      ]);
    });

    it("accepted has no transitions", () => {
      expect(quoteStatusTransitions.accepted).toEqual([]);
    });

    it("declined has no transitions", () => {
      expect(quoteStatusTransitions.declined).toEqual([]);
    });

    it("revision_requested can only transition to draft", () => {
      expect(quoteStatusTransitions.revision_requested).toEqual(["draft"]);
    });

    it("expired has no transitions", () => {
      expect(quoteStatusTransitions.expired).toEqual([]);
    });
  });

  describe("isValidQuoteTransition", () => {
    it("accepts valid forward transitions", () => {
      expect(isValidQuoteTransition("draft", "sent")).toBe(true);
      expect(isValidQuoteTransition("sent", "viewed")).toBe(true);
      expect(isValidQuoteTransition("sent", "expired")).toBe(true);
      expect(isValidQuoteTransition("viewed", "accepted")).toBe(true);
      expect(isValidQuoteTransition("viewed", "declined")).toBe(true);
      expect(isValidQuoteTransition("viewed", "revision_requested")).toBe(true);
      expect(isValidQuoteTransition("viewed", "expired")).toBe(true);
      expect(isValidQuoteTransition("revision_requested", "draft")).toBe(true);
    });

    it("rejects invalid transitions", () => {
      expect(isValidQuoteTransition("draft", "accepted")).toBe(false);
      expect(isValidQuoteTransition("draft", "viewed")).toBe(false);
      expect(isValidQuoteTransition("sent", "accepted")).toBe(false);
      expect(isValidQuoteTransition("accepted", "draft")).toBe(false);
      expect(isValidQuoteTransition("declined", "draft")).toBe(false);
      expect(isValidQuoteTransition("expired", "draft")).toBe(false);
    });

    it("rejects self-transitions", () => {
      for (const status of quoteStatuses) {
        expect(isValidQuoteTransition(status, status)).toBe(false);
      }
    });
  });

  describe("getNextQuoteStatuses", () => {
    it("returns correct next statuses for each status", () => {
      expect(getNextQuoteStatuses("draft")).toEqual(["sent"]);
      expect(getNextQuoteStatuses("sent")).toEqual(["viewed", "expired"]);
      expect(getNextQuoteStatuses("viewed")).toEqual([
        "accepted",
        "declined",
        "revision_requested",
        "expired",
      ]);
      expect(getNextQuoteStatuses("accepted")).toEqual([]);
      expect(getNextQuoteStatuses("declined")).toEqual([]);
      expect(getNextQuoteStatuses("revision_requested")).toEqual(["draft"]);
      expect(getNextQuoteStatuses("expired")).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // Terminal statuses
  // -----------------------------------------------------------------------

  describe("terminalQuoteStatuses", () => {
    it("contains accepted, declined, and expired", () => {
      expect(terminalQuoteStatuses).toEqual(["accepted", "declined", "expired"]);
      expect(terminalQuoteStatuses).toHaveLength(3);
    });
  });

  describe("isTerminalQuoteStatus", () => {
    it("returns true for terminal statuses", () => {
      expect(isTerminalQuoteStatus("accepted")).toBe(true);
      expect(isTerminalQuoteStatus("declined")).toBe(true);
      expect(isTerminalQuoteStatus("expired")).toBe(true);
    });

    it("returns false for non-terminal statuses", () => {
      expect(isTerminalQuoteStatus("draft")).toBe(false);
      expect(isTerminalQuoteStatus("sent")).toBe(false);
      expect(isTerminalQuoteStatus("viewed")).toBe(false);
      expect(isTerminalQuoteStatus("revision_requested")).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Share token tests
  // -----------------------------------------------------------------------

  describe("generateShareToken", () => {
    it("returns a string of length 48", () => {
      const token = generateShareToken();
      expect(typeof token).toBe("string");
      expect(token).toHaveLength(48);
    });

    it("produces different tokens on successive calls", () => {
      const token1 = generateShareToken();
      const token2 = generateShareToken();
      expect(token1).not.toBe(token2);
    });

    it("only contains URL-safe characters", () => {
      const token = generateShareToken();
      expect(token).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });

  // -----------------------------------------------------------------------
  // Format helper tests
  // -----------------------------------------------------------------------

  describe("formatQuoteNumber", () => {
    it("produces Q- prefix with uppercase 8 chars from id", () => {
      const result = formatQuoteNumber("abcd1234efgh");
      expect(result).toBe("Q-ABCD1234");
    });

    it("handles short ids by using the full id", () => {
      const result = formatQuoteNumber("abc");
      expect(result).toBe("Q-ABC");
    });

    it("handles exactly 8-character ids", () => {
      const result = formatQuoteNumber("12345678");
      expect(result).toBe("Q-12345678");
    });
  });

  describe("computeQuoteExpiresAt", () => {
    it("adds correct number of days to date", () => {
      const created = "2026-01-01T00:00:00.000Z";
      const result = computeQuoteExpiresAt(created, 30);
      expect(result).toBe("2026-01-31T00:00:00.000Z");
    });

    it("handles single day validity", () => {
      const created = "2026-06-15T12:00:00.000Z";
      const result = computeQuoteExpiresAt(created, 1);
      expect(result).toBe("2026-06-16T12:00:00.000Z");
    });

    it("handles zero days validity", () => {
      const created = "2026-03-10T08:30:00.000Z";
      const result = computeQuoteExpiresAt(created, 0);
      expect(result).toBe("2026-03-10T08:30:00.000Z");
    });
  });

  describe("isQuoteExpired", () => {
    it("returns true when current time is past expiration", () => {
      expect(isQuoteExpired("2020-01-01T00:00:00.000Z")).toBe(true);
    });

    it("returns false when current time is before expiration", () => {
      expect(isQuoteExpired("2099-01-01T00:00:00.000Z")).toBe(false);
    });

    it("returns true when now equals expiresAt", () => {
      const ts = "2026-06-01T12:00:00.000Z";
      expect(isQuoteExpired(ts, ts)).toBe(true);
    });

    it("edge case: custom now before expiration", () => {
      expect(
        isQuoteExpired("2026-06-01T12:00:00.000Z", "2026-05-31T23:59:59.999Z")
      ).toBe(false);
    });

    it("edge case: custom now after expiration", () => {
      expect(
        isQuoteExpired("2026-06-01T12:00:00.000Z", "2026-06-01T12:00:00.001Z")
      ).toBe(true);
    });
  });

  describe("getQuoteDisplayTimestamp", () => {
    it("returns respondedAt when present", () => {
      const result = getQuoteDisplayTimestamp({
        respondedAt: "2026-03-22T03:00:00.000Z",
        viewedAt: "2026-03-22T02:00:00.000Z",
        sentAt: "2026-03-22T01:00:00.000Z",
        createdAt: "2026-03-22T00:00:00.000Z",
      });
      expect(result).toBe("2026-03-22T03:00:00.000Z");
    });

    it("returns viewedAt when respondedAt is null", () => {
      const result = getQuoteDisplayTimestamp({
        respondedAt: null,
        viewedAt: "2026-03-22T02:00:00.000Z",
        sentAt: "2026-03-22T01:00:00.000Z",
        createdAt: "2026-03-22T00:00:00.000Z",
      });
      expect(result).toBe("2026-03-22T02:00:00.000Z");
    });

    it("returns sentAt when respondedAt and viewedAt are null", () => {
      const result = getQuoteDisplayTimestamp({
        respondedAt: null,
        viewedAt: null,
        sentAt: "2026-03-22T01:00:00.000Z",
        createdAt: "2026-03-22T00:00:00.000Z",
      });
      expect(result).toBe("2026-03-22T01:00:00.000Z");
    });

    it("returns createdAt as fallback", () => {
      const result = getQuoteDisplayTimestamp({
        respondedAt: null,
        viewedAt: null,
        sentAt: null,
        createdAt: "2026-03-22T00:00:00.000Z",
      });
      expect(result).toBe("2026-03-22T00:00:00.000Z");
    });
  });

  // -----------------------------------------------------------------------
  // Notification event type tests
  // -----------------------------------------------------------------------

  describe("quoteNotificationEventTypes", () => {
    it("has 7 entries", () => {
      expect(quoteNotificationEventTypes).toHaveLength(7);
    });

    it("all start with 'quote.'", () => {
      for (const eventType of quoteNotificationEventTypes) {
        expect(eventType).toMatch(/^quote\./);
      }
    });

    it("contains expected event types", () => {
      expect(quoteNotificationEventTypes).toEqual([
        "quote.sent",
        "quote.viewed",
        "quote.accepted",
        "quote.declined",
        "quote.revision_requested",
        "quote.expiring_soon",
        "quote.expired",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // Tracking tests
  // -----------------------------------------------------------------------

  describe("quoteTrackingSteps", () => {
    it("has 4 entries", () => {
      expect(quoteTrackingSteps).toHaveLength(4);
    });

    it("contains expected steps in order", () => {
      expect(quoteTrackingSteps).toEqual([
        "created",
        "sent",
        "viewed",
        "responded",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // Type shape tests
  // -----------------------------------------------------------------------

  describe("domain records", () => {
    it("QuoteRecord has required fields", () => {
      const record: QuoteRecord = {
        id: "quote-1",
        tenantId: "tenant-1",
        quoteNumber: "Q-ABCD1234",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        customerPhone: "555-0100",
        status: "draft",
        validityDays: 30,
        expiresAt: "2026-04-22T00:00:00.000Z",
        notes: "Internal notes",
        customerNotes: "Customer-facing notes",
        termsAndConditions: "Standard terms",
        subtotalCents: 10000,
        taxEstimateCents: 800,
        totalCents: 10800,
        shareToken: "abc123",
        shareTokenExpiresAt: "2026-04-22T00:00:00.000Z",
        createdAt: "2026-03-22T00:00:00.000Z",
        updatedAt: "2026-03-22T00:00:00.000Z",
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
      };
      expect(record.status).toBe("draft");
      expect(record.totalCents).toBe(10800);
    });

    it("QuoteLineItemRecord has required fields", () => {
      const item: QuoteLineItemRecord = {
        id: "item-1",
        quoteId: "quote-1",
        sortOrder: 0,
        catalogItemId: "cat-1",
        serviceId: null,
        description: "Web design service",
        quantity: 1,
        unitPriceCents: 5000,
        lineTotalCents: 5000,
        lineNotes: null,
      };
      expect(item.lineTotalCents).toBe(item.unitPriceCents * item.quantity);
    });

    it("AdminQuoteSummary has required fields", () => {
      const summary: AdminQuoteSummary = {
        id: "quote-1",
        quoteNumber: "Q-ABCD1234",
        createdAt: "2026-03-22T00:00:00.000Z",
        status: "sent",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        totalCents: 10800,
        lineItemCount: 3,
        expiresAt: "2026-04-22T00:00:00.000Z",
        sentAt: "2026-03-22T01:00:00.000Z",
        viewedAt: null,
        respondedAt: null,
      };
      expect(summary.status).toBe("sent");
      expect(summary.lineItemCount).toBe(3);
    });

    it("CustomerQuoteView has required fields", () => {
      const view: CustomerQuoteView = {
        quoteNumber: "Q-ABCD1234",
        businessName: "Acme Corp",
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        status: "viewed",
        validityDays: 30,
        expiresAt: "2026-04-22T00:00:00.000Z",
        customerNotes: "Thank you for your interest",
        termsAndConditions: null,
        lineItems: [
          {
            description: "Web design service",
            quantity: 1,
            unitPriceCents: 5000,
            lineTotalCents: 5000,
            lineNotes: null,
          },
        ],
        subtotalCents: 5000,
        taxEstimateCents: 400,
        totalCents: 5400,
        createdAt: "2026-03-22T00:00:00.000Z",
        sentAt: "2026-03-22T01:00:00.000Z",
      };
      expect(view.businessName).toBe("Acme Corp");
      expect(view.lineItems).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Request type shape tests
  // -----------------------------------------------------------------------

  describe("request types", () => {
    it("CreateQuoteRequest has required fields", () => {
      const req: CreateQuoteRequest = {
        customerName: "Jane Doe",
        customerEmail: "jane@example.com",
        lineItems: [
          {
            description: "Consulting",
            quantity: 2,
            unitPriceCents: 15000,
          },
        ],
      };
      expect(req.lineItems).toHaveLength(1);
    });

    it("UpdateQuoteRequest allows partial updates", () => {
      const req: UpdateQuoteRequest = {
        customerName: "Updated Name",
      };
      expect(req.customerName).toBe("Updated Name");
      expect(req.lineItems).toBeUndefined();
    });

    it("CustomerQuoteAcceptRequest has required fields", () => {
      const req: CustomerQuoteAcceptRequest = {
        respondentEmail: "jane@example.com",
        respondentName: "Jane Doe",
      };
      expect(req.respondentEmail).toBe("jane@example.com");
    });

    it("CustomerQuoteDeclineRequest has required fields", () => {
      const req: CustomerQuoteDeclineRequest = {
        respondentEmail: "jane@example.com",
        reason: "Too expensive",
      };
      expect(req.respondentEmail).toBe("jane@example.com");
    });

    it("CustomerQuoteRevisionRequest has required fields", () => {
      const req: CustomerQuoteRevisionRequest = {
        respondentEmail: "jane@example.com",
        revisionNotes: "Can we adjust the price?",
      };
      expect(req.revisionNotes).toBe("Can we adjust the price?");
    });

    it("QuoteToOrderConversionInput has required fields", () => {
      const input: QuoteToOrderConversionInput = {
        quoteId: "quote-1",
        tenantId: "tenant-1",
        preserveQuotedPrices: true,
      };
      expect(input.preserveQuotedPrices).toBe(true);
    });

    it("QuoteToOrderConversionResult has required fields", () => {
      const result: QuoteToOrderConversionResult = {
        success: true,
        orderId: "order-1",
        error: null,
      };
      expect(result.success).toBe(true);
      expect(result.orderId).toBe("order-1");
    });
  });
});
