import { Injectable } from "@nestjs/common";

import type {
	AuthActorType,
	PlatformActorRole,
	PlatformCapability
} from "@platform/types";

import { assertPlatformCapability } from "./platform-authorization";

export class PlatformAccessDeniedError extends Error {
	constructor() {
		super("Platform access denied.");
	}
}

export type PlatformAccessRequest = {
	actorType: AuthActorType | null;
	platformRole: PlatformActorRole | null;
	userId: string | null;
};

export type PlatformCapabilityAccessRequest = PlatformAccessRequest & {
	capability: PlatformCapability;
};

@Injectable()
export class PlatformAccessService {
	hasPlatformRole(request: PlatformAccessRequest): boolean {
		return this.resolvePlatformRole(request) !== null;
	}

	requirePlatformRole(request: PlatformAccessRequest): PlatformActorRole {
		const platformRole = this.resolvePlatformRole(request);

		if (!platformRole) {
			throw new PlatformAccessDeniedError();
		}

		return platformRole;
	}

	requirePlatformCapability(
		request: PlatformCapabilityAccessRequest
	): PlatformActorRole {
		const platformRole = this.requirePlatformRole(request);

		try {
			assertPlatformCapability(platformRole, request.capability);
		} catch {
			throw new PlatformAccessDeniedError();
		}

		return platformRole;
	}

	private resolvePlatformRole(
		request: PlatformAccessRequest
	): PlatformActorRole | null {
		if (request.actorType !== "platform" || !request.userId || !request.platformRole) {
			return null;
		}

		return request.platformRole;
	}
}