// Platform Logs Explorer page (PA-10) — terminal-style log viewer with service
// selector, level filtering, search, and auto-scroll. Uses mock data with an
// "Integration Pending" banner until streaming endpoints are available.

import { defineComponent, h, ref, computed, onMounted, onUnmounted, type VNode } from "vue";

// ── Types ────────────────────────────────────────────────────────────────────

type LogLevel = "error" | "warn" | "info" | "debug";

type LogEntry = {
	id: string;
	timestamp: string;
	level: LogLevel;
	service: string;
	message: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const SERVICES = ["API", "Worker", "Scheduler"] as const;
type ServiceKey = (typeof SERVICES)[number];

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];

const VISIBLE_LOG_LIMIT = 200;
const MOCK_INTERVAL_MS = 3_000;

const LEVEL_COLORS: Record<LogLevel, string> = {
	error: "red",
	warn: "yellow",
	info: "blue",
	debug: "gray",
};

const LEVEL_LABELS: Record<LogLevel, string> = {
	error: "ERROR",
	warn: "WARN",
	info: "INFO",
	debug: "DEBUG",
};

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MESSAGES: Record<LogLevel, string[]> = {
	error: [
		"Unhandled exception in request handler: ECONNREFUSED",
		"Database connection pool exhausted — retrying in 5s",
		"Failed to process webhook payload: invalid signature",
		"Redis sentinel failover detected — reconnecting",
	],
	warn: [
		"Slow query detected: SELECT * FROM tenants took 1.2s",
		"Rate limit threshold reached for tenant t-00392",
		"Deprecated API version v1 called by client sdk/2.1.0",
		"Memory usage above 80% threshold",
	],
	info: [
		"HTTP GET /api/health 200 OK (12ms)",
		"Tenant provisioning completed for t-00415",
		"Background job email-digest enqueued successfully",
		"Cache invalidation complete for module:catalog",
		"Deployment v2.14.3 rolled out to production",
		"Worker heartbeat received — all queues healthy",
	],
	debug: [
		"Resolving tenant context for slug: acme-burgers",
		"JWT token validated — sub: usr_8xk2p, exp: 1720000000",
		"Query plan: index scan on tenants_pkey",
		"WebSocket connection opened — client id: ws_a3f9c",
		"Cache HIT for key: tenant:t-00392:config",
	],
};

let mockIdCounter = 0;

function generateMockEntry(service: ServiceKey): LogEntry {
	const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
	const messages = MOCK_MESSAGES[level];
	const message = messages[Math.floor(Math.random() * messages.length)];

	mockIdCounter += 1;
	return {
		id: `log-${mockIdCounter}`,
		timestamp: new Date().toISOString(),
		level,
		service,
		message,
	};
}

function generateInitialLogs(): LogEntry[] {
	const entries: LogEntry[] = [];
	const now = Date.now();

	for (let i = 0; i < 50; i++) {
		const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
		const entry = generateMockEntry(service);
		entry.timestamp = new Date(now - (50 - i) * 2_000).toISOString();
		entries.push(entry);
	}

	return entries;
}

// ── Render helpers ───────────────────────────────────────────────────────────

function renderIntegrationBanner(): VNode {
	return h(
		"div",
		{
			class: "alert alert--info",
			role: "status",
			"data-testid": "integration-pending-banner",
		},
		[
			h("strong", "ℹ Integration Pending: "),
			h(
				"span",
				"Log streaming endpoints are not yet available. Displaying mock data for UI preview.",
			),
		],
	);
}

function renderServiceSelector(
	selected: ServiceKey | "All",
	onSelect: (service: ServiceKey | "All") => void,
): VNode {
	const options: Array<ServiceKey | "All"> = ["All", ...SERVICES];
	return h("div", { class: "logs-filter", "data-testid": "service-selector" }, [
		h("label", { class: "logs-filter__label" }, "Service:"),
		h(
			"select",
			{
				class: "logs-filter__select",
				value: selected,
				"data-testid": "service-select",
				onChange: (e: Event) =>
					onSelect((e.target as HTMLSelectElement).value as ServiceKey | "All"),
			},
			options.map((opt) =>
				h("option", { value: opt, key: opt }, opt),
			),
		),
	]);
}

function renderLevelFilter(
	activeLevels: Set<LogLevel>,
	onToggle: (level: LogLevel) => void,
): VNode {
	return h("div", { class: "logs-filter", "data-testid": "level-filter" }, [
		h("label", { class: "logs-filter__label" }, "Levels:"),
		h(
			"div",
			{ class: "level-toggles" },
			LOG_LEVELS.map((level) =>
				h(
					"button",
					{
						class: [
							"level-toggle",
							`level-toggle--${LEVEL_COLORS[level]}`,
							activeLevels.has(level) ? "level-toggle--active" : "",
						],
						type: "button",
						"data-testid": `level-toggle-${level}`,
						onClick: () => onToggle(level),
					},
					LEVEL_LABELS[level],
				),
			),
		),
	]);
}

function renderSearchInput(
	value: string,
	onInput: (value: string) => void,
): VNode {
	return h("div", { class: "logs-filter", "data-testid": "log-search" }, [
		h("input", {
			class: "logs-filter__input",
			type: "search",
			placeholder: "Search logs…",
			value,
			"data-testid": "log-search-input",
			onInput: (e: Event) => onInput((e.target as HTMLInputElement).value),
		}),
	]);
}

