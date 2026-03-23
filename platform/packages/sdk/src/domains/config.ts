import type {
	TenantModuleKey,
	TenantModuleEnablementRecord,
	ModuleRegistryEntry,
} from "@platform/types";
import type { HttpTransport } from "../http-transport";

export type GlobalConfig = {
	platformName: string;
	supportEmail: string;
	maintenanceMode: boolean;
	[key: string]: unknown;
};

export type ConfigApi = {
	getModules(): Promise<ModuleRegistryEntry[]>;
	updateModule(key: TenantModuleKey, params: Partial<TenantModuleEnablementRecord>): Promise<TenantModuleEnablementRecord>;
	getGlobal(): Promise<GlobalConfig>;
	updateGlobal(params: Partial<GlobalConfig>): Promise<GlobalConfig>;
};

export function createConfigApi(transport: HttpTransport): ConfigApi {
	return {
		getModules: () => transport.get("/config/modules"),
		updateModule: (key, params) => transport.put(`/config/modules/${key}`, params),
		getGlobal: () => transport.get("/config/global"),
		updateGlobal: (params) => transport.put("/config/global", params),
	};
}
