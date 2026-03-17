import type { PlatformActorRole, PlatformCapability } from "@platform/types";

export const platformRoleCapabilityMap: Record<PlatformActorRole, readonly PlatformCapability[]> = {
	owner: [
		"platform:manage",
		"tenants:read",
		"tenants:write",
		"domains:manage",
		"impersonation:manage",
		"analytics:read"
	],
	admin: ["tenants:read", "tenants:write", "domains:manage", "analytics:read"],
	support: ["tenants:read", "impersonation:manage"],
	analyst: ["tenants:read", "analytics:read"]
};

export function getPlatformRoleCapabilities(
	role: PlatformActorRole
): readonly PlatformCapability[] {
	return platformRoleCapabilityMap[role];
}

export function hasPlatformCapability(
	role: PlatformActorRole,
	capability: PlatformCapability
): boolean {
	return platformRoleCapabilityMap[role].includes(capability);
}

export function assertPlatformCapability(
	role: PlatformActorRole,
	capability: PlatformCapability
): void {
	if (!hasPlatformCapability(role, capability)) {
		throw new Error(`Platform role ${role} does not allow ${capability}.`);
	}
}
