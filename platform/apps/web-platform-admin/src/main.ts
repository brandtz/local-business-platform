import { createApp, defineComponent, h } from "vue";
import { createRouter, createWebHistory, RouterLink, RouterView } from "vue-router";

import { createRoutes } from "./routes";
import { getRuntimeConfig } from "./runtime-config";

const runtimeConfig = getRuntimeConfig();

document.title = runtimeConfig.appTitle;

const router = createRouter({
	history: createWebHistory(),
	routes: createRoutes(runtimeConfig)
});

const AppShell = defineComponent({
	name: "WebPlatformAdminShell",
	setup() {
		return () =>
			h("div", { class: "app-shell" }, [
				h("header", [
					h("h1", runtimeConfig.appTitle),
					h("p", "Platform operator control plane shell")
				]),
				h("nav", [
					h(RouterLink, { to: "/" }, { default: () => "Overview" }),
					" | ",
					h(RouterLink, { to: "/tenants" }, { default: () => "Tenants" }),
					" | ",
					h(RouterLink, { to: "/status" }, { default: () => "Status" })
				]),
				h("main", [h(RouterView)])
			]);
	}
});

createApp(AppShell).use(router).mount("#app");
