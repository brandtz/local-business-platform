import { describe, expect, it } from "vitest";

import {
	canAssignRole,
	canManageRole,
	evaluateDeactivation,
	evaluateRoleUpdate,
	resolveInvitationStatus,
	validateCreateInvitation,
	type CreateInvitationPayload,
	type MembershipSnapshot
} from "./tenant-membership";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function ownerActor(): MembershipSnapshot {
	return { userId: "owner-1", role: "owner", isActive: true };
}

function adminActor(): MembershipSnapshot {
	return { userId: "admin-1", role: "admin", isActive: true };
}

function managerTarget(): MembershipSnapshot {
	return { userId: "manager-1", role: "manager", isActive: true };
}

function staffTarget(): MembershipSnapshot {
	return { userId: "staff-1", role: "staff", isActive: true };
}

// ── Invitation Validation ────────────────────────────────────────────────────

describe("validateCreateInvitation", () => {
	it("accepts a valid invitation", () => {
		const payload: CreateInvitationPayload = {
			tenantId: "t1",
			email: "new@example.com",
			role: "manager",
			invitedByUserId: "u1"
		};
		expect(validateCreateInvitation(payload)).toEqual([]);
	});

	it("requires email", () => {
		const payload: CreateInvitationPayload = {
			tenantId: "t1",
			email: "",
			role: "staff",
			invitedByUserId: "u1"
		};
		const errors = validateCreateInvitation(payload);
		expect(errors.some((e) => e.field === "email" && e.code === "required")).toBe(true);
	});

	it("rejects invalid email format", () => {
		const payload: CreateInvitationPayload = {
			tenantId: "t1",
			email: "bad-email",
			role: "staff",
			invitedByUserId: "u1"
		};
		const errors = validateCreateInvitation(payload);
		expect(errors.some((e) => e.field === "email" && e.code === "format")).toBe(true);
	});

	it("rejects owner role for invitations", () => {
		const payload: CreateInvitationPayload = {
			tenantId: "t1",
			email: "new@example.com",
			role: "owner",
			invitedByUserId: "u1"
		};
		const errors = validateCreateInvitation(payload);
		expect(errors.some((e) => e.field === "role" && e.code === "invalid-role")).toBe(true);
	});

	it("accepts admin, manager, and staff roles", () => {
		for (const role of ["admin", "manager", "staff"] as const) {
			const payload: CreateInvitationPayload = {
				tenantId: "t1",
				email: "new@example.com",
				role,
				invitedByUserId: "u1"
			};
			expect(validateCreateInvitation(payload)).toEqual([]);
		}
	});
});

// ── Role Hierarchy ───────────────────────────────────────────────────────────

describe("canManageRole", () => {
	it("owner can manage admin, manager, staff", () => {
		expect(canManageRole("owner", "admin")).toBe(true);
		expect(canManageRole("owner", "manager")).toBe(true);
		expect(canManageRole("owner", "staff")).toBe(true);
	});

	it("admin can manage manager and staff", () => {
		expect(canManageRole("admin", "manager")).toBe(true);
		expect(canManageRole("admin", "staff")).toBe(true);
	});

	it("admin cannot manage owner or other admin", () => {
		expect(canManageRole("admin", "owner")).toBe(false);
		expect(canManageRole("admin", "admin")).toBe(false);
	});

	it("manager cannot manage admin or owner", () => {
		expect(canManageRole("manager", "admin")).toBe(false);
		expect(canManageRole("manager", "owner")).toBe(false);
	});

	it("staff cannot manage anyone", () => {
		expect(canManageRole("staff", "staff")).toBe(false);
		expect(canManageRole("staff", "manager")).toBe(false);
	});
});

describe("canAssignRole", () => {
	it("owner can assign admin, manager, staff", () => {
		expect(canAssignRole("owner", "admin")).toBe(true);
		expect(canAssignRole("owner", "manager")).toBe(true);
		expect(canAssignRole("owner", "staff")).toBe(true);
	});

	it("owner cannot assign owner", () => {
		expect(canAssignRole("owner", "owner")).toBe(false);
	});

	it("admin can assign manager and staff", () => {
		expect(canAssignRole("admin", "manager")).toBe(true);
		expect(canAssignRole("admin", "staff")).toBe(true);
	});

	it("admin cannot assign admin or owner", () => {
		expect(canAssignRole("admin", "admin")).toBe(false);
		expect(canAssignRole("admin", "owner")).toBe(false);
	});
});

