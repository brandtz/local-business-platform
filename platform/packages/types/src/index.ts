export const packageName = "@platform/types";

export * from "./auth";
export * from "./booking";
export * from "./cart";
export * from "./catalog";
export * from "./content";
export * from "./domain-events";
export * from "./service";
export * from "./staff";
export * from "./vertical";

export const appShellIds = [
	"api",
	"worker",
	"web-customer",
	"web-admin",
	"web-platform-admin"
] as const;

export type AppShellId = (typeof appShellIds)[number];

export const sharedPackageNames = [
	"@platform/config",
	"@platform/types",
	"@platform/ui",
	"@platform/utils",
	"@platform/sdk"
] as const;

export type SharedPackageName = (typeof sharedPackageNames)[number];
