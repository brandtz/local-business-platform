import { describe, expect, it } from "vitest";

import { ModuleRegistryService } from "./module-registry.service";
import {
	ModuleTemplateAssignmentError,
	ModuleTemplateAssignmentService,
	type AssignmentActorContext
} from "./module-template-assignment.service";
import { TemplateRegistryService } from "./template-registry.service";

const platformAdmin: AssignmentActorContext = {
	actorType: "platform",
	platformRole: "admin"
};

const platformOwner: AssignmentActorContext = {
	actorType: "platform",
	platformRole: "owner"
};

const tenantActor: AssignmentActorContext = {
	actorType: "tenant",
	platformRole: null
};

const anonymousActor: AssignmentActorContext = {
	actorType: null,
	platformRole: null
};

function createService(): ModuleTemplateAssignmentService {
	const moduleRegistry = new ModuleRegistryService();
	const templateRegistry = new TemplateRegistryService(moduleRegistry);
	return new ModuleTemplateAssignmentService(moduleRegistry, templateRegistry);
}

describe("ModuleTemplateAssignmentService", () => {
	describe("assignModules", () => {
		it("accepts valid module set from platform admin", () => {
			const service = createService();
			const result = service.assignModules(platformAdmin, {
				enabledModules: ["catalog", "ordering", "content", "operations"],
				tenantId: "t-1"
			});

			expect(result.kind).toBe("assigned");
			expect(result.tenantId).toBe("t-1");
			expect(result.enabledModules).toEqual(["catalog", "ordering", "content", "operations"]);
		});

		it("accepts valid module set from platform owner", () => {
			const service = createService();
			const result = service.assignModules(platformOwner, {
				enabledModules: ["catalog", "content"],
				tenantId: "t-1"
			});

			expect(result.kind).toBe("assigned");
		});

		it("rejects assignment from tenant actor", () => {
			const service = createService();

			expect(() =>
				service.assignModules(tenantActor, {
					enabledModules: ["catalog"],
					tenantId: "t-1"
				})
			).toThrow(ModuleTemplateAssignmentError);

			try {
				service.assignModules(tenantActor, {
					enabledModules: ["catalog"],
					tenantId: "t-1"
				});
			} catch (error) {
				expect((error as ModuleTemplateAssignmentError).reason).toBe("not-authorized");
			}
		});

		it("rejects assignment from anonymous actor", () => {
			const service = createService();

			expect(() =>
				service.assignModules(anonymousActor, {
					enabledModules: ["catalog"],
					tenantId: "t-1"
				})
			).toThrow(ModuleTemplateAssignmentError);
		});

		it("rejects invalid module keys", () => {
			const service = createService();

			expect(() =>
				service.assignModules(platformAdmin, {
					enabledModules: ["catalog", "unknown-module"],
					tenantId: "t-1"
				})
			).toThrow();
		});

		it("rejects empty module set", () => {
			const service = createService();

			expect(() =>
				service.assignModules(platformAdmin, {
					enabledModules: [],
					tenantId: "t-1"
				})
			).toThrow();
		});

		it("rejects module set with missing dependencies", () => {
			const service = createService();

			expect(() =>
				service.assignModules(platformAdmin, {
					enabledModules: ["ordering"],
					tenantId: "t-1"
				})
			).toThrow();
		});
	});

	describe("assignTemplate", () => {
		it("assigns template for platform admin", () => {
			const service = createService();
			const result = service.assignTemplate(platformAdmin, {
				tenantId: "t-1",
				verticalTemplate: "restaurant-core"
			});

			expect(result.kind).toBe("assigned");
			expect(result.association.tenantId).toBe("t-1");
			expect(result.association.verticalTemplate).toBe("restaurant-core");
			expect(result.association.assignedAt).toBeTruthy();
		});

		it("rejects assignment from tenant actor", () => {
			const service = createService();

			expect(() =>
				service.assignTemplate(tenantActor, {
					tenantId: "t-1",
					verticalTemplate: "restaurant-core"
				})
			).toThrow(ModuleTemplateAssignmentError);
		});

		it("rejects reassignment to same template", () => {
			const service = createService();

			expect(() =>
				service.assignTemplate(platformAdmin, {
					currentTemplate: "restaurant-core",
					tenantId: "t-1",
					verticalTemplate: "restaurant-core"
				})
			).toThrow(ModuleTemplateAssignmentError);

			try {
				service.assignTemplate(platformAdmin, {
					currentTemplate: "restaurant-core",
					tenantId: "t-1",
					verticalTemplate: "restaurant-core"
				});
			} catch (error) {
				expect((error as ModuleTemplateAssignmentError).reason).toBe("same-template");
			}
		});

		it("allows reassignment to different template", () => {
			const service = createService();
			const result = service.assignTemplate(platformAdmin, {
				currentTemplate: "restaurant-core",
				tenantId: "t-1",
				verticalTemplate: "services-core"
			});

			expect(result.kind).toBe("assigned");
			expect(result.association.verticalTemplate).toBe("services-core");
		});
	});

	describe("assignModulesWithTemplateCheck", () => {
		it("accepts compatible module set for template", () => {
			const service = createService();
			const result = service.assignModulesWithTemplateCheck(
				platformAdmin,
				{
					enabledModules: ["catalog", "ordering", "content", "operations"],
					tenantId: "t-1"
				},
				"restaurant-core"
			);

			expect(result.kind).toBe("assigned");
		});

		it("rejects module set incompatible with template", () => {
			const service = createService();

			expect(() =>
				service.assignModulesWithTemplateCheck(
					platformAdmin,
					{
						enabledModules: ["catalog", "content"],
						tenantId: "t-1"
					},
					"restaurant-core"
				)
			).toThrow();
		});

		it("rejects from non-platform-admin", () => {
			const service = createService();

			expect(() =>
				service.assignModulesWithTemplateCheck(
					tenantActor,
					{
						enabledModules: ["catalog", "ordering", "content", "operations"],
						tenantId: "t-1"
					},
					"restaurant-core"
				)
			).toThrow(ModuleTemplateAssignmentError);
		});
	});

	describe("contract shape stability", () => {
		it("module assignment result has expected shape", () => {
			const service = createService();
			const result = service.assignModules(platformAdmin, {
				enabledModules: ["catalog", "content"],
				tenantId: "t-1"
			});

			expect(result).toHaveProperty("kind");
			expect(result).toHaveProperty("tenantId");
			expect(result).toHaveProperty("enabledModules");
		});

		it("template assignment result has expected shape", () => {
			const service = createService();
			const result = service.assignTemplate(platformAdmin, {
				tenantId: "t-1",
				verticalTemplate: "restaurant-core"
			});

			expect(result).toHaveProperty("kind");
			expect(result).toHaveProperty("association");
			expect(result.association).toHaveProperty("tenantId");
			expect(result.association).toHaveProperty("verticalTemplate");
			expect(result.association).toHaveProperty("assignedAt");
		});
	});
});
