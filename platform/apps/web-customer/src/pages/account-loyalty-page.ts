// Account Loyalty page — points balance, tier progress, benefits,
// available rewards, and points history.
// Fetches data via SDK loyalty API.

import { defineComponent, h, ref, onMounted, type VNode } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import type {
	LoyaltyProgramConfig,
	LoyaltyTierDefinition,
	PointLedgerEntry,
} from "@platform/types";
import { buildLoyaltyTabData, type LoyaltyTabData } from "@platform/types";

import type { LoyaltyReward } from "@platform/sdk";

import { useSdk } from "../composables/use-sdk";
import { renderAccountSidebar } from "./account-dashboard-page";

// ── Pure Helpers ─────────────────────────────────────────────────────────────

export function formatTierName(tier: string): string {
	if (tier.length === 0) return tier;
	return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

export function calculateTierProgress(current: number, threshold: number): number {
	if (threshold <= 0) return 100;
	const progress = Math.min(Math.round((current / threshold) * 100), 100);
	return Math.max(progress, 0);
}

// ── Render Helpers ──────────────────────────────────────────────────────────

function renderLoading(): VNode {
	return h("div", {
		class: "page-loading",
		role: "status",
		"aria-live": "polite",
		"data-testid": "loading-state",
	}, [
		h("div", { class: "page-loading__spinner" }),
		h("p", "Loading loyalty information..."),
	]);
}

function renderError(message: string): VNode {
	return h("div", {
		class: "page-error",
		role: "alert",
		"data-testid": "error-state",
	}, [
		h("h2", "Something went wrong"),
		h("p", message),
		h(RouterLink, { to: "/account", class: "page-error__back" }, {
			default: () => "Back to Account",
		}),
	]);
}

function renderPointsBalance(tabData: LoyaltyTabData): VNode {
	return h("section", {
		class: "account-loyalty__balance",
		"data-testid": "points-balance",
	}, [
		h("div", { class: "account-loyalty__points-display" }, [
			h("span", {
				class: "account-loyalty__points-value",
				"data-testid": "points-value",
			}, tabData.pointBalance.toLocaleString()),
			h("span", { class: "account-loyalty__points-label" }, "Points Available"),
		]),
		h("div", { class: "account-loyalty__tier-badge" }, [
			h("span", {
				class: "account-loyalty__tier-name",
				"data-testid": "tier-name",
			}, formatTierName(tabData.tierName)),
			h("span", { class: "account-loyalty__member-since" },
				`Member since ${new Date(tabData.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
			),
		]),
	]);
}

function renderTierProgress(tabData: LoyaltyTabData): VNode {
	if (!tabData.nextTierName || tabData.nextTierThreshold === null) {
		return h("section", {
			class: "account-loyalty__progress",
			"data-testid": "tier-progress",
		}, [
			h("p", {
				class: "account-loyalty__max-tier",
				"data-testid": "max-tier-message",
			}, `You've reached the highest tier: ${formatTierName(tabData.tierName)}!`),
		]);
	}

	return h("section", {
		class: "account-loyalty__progress",
		"data-testid": "tier-progress",
	}, [
		h("h3", { class: "account-loyalty__section-title" }, "Tier Progress"),
		h("div", { class: "account-loyalty__progress-info" }, [
			h("span", { "data-testid": "current-tier" }, formatTierName(tabData.tierName)),
			h("span", { "data-testid": "next-tier" }, formatTierName(tabData.nextTierName)),
		]),
		h("div", {
			class: "account-loyalty__progress-bar-track",
			"data-testid": "progress-bar",
		}, [
			h("div", {
				class: "account-loyalty__progress-bar-fill",
				style: { width: `${tabData.progressPercent}%` },
				"data-testid": "progress-bar-fill",
			}),
		]),
		tabData.pointsToNextTier !== null
			? h("p", {
				class: "account-loyalty__points-to-next",
				"data-testid": "points-to-next",
			}, `${tabData.pointsToNextTier.toLocaleString()} points to ${formatTierName(tabData.nextTierName)}`)
			: null,
	]);
}

function renderTierBenefits(tiers: LoyaltyTierDefinition[], currentTier: string): VNode {
	return h("section", {
		class: "account-loyalty__benefits",
		"data-testid": "tier-benefits",
	}, [
		h("h3", { class: "account-loyalty__section-title" }, "Tier Benefits"),
		h("ul", { class: "account-loyalty__benefits-list" },
			tiers.map((tier) =>
				h("li", {
					key: tier.name,
					class: [
						"account-loyalty__benefit-item",
						tier.name.toLowerCase() === currentTier.toLowerCase()
							? "account-loyalty__benefit-item--current"
							: "",
					],
					"data-testid": `benefit-${tier.name.toLowerCase()}`,
				}, [
					h("strong", formatTierName(tier.name)),
					h("span", ` — ${tier.benefitsDescription}`),
					tier.name.toLowerCase() === currentTier.toLowerCase()
						? h("span", {
							class: "account-loyalty__current-badge",
							"data-testid": "current-tier-badge",
						}, " (Current)")
						: null,
				])
			)
		),
	]);
}

function renderRewards(
	rewards: LoyaltyReward[],
	canRedeem: boolean,
	pointBalance: number,
	redeeming: string | null,
	onRedeem: (rewardId: string) => void,
): VNode {
	if (rewards.length === 0) {
		return h("section", {
			class: "account-loyalty__rewards",
			"data-testid": "rewards-section",
		}, [
			h("h3", { class: "account-loyalty__section-title" }, "Available Rewards"),
			h("p", { class: "account-loyalty__no-rewards", "data-testid": "no-rewards" }, "No rewards available at this time."),
		]);
	}

	return h("section", {
		class: "account-loyalty__rewards",
		"data-testid": "rewards-section",
	}, [
		h("h3", { class: "account-loyalty__section-title" }, "Available Rewards"),
		h("div", { class: "account-loyalty__rewards-list" },
			rewards.map((reward) => {
				const canAfford = pointBalance >= reward.pointsCost;
				return h("div", {
					key: reward.id,
					class: "account-loyalty__reward-card",
					"data-testid": `reward-${reward.id}`,
				}, [
					h("div", { class: "account-loyalty__reward-info" }, [
						h("span", {
							class: "account-loyalty__reward-name",
							"data-testid": "reward-name",
						}, reward.name),
						h("span", {
							class: "account-loyalty__reward-desc",
						}, reward.description),
						h("span", {
							class: "account-loyalty__reward-cost",
							"data-testid": "reward-cost",
						}, `${reward.pointsCost.toLocaleString()} points`),
					]),
					h("button", {
						class: "account-loyalty__redeem-btn",
						"data-testid": `redeem-${reward.id}`,
						disabled: !canRedeem || !canAfford || redeeming === reward.id,
						onClick: () => onRedeem(reward.id),
					}, redeeming === reward.id ? "Redeeming..." : "Redeem"),
				]);
			})
		),
	]);
}

function renderPointsHistory(entries: PointLedgerEntry[]): VNode {
	if (entries.length === 0) {
		return h("section", {
			class: "account-loyalty__history",
			"data-testid": "points-history",
		}, [
			h("h3", { class: "account-loyalty__section-title" }, "Points History"),
			h("p", { "data-testid": "no-history" }, "No points activity yet."),
		]);
	}

	return h("section", {
		class: "account-loyalty__history",
		"data-testid": "points-history",
	}, [
		h("h3", { class: "account-loyalty__section-title" }, "Recent Activity"),
		h("table", { class: "account-loyalty__history-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Date"),
					h("th", "Description"),
					h("th", "Points"),
					h("th", "Balance"),
				]),
			]),
			h("tbody",
				entries.map((entry) =>
					h("tr", {
						key: entry.id,
						class: `account-loyalty__history-row--${entry.type}`,
						"data-testid": `history-entry-${entry.id}`,
					}, [
						h("td", { "data-testid": "history-date" },
							new Date(entry.createdAt).toLocaleDateString("en-US", {
								month: "short",
								day: "numeric",
							})
						),
						h("td", { "data-testid": "history-desc" }, entry.description),
						h("td", {
							class: entry.type === "earn" ? "account-loyalty__points-positive" : "account-loyalty__points-negative",
							"data-testid": "history-points",
						}, `${entry.type === "earn" ? "+" : ""}${entry.points}`),
						h("td", { "data-testid": "history-balance" }, entry.balanceAfter.toLocaleString()),
					])
				)
			),
		]),
	]);
}

