export const packageName = "@platform/types";

export * from "./auth";

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
