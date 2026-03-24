// Platform Domain Management page (PA-06) — lists custom domains with
// verification / SSL status, provides Check DNS, Add Domain, and detail
// expansion per row.

import { defineComponent, h, ref, computed, onMounted, type VNode } from "vue";
import { useSdk } from "../composables/use-sdk";
import type {
	TenantCustomDomainRecord,
	CustomDomainVerificationState,
	CustomDomainPromotionState,
} from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type ActionState = {
	inProgress: string | null;
	error: string | null;
	success: string | null;
};

type AddDomainForm = {
	domain: string;
	tenantId: string;
};

// ── Color helpers ────────────────────────────────────────────────────────────

function verificationColor(state: CustomDomainVerificationState): string {
	switch (state) {
		case "verified":
			return "green";
		case "pending":
			return "yellow";
		case "failed":
			return "red";
		case "denied":
			return "red";
		default:
			return "gray";
	}
}

function promotionColor(state: CustomDomainPromotionState): string {
	switch (state) {
		case "promoted":
			return "green";
		case "ready":
			return "green";
		case "not-requested":
			return "yellow";
		case "failed":
			return "red";
		case "rollback-pending":
			return "yellow";
		case "rolled-back":
			return "orange";
		case "denied":
			return "red";
		default:
			return "gray";
	}
}

function verificationLabel(state: CustomDomainVerificationState): string {
	switch (state) {
		case "verified":
			return "Verified";
		case "pending":
			return "Pending";
		case "failed":
			return "Failed";
		case "denied":
			return "Denied";
		default:
			return state;
	}
}

function sslLabel(state: CustomDomainPromotionState): string {
	switch (state) {
		case "promoted":
			return "Active";
		case "ready":
			return "Ready";
		case "not-requested":
			return "Pending";
		case "failed":
			return "Failed";
		case "rollback-pending":
			return "Rollback Pending";
		case "rolled-back":
			return "Rolled Back";
		case "denied":
			return "Denied";
		default:
			return state;
	}
}

// ── Render helpers ───────────────────────────────────────────────────────────

function renderMetricCard(label: string, value: string | number, testId: string): VNode {
	return h("div", { class: "metric-card", "data-testid": testId }, [
		h("span", { class: "metric-card__value" }, String(value)),
		h("span", { class: "metric-card__label" }, label),
	]);
}

function renderStatsRow(
	total: number,
	active: number,
	pending: number,
	failed: number,
): VNode {
	return h("div", { class: "kpi-row", "data-testid": "domains-stats-row" }, [
		renderMetricCard("Total Domains", total, "metric-total-domains"),
		renderMetricCard("Active", active, "metric-active-domains"),
		renderMetricCard("Pending Verification", pending, "metric-pending-domains"),
		renderMetricCard("Failed", failed, "metric-failed-domains"),
	]);
}

function renderDomainDetailExpansion(domain: TenantCustomDomainRecord): VNode {
	const evidence = domain.verificationEvidence;
	const method = evidence?.method ?? "dns-cname";

	const dnsRecords: { type: string; name: string; value: string }[] = [];
	if (method === "dns-cname" || method === "dns-txt") {
		dnsRecords.push({
			type: method === "dns-cname" ? "CNAME" : "TXT",
			name: domain.hostname,
			value: evidence?.observedValue ?? `platform-verify.${domain.hostname}`,
		});
	}

	return h(
		"tr",
		{ class: "domain-detail-row", "data-testid": `domain-detail-${domain.id}` },
		[
			h("td", { colspan: 5 }, [
				h("div", { class: "domain-detail" }, [
					h("div", { class: "domain-detail__section" }, [
						h("h4", { class: "domain-detail__heading" }, "DNS Records"),
						dnsRecords.length > 0
							? h("table", { class: "domain-detail__dns-table", "data-testid": "dns-records-table" }, [
									h("thead", [
										h("tr", [
											h("th", "Type"),
											h("th", "Name"),
											h("th", "Value"),
										]),
									]),
									h(
										"tbody",
										dnsRecords.map((rec) =>
											h("tr", { key: rec.name }, [
												h("td", rec.type),
												h("td", rec.name),
												h("td", { class: "domain-detail__mono" }, rec.value),
											]),
										),
									),
								])
							: h("p", { class: "domain-detail__empty" }, "No DNS records configured."),
					]),

					h("div", { class: "domain-detail__section" }, [
						h("h4", { class: "domain-detail__heading" }, "SSL / Promotion Status"),
						h("dl", { class: "detail-grid" }, [
							h("dt", "Promotion State"),
							h("dd", [
								h(
									"span",
									{ class: `badge badge--${promotionColor(domain.promotionState)}`, "data-testid": "detail-ssl-badge" },
									sslLabel(domain.promotionState),
								),
							]),
							h("dt", "Promoted At"),
							h("dd", domain.promotedAt ?? "—"),
							...(domain.promotionFailureReason
								? [h("dt", "Failure Reason"), h("dd", { class: "error" }, domain.promotionFailureReason)]
								: []),
						]),
					]),

					h("div", { class: "domain-detail__section" }, [
						h("h4", { class: "domain-detail__heading" }, "Propagation Info"),
						h("dl", { class: "detail-grid" }, [
							h("dt", "Verification Method"),
							h("dd", evidence?.method ?? "—"),
							h("dt", "Last Checked"),
							h("dd", evidence?.checkedAt ?? "—"),
							h("dt", "Verification State Changed"),
							h("dd", domain.verificationStateChangedAt ?? "—"),
							...(domain.verificationFailureReason
								? [h("dt", "Failure Reason"), h("dd", { class: "error" }, domain.verificationFailureReason)]
								: []),
						]),
					]),
				]),
			]),
		],
	);
}