function renderLogLine(entry: LogEntry): VNode {
	const color = LEVEL_COLORS[entry.level];
	const ts = entry.timestamp.replace("T", " ").replace("Z", "");

	return h(
		"div",
		{
			class: `log-line log-line--${color}`,
			key: entry.id,
			"data-testid": "log-line",
		},
		[
			h("span", { class: "log-line__timestamp" }, ts),
			h(
				"span",
				{ class: `log-line__level log-line__level--${color}` },
				`[${LEVEL_LABELS[entry.level]}]`,
			),
			h("span", { class: "log-line__service" }, `[${entry.service}]`),
			h("span", { class: "log-line__message" }, entry.message),
		],
	);
}

function renderLogViewer(entries: LogEntry[]): VNode {
	return h(
		"div",
		{
			class: "log-viewer",
			"data-testid": "log-viewer",
		},
		entries.length === 0
			? [h("p", { class: "log-viewer__empty" }, "No log entries match the current filters.")]
			: entries.map(renderLogLine),
	);
}

function renderAutoScrollControls(
	autoScroll: boolean,
	paused: boolean,
	onToggleScroll: () => void,
	onTogglePause: () => void,
): VNode {
	return h("div", { class: "log-controls", "data-testid": "log-controls" }, [
		h("label", { class: "log-controls__toggle" }, [
			h("input", {
				type: "checkbox",
				checked: autoScroll,
				onChange: onToggleScroll,
				"data-testid": "auto-scroll-checkbox",
			}),
			h("span", " Auto-scroll"),
		]),
		h(
			"button",
			{
				class: `btn ${paused ? "btn--primary" : "btn--secondary"}`,
				type: "button",
				"data-testid": "pause-button",
				onClick: onTogglePause,
			},
			paused ? "▶ Resume" : "⏸ Pause",
		),
	]);
}

function renderLoadingState(): VNode {
	return h(
		"section",
		{
			class: "logs-page logs-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading logs…")],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformLogsPage = defineComponent({
	name: "PlatformLogsPage",

	setup() {
		const loading = ref(true);
		const allLogs = ref<LogEntry[]>([]);

		const selectedService = ref<ServiceKey | "All">("All");
		const activeLevels = ref<Set<LogLevel>>(new Set(LOG_LEVELS));
		const searchQuery = ref("");
		const autoScroll = ref(true);
		const paused = ref(false);

		let mockInterval: ReturnType<typeof setInterval> | null = null;

		// ── Filtered + windowed entries ──────────────────────────────────

		const filteredLogs = computed(() => {
			let entries = allLogs.value;

			if (selectedService.value !== "All") {
				entries = entries.filter((e) => e.service === selectedService.value);
			}

			entries = entries.filter((e) => activeLevels.value.has(e.level));

			const query = searchQuery.value.trim().toLowerCase();
			if (query) {
				entries = entries.filter(
					(e) =>
						e.message.toLowerCase().includes(query) ||
						e.service.toLowerCase().includes(query) ||
						e.level.includes(query),
				);
			}

			// Virtual scrolling hint: only render last N entries
			if (entries.length > VISIBLE_LOG_LIMIT) {
				entries = entries.slice(entries.length - VISIBLE_LOG_LIMIT);
			}

			return entries;
		});

		// ── Mock log stream ─────────────────────────────────────────────

		function appendMockLogs(): void {
			if (paused.value) return;

			const count = Math.floor(Math.random() * 3) + 1;
			const newEntries: LogEntry[] = [];
			for (let i = 0; i < count; i++) {
				const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
				newEntries.push(generateMockEntry(service));
			}

			allLogs.value = [...allLogs.value, ...newEntries];
		}

		function startMockStream(): void {
			stopMockStream();
			mockInterval = setInterval(appendMockLogs, MOCK_INTERVAL_MS);
		}

		function stopMockStream(): void {
			if (mockInterval !== null) {
				clearInterval(mockInterval);
				mockInterval = null;
			}
		}

		// ── Handlers ────────────────────────────────────────────────────

		function handleServiceChange(service: ServiceKey | "All"): void {
			selectedService.value = service;
		}

		function handleLevelToggle(level: LogLevel): void {
			const next = new Set(activeLevels.value);
			if (next.has(level)) {
				next.delete(level);
			} else {
				next.add(level);
			}
			activeLevels.value = next;
		}

		function handleSearchInput(value: string): void {
			searchQuery.value = value;
		}

		function handleToggleAutoScroll(): void {
			autoScroll.value = !autoScroll.value;
		}

		function handleTogglePause(): void {
			paused.value = !paused.value;
		}

		// ── Lifecycle ───────────────────────────────────────────────────

		onMounted(() => {
			allLogs.value = generateInitialLogs();
			loading.value = false;
			startMockStream();
		});

		onUnmounted(() => {
			stopMockStream();
		});

		// ── Render ──────────────────────────────────────────────────────

		return () => {
			if (loading.value) {
				return renderLoadingState();
			}

			return h(
				"section",
				{ class: "logs-page", "data-testid": "platform-logs-page" },
				[
					h("header", { class: "logs-page__header" }, [
						h("h1", "Logs Explorer"),
					]),

					renderIntegrationBanner(),

					h("div", { class: "logs-page__toolbar", "data-testid": "logs-toolbar" }, [
						renderServiceSelector(selectedService.value, handleServiceChange),
						renderLevelFilter(activeLevels.value, handleLevelToggle),
						renderSearchInput(searchQuery.value, handleSearchInput),
						renderAutoScrollControls(
							autoScroll.value,
							paused.value,
							handleToggleAutoScroll,
							handleTogglePause,
						),
					]),

					h("div", { class: "logs-page__stats", "data-testid": "logs-stats" }, [
						h(
							"span",
							`Showing ${filteredLogs.value.length} of ${allLogs.value.length} entries`,
						),
					]),

					renderLogViewer(filteredLogs.value),
				],
			);
		};
	},
});
