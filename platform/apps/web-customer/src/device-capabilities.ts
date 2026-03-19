// E4-S5-T3: Push notification registration hooks and device capability
// abstraction layer. Detects notification support, geolocation, camera/media
// access without coupling to specific APIs. Follows progressive enhancement.
// Security: notification subscriptions are tenant-scoped; a subscription for
// one tenant must not receive notifications from another.

import type { TenantFrontendContext } from "./tenant-bootstrap";

// ── Device Capabilities ──────────────────────────────────────────────────────

export const deviceCapabilities = [
	"notifications",
	"geolocation",
	"camera",
	"microphone",
	"vibration",
	"share",
	"clipboard",
	"storage-persist"
] as const;

export type DeviceCapability = (typeof deviceCapabilities)[number];

export type CapabilityStatus = "available" | "unavailable" | "unknown";

export type CapabilityDetectionResult = {
	readonly capability: DeviceCapability;
	readonly status: CapabilityStatus;
};

/**
 * Detects whether a device capability is available in the current environment.
 * Returns "unavailable" for server-side or unsupported environments.
 */
export function detectCapability(capability: DeviceCapability): CapabilityDetectionResult {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return { capability, status: "unavailable" };
	}

	switch (capability) {
		case "notifications":
			return {
				capability,
				status: "Notification" in window ? "available" : "unavailable"
			};
		case "geolocation":
			return {
				capability,
				status: "geolocation" in navigator ? "available" : "unavailable"
			};
		case "camera":
		case "microphone":
			return {
				capability,
				status: "mediaDevices" in navigator ? "available" : "unavailable"
			};
		case "vibration":
			return {
				capability,
				status: "vibrate" in navigator ? "available" : "unavailable"
			};
		case "share":
			return {
				capability,
				status: "share" in navigator ? "available" : "unavailable"
			};
		case "clipboard":
			return {
				capability,
				status: "clipboard" in navigator ? "available" : "unavailable"
			};
		case "storage-persist":
			return {
				capability,
				status: navigator.storage && "persist" in navigator.storage
					? "available"
					: "unavailable"
			};
		default:
			return { capability, status: "unknown" };
	}
}

/**
 * Detects all capabilities at once and returns a map.
 */
export function detectAllCapabilities(): Map<DeviceCapability, CapabilityStatus> {
	const results = new Map<DeviceCapability, CapabilityStatus>();
	for (const cap of deviceCapabilities) {
		results.set(cap, detectCapability(cap).status);
	}
	return results;
}

/**
 * Returns true if the capability is available.
 */
export function isCapabilityAvailable(capability: DeviceCapability): boolean {
	return detectCapability(capability).status === "available";
}

// ── Notification Permission ──────────────────────────────────────────────────

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

/**
 * Gets the current notification permission state without prompting.
 */
export function getNotificationPermission(): NotificationPermissionState {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return "unsupported";
	}
	return Notification.permission as NotificationPermissionState;
}

/**
 * Requests notification permission from the user. Returns the resulting
 * permission state. Follows progressive enhancement — if unsupported,
 * returns "unsupported" without throwing.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return "unsupported";
	}

	try {
		const result = await Notification.requestPermission();
		return result as NotificationPermissionState;
	} catch {
		return "denied";
	}
}

// ── Push Subscription ────────────────────────────────────────────────────────

export type PushSubscriptionDescriptor = {
	readonly tenantId: string;
	readonly endpoint: string;
	readonly keys: {
		readonly p256dh: string;
		readonly auth: string;
	};
	readonly expirationTime: number | null;
};

/**
 * Creates a tenant-scoped push subscription descriptor from a browser
 * PushSubscription. The tenantId ensures subscriptions are never shared
 * across tenants.
 */
export function createPushSubscriptionDescriptor(
	subscription: PushSubscription,
	context: TenantFrontendContext
): PushSubscriptionDescriptor {
	const keys = subscription.toJSON().keys ?? {};
	return {
		tenantId: context.tenantId,
		endpoint: subscription.endpoint,
		keys: {
			p256dh: keys.p256dh ?? "",
			auth: keys.auth ?? ""
		},
		expirationTime: subscription.expirationTime
	};
}

/**
 * Validates that a PushSubscriptionDescriptor has the required fields
 * for backend delivery.
 */
export function validatePushSubscription(
	descriptor: PushSubscriptionDescriptor
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	if (!descriptor.tenantId) errors.push("tenantId is required");
	if (!descriptor.endpoint) errors.push("endpoint is required");
	if (!descriptor.keys.p256dh) errors.push("p256dh key is required");
	if (!descriptor.keys.auth) errors.push("auth key is required");

	return { valid: errors.length === 0, errors };
}

// ── Notification Registration Hook ───────────────────────────────────────────

export type NotificationRegistrationResult =
	| { state: "unsupported" }
	| { state: "permission-denied" }
	| { state: "subscribed"; descriptor: PushSubscriptionDescriptor }
	| { state: "error"; error: string };

/**
 * Returns whether the notification registration flow should be offered
 * to the user. Only true if notifications are supported and permission
 * is not yet denied.
 */
export function shouldOfferNotifications(): boolean {
	const permission = getNotificationPermission();
	return permission === "default" || permission === "granted";
}

/**
 * Returns whether notifications are fully active (permission granted and
 * capability available).
 */
export function areNotificationsActive(): boolean {
	return getNotificationPermission() === "granted" && isCapabilityAvailable("notifications");
}