function renderDomainRow(
	domain: TenantCustomDomainRecord,
	expandedId: string | null,
	onToggle: () => void,
	onCheckDns: () => void,
	onDelete: () => void,
	actionInProgress: string | null,
): VNode[] {
	const isExpanded = expandedId === domain.id;
	const nodes: VNode[] = [
		h(
			"tr",
			{
				class: ["domain-row", isExpanded ? "domain-row--expanded" : ""],
				"data-testid": `domain-row-${domain.id}`,
				onClick: onToggle,
				style: { cursor: "pointer" },
			},
			[
				h("td", { "data-testid": "domain-hostname" }, domain.hostname),
				h("td", { "data-testid": "domain-tenant" }, domain.tenantId),
				h("td", [
					h(
						"span",
						{
							class: `badge badge--${verificationColor(domain.verificationState)}`,
							"data-testid": "domain-dns-badge",
						},
						verificationLabel(domain.verificationState),
					),
				]),
				h("td", [
					h(
						"span",
						{
							class: `badge badge--${promotionColor(domain.promotionState)}`,
							"data-testid": "domain-ssl-badge",
						},
						sslLabel(domain.promotionState),
					),
				]),
				h("td", { class: "domain-row__actions" }, [
					h(
						"button",
						{
							class: "btn btn--secondary",
							type: "button",
							disabled: actionInProgress === `verify-${domain.id}`,
							"data-testid": `check-dns-${domain.id}`,
							onClick: (e: Event) => {
								e.stopPropagation();
								onCheckDns();
							},
						},
						actionInProgress === `verify-${domain.id}` ? "Checking…" : "Check DNS",
					),
					h(
						"button",
						{
							class: "btn btn--danger",
							type: "button",
							disabled: !!actionInProgress,
							"data-testid": `delete-domain-${domain.id}`,
							onClick: (e: Event) => {
								e.stopPropagation();
								onDelete();
							},
						},
						actionInProgress === `delete-${domain.id}` ? "Deleting…" : "Delete",
					),
				]),
			],
		),
	];

	if (isExpanded) {
		nodes.push(renderDomainDetailExpansion(domain));
	}

	return nodes;
}

function renderDomainsTable(
	domains: TenantCustomDomainRecord[],
	expandedId: string | null,
	onToggleExpand: (id: string) => void,
	onCheckDns: (id: string) => void,
	onDelete: (id: string) => void,
	actionInProgress: string | null,
): VNode {
	return h("div", { class: "domains-table-section", "data-testid": "domains-table-section" }, [
		h("table", { class: "domains-table", "data-testid": "domains-table" }, [
			h("thead", [
				h("tr", [
					h("th", "Domain"),
					h("th", "Tenant"),
					h("th", "DNS Status"),
					h("th", "SSL Status"),
					h("th", "Actions"),
				]),
			]),
			h(
				"tbody",
				domains.flatMap((domain) =>
					renderDomainRow(
						domain,
						expandedId,
						() => onToggleExpand(domain.id),
						() => onCheckDns(domain.id),
						() => onDelete(domain.id),
						actionInProgress,
					),
				),
			),
		]),
	]);
}

