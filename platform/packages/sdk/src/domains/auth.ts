import type {
	PasswordLoginRequest,
	PasswordLoginResponse,
	PasswordResetRequestInitiate,
	PasswordResetRequestComplete,
	SessionRefreshRequest,
	SessionRefreshResponse,
	AuthUserSummary,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type RegisterParams = {
	email: string;
	password: string;
	name: string;
};

export type RegisterResponse = {
	token: string;
	user: AuthUserSummary;
};

export type AuthApi = {
	login(params: PasswordLoginRequest): Promise<PasswordLoginResponse>;
	register(params: RegisterParams): Promise<RegisterResponse>;
	forgotPassword(params: PasswordResetRequestInitiate): Promise<{ success: boolean }>;
	resetPassword(params: PasswordResetRequestComplete): Promise<{ success: boolean }>;
	me(): Promise<AuthUserSummary>;
	refresh(params: SessionRefreshRequest): Promise<SessionRefreshResponse>;
};

export function createAuthApi(transport: HttpTransport): AuthApi {
	return {
		login: (params) => transport.post("/auth/login", params),
		register: (params) => transport.post("/auth/register", params),
		forgotPassword: (params) => transport.post("/auth/forgot-password", params),
		resetPassword: (params) => transport.post("/auth/reset-password", params),
		me: () => transport.get("/auth/me"),
		refresh: (params) => transport.post("/auth/refresh", params),
	};
}
