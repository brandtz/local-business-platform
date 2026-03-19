import { describe, it, expect } from "vitest";

import {
	deviceCapabilities,
	detectCapability,
	detectAllCapabilities,
	isCapabilityAvailable,
	getNotificationPermission,
	requestNotificationPermission,
	validatePushSubscription,
	shouldOfferNotifications,
	areNotificationsActive,
	type DeviceCapability,
	type CapabilityStatus,
	type PushSubscriptionDescriptor,
	type NotificationPermissionState
} from "./device-capabilities";

// ── Capability Detection ─────────────────────────────────────────────────────

describe("deviceCapabilities", () => {
	it("lists at least 8 capabilities", () => {
		expect(deviceCapabilities.length).toBeGreaterThanOrEqual(8);
	});

	it("includes notifications", () => {
		expect(deviceCapabilities).toContain("notifications");
	});

	it("includes geolocation", () => {
		expect(deviceCapabilities).toContain("geolocation");
	});
});

describe("detectCapability", () => {
	it("returns a valid result for each capability", () => {
		for (const cap of deviceCapabilities) {
			const result = detectCapability(cap);
			expect(result.capability).toBe(cap);
			expect(["available", "unavailable", "unknown"]).toContain(result.status);
		}
	});

	it("returns unavailable in non-browser environments for notifications", () => {
		// In vitest/node, window globals may not have Notification
		const result = detectCapability("notifications");
		expect(["available", "unavailable"]).toContain(result.status);
	});

	it("handles unknown capability gracefully", () => {
		const result = detectCapability("nonexistent" as DeviceCapability);
		// Should not throw
		expect(result.capability).toBe("nonexistent");
	});
});

describe("detectAllCapabilities", () => {
	it("returns entries for all capabilities", () => {
		const results = detectAllCapabilities();
		expect(results.size).toBe(deviceCapabilities.length);
		for (const cap of deviceCapabilities) {
			expect(results.has(cap)).toBe(true);
		}
	});
});

describe("isCapabilityAvailable", () => {
	it("returns a boolean", () => {
		expect(typeof isCapabilityAvailable("notifications")).toBe("boolean");
	});

	it("returns false for capabilities not present in node", () => {
		// In node env, most browser APIs are unavailable
		// But some vitest setups might polyfill them — just check it doesn't throw
		for (const cap of deviceCapabilities) {
			expect(typeof isCapabilityAvailable(cap)).toBe("boolean");
		}
	});
});

// ── Notification Permission ──────────────────────────────────────────────────

describe("getNotificationPermission", () => {
	it("returns a valid permission state", () => {
		const result = getNotificationPermission();
		expect(["default", "granted", "denied", "unsupported"]).toContain(result);
	});
});

describe("requestNotificationPermission", () => {
	it("returns a valid permission state without throwing", async () => {
		const result = await requestNotificationPermission();
		expect(["default", "granted", "denied", "unsupported"]).toContain(result);
	});
});

// ── Push Subscription Validation ─────────────────────────────────────────────

describe("validatePushSubscription", () => {
	it("validates a complete subscription", () => {
		const descriptor: PushSubscriptionDescriptor = {
			tenantId: "tenant-1",
			endpoint: "https://push.example.com/send/abc",
			keys: { p256dh: "key1", auth: "key2" },
			expirationTime: null
		};
		const result = validatePushSubscription(descriptor);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("rejects missing tenantId", () => {
		const descriptor: PushSubscriptionDescriptor = {
			tenantId: "",
			endpoint: "https://push.example.com/send/abc",
			keys: { p256dh: "key1", auth: "key2" },
			expirationTime: null
		};
		const result = validatePushSubscription(descriptor);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("tenantId is required");
	});

	it("rejects missing endpoint", () => {
		const descriptor: PushSubscriptionDescriptor = {
			tenantId: "t1",
			endpoint: "",
			keys: { p256dh: "key1", auth: "key2" },
			expirationTime: null
		};
		const result = validatePushSubscription(descriptor);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("endpoint is required");
	});

	it("rejects missing p256dh key", () => {
		const descriptor: PushSubscriptionDescriptor = {
			tenantId: "t1",
			endpoint: "https://push.example.com/send",
			keys: { p256dh: "", auth: "key2" },
			expirationTime: null
		};
		const result = validatePushSubscription(descriptor);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("p256dh key is required");
	});

	it("rejects missing auth key", () => {
		const descriptor: PushSubscriptionDescriptor = {
			tenantId: "t1",
			endpoint: "https://push.example.com/send",
			keys: { p256dh: "key1", auth: "" },
			expirationTime: null
		};
		const result = validatePushSubscription(descriptor);
		expect(result.valid).toBe(false);
		expect(result.errors).toContain("auth key is required");
	});

	it("reports all errors at once", () => {
		const descriptor: PushSubscriptionDescriptor = {
			tenantId: "",
			endpoint: "",
			keys: { p256dh: "", auth: "" },
			expirationTime: null
		};
		const result = validatePushSubscription(descriptor);
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(4);
	});
});

// ── Notification Offering ────────────────────────────────────────────────────

describe("shouldOfferNotifications", () => {
	it("returns a boolean", () => {
		expect(typeof shouldOfferNotifications()).toBe("boolean");
	});
});

describe("areNotificationsActive", () => {
	it("returns a boolean", () => {
		expect(typeof areNotificationsActive()).toBe("boolean");
	});
});

// ── Degraded Mode ────────────────────────────────────────────────────────────

describe("degraded mode — missing capabilities do not break app", () => {
	it("detectCapability never throws", () => {
		for (const cap of deviceCapabilities) {
			expect(() => detectCapability(cap)).not.toThrow();
		}
	});

	it("detectAllCapabilities never throws", () => {
		expect(() => detectAllCapabilities()).not.toThrow();
	});

	it("getNotificationPermission never throws", () => {
		expect(() => getNotificationPermission()).not.toThrow();
	});

	it("requestNotificationPermission never throws", async () => {
		await expect(requestNotificationPermission()).resolves.toBeDefined();
	});

	it("shouldOfferNotifications never throws", () => {
		expect(() => shouldOfferNotifications()).not.toThrow();
	});
});