function renderAddDomainModal(
	form: AddDomainForm,
	onUpdateDomain: (value: string) => void,
	onUpdateTenantId: (value: string) => void,
	onSubmit: () => void,
	onCancel: () => void,
	submitting: boolean,
): VNode {
	return h("div", { class: "modal-overlay", "data-testid": "add-domain-modal" }, [
		h("div", { class: "modal-dialog", role: "dialog", "aria-label": "Add Domain" }, [
			h("h2", { class: "modal-dialog__title" }, "Add Domain"),

			h("form", {
				class: "modal-dialog__form",
				onSubmit: (e: Event) => {
					e.preventDefault();
					onSubmit();
				},
			}, [
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "add-domain-name" }, "Domain Name"),
					h("input", {
						id: "add-domain-name",
						class: "form-field__input",
						type: "text",
						placeholder: "e.g. store.example.com",
						value: form.domain,
						required: true,
						"data-testid": "add-domain-input",
						onInput: (e: Event) => onUpdateDomain((e.target as HTMLInputElement).value),
					}),
				]),

				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "add-domain-tenant" }, "Tenant ID"),
					h("input", {
						id: "add-domain-tenant",
						class: "form-field__input",
						type: "text",
						placeholder: "e.g. tenant_abc123",
						value: form.tenantId,
						required: true,
						"data-testid": "add-tenant-input",
						onInput: (e: Event) => onUpdateTenantId((e.target as HTMLInputElement).value),
					}),
				]),

				h("div", { class: "modal-dialog__actions" }, [
					h(
						"button",
						{
							class: "btn btn--secondary",
							type: "button",
							disabled: submitting,
							"data-testid": "add-domain-cancel",
							onClick: onCancel,
						},
						"Cancel",
					),
					h(
						"button",
						{
							class: "btn btn--primary",
							type: "submit",
							disabled: submitting || !form.domain.trim() || !form.tenantId.trim(),
							"data-testid": "add-domain-submit",
						},
						submitting ? "Adding…" : "Add Domain",
					),
				]),
			]),
		]),
	]);
}

function renderLoadingState(): VNode {
	return h(
		"section",
		{
			class: "domains-page domains-page--loading",
			role: "status",
			"aria-live": "polite",
			"data-testid": "loading-state",
		},
		[h("p", "Loading domains…")],
	);
}

function renderErrorState(message: string, onRetry: () => void): VNode {
	return h(
		"section",
		{
			class: "domains-page domains-page--error",
			role: "alert",
			"data-testid": "error-state",
		},
		[
			h("p", { class: "error" }, message),
			h(
				"button",
				{
					class: "btn btn--secondary",
					type: "button",
					"data-testid": "retry-button",
					onClick: onRetry,
				},
				"Retry",
			),
		],
	);
}

function renderEmptyState(): VNode {
	return h(
		"div",
		{
			class: "domains-page__empty",
			"data-testid": "empty-state",
		},
		[h("p", "No custom domains configured yet. Add one to get started.")],
	);
}

// ── Component ────────────────────────────────────────────────────────────────

