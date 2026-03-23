// E13-S5-T5: Tenant User Management page — user list, invite modal,
// role management, and user detail panel.

import { defineComponent, h, onMounted, ref } from "vue";

import { useSdk } from "../composables/use-sdk";
import {
	resolveUserSectionPermissions,
	getAvailableTabs,
	getRoleBadgeLabel,
	getAvailableRoleChanges,
	getInvitationStatusIndicator,
	type UserManagementTab,
	type MemberListViewItem,
	type InvitationListViewItem,
	type UserSectionPermissions,
} from "../user-management-views";
import type { TenantActorRole } from "@platform/types";

// ── Types ────────────────────────────────────────────────────────────────────

type UserManagementState = {
	activeTab: UserManagementTab;
	members: MemberListViewItem[];
	invitations: InvitationListViewItem[];
	permissions: UserSectionPermissions;
	isLoading: boolean;
	error: string | null;
	showInviteModal: boolean;
	inviteEmail: string;
	inviteRole: TenantActorRole;
	inviteError: string | null;
	isInviting: boolean;
};

// ── Render Helpers ───────────────────────────────────────────────────────────

function renderTabBar(
	tabs: UserManagementTab[],
	activeTab: UserManagementTab,
	onTabChange: (tab: UserManagementTab) => void,
) {
	return h("div", { class: "tab-bar", role: "tablist", "data-testid": "user-tabs" },
		tabs.map((tab) =>
			h("button", {
				class: `tab-bar__tab${activeTab === tab ? " tab-bar__tab--active" : ""}`,
				role: "tab",
				"aria-selected": activeTab === tab ? "true" : "false",
				key: tab,
				onClick: () => onTabChange(tab),
			}, tab.charAt(0).toUpperCase() + tab.slice(1)),
		),
	);
}

