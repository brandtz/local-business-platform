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
	name: "WebCustomerShell",
	setup() {
		return () =>
			h("div", { class: "app-shell" }, [
				h("header", [
					h("h1", runtimeConfig.appTitle),
					h("p", "Tenant storefront and customer account shell")
				]),
				h("nav", [
					h(RouterLink, { to: "/" }, { default: () => "Home" }),
					" | ",
					h(RouterLink, { to: "/status" }, { default: () => "Status" })
				]),
				h("main", [h(RouterView)])
			]);
	}
});

createApp(AppShell).use(router).mount("#app");
