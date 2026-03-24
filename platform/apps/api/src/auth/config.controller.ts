import { Controller, Get, Put, Param, Body } from "@nestjs/common";

import {
	getFullModuleRegistry,
	getModuleRegistryEntry,
	isValidModuleKey,
} from "@platform/types";

@Controller("config")
export class ConfigController {
	@Get("modules")
	getModules() {
		return getFullModuleRegistry();
	}

	@Put("modules/:key")
	updateModule(@Param("key") key: string, @Body() body: Record<string, unknown>) {
		if (isValidModuleKey(key)) {
			return getModuleRegistryEntry(key);
		}
		return { key, ...body };
	}

	@Get("global")
	getGlobal() {
		return {
			platformName: "Local Business Platform",
			supportEmail: "support@platform.local",
			maintenanceMode: false,
		};
	}

	@Put("global")
	updateGlobal(@Body() body: Record<string, unknown>) {
		return {
			platformName: "Local Business Platform",
			supportEmail: "support@platform.local",
			maintenanceMode: false,
			...body,
		};
	}
}