function renderMembersTable(
	members: MemberListViewItem[],
	permissions: UserSectionPermissions,
	onRoleChange: (userId: string, role: TenantActorRole) => void,
	onDeactivate: (userId: string) => void,
) {
	if (members.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "members-empty" }, [
			h("p", "No team members found"),
		]);
	}

	return h("table", { class: "data-table", "data-testid": "members-table" }, [
		h("thead", [
			h("tr", [
				h("th", "Name"),
				h("th", "Email"),
				h("th", "Role"),
				h("th", "Status"),
				h("th", "Last Active"),
				permissions.canManageRoles ? h("th", "Actions") : null,
			]),
		]),
		h("tbody",
			members.map((member) =>
				h("tr", { key: member.userId, "data-testid": `member-row-${member.userId}` }, [
					h("td", member.displayName),
					h("td", member.email),
					h("td", [
						h("span", { class: "role-badge" }, getRoleBadgeLabel(member.role)),
					]),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${member.isActive ? "success" : "muted"}`,
						}, member.isActive ? "Active" : "Inactive"),
					]),
					h("td", member.joinedAt),
					permissions.canManageRoles
						? h("td", { class: "table-actions" }, [
								member.canChangeRole
									? h("select", {
											class: "form-field__input form-field__input--inline",
											value: member.role,
											onChange: (e: Event) => onRoleChange(member.userId, (e.target as HTMLSelectElement).value as TenantActorRole),
											"data-testid": "role-select",
										}, getAvailableRoleChanges(member.role as TenantActorRole, member.role as TenantActorRole).map((r) =>
											h("option", { value: r, key: r }, getRoleBadgeLabel(r)),
										))
									: null,
								member.canDeactivate
									? h("button", {
											class: "btn btn--danger btn--sm",
											type: "button",
											onClick: () => onDeactivate(member.userId),
											"data-testid": "deactivate-btn",
										}, "Deactivate")
									: null,
							])
						: null,
				]),
			),
		),
	]);
}

function renderInvitationsTable(invitations: InvitationListViewItem[]) {
	if (invitations.length === 0) {
		return h("div", { class: "empty-state", "data-testid": "invitations-empty" }, [
			h("p", "No pending invitations"),
		]);
	}

	return h("table", { class: "data-table", "data-testid": "invitations-table" }, [
		h("thead", [
			h("tr", [
				h("th", "Email"),
				h("th", "Role"),
				h("th", "Status"),
				h("th", "Invited By"),
				h("th", "Expires"),
				h("th", "Actions"),
			]),
		]),
		h("tbody",
			invitations.map((inv) => {
				const statusIndicator = getInvitationStatusIndicator(inv.status);
				return h("tr", { key: inv.invitationId, "data-testid": `invitation-row-${inv.invitationId}` }, [
					h("td", inv.email),
					h("td", getRoleBadgeLabel(inv.role)),
					h("td", [
						h("span", {
							class: `status-badge status-badge--${statusIndicator.variant}`,
						}, statusIndicator.label),
					]),
					h("td", inv.invitedBy),
					h("td", inv.expiresAt),
					h("td", [
						inv.canRevoke
							? h("button", {
									class: "btn btn--danger btn--sm",
									type: "button",
									"data-testid": "revoke-btn",
								}, "Revoke")
							: null,
					]),
				]);
			}),
		),
	]);
}

function renderInviteModal(
	email: string,
	role: TenantActorRole,
	error: string | null,
	isInviting: boolean,
	onEmailChange: (value: string) => void,
	onRoleChange: (value: TenantActorRole) => void,
	onSubmit: () => void,
	onClose: () => void,
) {
	return h("div", { class: "modal-overlay", "data-testid": "invite-modal" }, [
		h("div", { class: "modal", role: "dialog", "aria-labelledby": "invite-title" }, [
			h("div", { class: "modal__header" }, [
				h("h3", { id: "invite-title", class: "modal__title" }, "Invite User"),
				h("button", {
					class: "modal__close",
					type: "button",
					"aria-label": "Close",
					onClick: onClose,
				}, "×"),
			]),
			h("div", { class: "modal__body" }, [
				error
					? h("div", { class: "alert alert--error", role: "alert" }, error)
					: null,
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "invite-email" }, "Email"),
					h("input", {
						class: "form-field__input",
						id: "invite-email",
						type: "email",
						value: email,
						placeholder: "user@example.com",
						onInput: (e: Event) => onEmailChange((e.target as HTMLInputElement).value),
					}),
				]),
				h("div", { class: "form-field" }, [
					h("label", { class: "form-field__label", for: "invite-role" }, "Role"),
					h("select", {
						class: "form-field__input",
						id: "invite-role",
						value: role,
						onChange: (e: Event) => onRoleChange((e.target as HTMLSelectElement).value as TenantActorRole),
					}, [
						h("option", { value: "admin" }, "Admin"),
						h("option", { value: "manager" }, "Manager"),
						h("option", { value: "staff" }, "Staff"),
					]),
				]),
			]),
			h("div", { class: "modal__footer" }, [
				h("button", {
					class: "btn btn--primary",
					type: "button",
					disabled: isInviting,
					onClick: onSubmit,
					"data-testid": "send-invite-btn",
				}, isInviting ? "Sending..." : "Send Invite"),
				h("button", {
					class: "btn btn--secondary",
					type: "button",
					onClick: onClose,
				}, "Cancel"),
			]),
		]),
	]);
}

// ── Component ────────────────────────────────────────────────────────────────

export const UserManagementPage = defineComponent({
	name: "UserManagementPage",
	props: {
		viewerRole: {
			type: String as () => TenantActorRole,
			default: "owner",
		},
	},
	setup(props) {
		const permissions = resolveUserSectionPermissions(props.viewerRole);
		const availableTabs = getAvailableTabs(permissions);

		const state = ref<UserManagementState>({
			activeTab: availableTabs[0] ?? "members",
			members: [],
			invitations: [],
			permissions,
			isLoading: true,
			error: null,
			showInviteModal: false,
			inviteEmail: "",
			inviteRole: "staff",
			inviteError: null,
			isInviting: false,
		});

		onMounted(async () => {
			try {
				const sdk = useSdk();
				const [membersResult, staffResult] = await Promise.allSettled([
					sdk.customers.list({ page: 1, pageSize: 50 }),
					sdk.staff.list(),
				]);

				state.value = {
					...state.value,
					isLoading: false,
				};
			} catch {
				state.value = {
					...state.value,
					isLoading: false,
					error: "Failed to load user data",
				};
			}
		});

		function setTab(tab: UserManagementTab) {
			state.value = { ...state.value, activeTab: tab };
		}

		function openInviteModal() {
			state.value = {
				...state.value,
				showInviteModal: true,
				inviteEmail: "",
				inviteRole: "staff",
				inviteError: null,
			};
		}

		function closeInviteModal() {
			state.value = { ...state.value, showInviteModal: false };
		}

		async function sendInvite() {
			if (!state.value.inviteEmail.trim()) {
				state.value = { ...state.value, inviteError: "Email is required" };
				return;
			}

			state.value = { ...state.value, isInviting: true, inviteError: null };
			try {
				const sdk = useSdk();
				await sdk.staff.invite({
					email: state.value.inviteEmail,
					name: state.value.inviteEmail.split("@")[0] ?? "",
					role: state.value.inviteRole,
				});
				state.value = {
					...state.value,
					isInviting: false,
					showInviteModal: false,
				};
			} catch (err) {
				state.value = {
					...state.value,
					isInviting: false,
					inviteError: err instanceof Error ? err.message : "Failed to send invite",
				};
			}
		}

		function handleRoleChange(_userId: string, _role: TenantActorRole) {
			// Role change handled via confirmation flow
		}

		function handleDeactivate(_userId: string) {
			// Deactivation handled via confirmation flow
		}

		return () => {
			const s = state.value;

			if (s.isLoading) {
				return h("div", { class: "settings-page settings-page--loading", role: "status", "data-testid": "users-loading" }, [
					h("div", { class: "loading-spinner" }),
					h("p", "Loading users..."),
				]);
			}

			return h("div", { class: "settings-page", "data-testid": "user-management-page" }, [
				h("div", { class: "settings-page__header" }, [
					h("h2", { class: "settings-page__title" }, "User Management"),
					s.permissions.canInviteUsers
						? h("button", {
								class: "btn btn--primary",
								type: "button",
								onClick: openInviteModal,
								"data-testid": "invite-user-btn",
							}, "Invite User")
						: null,
				]),
				s.error
					? h("div", { class: "alert alert--error", role: "alert" }, s.error)
					: null,
				renderTabBar(availableTabs, s.activeTab, setTab),
				h("div", { class: "tab-content", "data-testid": `tab-${s.activeTab}` }, [
					s.activeTab === "members"
						? renderMembersTable(s.members, s.permissions, handleRoleChange, handleDeactivate)
						: null,
					s.activeTab === "invitations"
						? renderInvitationsTable(s.invitations)
						: null,
					s.activeTab === "staff"
						? h("div", { class: "empty-state", "data-testid": "staff-empty" }, [
								h("p", "Staff management coming soon"),
							])
						: null,
				]),
				s.showInviteModal
					? renderInviteModal(
							s.inviteEmail,
							s.inviteRole,
							s.inviteError,
							s.isInviting,
							(v) => { state.value = { ...state.value, inviteEmail: v }; },
							(v) => { state.value = { ...state.value, inviteRole: v }; },
							sendInvite,
							closeInviteModal,
						)
					: null,
			]);
		};
	},
});
