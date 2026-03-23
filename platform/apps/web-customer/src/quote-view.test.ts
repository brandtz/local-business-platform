import { describe, it, expect } from "vitest";
import type { CustomerQuoteView, CustomerQuoteLineItemView } from "@platform/types";
import {
  quoteViewStates,
  buildCustomerQuoteDisplay,
  getQuoteStatusDescription,
  getQuoteViewState,
  createInitialResponseFormState,
  validateResponseForm,
  isResponseFormValid,
  type QuoteResponseFormState,
} from "./quote-view";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function sampleLineItem(overrides?: Partial<CustomerQuoteLineItemView>): CustomerQuoteLineItemView {
  return {
    description: "Lawn Mowing",
    quantity: 1,
    unitPriceCents: 5000,
    lineTotalCents: 5000,
    lineNotes: null,
    ...overrides,
  };
}

function sampleQuoteView(overrides?: Partial<CustomerQuoteView>): CustomerQuoteView {
  return {
    quoteNumber: "Q-1001",
    businessName: "Green Thumb Landscaping",
    customerName: "Alice Smith",
    customerEmail: "alice@example.com",
    status: "sent",
    validityDays: 30,
    expiresAt: "2026-04-22T00:00:00.000Z",
    customerNotes: "Please start early morning.",
    termsAndConditions: "Net 30 payment terms.",
    lineItems: [sampleLineItem()],
    subtotalCents: 5000,
    taxEstimateCents: 400,
    totalCents: 5400,
    createdAt: "2026-03-22T10:00:00.000Z",
    sentAt: "2026-03-22T10:05:00.000Z",
    ...overrides,
  };
}

