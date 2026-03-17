export const packageName = "@platform/config";

export const configExports = ["eslint", "prettier", "vitest"] as const;

export const workspaceTaskNames = [
	"dev",
	"dev:customer",
	"dev:admin",
	"dev:platform",
	"dev:api",
	"dev:worker",
	"start:api",
	"start:worker",
	"preview:customer",
	"preview:admin",
	"preview:platform",
	"lint",
	"test",
	"typecheck",
	"build"
] as const;

export type WorkspaceTaskName = (typeof workspaceTaskNames)[number];

export const workspaceDependencyRules = {
	"@platform/config": [],
	"@platform/types": [],
	"@platform/utils": ["@platform/types"],
	"@platform/ui": ["@platform/types", "@platform/utils"],
	"@platform/sdk": ["@platform/types", "@platform/utils"],
	"@platform/api": [
		"@platform/config",
		"@platform/types",
		"@platform/utils",
		"@platform/sdk"
	],
	"@platform/worker": [
		"@platform/config",
		"@platform/types",
		"@platform/utils",
		"@platform/sdk"
	],
	"@platform/web-customer": [
		"@platform/config",
		"@platform/types",
		"@platform/utils",
		"@platform/ui",
		"@platform/sdk"
	],
	"@platform/web-admin": [
		"@platform/config",
		"@platform/types",
		"@platform/utils",
		"@platform/ui",
		"@platform/sdk"
	],
	"@platform/web-platform-admin": [
		"@platform/config",
		"@platform/types",
		"@platform/utils",
		"@platform/ui",
		"@platform/sdk"
	]
} as const;

export type WorkspacePackageName = keyof typeof workspaceDependencyRules;
