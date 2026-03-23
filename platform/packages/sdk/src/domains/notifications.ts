import type {
	InAppNotification,
	CustomerNotificationQuery,
	CustomerNotificationResponse,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type NotificationsApi = {
	list(params?: CustomerNotificationQuery): Promise<CustomerNotificationResponse>;
	markRead(id: string): Promise<InAppNotification>;
	markAllRead(): Promise<{ success: boolean }>;
};

export function createNotificationsApi(transport: HttpTransport): NotificationsApi {
	return {
		list: (params) =>
			transport.get("/notifications", params),
		markRead: (id) => transport.post(`/notifications/${id}/read`),
		markAllRead: () => transport.post("/notifications/read-all"),
	};
}
