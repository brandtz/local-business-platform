// E13-S7-T6: Staff Management page — staff CardGrid, invite modal,
// staff detail panel with schedule, assigned services, and metrics.

import { defineComponent, h, onMounted, ref } from "vue";
import { useSdk } from "../composables/use-sdk";
import type { StaffProfileRecord, StaffScheduleWindowRecord } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type StaffCardData = {
	id: string;
	name: string;
	email: string;
	phone: string;
	role: string;
	status: string;
	photoUrl: string | null;
	isBookable: boolean;
};

type StaffDetailData = {
	profile: StaffProfileRecord;
	schedule: StaffScheduleWindowRecord[];
};

type InviteFormData = {
	email: string;
	name: string;
	role: string;
};

type StaffPageState = {
	detailLoading: boolean;
	error: string | null;
	inviteForm: InviteFormData;
	isLoading: boolean;
	isSaving: boolean;
	selectedStaff: StaffDetailData | null;
	showInviteModal: boolean;
	showPanel: boolean;
	staff: StaffCardData[];
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderStaffGrid(
	staff: StaffCardData[],
	onCardClick: (id: string) => void,
) {
	if (staff.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "staff-empty" }, [
			h("p", "No staff members yet."),
		]);
	}

	return h("div", { class: "card-grid", "data-testid": "staff-grid" },
		staff.map((s) =>
			h("div", {
				class: "staff-card",
				key: s.id,
				"data-testid": `staff-card-${s.id}`,
				onClick: () => onCardClick(s.id),
			}, [
				h("div", { class: "staff-card__avatar" },
					s.photoUrl
						? h("img", { src: s.photoUrl, alt: s.name, class: "avatar" })
						: h("div", { class: "avatar avatar--placeholder" }, s.name.charAt(0).toUpperCase()),
				),
				h("div", { class: "staff-card__info" }, [
					h("span", { class: "staff-card__name", "data-testid": "staff-name" }, s.name),
					h("span", { class: "staff-card__role", "data-testid": "staff-role" }, s.role || "Staff"),
					h("span", {
						class: `badge ${s.status === "active" ? "badge-success" : "badge-neutral"}`,
						"data-testid": "staff-status",
					}, s.status === "active" ? "Active" : "Inactive"),
				]),
			]),
		),
	);
}

function renderInviteModal(
	show: boolean,
	form: InviteFormData,
	onFieldChange: (field: keyof InviteFormData, value: string) => void,
	onSubmit: () => void,
	onClose: () => void,
	isSaving: boolean,
) {
	if (!show) return null;

	return h("div", { class: "modal-overlay", "data-testid": "invite-modal" }, [
		h("div", { class: "modal" }, [
			h("h3", "Invite Staff Member"),
			h("div", { class: "form-group" }, [
				h("label", "Name"),
				h("input", {
					type: "text",
					value: form.name,
					"data-testid": "invite-name",
					onInput: (e: Event) => onFieldChange("name", (e.target as HTMLInputElement).value),
				}),
			]),
			h("div", { class: "form-group" }, [
				h("label", "Email"),
				h("input", {
					type: "email",
					value: form.email,
					"data-testid": "invite-email",
					onInput: (e: Event) => onFieldChange("email", (e.target as HTMLInputElement).value),
				}),
			]),
			h("div", { class: "form-group" }, [
				h("label", "Role"),
				h("select", {
					value: form.role,
					"data-testid": "invite-role",
					onChange: (e: Event) => onFieldChange("role", (e.target as HTMLSelectElement).value),
				}, [
					h("option", { value: "staff" }, "Staff"),
					h("option", { value: "manager" }, "Manager"),
					h("option", { value: "admin" }, "Admin"),
				]),
			]),
			h("div", { class: "modal__actions" }, [
				h("button", {
					class: "btn btn--primary",
					disabled: isSaving || !form.name.trim() || !form.email.trim(),
					"data-testid": "invite-submit",
					onClick: onSubmit,
				}, isSaving ? "Inviting…" : "Send Invite"),
				h("button", {
					class: "btn",
					"data-testid": "invite-cancel",
					onClick: onClose,
				}, "Cancel"),
			]),
		]),
	]);
}

function renderStaffPanel(
	data: StaffDetailData | null,
	loading: boolean,
	onClose: () => void,
	onDeactivate: () => void,
) {
	return h("div", { class: "slide-panel slide-panel--open", "data-testid": "staff-panel" }, [
		h("div", { class: "slide-panel__header" }, [
			h("h3", "Staff Details"),
			h("button", {
				class: "slide-panel__close",
				"data-testid": "panel-close",
				onClick: onClose,
			}, "✕"),
		]),

		loading
			? h("div", { class: "loading", "data-testid": "panel-loading" }, "Loading staff details…")
			: data
				? renderStaffPanelContent(data, onDeactivate)
				: h("div", { class: "empty-state" }, "No staff data."),
	]);
}