function sampleFormState(overrides?: Partial<QuoteResponseFormState>): QuoteResponseFormState {
  return {
    respondentEmail: "alice@example.com",
    respondentName: "Alice Smith",
    action: "accept",
    declineReason: "",
    revisionNotes: "",
    isSubmitting: false,
    error: null,
    isComplete: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Quote View", () => {
  const now = "2026-03-23T00:00:00.000Z";

  // -----------------------------------------------------------------------
  // quoteViewStates
  // -----------------------------------------------------------------------

  describe("quoteViewStates", () => {
    it("contains all expected states", () => {
      expect(quoteViewStates).toEqual([
        "loading",
        "ready",
        "expired",
        "accepted",
        "declined",
        "revision_requested",
        "error",
        "not_found",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // buildCustomerQuoteDisplay
  // -----------------------------------------------------------------------

  describe("buildCustomerQuoteDisplay", () => {
    it("maps CustomerQuoteView to display data correctly", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView(), now);
      expect(display.quoteNumber).toBe("Q-1001");
      expect(display.businessName).toBe("Green Thumb Landscaping");
      expect(display.customerName).toBe("Alice Smith");
      expect(display.status).toBe("sent");
      expect(display.customerNotes).toBe("Please start early morning.");
      expect(display.termsAndConditions).toBe("Net 30 payment terms.");
      expect(display.createdAt).toBe("2026-03-22T10:00:00.000Z");
      expect(display.sentAt).toBe("2026-03-22T10:05:00.000Z");
    });

    it("formats dollar amounts", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView(), now);
      expect(display.subtotalFormatted).toBe("$50.00");
      expect(display.taxEstimateFormatted).toBe("$4.00");
      expect(display.totalFormatted).toBe("$54.00");
      expect(display.lineItems[0].unitPriceFormatted).toBe("$50.00");
      expect(display.lineItems[0].lineTotalFormatted).toBe("$50.00");
    });

    it("sets isActionable to true for sent status", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "sent" }), now);
      expect(display.isActionable).toBe(true);
    });

    it("sets isActionable to true for viewed status", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "viewed" }), now);
      expect(display.isActionable).toBe(true);
    });

    it("sets isActionable to false for accepted status", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "accepted" }), now);
      expect(display.isActionable).toBe(false);
    });

    it("sets isActionable to false for declined status", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "declined" }), now);
      expect(display.isActionable).toBe(false);
    });

    it("sets isActionable to false for expired status", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "expired" }), now);
      expect(display.isActionable).toBe(false);
    });

    it("calculates expiresInDays", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView(), now);
      expect(display.expiresInDays).toBe(30);
    });

    it("sets isExpiringSoon when <= 3 days", () => {
      const soonExpiry = "2026-03-25T00:00:00.000Z";
      const display = buildCustomerQuoteDisplay(
        sampleQuoteView({ expiresAt: soonExpiry }),
        now,
      );
      expect(display.expiresInDays).toBe(2);
      expect(display.isExpiringSoon).toBe(true);
    });

    it("sets isExpiringSoon to false when > 3 days", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView(), now);
      expect(display.expiresInDays).toBe(30);
      expect(display.isExpiringSoon).toBe(false);
    });

    it("returns correct status label for sent", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "sent" }), now);
      expect(display.statusLabel).toBe("Awaiting Response");
    });

    it("returns correct status label for accepted", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "accepted" }), now);
      expect(display.statusLabel).toBe("Accepted");
    });

    it("returns correct status description", () => {
      const display = buildCustomerQuoteDisplay(sampleQuoteView({ status: "sent" }), now);
      expect(display.statusDescription).toBe("This quote is awaiting your response.");
    });

    it("maps multiple line items", () => {
      const view = sampleQuoteView({
        lineItems: [
          sampleLineItem({ description: "Mowing", lineTotalCents: 3000 }),
          sampleLineItem({ description: "Edging", lineTotalCents: 2000, lineNotes: "Front only" }),
        ],
      });
      const display = buildCustomerQuoteDisplay(view, now);
      expect(display.lineItems).toHaveLength(2);
      expect(display.lineItems[0].description).toBe("Mowing");
      expect(display.lineItems[0].lineTotalFormatted).toBe("$30.00");
      expect(display.lineItems[1].description).toBe("Edging");
      expect(display.lineItems[1].lineNotes).toBe("Front only");
    });
  });

  // -----------------------------------------------------------------------
  // getQuoteStatusDescription
  // -----------------------------------------------------------------------

  describe("getQuoteStatusDescription", () => {
    it("returns correct description for sent", () => {
      expect(getQuoteStatusDescription("sent")).toBe("This quote is awaiting your response.");
    });

    it("returns correct description for viewed", () => {
      expect(getQuoteStatusDescription("viewed")).toBe("This quote is awaiting your response.");
    });

    it("returns correct description for accepted", () => {
      expect(getQuoteStatusDescription("accepted")).toBe("You have accepted this quote.");
    });

    it("returns correct description for declined", () => {
      expect(getQuoteStatusDescription("declined")).toBe("You have declined this quote.");
    });

    it("returns correct description for revision_requested", () => {
      expect(getQuoteStatusDescription("revision_requested")).toBe(
        "You have requested a revision to this quote.",
      );
    });

    it("returns correct description for expired", () => {
      expect(getQuoteStatusDescription("expired")).toBe(
        "This quote has expired and is no longer valid.",
      );
    });

    it("returns correct description for draft", () => {
      expect(getQuoteStatusDescription("draft")).toBe("This quote is being prepared.");
    });
  });

  // -----------------------------------------------------------------------
  // getQuoteViewState
  // -----------------------------------------------------------------------

  describe("getQuoteViewState", () => {
    it("returns not_found for null", () => {
      expect(getQuoteViewState(null)).toBe("not_found");
    });

    it("returns error for error string", () => {
      expect(getQuoteViewState(sampleQuoteView(), "Something went wrong")).toBe("error");
    });

    it("returns accepted for accepted quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "accepted" }))).toBe("accepted");
    });

    it("returns declined for declined quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "declined" }))).toBe("declined");
    });

    it("returns revision_requested for revision_requested quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "revision_requested" }))).toBe(
        "revision_requested",
      );
    });

    it("returns expired for expired quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "expired" }))).toBe("expired");
    });

    it("returns ready for sent quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "sent" }))).toBe("ready");
    });

    it("returns ready for viewed quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "viewed" }))).toBe("ready");
    });

    it("returns ready for draft quote", () => {
      expect(getQuoteViewState(sampleQuoteView({ status: "draft" }))).toBe("ready");
    });
  });

  // -----------------------------------------------------------------------
  // createInitialResponseFormState
  // -----------------------------------------------------------------------

  describe("createInitialResponseFormState", () => {
    it("returns initial state with empty fields and null action", () => {
      const state = createInitialResponseFormState();
      expect(state.respondentEmail).toBe("");
      expect(state.respondentName).toBe("");
      expect(state.action).toBeNull();
      expect(state.declineReason).toBe("");
      expect(state.revisionNotes).toBe("");
      expect(state.isSubmitting).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isComplete).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // validateResponseForm
  // -----------------------------------------------------------------------

  describe("validateResponseForm", () => {
    it("returns errors for missing email", () => {
      const errors = validateResponseForm(sampleFormState({ respondentEmail: "" }));
      expect(errors).toContain("Email address is required.");
    });

    it("returns errors for whitespace-only email", () => {
      const errors = validateResponseForm(sampleFormState({ respondentEmail: "   " }));
      expect(errors).toContain("Email address is required.");
    });

    it("returns errors for invalid email (no @)", () => {
      const errors = validateResponseForm(sampleFormState({ respondentEmail: "alice.example.com" }));
      expect(errors).toContain("Please enter a valid email address.");
    });

    it("returns errors for no action selected", () => {
      const errors = validateResponseForm(sampleFormState({ action: null }));
      expect(errors).toContain("Please select a response action.");
    });

    it("returns errors for revision with empty notes", () => {
      const errors = validateResponseForm(
        sampleFormState({ action: "revision", revisionNotes: "" }),
      );
      expect(errors).toContain("Please describe the changes you would like.");
    });

    it("returns errors for revision with whitespace-only notes", () => {
      const errors = validateResponseForm(
        sampleFormState({ action: "revision", revisionNotes: "   " }),
      );
      expect(errors).toContain("Please describe the changes you would like.");
    });

    it("returns empty array for valid form", () => {
      const errors = validateResponseForm(sampleFormState());
      expect(errors).toEqual([]);
    });

    it("accept with just email is valid", () => {
      const errors = validateResponseForm(
        sampleFormState({ action: "accept", respondentName: "" }),
      );
      expect(errors).toEqual([]);
    });

    it("decline with email is valid", () => {
      const errors = validateResponseForm(
        sampleFormState({ action: "decline" }),
      );
      expect(errors).toEqual([]);
    });

    it("revision with email and notes is valid", () => {
      const errors = validateResponseForm(
        sampleFormState({ action: "revision", revisionNotes: "Change the scope." }),
      );
      expect(errors).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // isResponseFormValid
  // -----------------------------------------------------------------------

  describe("isResponseFormValid", () => {
    it("returns true for valid form", () => {
      expect(isResponseFormValid(sampleFormState())).toBe(true);
    });

    it("returns false for invalid form", () => {
      expect(isResponseFormValid(sampleFormState({ respondentEmail: "", action: null }))).toBe(
        false,
      );
    });
  });
});
