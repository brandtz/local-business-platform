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
