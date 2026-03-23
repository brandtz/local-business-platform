// HTTP transport layer built on the Fetch API with interceptors,
// auth-token injection, tenant-ID headers, and timeout support.

import { classifyApiError, type ApiError } from "./api-client";

// ── Public types ─────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestConfig = {
	url: string;
	method: HttpMethod;
	headers: Record<string, string>;
	body?: unknown;
	signal?: AbortSignal;
};

export type HttpResponse<T> = {
	data: T;
	status: number;
	headers: Record<string, string>;
};

export type RequestInterceptor = (
	config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
	response: HttpResponse<unknown>,
) => HttpResponse<unknown> | Promise<HttpResponse<unknown>>;

export type HttpTransportConfig = {
	baseUrl: string;
	timeout: number;
	defaultHeaders: Record<string, string>;
	requestInterceptors: RequestInterceptor[];
	responseInterceptors: ResponseInterceptor[];
};

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export type HttpTransport = {
	get<T>(path: string, params?: QueryParams): Promise<T>;
	post<T>(path: string, body?: unknown): Promise<T>;
	put<T>(path: string, body?: unknown): Promise<T>;
	patch<T>(path: string, body?: unknown): Promise<T>;
	delete<T>(path: string): Promise<T>;
	setAuthToken(token: string): void;
	clearAuthToken(): void;
	setTenantId(id: string): void;
	clearTenantId(): void;
	getActiveRequestCount(): number;
};

// ── Transport error ──────────────────────────────────────────────────────────

export class HttpTransportError extends Error {
	public readonly apiError: ApiError;

	constructor(apiError: ApiError) {
		super(apiError.message);
		this.name = "HttpTransportError";
		this.apiError = apiError;
	}
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createHttpTransport(config: HttpTransportConfig): HttpTransport {
	let authToken: string | null = null;
	let tenantId: string | null = null;
	let activeRequestCount = 0;

	async function request<T>(
		method: HttpMethod,
		path: string,
		body?: unknown,
		queryParams?: QueryParams,
	): Promise<T> {
		const url = buildUrl(config.baseUrl, path, queryParams);

		const headers: Record<string, string> = { ...config.defaultHeaders };
		if (authToken) {
			headers["Authorization"] = `Bearer ${authToken}`;
		}
		if (tenantId) {
			headers["X-Tenant-Id"] = tenantId;
		}
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
		}

		let requestConfig: RequestConfig = { url, method, headers, body };

		for (const interceptor of config.requestInterceptors) {
			requestConfig = await interceptor(requestConfig);
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), config.timeout);
		requestConfig.signal = requestConfig.signal ?? controller.signal;

		activeRequestCount++;

		try {
			const fetchInit: RequestInit = {
				method: requestConfig.method,
				headers: requestConfig.headers,
				signal: requestConfig.signal,
			};
			if (requestConfig.body !== undefined) {
				fetchInit.body = JSON.stringify(requestConfig.body);
			}

			const raw = await fetch(requestConfig.url, fetchInit);
			clearTimeout(timeoutId);

			if (!raw.ok) {
				throw new HttpTransportError(classifyApiError(raw.status));
			}

			const responseHeaders: Record<string, string> = {};
			raw.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			const contentType = raw.headers.get("content-type") ?? "";
			const data = contentType.includes("application/json")
				? ((await raw.json()) as T)
				: ((await raw.text()) as unknown as T);

			let httpResponse: HttpResponse<unknown> = {
				data,
				status: raw.status,
				headers: responseHeaders,
			};

			for (const interceptor of config.responseInterceptors) {
				httpResponse = await interceptor(httpResponse);
			}

			return httpResponse.data as T;
		} catch (error: unknown) {
			clearTimeout(timeoutId);

			if (error instanceof HttpTransportError) {
				throw error;
			}

			if (error instanceof DOMException && error.name === "AbortError") {
				throw new HttpTransportError(classifyApiError(408));
			}

			throw new HttpTransportError(classifyApiError(null));
		} finally {
			activeRequestCount--;
		}
	}

	return {
		get: <T>(path: string, params?: QueryParams) =>
			request<T>("GET", path, undefined, params),
		post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
		put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
		patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
		delete: <T>(path: string) => request<T>("DELETE", path),

		setAuthToken(token: string) {
			authToken = token;
		},
		clearAuthToken() {
			authToken = null;
		},
		setTenantId(id: string) {
			tenantId = id;
		},
		clearTenantId() {
			tenantId = null;
		},
		getActiveRequestCount() {
			return activeRequestCount;
		},
	};
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function serializeParams(params: QueryParams): Record<string, string> {
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value != null) {
			result[key] = String(value);
		}
	}
	return result;
}

function buildUrl(
	baseUrl: string,
	path: string,
	params?: QueryParams,
): string {
	const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	let url = `${base}${normalizedPath}`;

	if (params && Object.keys(params).length > 0) {
		const qs = new URLSearchParams(serializeParams(params)).toString();
		url += `?${qs}`;
	}

	return url;
}