// ── Page Component ──────────────────────────────────────────────────────────

export const AccountLoyaltyPage = defineComponent({
	name: "AccountLoyaltyPage",
	setup() {
		const sdk = useSdk();
		const route = useRoute();
		const router = useRouter();

		const loading = ref(true);
		const error = ref<string | null>(null);
		const tabData = ref<LoyaltyTabData | null>(null);
		const config = ref<LoyaltyProgramConfig | null>(null);
		const rewards = ref<LoyaltyReward[]>([]);
		const redeeming = ref<string | null>(null);
		const customerId = ref("");
		const tenantId = ref("");

		async function fetchLoyaltyData(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const profile = await sdk.auth.me();

				const [loyaltyConfig, account, rewardsList] = await Promise.all([
					sdk.loyalty.getConfig(),
					sdk.loyalty.getCustomerPoints(profile.id),
					sdk.loyalty.listRewards(),
				]);

				config.value = loyaltyConfig;
				rewards.value = rewardsList;
				customerId.value = profile.id;
				tenantId.value = account.tenantId;

				// Build tab data using the canonical helper from @platform/types
				tabData.value = buildLoyaltyTabData(
					{
						currentTier: account.currentTier,
						pointBalance: account.pointBalance,
						lifetimePoints: account.lifetimePoints,
						memberSince: account.memberSince,
					},
					{
						tiers: loyaltyConfig.tiers,
						minimumRedemptionPoints: loyaltyConfig.minimumRedemptionPoints,
					},
					[], // Recent activity loaded separately if needed
				);
			} catch {
				error.value = "Unable to load loyalty information. Please try again later.";
			} finally {
				loading.value = false;
			}
		}

		async function redeemReward(rewardId: string): Promise<void> {
			if (!tabData.value) return;
			const reward = rewards.value.find((r) => r.id === rewardId);
			if (!reward) return;

			redeeming.value = rewardId;
			try {
				await sdk.loyalty.redeem({
					tenantId: tenantId.value,
					customerId: customerId.value,
					pointsToRedeem: reward.pointsCost,
				});
				// Refresh data after redemption
				await fetchLoyaltyData();
			} catch {
				error.value = "Unable to redeem reward. Please try again.";
			} finally {
				redeeming.value = null;
			}
		}

		onMounted(fetchLoyaltyData);

		return () => {
			if (loading.value) return renderLoading();
			if (error.value || !tabData.value || !config.value) {
				return renderError(error.value ?? "Loyalty data not available");
			}

			const currentTabData = tabData.value;
			const currentConfig = config.value;

			return h("div", {
				class: "account-loyalty-page",
				"data-testid": "account-loyalty-page",
			}, [
				renderAccountSidebar(route.path, (path) => router.push(path)),
				h("div", { class: "account-loyalty__content" }, [
					h("h1", { class: "account-loyalty__heading" }, "Loyalty & Rewards"),
					renderPointsBalance(currentTabData),
					renderTierProgress(currentTabData),
					renderTierBenefits(currentConfig.tiers, currentTabData.tierName),
					renderRewards(
						rewards.value,
						currentTabData.canRedeem,
						currentTabData.pointBalance,
						redeeming.value,
						redeemReward,
					),
					renderPointsHistory(currentTabData.recentActivity),
				]),
			]);
		};
	},
});