// ── Role Update ──────────────────────────────────────────────────────────────

describe("evaluateRoleUpdate", () => {
	it("allows owner to change manager to staff", () => {
		const result = evaluateRoleUpdate(ownerActor(), managerTarget(), "staff", 2);
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.previousRole).toBe("manager");
			expect(result.newRole).toBe("staff");
		}
	});

	it("rejects self-demotion", () => {
		const actor = ownerActor();
		const target = { ...ownerActor() };
		const result = evaluateRoleUpdate(actor, target, "admin", 2);
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("self-demotion");
		}
	});

	it("rejects changing to the same role", () => {
		const result = evaluateRoleUpdate(ownerActor(), managerTarget(), "manager", 2);
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("same-role");
		}
	});

	it("prevents demoting last owner", () => {
		const target: MembershipSnapshot = { userId: "owner-2", role: "owner", isActive: true };
		const result = evaluateRoleUpdate(ownerActor(), target, "admin", 1);
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("last-owner");
		}
	});

	it("rejects admin trying to manage owner", () => {
		const target: MembershipSnapshot = { userId: "owner-2", role: "owner", isActive: true };
		const result = evaluateRoleUpdate(adminActor(), target, "admin", 2);
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("insufficient-permissions");
		}
	});

	it("rejects admin assigning admin role", () => {
		const result = evaluateRoleUpdate(adminActor(), staffTarget(), "admin", 2);
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("insufficient-permissions");
		}
	});
});

// ── Deactivation ─────────────────────────────────────────────────────────────

describe("evaluateDeactivation", () => {
	it("allows owner to deactivate manager", () => {
		const result = evaluateDeactivation(ownerActor(), managerTarget(), 2, "deactivate");
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.membershipStatus).toBe("deactivated");
		}
	});

	it("allows owner to reactivate deactivated user", () => {
		const target = { ...staffTarget(), isActive: false };
		const result = evaluateDeactivation(ownerActor(), target, 2, "reactivate");
		expect(result.status).toBe("success");
		if (result.status === "success") {
			expect(result.membershipStatus).toBe("active");
		}
	});

	it("rejects self-deactivation", () => {
		const actor = ownerActor();
		const target = { ...ownerActor() };
		const result = evaluateDeactivation(actor, target, 2, "deactivate");
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("self-deactivation");
		}
	});

	it("rejects deactivating already-deactivated user", () => {
		const target = { ...managerTarget(), isActive: false };
		const result = evaluateDeactivation(ownerActor(), target, 2, "deactivate");
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("already-deactivated");
		}
	});

	it("rejects reactivating already-active user", () => {
		const result = evaluateDeactivation(ownerActor(), managerTarget(), 2, "reactivate");
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("already-active");
		}
	});

	it("prevents deactivating last owner", () => {
		const target: MembershipSnapshot = { userId: "owner-2", role: "owner", isActive: true };
		const result = evaluateDeactivation(ownerActor(), target, 1, "deactivate");
		expect(result.status).toBe("error");
		if (result.status === "error") {
			expect(result.code).toBe("last-owner");
		}
	});

	it("admin cannot deactivate another admin", () => {
		const target: MembershipSnapshot = { userId: "admin-2", role: "admin", isActive: true };
		const result = evaluateDeactivation(adminActor(), target, 2, "deactivate");
		expect(result.status).toBe("error");
	});
});

// ── Invitation Status ────────────────────────────────────────────────────────

describe("resolveInvitationStatus", () => {
	it("returns accepted for accepted invitation", () => {
		expect(
			resolveInvitationStatus(
				{ status: "accepted", expiresAt: "2025-01-01T00:00:00Z" },
				new Date("2025-06-01")
			)
		).toBe("accepted");
	});

	it("returns revoked for revoked invitation", () => {
		expect(
			resolveInvitationStatus(
				{ status: "revoked", expiresAt: "2025-12-31T00:00:00Z" },
				new Date("2025-06-01")
			)
		).toBe("revoked");
	});

	it("returns expired for pending invitation past expiry", () => {
		expect(
			resolveInvitationStatus(
				{ status: "pending", expiresAt: "2025-01-01T00:00:00Z" },
				new Date("2025-06-01")
			)
		).toBe("expired");
	});

	it("returns pending for pending invitation before expiry", () => {
		expect(
			resolveInvitationStatus(
				{ status: "pending", expiresAt: "2025-12-31T00:00:00Z" },
				new Date("2025-06-01")
			)
		).toBe("pending");
	});
});
