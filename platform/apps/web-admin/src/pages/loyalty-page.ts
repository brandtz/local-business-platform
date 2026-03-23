// E13-S7-T7: Loyalty Program Configuration page — points config,
// tier definitions, rewards catalog, module gating.

import { defineComponent, h, onMounted, ref } from "vue";
import { useSdk } from "../composables/use-sdk";
import type { LoyaltyProgramConfig, LoyaltyTierDefinition } from "@platform/types";
import type { LoyaltyReward } from "@platform/sdk";

// ── Types ────────────────────────────────────────────────────────────────────

type LoyaltyPageState = {
	config: LoyaltyProgramConfig | null;
	error: string | null;
	isLoading: boolean;
	isSaving: boolean;
	moduleEnabled: boolean;
	rewards: LoyaltyReward[];
	editingTier: LoyaltyTierDefinition | null;
	editingReward: LoyaltyReward | null;
	showTierPanel: boolean;
	showRewardPanel: boolean;
	tierForm: { name: string; pointThreshold: string; benefitsDescription: string };
	rewardForm: { name: string; pointsCost: string; description: string };
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderModuleDisabled(onEnable: () => void) {
	return h("div", { class: "module-gated", "data-testid": "loyalty-disabled" }, [
		h("h3", "Loyalty Module"),
		h("p", "The loyalty module is not enabled for this business."),
		h("button", {
			class: "btn btn--primary",
			"data-testid": "enable-loyalty-btn",
			onClick: onEnable,
		}, "Enable Loyalty Module"),
	]);
}

function renderPointsConfig(config: LoyaltyProgramConfig) {
	return h("div", { class: "loyalty-section", "data-testid": "points-config" }, [
		h("h3", "Points Configuration"),
		h("div", { class: "config-grid" }, [
			h("div", { "data-testid": "accumulation-mode" }, [
				h("span", "Accumulation Mode"),
				h("strong", config.accumulationMode === "per_dollar" ? "Per Dollar Spent" : "Per Order"),
			]),
			h("div", { "data-testid": "points-per-dollar" }, [
				h("span", "Points per Dollar"),
				h("strong", String(config.pointsPerDollar)),
			]),
			h("div", { "data-testid": "points-per-order" }, [
				h("span", "Points per Order"),
				h("strong", String(config.pointsPerOrder)),
			]),
			h("div", { "data-testid": "redemption-rate" }, [
				h("span", "Redemption Rate"),
				h("strong", `${config.pointRedemptionRate} pts = $0.01`),
			]),
			h("div", { "data-testid": "min-redemption" }, [
				h("span", "Minimum Redemption"),
				h("strong", `${config.minimumRedemptionPoints} pts`),
			]),
			h("div", { "data-testid": "expiration-policy" }, [
				h("span", "Expiration"),
				h("strong",
					config.expirationPolicy === "never"
						? "Never"
						: `${config.expirationPolicy} (${config.expirationDays} days)`),
			]),
		]),
	]);
}

function renderTiersTable(
	tiers: LoyaltyTierDefinition[],
	onEdit: (tier: LoyaltyTierDefinition) => void,
) {
	return h("div", { class: "loyalty-section", "data-testid": "tiers-section" }, [
		h("h3", "Tier Definitions"),
		tiers.length === 0
			? h("p", { class: "text-muted" }, "No tiers configured.")
			: h("table", { class: "data-table", "data-testid": "tiers-table" }, [
				h("thead", [
					h("tr", [h("th", "Tier"), h("th", "Points Threshold"), h("th", "Benefits"), h("th", "Actions")]),
				]),
				h("tbody",
					tiers.map((tier, i) =>
						h("tr", { key: i, "data-testid": `tier-row-${i}` }, [
							h("td", { "data-testid": "tier-name" }, tier.name),
							h("td", { "data-testid": "tier-threshold" }, String(tier.pointThreshold)),
							h("td", { "data-testid": "tier-benefits" }, tier.benefitsDescription),
							h("td", [
								h("button", {
									class: "btn btn--sm",
									"data-testid": `edit-tier-${i}`,
									onClick: () => onEdit(tier),
								}, "Edit"),
							]),
						]),
					),
				),
			]),
	]);
}

function renderRewardsTable(
	rewards: LoyaltyReward[],
	onEdit: (reward: LoyaltyReward) => void,
) {
	return h("div", { class: "loyalty-section", "data-testid": "rewards-section" }, [
		h("h3", "Rewards Catalog"),
		rewards.length === 0
			? h("p", { class: "text-muted", "data-testid": "rewards-empty" }, "No rewards configured.")
			: h("table", { class: "data-table", "data-testid": "rewards-table" }, [
				h("thead", [
					h("tr", [h("th", "Reward"), h("th", "Points Cost"), h("th", "Description"), h("th", "Actions")]),
				]),
				h("tbody",
					rewards.map((reward) =>
						h("tr", { key: reward.id, "data-testid": `reward-row-${reward.id}` }, [
							h("td", { "data-testid": "reward-name" }, reward.name),
							h("td", { "data-testid": "reward-cost" }, String(reward.pointsCost)),
							h("td", { "data-testid": "reward-description" }, reward.description),
							h("td", [
								h("button", {
									class: "btn btn--sm",
									"data-testid": `edit-reward-${reward.id}`,
									onClick: () => onEdit(reward),
								}, "Edit"),
							]),
						]),
					),
				),
			]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const LoyaltyPage = defineComponent({
	name: "LoyaltyPage",
	setup() {
		const sdk = useSdk();

		const state = ref<LoyaltyPageState>({
			config: null,
			error: null,
			isLoading: false,
			isSaving: false,
			moduleEnabled: false,
			rewards: [],
			editingTier: null,
			editingReward: null,
			showTierPanel: false,
			showRewardPanel: false,
			tierForm: { name: "", pointThreshold: "0", benefitsDescription: "" },
			rewardForm: { name: "", pointsCost: "0", description: "" },
		});

		async function loadConfig() {
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const config = await sdk.loyalty.getConfig();
				const rewards = await sdk.loyalty.listRewards().catch(() => [] as LoyaltyReward[]);
				state.value = {
					...state.value,
					isLoading: false,
					config,
					moduleEnabled: config.enabled,
					rewards,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load loyalty config",
				};
			}
		}

		async function handleEnable() {
			state.value = { ...state.value, isSaving: true };
			try {
				await sdk.loyalty.updateConfig({ enabled: true });
				void loadConfig();
			} catch {
				state.value = { ...state.value, isSaving: false, error: "Failed to enable loyalty module" };
			}
		}

		onMounted(() => {
			void loadConfig();
		});

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("section", { "data-testid": "loyalty-page" }, [
					h("h2", "Loyalty Program"),
					h("div", { class: "loading", "data-testid": "loyalty-loading" }, "Loading loyalty configuration…"),
				]);
			}

			if (!s.moduleEnabled && !s.config?.enabled) {
				return h("section", { "data-testid": "loyalty-page" }, [
					h("h2", "Loyalty Program"),
					s.error
						? h("div", { class: "alert alert--error", "data-testid": "loyalty-error" }, s.error)
						: null,
					renderModuleDisabled(handleEnable),
				]);
			}

			return h("section", { "data-testid": "loyalty-page" }, [
				h("h2", "Loyalty Program"),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "loyalty-error" }, s.error)
					: null,

				s.config ? renderPointsConfig(s.config) : null,
				s.config ? renderTiersTable(s.config.tiers, (tier) => {
					state.value = {
						...state.value,
						editingTier: tier,
						showTierPanel: true,
						tierForm: {
							name: tier.name,
							pointThreshold: String(tier.pointThreshold),
							benefitsDescription: tier.benefitsDescription,
						},
					};
				}) : null,
				renderRewardsTable(s.rewards, (reward) => {
					state.value = {
						...state.value,
						editingReward: reward,
						showRewardPanel: true,
						rewardForm: {
							name: reward.name,
							pointsCost: String(reward.pointsCost),
							description: reward.description,
						},
					};
				}),
			]);
		};
	},
});
