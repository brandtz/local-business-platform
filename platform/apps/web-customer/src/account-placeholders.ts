// E4-S4-T3: Placeholder page components and mount point interfaces for
// orders, bookings, loyalty, and preferences account sections.
// Mount point interfaces define what each domain module must provide when it
// replaces the placeholder. These are public contracts consumed by E7 commerce
// modules and E6 domain modules.
// Security: module-gated sections check tenant module enablement via the
// tenant context, never global flags.

import { defineComponent, h, type Component, type VNode } from "vue";

import type { TenantModuleKey } from "@platform/types";
import type { EmptyStateDescriptor } from "@platform/ui";

import { getAccountEmptyState, type AccountEmptyStateDescriptor } from "./account-shell";
import type { TenantFrontendContext } from "./tenant-bootstrap";
import { isTenantModuleEnabled } from "./tenant-context-consumer";

// ── Mount Point Interfaces ───────────────────────────────────────────────────
// Each account section defines a mount point that domain modules satisfy.
// When a module replaces the placeholder, it provides a component matching
// the corresponding mount point interface.

export type OrdersMountPoint = {
	readonly sectionKey: "orders";
	readonly listComponent: Component;
	readonly detailComponent: Component;
	readonly emptyState: EmptyStateDescriptor;
};

export type BookingsMountPoint = {
	readonly sectionKey: "bookings";
	readonly listComponent: Component;
	readonly detailComponent: Component;
	readonly emptyState: EmptyStateDescriptor;
};

export type AddressesMountPoint = {
	readonly sectionKey: "addresses";
	readonly listComponent: Component;
	readonly formComponent: Component;
	readonly emptyState: EmptyStateDescriptor;
};

export type PaymentMethodsMountPoint = {
	readonly sectionKey: "payment-methods";
	readonly listComponent: Component;
	readonly emptyState: EmptyStateDescriptor;
};

export type LoyaltyMountPoint = {
	readonly sectionKey: "loyalty";
	readonly dashboardComponent: Component;
	readonly emptyState: EmptyStateDescriptor;
};

export type NotificationsMountPoint = {
	readonly sectionKey: "notifications";
	readonly formComponent: Component;
};

export type PreferencesMountPoint = {
	readonly sectionKey: "preferences";
	readonly formComponent: Component;
};

export type AccountMountPoint =
	| OrdersMountPoint
	| BookingsMountPoint
	| AddressesMountPoint
	| PaymentMethodsMountPoint
	| LoyaltyMountPoint
	| NotificationsMountPoint
	| PreferencesMountPoint;

export type AccountMountPointMap = {
	orders?: OrdersMountPoint;
	bookings?: BookingsMountPoint;
	addresses?: AddressesMountPoint;
	"payment-methods"?: PaymentMethodsMountPoint;
	loyalty?: LoyaltyMountPoint;
	notifications?: NotificationsMountPoint;
	preferences?: PreferencesMountPoint;
};

// ── Mount Point Registry ─────────────────────────────────────────────────────

const mountPointRegistry: AccountMountPointMap = {};

export function registerAccountMountPoint<K extends keyof AccountMountPointMap>(
	key: K,
	mountPoint: NonNullable<AccountMountPointMap[K]>
): void {
	(mountPointRegistry as Record<string, unknown>)[key] = mountPoint;
}

export function getAccountMountPoint<K extends keyof AccountMountPointMap>(
	key: K
): AccountMountPointMap[K] | undefined {
	return mountPointRegistry[key];
}

export function getRegisteredMountPointKeys(): (keyof AccountMountPointMap)[] {
	return Object.keys(mountPointRegistry) as (keyof AccountMountPointMap)[];
}

export function clearAccountMountPoints(): void {
	for (const key of Object.keys(mountPointRegistry)) {
		delete (mountPointRegistry as Record<string, unknown>)[key];
	}
}

// ── Module-Gated Section Descriptor ──────────────────────────────────────────

export type AccountSectionDescriptor = {
	readonly key: string;
	readonly label: string;
	readonly requiredModule?: TenantModuleKey;
};

export const accountSections: readonly AccountSectionDescriptor[] = [
	{ key: "orders", label: "Orders", requiredModule: "ordering" },
	{ key: "bookings", label: "Bookings", requiredModule: "bookings" },
	{ key: "addresses", label: "Saved Addresses" },
	{ key: "payment-methods", label: "Payment Methods" },
	{ key: "loyalty", label: "Loyalty" },
	{ key: "notifications", label: "Notifications" },
	{ key: "preferences", label: "Preferences" }
];

// ── Module Availability Check ────────────────────────────────────────────────

export type SectionAvailability =
	| { available: true }
	| { available: false; reason: "module-disabled" };

export function checkSectionAvailability(
	section: AccountSectionDescriptor,
	context: TenantFrontendContext
): SectionAvailability {
	if (section.requiredModule && !isTenantModuleEnabled(context, section.requiredModule)) {
		return { available: false, reason: "module-disabled" };
	}
	return { available: true };
}

export function getAvailableSections(
	context: TenantFrontendContext
): readonly AccountSectionDescriptor[] {
	return accountSections.filter(
		(s) => checkSectionAvailability(s, context).available
	);
}

// ── Placeholder Components ───────────────────────────────────────────────────

function renderEmptyState(emptyState: AccountEmptyStateDescriptor): VNode {
	const children: VNode[] = [
		h("h3", { class: "placeholder-title" }, emptyState.title),
		h("p", { class: "placeholder-message" }, emptyState.message)
	];
	if (emptyState.actionLabel) {
		children.push(
			h(
				"a",
				{
					class: "placeholder-action",
					href: emptyState.actionPath ?? "#"
				},
				emptyState.actionLabel
			)
		);
	}
	return h("div", { class: "placeholder-empty-state" }, children);
}

function renderModuleDisabled(section: AccountSectionDescriptor): VNode {
	return h("div", { class: "section-unavailable", "data-section": section.key }, [
		h("h3", "Section Unavailable"),
		h("p", `The ${section.label} section is not available for this business.`)
	]);
}

export function createPlaceholderPage(
	section: AccountSectionDescriptor,
	context: TenantFrontendContext
): Component {
	return defineComponent({
		name: `${section.label}Placeholder`,
		setup() {
			const availability = checkSectionAvailability(section, context);

			return () => {
				if (!availability.available) {
					return renderModuleDisabled(section);
				}

				const mountPoint = getAccountMountPoint(
					section.key as keyof AccountMountPointMap
				);

				if (mountPoint) {
					// A domain module has registered — defer to its component
					if ("listComponent" in mountPoint) {
						return h(mountPoint.listComponent);
					}
					if ("dashboardComponent" in mountPoint) {
						return h(mountPoint.dashboardComponent);
					}
					if ("formComponent" in mountPoint) {
						return h(mountPoint.formComponent);
					}
				}

				// Default placeholder with empty state
				const emptyState = getAccountEmptyState(section.key);
				return h("section", { class: "account-placeholder", "data-section": section.key }, [
					h("h2", section.label),
					emptyState
						? renderEmptyState(emptyState)
						: h("p", `${section.label} content will be available here.`)
				]);
			};
		}
	});
}

/**
 * Creates all placeholder pages for account sections, each with module gating.
 */
export function createAllPlaceholderPages(
	context: TenantFrontendContext
): Record<string, Component> {
	const pages: Record<string, Component> = {};
	for (const section of accountSections) {
		pages[section.key] = createPlaceholderPage(section, context);
	}
	return pages;
}
