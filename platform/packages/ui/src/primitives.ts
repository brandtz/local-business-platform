// E4-S1-T2: Reusable layout primitives, feedback components, and form primitives.
// These are TypeScript-level contracts and utility descriptors consumed by app-level
// Vue components. The @platform/ui package stays framework-agnostic at this layer;
// apps use these types to keep component implementations consistent.

// ── Feedback Primitives ──────────────────────────────────────────────────────

export const alertVariants = ["info", "success", "warning", "error"] as const;

export type AlertVariant = (typeof alertVariants)[number];

export type AlertDescriptor = {
	variant: AlertVariant;
	title: string;
	message?: string;
	dismissible: boolean;
};

export function createAlertDescriptor(
	variant: AlertVariant,
	title: string,
	options?: { message?: string; dismissible?: boolean }
): AlertDescriptor {
	return {
		variant,
		title,
		message: options?.message,
		dismissible: options?.dismissible ?? false
	};
}

export type EmptyStateDescriptor = {
	title: string;
	message: string;
	actionLabel?: string;
};

export function createEmptyStateDescriptor(
	title: string,
	message: string,
	actionLabel?: string
): EmptyStateDescriptor {
	return { title, message, actionLabel };
}

// ── Status Banner ────────────────────────────────────────────────────────────

export const bannerIntents = ["info", "warning", "error", "security"] as const;

export type BannerIntent = (typeof bannerIntents)[number];

export type StatusBannerDescriptor = {
	intent: BannerIntent;
	message: string;
	persistent: boolean;
};

export function createStatusBannerDescriptor(
	intent: BannerIntent,
	message: string,
	persistent = false
): StatusBannerDescriptor {
	return { intent, message, persistent };
}

// ── Layout Primitives ────────────────────────────────────────────────────────

export const layoutRegions = [
	"header",
	"sidebar",
	"main",
	"footer"
] as const;

export type LayoutRegion = (typeof layoutRegions)[number];

export type PageLayoutDescriptor = {
	title: string;
	regions: readonly LayoutRegion[];
	fullWidth: boolean;
};

export function createPageLayoutDescriptor(
	title: string,
	options?: { regions?: LayoutRegion[]; fullWidth?: boolean }
): PageLayoutDescriptor {
	return {
		title,
		regions: options?.regions ?? ["header", "main", "footer"],
		fullWidth: options?.fullWidth ?? false
	};
}

export const stackDirections = ["vertical", "horizontal"] as const;

export type StackDirection = (typeof stackDirections)[number];

export type StackDescriptor = {
	direction: StackDirection;
	gap: string;
};

export function createStackDescriptor(
	direction: StackDirection = "vertical",
	gap = "1rem"
): StackDescriptor {
	return { direction, gap };
}

// ── Shell State Descriptors ──────────────────────────────────────────────────

export const shellStates = [
	"loading",
	"ready",
	"error",
	"empty",
	"access-denied",
	"auth-required",
	"suspended"
] as const;

export type ShellState = (typeof shellStates)[number];

export type ShellStateDescriptor = {
	state: ShellState;
	title: string;
	message: string;
};

const defaultShellStateMessages: Record<ShellState, { title: string; message: string }> = {
	loading: {
		title: "Loading",
		message: "Please wait while we prepare your experience."
	},
	ready: {
		title: "Ready",
		message: "Application is ready."
	},
	error: {
		title: "Something Went Wrong",
		message: "An unexpected error occurred. Please try again."
	},
	empty: {
		title: "Nothing Here Yet",
		message: "This section has no content to display."
	},
	"access-denied": {
		title: "Access Denied",
		message: "You do not have permission to view this page."
	},
	"auth-required": {
		title: "Authentication Required",
		message: "Please sign in to continue."
	},
	suspended: {
		title: "Account Suspended",
		message: "This account has been suspended. Please contact support."
	}
};

export function resolveShellStateDescriptor(
	state: ShellState,
	overrides?: { title?: string; message?: string }
): ShellStateDescriptor {
	const defaults = defaultShellStateMessages[state];

	return {
		state,
		title: overrides?.title ?? defaults.title,
		message: overrides?.message ?? defaults.message
	};
}

export function getDefaultShellStateMessage(state: ShellState): { title: string; message: string } {
	return { ...defaultShellStateMessages[state] };
}
