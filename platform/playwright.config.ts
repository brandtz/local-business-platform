import { createRequire } from "node:module";
import path from "node:path";

import { defineConfig } from "@playwright/test";

const require = createRequire(import.meta.url);
const VITE_CLI_PATH = path.resolve(
	path.dirname(require.resolve("vite/package.json")),
	"bin",
	"vite.js"
);

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