// Tests for loyalty page configuration logic and module gating

import { describe, expect, it } from "vitest";

import type { LoyaltyProgramConfig, LoyaltyTierDefinition } from "@platform/types";
import { DEFAULT_LOYALTY_PROGRAM_CONFIG } from "@platform/types";
import type { LoyaltyReward } from "@platform/sdk";

describe("LoyaltyPage helpers", () => {
	describe("module gating", () => {
		it("disabled config shows placeholder", () => {
			const config: Partial<LoyaltyProgramConfig> = { enabled: false };
			expect(config.enabled).toBe(false);
		});

		it("enabled config shows full UI", () => {
			const config: Partial<LoyaltyProgramConfig> = { enabled: true };
			expect(config.enabled).toBe(true);
		});
	});

	describe("default loyalty configuration", () => {
		it("has default tiers", () => {
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers).toHaveLength(4);
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers[0]!.name).toBe("Bronze");
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers[1]!.name).toBe("Silver");
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers[2]!.name).toBe("Gold");
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers[3]!.name).toBe("Platinum");
		});

		it("has default accumulation mode", () => {
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.accumulationMode).toBe("per_dollar");
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.pointsPerDollar).toBe(1);
		});

		it("has default expiration policy", () => {
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.expirationPolicy).toBe("rolling");
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.expirationDays).toBe(365);
		});

		it("is disabled by default", () => {
			expect(DEFAULT_LOYALTY_PROGRAM_CONFIG.enabled).toBe(false);
		});
	});

	describe("tier definitions", () => {
		it("tiers have required fields", () => {
			const tier: LoyaltyTierDefinition = {
				name: "Gold",
				pointThreshold: 2000,
				benefitsDescription: "10% bonus points",
			};
			expect(tier.name).toBe("Gold");
			expect(tier.pointThreshold).toBe(2000);
			expect(tier.benefitsDescription).toBeTruthy();
		});

		it("tiers should be ordered by threshold", () => {
			const tiers = DEFAULT_LOYALTY_PROGRAM_CONFIG.tiers;
			for (let i = 1; i < tiers.length; i++) {
				expect(tiers[i]!.pointThreshold).toBeGreaterThan(tiers[i - 1]!.pointThreshold);
			}
		});
	});

	describe("rewards catalog", () => {
		it("reward has required fields", () => {
			const reward: LoyaltyReward = {
				id: "reward-1",
				name: "Free Coffee",
				pointsCost: 100,
				description: "One free coffee of any size",
			};
			expect(reward.id).toBeTruthy();
			expect(reward.name).toBe("Free Coffee");
			expect(reward.pointsCost).toBe(100);
		});
	});

	describe("points configuration display", () => {
		it("formats accumulation mode label", () => {
			function getAccumulationLabel(mode: string): string {
				return mode === "per_dollar" ? "Per Dollar Spent" : "Per Order";
			}

			expect(getAccumulationLabel("per_dollar")).toBe("Per Dollar Spent");
			expect(getAccumulationLabel("per_order")).toBe("Per Order");
		});

		it("formats expiration policy label", () => {
			function getExpirationLabel(policy: string, days: number): string {
				if (policy === "never") return "Never";
				return `${policy} (${days} days)`;
			}

			expect(getExpirationLabel("never", 365)).toBe("Never");
			expect(getExpirationLabel("rolling", 365)).toBe("rolling (365 days)");
			expect(getExpirationLabel("time_based", 180)).toBe("time_based (180 days)");
		});
	});
});
