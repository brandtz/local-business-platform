// E11-S2-T6: Loyalty API contract assertions
// Validates request payloads for loyalty configuration, redemption,
// manual adjustment, and ledger query endpoints.

import type {
	CreateLoyaltyProgramInput,
	UpdateLoyaltyProgramInput,
	PointRedemptionInput,
	ManualPointAdjustmentInput,
	PointLedgerQuery,
} from "@platform/types";
import {
	isValidAccumulationMode,
	isValidExpirationPolicy,
} from "@platform/types";

// ── Create Loyalty Program ──────────────────────────────────────────────────

export function assertCreateLoyaltyProgramInput(
	input: unknown,
): asserts input is CreateLoyaltyProgramInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Loyalty program input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (obj.accumulationMode !== undefined) {
		if (typeof obj.accumulationMode !== "string" || !isValidAccumulationMode(obj.accumulationMode)) {
			throw new Error("accumulationMode must be 'per_dollar' or 'per_order'.");
		}
	}
	if (obj.expirationPolicy !== undefined) {
		if (typeof obj.expirationPolicy !== "string" || !isValidExpirationPolicy(obj.expirationPolicy)) {
			throw new Error("expirationPolicy must be 'time_based', 'rolling', or 'never'.");
		}
	}
	if (obj.pointsPerDollar !== undefined && (typeof obj.pointsPerDollar !== "number" || obj.pointsPerDollar < 0)) {
		throw new Error("pointsPerDollar must be a non-negative number.");
	}
	if (obj.pointsPerOrder !== undefined && (typeof obj.pointsPerOrder !== "number" || obj.pointsPerOrder < 0)) {
		throw new Error("pointsPerOrder must be a non-negative number.");
	}
	if (obj.pointRedemptionRate !== undefined && (typeof obj.pointRedemptionRate !== "number" || obj.pointRedemptionRate <= 0)) {
		throw new Error("pointRedemptionRate must be a positive number.");
	}
	if (obj.minimumRedemptionPoints !== undefined && (typeof obj.minimumRedemptionPoints !== "number" || obj.minimumRedemptionPoints < 0)) {
		throw new Error("minimumRedemptionPoints must be a non-negative number.");
	}
	if (obj.tiers !== undefined && !Array.isArray(obj.tiers)) {
		throw new Error("tiers must be an array.");
	}
}

// ── Update Loyalty Program ──────────────────────────────────────────────────

export function assertUpdateLoyaltyProgramInput(
	input: unknown,
): asserts input is UpdateLoyaltyProgramInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Loyalty program update input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (obj.accumulationMode !== undefined) {
		if (typeof obj.accumulationMode !== "string" || !isValidAccumulationMode(obj.accumulationMode)) {
			throw new Error("accumulationMode must be 'per_dollar' or 'per_order'.");
		}
	}
	if (obj.expirationPolicy !== undefined) {
		if (typeof obj.expirationPolicy !== "string" || !isValidExpirationPolicy(obj.expirationPolicy)) {
			throw new Error("expirationPolicy must be 'time_based', 'rolling', or 'never'.");
		}
	}
	if (obj.pointsPerDollar !== undefined && (typeof obj.pointsPerDollar !== "number" || obj.pointsPerDollar < 0)) {
		throw new Error("pointsPerDollar must be a non-negative number.");
	}
	if (obj.pointRedemptionRate !== undefined && (typeof obj.pointRedemptionRate !== "number" || obj.pointRedemptionRate <= 0)) {
		throw new Error("pointRedemptionRate must be a positive number.");
	}
	if (obj.tiers !== undefined && !Array.isArray(obj.tiers)) {
		throw new Error("tiers must be an array.");
	}
}

// ── Point Redemption ────────────────────────────────────────────────────────

export function assertPointRedemptionInput(
	input: unknown,
): asserts input is PointRedemptionInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Redemption input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (typeof obj.customerId !== "string" || !obj.customerId) {
		throw new Error("customerId is required.");
	}
	if (typeof obj.pointsToRedeem !== "number" || obj.pointsToRedeem <= 0) {
		throw new Error("pointsToRedeem must be a positive number.");
	}
}

// ── Manual Adjustment ───────────────────────────────────────────────────────

export function assertManualPointAdjustmentInput(
	input: unknown,
): asserts input is ManualPointAdjustmentInput {
	if (typeof input !== "object" || input === null) {
		throw new Error("Adjustment input must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (typeof obj.customerId !== "string" || !obj.customerId) {
		throw new Error("customerId is required.");
	}
	if (typeof obj.points !== "number" || obj.points === 0) {
		throw new Error("points must be a non-zero number.");
	}
	if (typeof obj.reason !== "string" || !obj.reason.trim()) {
		throw new Error("reason is required.");
	}
	if (typeof obj.actorId !== "string" || !obj.actorId) {
		throw new Error("actorId is required.");
	}
}

// ── Ledger Query ────────────────────────────────────────────────────────────

export function assertPointLedgerQuery(
	input: unknown,
): asserts input is PointLedgerQuery {
	if (typeof input !== "object" || input === null) {
		throw new Error("Ledger query must be an object.");
	}
	const obj = input as Record<string, unknown>;
	if (typeof obj.tenantId !== "string" || !obj.tenantId) {
		throw new Error("tenantId is required.");
	}
	if (typeof obj.customerId !== "string" || !obj.customerId) {
		throw new Error("customerId is required.");
	}
	if (obj.page !== undefined && (typeof obj.page !== "number" || obj.page < 1)) {
		throw new Error("page must be a positive number.");
	}
	if (obj.pageSize !== undefined && (typeof obj.pageSize !== "number" || obj.pageSize < 1 || obj.pageSize > 100)) {
		throw new Error("pageSize must be between 1 and 100.");
	}
}
