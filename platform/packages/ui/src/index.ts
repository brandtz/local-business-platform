import type { AppShellId } from "@platform/types";
import { trimToUndefined } from "@platform/utils";

export const packageName = "@platform/ui";

export type UiShellDescriptor = {
	appId: AppShellId;
	title: string;
};

export function createUiShellDescriptor(
	appId: AppShellId,
	title: string
): UiShellDescriptor {
	return {
		appId,
		title: trimToUndefined(title) || "Untitled Shell"
	};
}

// E4-S1-T1: Shared visual tokens
export * from "./tokens";

// E4-S1-T2: Layout primitives and feedback components
export * from "./primitives";

// E4-S1-T3: Theme override mechanism for tenant branding
export * from "./theme";