export const PlatformDomainsPage = defineComponent({
	name: "PlatformDomainsPage",

	setup() {
		const sdk = useSdk();

		// ── State ────────────────────────────────────────────────────

		const loading = ref(true);
		const error = ref<string | null>(null);
		const domains = ref<TenantCustomDomainRecord[]>([]);
		const total = ref(0);

		const expandedDomainId = ref<string | null>(null);
		const showAddModal = ref(false);

		const addForm = ref<AddDomainForm>({ domain: "", tenantId: "" });

		const actionState = ref<ActionState>({
			inProgress: null,
			error: null,
			success: null,
		});

		// ── Computed stats ───────────────────────────────────────────

		const activeCount = computed(
			() => domains.value.filter((d) => d.verificationState === "verified").length,
		);

		const pendingCount = computed(
			() => domains.value.filter((d) => d.verificationState === "pending").length,
		);

		const failedCount = computed(
			() =>
				domains.value.filter(
					(d) => d.verificationState === "failed" || d.verificationState === "denied",
				).length,
		);

		// ── Data fetching ────────────────────────────────────────────

		async function fetchDomains(): Promise<void> {
			loading.value = true;
			error.value = null;

			try {
				const result = await sdk.domains.list();
				domains.value = result.data;
				total.value = result.total;
			} catch (err: unknown) {
				error.value =
					err instanceof Error
						? err.message
						: "Failed to load domains.";
			} finally {
				loading.value = false;
			}
		}

		// ── Actions ──────────────────────────────────────────────────

		function clearActionState(): void {
			actionState.value = { inProgress: null, error: null, success: null };
		}

		async function handleCheckDns(domainId: string): Promise<void> {
			clearActionState();
			actionState.value.inProgress = `verify-${domainId}`;

			try {
				const result = await sdk.domains.verify(domainId);
				const idx = domains.value.findIndex((d) => d.id === domainId);
				if (idx !== -1) {
					domains.value[idx] = result.domain;
				}
				actionState.value = {
					inProgress: null,
					error: null,
					success: `DNS check complete — status: ${result.verificationState}.`,
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "DNS verification failed.",
					success: null,
				};
			}
		}

		async function handleDeleteDomain(domainId: string): Promise<void> {
			clearActionState();
			actionState.value.inProgress = `delete-${domainId}`;

			try {
				await sdk.domains.delete(domainId);
				domains.value = domains.value.filter((d) => d.id !== domainId);
				total.value = domains.value.length;
				if (expandedDomainId.value === domainId) {
					expandedDomainId.value = null;
				}
				actionState.value = {
					inProgress: null,
					error: null,
					success: "Domain deleted successfully.",
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "Failed to delete domain.",
					success: null,
				};
			}
		}

		async function handleAddDomain(): Promise<void> {
			clearActionState();
			actionState.value.inProgress = "add";

			try {
				const created = await sdk.domains.create({
					domain: addForm.value.domain.trim(),
					tenantId: addForm.value.tenantId.trim(),
				});
				domains.value.push(created);
				total.value = domains.value.length;
				addForm.value = { domain: "", tenantId: "" };
				showAddModal.value = false;
				actionState.value = {
					inProgress: null,
					error: null,
					success: `Domain "${created.hostname}" added successfully.`,
				};
			} catch (err: unknown) {
				actionState.value = {
					inProgress: null,
					error: err instanceof Error ? err.message : "Failed to add domain.",
					success: null,
				};
			}
		}

		function toggleExpand(domainId: string): void {
			expandedDomainId.value =
				expandedDomainId.value === domainId ? null : domainId;
		}

		// ── Lifecycle ────────────────────────────────────────────────

		onMounted(() => {
			void fetchDomains();
		});

		// ── Render ───────────────────────────────────────────────────

		return () => {
			if (loading.value) {
				return renderLoadingState();
			}

			if (error.value && domains.value.length === 0) {
				return renderErrorState(error.value, () => void fetchDomains());
			}

			return h(
				"section",
				{ class: "domains-page", "data-testid": "platform-domains-page" },
				[
					h("header", { class: "domains-page__header" }, [
						h("h1", { class: "domains-page__title" }, "Domain Management"),
						h(
							"button",
							{
								class: "btn btn--primary",
								type: "button",
								"data-testid": "add-domain-button",
								onClick: () => {
									addForm.value = { domain: "", tenantId: "" };
									showAddModal.value = true;
								},
							},
							"Add Domain",
						),
					]),

					// Action feedback alerts
					actionState.value.error
						? h(
								"div",
								{ class: "alert alert--error", role: "alert", "data-testid": "action-error" },
								actionState.value.error,
							)
						: null,

					actionState.value.success
						? h(
								"div",
								{ class: "alert alert--success", role: "status", "data-testid": "action-success" },
								actionState.value.success,
							)
						: null,

					// Stats row
					renderStatsRow(
						total.value,
						activeCount.value,
						pendingCount.value,
						failedCount.value,
					),

					// Domain table or empty state
					domains.value.length === 0
						? renderEmptyState()
						: renderDomainsTable(
								domains.value,
								expandedDomainId.value,
								toggleExpand,
								(id: string) => void handleCheckDns(id),
								(id: string) => void handleDeleteDomain(id),
								actionState.value.inProgress,
							),

					// Add Domain modal
					showAddModal.value
						? renderAddDomainModal(
								addForm.value,
								(v: string) => {
									addForm.value.domain = v;
								},
								(v: string) => {
									addForm.value.tenantId = v;
								},
								() => void handleAddDomain(),
								() => {
									showAddModal.value = false;
								},
								actionState.value.inProgress === "add",
							)
						: null,
				],
			);
		};
	},
});