function renderStaffPanelContent(data: StaffDetailData, onDeactivate: () => void) {
	const { profile, schedule } = data;

	return h("div", { class: "staff-panel-content", "data-testid": "panel-content" }, [
		h("div", { class: "staff-panel__section", "data-testid": "panel-profile" }, [
			h("h4", "Profile"),
			h("p", { "data-testid": "panel-name" }, profile.displayName),
			h("p", { "data-testid": "panel-email" }, profile.email ?? "—"),
			h("p", { "data-testid": "panel-phone" }, profile.phone ?? "—"),
			h("p", { "data-testid": "panel-role" }, `Role: ${profile.role ?? "Staff"}`),
			h("span", {
				class: `badge ${profile.status === "active" ? "badge-success" : "badge-neutral"}`,
				"data-testid": "panel-status",
			}, profile.status === "active" ? "Active" : "Inactive"),
		]),

		h("div", { class: "staff-panel__section", "data-testid": "panel-schedule" }, [
			h("h4", "Weekly Schedule"),
			schedule.length > 0
				? h("table", { class: "data-table" }, [
					h("thead", [h("tr", [h("th", "Day"), h("th", "Start"), h("th", "End")])]),
					h("tbody",
						schedule.map((w) =>
							h("tr", { key: w.id }, [
								h("td", DAY_NAMES[w.dayOfWeek] ?? `Day ${w.dayOfWeek}`),
								h("td", w.startTime),
								h("td", w.endTime),
							]),
						),
					),
				])
				: h("p", { class: "text-muted" }, "No schedule set."),
		]),

		profile.status === "active"
			? h("button", {
				class: "btn btn--danger",
				"data-testid": "deactivate-btn",
				onClick: onDeactivate,
			}, "Deactivate")
			: null,
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const StaffPage = defineComponent({
	name: "StaffPage",
	setup() {
		const sdk = useSdk();

		const state = ref<StaffPageState>({
			detailLoading: false,
			error: null,
			inviteForm: { email: "", name: "", role: "staff" },
			isLoading: false,
			isSaving: false,
			selectedStaff: null,
			showInviteModal: false,
			showPanel: false,
			staff: [],
		});

		async function loadStaff() {
			state.value = { ...state.value, isLoading: true, error: null };
			try {
				const response = await sdk.staff.list();
				const staff: StaffCardData[] = response.data.map((s) => ({
					id: s.id,
					name: s.displayName,
					email: s.email ?? "",
					phone: s.phone ?? "",
					role: s.role ?? "Staff",
					status: s.status,
					photoUrl: s.photoUrl ?? null,
					isBookable: s.isBookable,
				}));
				state.value = { ...state.value, isLoading: false, staff };
			} catch (err) {
				state.value = {
					...state.value,
					isLoading: false,
					error: err instanceof Error ? err.message : "Failed to load staff",
				};
			}
		}

		async function loadStaffDetail(staffId: string) {
			state.value = { ...state.value, showPanel: true, detailLoading: true, selectedStaff: null };
			try {
				const [profile, schedule] = await Promise.all([
					sdk.staff.get(staffId),
					sdk.staff.getSchedule(staffId),
				]);
				state.value = {
					...state.value,
					detailLoading: false,
					selectedStaff: { profile, schedule },
				};
			} catch (err) {
				state.value = {
					...state.value,
					detailLoading: false,
					error: err instanceof Error ? err.message : "Failed to load staff details",
				};
			}
		}

		async function handleInvite() {
			state.value = { ...state.value, isSaving: true };
			try {
				await sdk.staff.invite({
					email: state.value.inviteForm.email,
					name: state.value.inviteForm.name,
					role: state.value.inviteForm.role,
				});
				state.value = {
					...state.value,
					isSaving: false,
					showInviteModal: false,
					inviteForm: { email: "", name: "", role: "staff" },
				};
				void loadStaff();
			} catch {
				state.value = { ...state.value, isSaving: false, error: "Failed to invite staff member" };
			}
		}

		async function handleDeactivate() {
			const staffId = state.value.selectedStaff?.profile.id;
			if (!staffId) return;
			try {
				await sdk.staff.deactivate(staffId);
				void loadStaff();
				void loadStaffDetail(staffId);
			} catch {
				state.value = { ...state.value, error: "Failed to deactivate staff member" };
			}
		}

		onMounted(() => {
			void loadStaff();
		});

		return () => {
			const s = state.value;

			return h("section", { "data-testid": "staff-page" }, [
				h("div", { class: "staff-header" }, [
					h("h2", "Staff"),
					h("button", {
						class: "btn btn--primary",
						"data-testid": "invite-staff-btn",
						onClick: () => { state.value = { ...state.value, showInviteModal: true }; },
					}, "+ Invite Staff"),
				]),

				s.error
					? h("div", { class: "alert alert--error", "data-testid": "staff-error" }, s.error)
					: null,

				s.isLoading
					? h("div", { class: "loading", "data-testid": "staff-loading" }, "Loading staff…")
					: renderStaffGrid(s.staff, (id) => void loadStaffDetail(id)),

				renderInviteModal(
					s.showInviteModal,
					s.inviteForm,
					(field, value) => {
						state.value = {
							...state.value,
							inviteForm: { ...state.value.inviteForm, [field]: value },
						};
					},
					handleInvite,
					() => { state.value = { ...state.value, showInviteModal: false }; },
					s.isSaving,
				),

				s.showPanel
					? renderStaffPanel(
						s.selectedStaff,
						s.detailLoading,
						() => { state.value = { ...state.value, showPanel: false, selectedStaff: null }; },
						handleDeactivate,
					)
					: null,
			]);
		};
	},
});
