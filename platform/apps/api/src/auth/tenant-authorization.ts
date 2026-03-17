import type { TenantActorRole } from "@platform/types";

export const tenantCapabilities = [
	"tenant:manage",
	"catalog:write",
	"orders:manage",
	"staff:manage",
	"content:publish"
] as const;

export type TenantCapability = (typeof tenantCapabilities)[number];

const tenantRoleCapabilityMap: Record<TenantActorRole, readonly TenantCapability[]> = {
	owner: [
		"tenant:manage",
		"catalog:write",
		"orders:manage",
		"staff:manage",
		"content:publish"
	],
	admin: ["catalog:write", "orders:manage", "staff:manage", "content:publish"],
	manager: ["catalog:write", "orders:manage", "content:publish"],
	staff: ["orders:manage"]
};

export function getTenantRoleCapabilities(role: TenantActorRole): readonly TenantCapability[] {
	return tenantRoleCapabilityMap[role];
}

export function hasTenantCapability(
	role: TenantActorRole,
	capability: TenantCapability
): boolean {
	return tenantRoleCapabilityMap[role].includes(capability);
}

export function assertTenantCapability(
	role: TenantActorRole,
	capability: TenantCapability
): void {
	if (!hasTenantCapability(role, capability)) {
		throw new Error(`Tenant role ${role} does not allow ${capability}.`);
	}
}
