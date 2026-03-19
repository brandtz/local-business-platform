import { describe, it, expect } from "vitest";
import {
	getRoleBadgeLabel,
	getRoleBadgeVariant,
	getAvailableRoleChanges,
	getInvitationStatusIndicator,
	getInvitableRoles,
	createEmptyInvitationForm,
	validateInvitationForm,
	getStaffStatusBadge,
	getBookableBadge,
	resolveUserSectionPermissions,
	getAvailableTabs,
	buildDeactivationConfirmation,
	buildRoleChangeConfirmation
} from "./user-management-views.js";

// ── Role Badge ───────────────────────────────────────────────────────────────

describe("getRoleBadgeVariant", () => {
	it("maps each role to its variant", () => {
		expect(getRoleBadgeVariant("owner")).toBe("owner");
		expect(getRoleBadgeVariant("admin")).toBe("admin");
		expect(getRoleBadgeVariant("staff")).toBe("staff");
	});
});

describe("getRoleBadgeLabel", () => {
	it("returns capitalized labels", () => {
		expect(getRoleBadgeLabel("owner")).toBe("Owner");
		expect(getRoleBadgeLabel("manager")).toBe("Manager");
	});
});

// ── Role Change Options ──────────────────────────────────────────────────────

describe("getAvailableRoleChanges", () => {
	it("owner can change admin to manager or staff", () => {
		const result = getAvailableRoleChanges("owner", "admin");
		expect(result).toContain("manager");
		expect(result).toContain("staff");
		expect(result).not.toContain("admin");
		expect(result).not.toContain("owner");
	});

	it("owner can change staff to admin or manager", () => {
		const result = getAvailableRoleChanges("owner", "staff");
		expect(result).toContain("admin");
		expect(result).toContain("manager");
	});

	it("admin can change staff to manager only", () => {
		const result = getAvailableRoleChanges("admin", "staff");
		expect(result).toContain("manager");
		expect(result).not.toContain("admin");
	});

	it("admin cannot change another admin", () => {
		expect(getAvailableRoleChanges("admin", "admin")).toEqual([]);
	});

	it("admin cannot change owner", () => {
		expect(getAvailableRoleChanges("admin", "owner")).toEqual([]);
	});

	it("staff cannot change anyone", () => {
		expect(getAvailableRoleChanges("staff", "staff")).toEqual([]);
		expect(getAvailableRoleChanges("staff", "manager")).toEqual([]);
	});
});

// ── Invitation Status ────────────────────────────────────────────────────────

describe("getInvitationStatusIndicator", () => {
	it("returns correct indicator for pending", () => {
		const result = getInvitationStatusIndicator("pending");
		expect(result.label).toBe("Pending");
		expect(result.variant).toBe("info");
	});

	it("returns correct indicator for accepted", () => {
		expect(getInvitationStatusIndicator("accepted").variant).toBe("success");
	});

	it("returns correct indicator for expired", () => {
		expect(getInvitationStatusIndicator("expired").variant).toBe("warning");
	});

	it("returns correct indicator for revoked", () => {
		expect(getInvitationStatusIndicator("revoked").variant).toBe("neutral");
	});
});

// ── Invitable Roles ──────────────────────────────────────────────────────────

describe("getInvitableRoles", () => {
	it("owner can invite admin, manager, staff", () => {
		const roles = getInvitableRoles("owner");
		expect(roles).toEqual(["admin", "manager", "staff"]);
	});

	it("admin can invite manager, staff", () => {
		const roles = getInvitableRoles("admin");
		expect(roles).toEqual(["manager", "staff"]);
	});

	it("manager can invite staff", () => {
		const roles = getInvitableRoles("manager");
		expect(roles).toEqual(["staff"]);
	});

	it("staff cannot invite anyone", () => {
		expect(getInvitableRoles("staff")).toEqual([]);
	});
});

// ── Invitation Form Validation ───────────────────────────────────────────────

