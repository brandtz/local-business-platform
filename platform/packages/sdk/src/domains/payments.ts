import type {
	PaymentConnectionRecord,
	CreatePaymentConnectionInput,
	AdminPaymentConnectionDetail,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type PaymentMethodSummary = {
	id: string;
	type: string;
	last4: string;
	isDefault: boolean;
};

export type AddPaymentMethodParams = {
	type: string;
	token: string;
	setDefault?: boolean;
};

export type PaymentsApi = {
	getConfig(): Promise<AdminPaymentConnectionDetail>;
	updateConfig(params: Partial<PaymentConnectionRecord>): Promise<PaymentConnectionRecord>;
	listMethods(): Promise<PaymentMethodSummary[]>;
	addMethod(params: AddPaymentMethodParams): Promise<PaymentMethodSummary>;
	removeMethod(id: string): Promise<void>;
	createConnection(params: CreatePaymentConnectionInput): Promise<PaymentConnectionRecord>;
};

export function createPaymentsApi(transport: HttpTransport): PaymentsApi {
	return {
		getConfig: () => transport.get("/payments/config"),
		updateConfig: (params) => transport.put("/payments/config", params),
		listMethods: () => transport.get("/payments/methods"),
		addMethod: (params) => transport.post("/payments/methods", params),
		removeMethod: (id) => transport.delete(`/payments/methods/${id}`),
		createConnection: (params) => transport.post("/payments/connections", params),
	};
}
