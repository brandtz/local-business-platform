import { defineConfig } from "@playwright/test";

const VITE_CLI_PATH =
	"../../node_modules/.pnpm/vite@8.0.0_@types+node@25.5.0_esbuild@0.27.4_tsx@4.21.0_yaml@2.8.2/node_modules/vite/bin/vite.js";

function createWebServer(cwd: string, port: number) {
	return {
		command: `npx -y node@22.14.0 ${VITE_CLI_PATH} --host 127.0.0.1 --port ${port}`,
		cwd,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		url: `http://127.0.0.1:${port}/status`
	};
}

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	timeout: 30_000,
	expect: {
		timeout: 5_000
	},
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		headless: true,
		screenshot: "only-on-failure",
		trace: "on-first-retry",
		video: "retain-on-failure"
	},
	webServer: [
		createWebServer("./apps/web-admin", 4173),
		createWebServer("./apps/web-platform-admin", 4174),
		createWebServer("./apps/web-customer", 4175)
	],
	projects: [
		{
			name: "web-customer-smoke",
			testMatch: /web-customer\.spec\.ts/
		},
		{
			name: "web-admin-smoke",
			testMatch: /web-admin\.spec\.ts/
		},
		{
			name: "web-platform-admin-smoke",
			testMatch: /web-platform-admin\.spec\.ts/
		}
	]
});