describe("validateInvitationForm", () => {
	it("returns no errors for valid form", () => {
		const form = {
			...createEmptyInvitationForm(),
			email: "user@test.com",
			role: "staff" as const
		};
		expect(validateInvitationForm(form, "owner")).toEqual([]);
	});

	it("requires email", () => {
		const form = createEmptyInvitationForm();
		const errors = validateInvitationForm(form, "owner");
		expect(errors).toEqual([
			expect.objectContaining({ field: "email", message: "Email is required." })
		]);
	});

	it("validates email format", () => {
		const form = { ...createEmptyInvitationForm(), email: "bad" };
		const errors = validateInvitationForm(form, "owner");
		expect(errors).toEqual([
			expect.objectContaining({ field: "email" })
		]);
	});

	it("rejects role above viewer permissions", () => {
		const form = {
			...createEmptyInvitationForm(),
			email: "x@y.com",
			role: "admin" as const
		};
		const errors = validateInvitationForm(form, "admin");
		expect(errors).toEqual([
			expect.objectContaining({ field: "role" })
		]);
	});
});

// ── Staff Badges ─────────────────────────────────────────────────────────────

describe("getStaffStatusBadge", () => {
	it("returns Active/success for active staff", () => {
		expect(getStaffStatusBadge(true)).toEqual({
			label: "Active",
			variant: "success"
		});
	});

	it("returns Inactive/neutral for inactive staff", () => {
		expect(getStaffStatusBadge(false)).toEqual({
			label: "Inactive",
			variant: "neutral"
		});
	});
});

describe("getBookableBadge", () => {
	it("returns info badge for bookable", () => {
		expect(getBookableBadge(true)).toEqual({
			label: "Bookable",
			variant: "info"
		});
	});

	it("returns null for non-bookable", () => {
		expect(getBookableBadge(false)).toBeNull();
	});
});

// ── Permissions ──────────────────────────────────────────────────────────────

describe("resolveUserSectionPermissions", () => {
	it("owner has full permissions", () => {
		const perms = resolveUserSectionPermissions("owner");
		expect(perms.canViewMembers).toBe(true);
		expect(perms.canInviteUsers).toBe(true);
		expect(perms.canManageRoles).toBe(true);
		expect(perms.canManageStaff).toBe(true);
	});

	it("admin has full permissions", () => {
		const perms = resolveUserSectionPermissions("admin");
		expect(perms.canViewMembers).toBe(true);
		expect(perms.canManageStaff).toBe(true);
	});

	it("manager can only view staff", () => {
		const perms = resolveUserSectionPermissions("manager");
		expect(perms.canViewMembers).toBe(false);
		expect(perms.canViewInvitations).toBe(false);
		expect(perms.canViewStaff).toBe(true);
		expect(perms.canManageStaff).toBe(false);
	});

	it("staff has no management permissions", () => {
		const perms = resolveUserSectionPermissions("staff");
		expect(perms.canViewMembers).toBe(false);
		expect(perms.canViewStaff).toBe(false);
	});
});

describe("getAvailableTabs", () => {
	it("returns all tabs for owner/admin", () => {
		const perms = resolveUserSectionPermissions("owner");
		expect(getAvailableTabs(perms)).toEqual([
			"members",
			"invitations",
			"staff"
		]);
	});

	it("returns only staff tab for manager", () => {
		const perms = resolveUserSectionPermissions("manager");
		expect(getAvailableTabs(perms)).toEqual(["staff"]);
	});

	it("returns empty for staff role", () => {
		const perms = resolveUserSectionPermissions("staff");
		expect(getAvailableTabs(perms)).toEqual([]);
	});
});

// ── Confirmation Builders ────────────────────────────────────────────────────

describe("buildDeactivationConfirmation", () => {
	it("builds a confirmation with user info", () => {
		const confirmation = buildDeactivationConfirmation("u1", "Alice");
		expect(confirmation.userId).toBe("u1");
		expect(confirmation.message).toContain("Alice");
		expect(confirmation.message).toContain("deactivate");
	});
});

describe("buildRoleChangeConfirmation", () => {
	it("includes role labels in message", () => {
		const confirmation = buildRoleChangeConfirmation(
			"u1",
			"Bob",
			"staff",
			"manager"
		);
		expect(confirmation.message).toContain("Bob");
		expect(confirmation.message).toContain("Staff");
		expect(confirmation.message).toContain("Manager");
	});
});
