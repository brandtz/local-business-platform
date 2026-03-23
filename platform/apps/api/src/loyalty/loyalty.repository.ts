import { Injectable } from "@nestjs/common";
import type {
	LoyaltyProgramConfig,
	CreateLoyaltyProgramInput,
	UpdateLoyaltyProgramInput,
	PointLedgerEntry,
	LedgerEntryType,
} from "@platform/types";
import { DEFAULT_LOYALTY_PROGRAM_CONFIG } from "@platform/types";

// ---------------------------------------------------------------------------
// E11-S2: Loyalty Repository — in-memory store for loyalty data
// ---------------------------------------------------------------------------

type StoredLoyaltyAccount = {
	id: string;
	tenantId: string;
	customerId: string;
	currentTier: string;
	pointBalance: number;
	lifetimePoints: number;
	memberSince: string;
};

@Injectable()
export class LoyaltyRepository {
	private configs: Map<string, LoyaltyProgramConfig> = new Map();
	private accounts: Map<string, StoredLoyaltyAccount> = new Map();
	private ledger: PointLedgerEntry[] = [];
	private nextId = 1;

	private generateId(prefix: string): string {
		return `${prefix}-${this.nextId++}`;
	}

	private accountKey(tenantId: string, customerId: string): string {
		return `${tenantId}:${customerId}`;
	}

	// ── Program Config ────────────────────────────────────────────────────────

	getConfig(tenantId: string): LoyaltyProgramConfig | null {
		return this.configs.get(tenantId) ?? null;
	}

	getOrCreateConfig(tenantId: string): LoyaltyProgramConfig {
		const existing = this.configs.get(tenantId);
		if (existing) return existing;

		const now = new Date().toISOString();
		const config: LoyaltyProgramConfig = {
			id: this.generateId("lcfg"),
			tenantId,
			...DEFAULT_LOYALTY_PROGRAM_CONFIG,
			createdAt: now,
			updatedAt: now,
		};
		this.configs.set(tenantId, config);
		return config;
	}

	createConfig(input: CreateLoyaltyProgramInput): LoyaltyProgramConfig {
		const now = new Date().toISOString();
		const config: LoyaltyProgramConfig = {
			id: this.generateId("lcfg"),
			tenantId: input.tenantId,
			enabled: input.enabled ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.enabled,
			tiers: input.tiers ?? [...DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers],
			accumulationMode: input.accumulationMode ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.accumulationMode,
			pointsPerDollar: input.pointsPerDollar ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.pointsPerDollar,
			pointsPerOrder: input.pointsPerOrder ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.pointsPerOrder,
			pointRedemptionRate: input.pointRedemptionRate ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.pointRedemptionRate,
			minimumRedemptionPoints: input.minimumRedemptionPoints ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.minimumRedemptionPoints,
			expirationPolicy: input.expirationPolicy ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.expirationPolicy,
			expirationDays: input.expirationDays ?? DEFAULT_LOYALTY_PROGRAM_CONFIG.expirationDays,
			createdAt: now,
			updatedAt: now,
		};
		this.configs.set(input.tenantId, config);
		return config;
	}

	updateConfig(tenantId: string, input: UpdateLoyaltyProgramInput): LoyaltyProgramConfig | null {
		const existing = this.configs.get(tenantId);
		if (!existing) return null;

		const updated: LoyaltyProgramConfig = {
			...existing,
			enabled: input.enabled ?? existing.enabled,
			tiers: input.tiers ?? existing.tiers,
			accumulationMode: input.accumulationMode ?? existing.accumulationMode,
			pointsPerDollar: input.pointsPerDollar ?? existing.pointsPerDollar,
			pointsPerOrder: input.pointsPerOrder ?? existing.pointsPerOrder,
			pointRedemptionRate: input.pointRedemptionRate ?? existing.pointRedemptionRate,
			minimumRedemptionPoints: input.minimumRedemptionPoints ?? existing.minimumRedemptionPoints,
			expirationPolicy: input.expirationPolicy ?? existing.expirationPolicy,
			expirationDays: input.expirationDays ?? existing.expirationDays,
			updatedAt: new Date().toISOString(),
		};
		this.configs.set(tenantId, updated);
		return updated;
	}

	// ── Customer Loyalty Account ──────────────────────────────────────────────

	getAccount(tenantId: string, customerId: string): StoredLoyaltyAccount | null {
		return this.accounts.get(this.accountKey(tenantId, customerId)) ?? null;
	}

	getOrCreateAccount(tenantId: string, customerId: string): StoredLoyaltyAccount {
		const key = this.accountKey(tenantId, customerId);
		const existing = this.accounts.get(key);
		if (existing) return existing;

		const account: StoredLoyaltyAccount = {
			id: this.generateId("lacct"),
			tenantId,
			customerId,
			currentTier: "bronze",
			pointBalance: 0,
			lifetimePoints: 0,
			memberSince: new Date().toISOString(),
		};
		this.accounts.set(key, account);
		return account;
	}

	updateAccount(
		tenantId: string,
		customerId: string,
		update: Partial<Pick<StoredLoyaltyAccount, "currentTier" | "pointBalance" | "lifetimePoints">>,
	): StoredLoyaltyAccount | null {
		const key = this.accountKey(tenantId, customerId);
		const existing = this.accounts.get(key);
		if (!existing) return null;

		const updated = { ...existing, ...update };
		this.accounts.set(key, updated);
		return updated;
	}

	listAccountsForTenant(tenantId: string): StoredLoyaltyAccount[] {
		return Array.from(this.accounts.values()).filter((a) => a.tenantId === tenantId);
	}

	// ── Point Ledger ─────────────────────────────────────────────────────────

	addLedgerEntry(
		tenantId: string,
		customerId: string,
		type: LedgerEntryType,
		points: number,
		balanceAfter: number,
		description: string,
		referenceType: PointLedgerEntry["referenceType"],
		referenceId: string | null,
		expiresAt: string | null,
	): PointLedgerEntry {
		const entry: PointLedgerEntry = {
			id: this.generateId("ple"),
			tenantId,
			customerId,
			type,
			points,
			balanceAfter,
			description,
			referenceType,
			referenceId,
			expiresAt,
			createdAt: new Date().toISOString(),
		};
		this.ledger.push(entry);
		return entry;
	}

	getLedgerEntries(
		tenantId: string,
		customerId: string,
		type?: LedgerEntryType,
		page: number = 1,
		pageSize: number = 20,
	): { entries: PointLedgerEntry[]; total: number } {
		let filtered = this.ledger.filter(
			(e) => e.tenantId === tenantId && e.customerId === customerId,
		);
		if (type) {
			filtered = filtered.filter((e) => e.type === type);
		}
		// Sort by createdAt descending
		filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

		const total = filtered.length;
		const start = (page - 1) * pageSize;
		const entries = filtered.slice(start, start + pageSize);

		return { entries, total };
	}

	getExpirableEntries(tenantId: string, beforeDate: string): PointLedgerEntry[] {
		return this.ledger.filter(
			(e) =>
				e.tenantId === tenantId &&
				e.type === "earn" &&
				e.expiresAt !== null &&
				e.expiresAt <= beforeDate,
		);
	}

	getExpirableEntriesAllTenants(beforeDate: string): PointLedgerEntry[] {
		return this.ledger.filter(
			(e) =>
				e.type === "earn" &&
				e.expiresAt !== null &&
				e.expiresAt <= beforeDate,
		);
	}

	getAllConfigs(): LoyaltyProgramConfig[] {
		return Array.from(this.configs.values());
	}
}
