import type {
	OrderRecord,
	AdminOrderListQuery,
	AdminOrderListResponse,
	AdminOrderDetail,
	CreateOrderFromCartInput,
	OrderStatus,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type OrderStatusUpdateParams = {
	status: OrderStatus;
	reason?: string;
};

export type RefundParams = {
	amountCents: number;
	reason: string;
};

export type OrdersApi = {
	list(params?: AdminOrderListQuery): Promise<AdminOrderListResponse>;
	get(id: string): Promise<AdminOrderDetail>;
	create(params: CreateOrderFromCartInput): Promise<OrderRecord>;
	updateStatus(id: string, params: OrderStatusUpdateParams): Promise<OrderRecord>;
	refund(id: string, params: RefundParams): Promise<{ success: boolean }>;
};

export function createOrdersApi(transport: HttpTransport): OrdersApi {
	return {
		list: (params) =>
			transport.get("/orders", params),
		get: (id) => transport.get(`/orders/${id}`),
		create: (params) => transport.post("/orders", params),
		updateStatus: (id, params) => transport.patch(`/orders/${id}/status`, params),
		refund: (id, params) => transport.post(`/orders/${id}/refund`, params),
	};
}
