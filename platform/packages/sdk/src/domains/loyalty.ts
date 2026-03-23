import type {
	LoyaltyProgramConfig,
	UpdateLoyaltyProgramInput,
	LoyaltyAccount,
	PointRedemptionInput,
	PointRedemptionResult,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type LoyaltyReward = {
	id: string;
	name: string;
	pointsCost: number;
	description: string;
};

export type LoyaltyApi = {
	getConfig(): Promise<LoyaltyProgramConfig>;
	updateConfig(params: UpdateLoyaltyProgramInput): Promise<LoyaltyProgramConfig>;
	getCustomerPoints(customerId: string): Promise<LoyaltyAccount>;
	listRewards(): Promise<LoyaltyReward[]>;
	redeem(params: PointRedemptionInput): Promise<PointRedemptionResult>;
};

export function createLoyaltyApi(transport: HttpTransport): LoyaltyApi {
	return {
		getConfig: () => transport.get("/loyalty/config"),
		updateConfig: (params) => transport.put("/loyalty/config", params),
		getCustomerPoints: (customerId) => transport.get(`/loyalty/customers/${customerId}/points`),
		listRewards: () => transport.get("/loyalty/rewards"),
		redeem: (params) => transport.post("/loyalty/redeem", params),
	};
}
