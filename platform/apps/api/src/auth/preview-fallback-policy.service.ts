import { Injectable } from "@nestjs/common";

import type {
	PreviewRouteUnresolvedReason
} from "./preview-route-resolution.service";

import type {
	PreviewRouteResolutionResult
} from "./preview-route-resolution.service";

export const previewFallbackKinds = [
	"no-host",
	"no-matching-domain",
	"tenant-not-found",
	"tenant-not-accessible"
] as const;

export type PreviewFallbackKind = (typeof previewFallbackKinds)[number];

export type PreviewFallbackResponse = {
	httpStatus: number;
	kind: PreviewFallbackKind;
	retryable: boolean;
	safeMessage: string;
};

const fallbackResponses: Record<PreviewRouteUnresolvedReason, PreviewFallbackResponse> = {
	"no-host": {
		httpStatus: 400,
		kind: "no-host",
		retryable: false,
		safeMessage: "The request did not include a valid host."
	},
	"no-matching-domain": {
		httpStatus: 404,
		kind: "no-matching-domain",
		retryable: false,
		safeMessage: "The requested preview environment could not be found."
	},
	"tenant-not-found": {
		httpStatus: 404,
		kind: "tenant-not-found",
		retryable: false,
		safeMessage: "The requested preview environment could not be found."
	},
	"tenant-not-accessible": {
		httpStatus: 403,
		kind: "tenant-not-accessible",
		retryable: false,
		safeMessage: "This preview environment is not currently available."
	}
};

@Injectable()
export class PreviewFallbackPolicyService {
	getFallbackForUnresolvedRoute(
		reason: PreviewRouteUnresolvedReason
	): PreviewFallbackResponse {
		return fallbackResponses[reason];
	}

	getFallbackForResolution(
		result: PreviewRouteResolutionResult
	): PreviewFallbackResponse | null {
		if (result.kind === "resolved") {
			return null;
		}

		return this.getFallbackForUnresolvedRoute(result.reason);
	}

	isRetryable(reason: PreviewRouteUnresolvedReason): boolean {
		return fallbackResponses[reason].retryable;
	}
}
