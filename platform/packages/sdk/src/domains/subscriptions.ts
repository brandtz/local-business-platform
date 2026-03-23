import type {
	SubscriptionPackageRecord,
	CreateSubscriptionPackageInput,
	UpdateSubscriptionPackageInput,
	SubscriptionPackageWithEntitlements,
	TenantSubscriptionStatus,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type SubscriptionListResponse = {
	data: SubscriptionPackageRecord[];
	total: number;
};

export type TenantSubscriptionRecord = {
	id: string;
	tenantId: string;
	packageId: string;
	status: TenantSubscriptionStatus;
	startedAt: string;
	expiresAt: string | null;
	cancelledAt: string | null;
};

export type CreateSubscriptionParams = {
	tenantId: string;
	packageId: string;
};

export type SubscriptionsApi = {
	listPlans(): Promise<SubscriptionListResponse>;
	getPlan(id: string): Promise<SubscriptionPackageWithEntitlements>;
	createPlan(params: CreateSubscriptionPackageInput): Promise<SubscriptionPackageRecord>;
	updatePlan(id: string, params: UpdateSubscriptionPackageInput): Promise<SubscriptionPackageRecord>;
	deletePlan(id: string): Promise<void>;
	getSubscription(id: string): Promise<TenantSubscriptionRecord>;
	createSubscription(params: CreateSubscriptionParams): Promise<TenantSubscriptionRecord>;
	cancelSubscription(id: string): Promise<TenantSubscriptionRecord>;
	reactivateSubscription(id: string): Promise<TenantSubscriptionRecord>;
};

export function createSubscriptionsApi(transport: HttpTransport): SubscriptionsApi {
	return {
		listPlans: () => transport.get("/subscriptions/plans"),
		getPlan: (id) => transport.get(`/subscriptions/plans/${id}`),
		createPlan: (params) => transport.post("/subscriptions/plans", params),
		updatePlan: (id, params) => transport.put(`/subscriptions/plans/${id}`, params),
		deletePlan: (id) => transport.delete(`/subscriptions/plans/${id}`),
		getSubscription: (id) => transport.get(`/subscriptions/${id}`),
		createSubscription: (params) => transport.post("/subscriptions", params),
		cancelSubscription: (id) => transport.post(`/subscriptions/${id}/cancel`),
		reactivateSubscription: (id) => transport.post(`/subscriptions/${id}/reactivate`),
	};
}
