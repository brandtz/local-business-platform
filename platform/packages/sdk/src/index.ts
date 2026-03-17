import type { AppShellId } from "@platform/types";
import { trimToUndefined } from "@platform/utils";

export const packageName = "@platform/sdk";

export type SdkClientDescriptor = {
	name: AppShellId | "platform-admin";
	transport: "http";
};

export function createSdkClientDescriptor(
	name: SdkClientDescriptor["name"]
): SdkClientDescriptor {
	return {
		name: (trimToUndefined(name) || "web-customer") as SdkClientDescriptor["name"],
		transport: "http"
	};
}

// E4-S6-T1: Shared API client conventions and error boundary patterns
export * from "./api-client";
