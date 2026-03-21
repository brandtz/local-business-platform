import { Injectable } from "@nestjs/common";

import type {
	BusinessVertical,
	InquiryFormConfig,
	VerticalModuleConfig,
	VerticalTemplateConfig,
	VerticalThemeDefaults,
	WeeklyHoursEntry,
} from "@platform/types";
import {
	validateVerticalSelection,
	verticalConfigs,
} from "@platform/types";

export class VerticalTemplateError extends Error {
	constructor(
		public readonly reason: "unsupported-vertical" | "seed-conflict",
		message: string
	) {
		super(message);
		this.name = "VerticalTemplateError";
	}
}

export type SeedResult = {
	categoriesSeeded: number;
	contentPagesSeeded: number;
	hoursApplied: number;
	modulesEnabled: readonly string[];
	servicesSeeded: number;
	vertical: BusinessVertical;
};

@Injectable()
export class VerticalTemplateService {
	getConfig(vertical: BusinessVertical): VerticalTemplateConfig {
		const result = validateVerticalSelection(vertical);
		if (!result.valid) {
			throw new VerticalTemplateError(
				"unsupported-vertical",
				`Unsupported vertical: ${vertical}`
			);
		}
		return verticalConfigs[vertical];
	}

	getEnabledModules(vertical: BusinessVertical): string[] {
		const config = this.getConfig(vertical);
		return Object.entries(config.modules)
			.filter(([, enabled]) => enabled)
			.map(([name]) => name);
	}

	getStarterCategories(vertical: BusinessVertical): readonly string[] {
		return this.getConfig(vertical).starterCategories;
	}

	getStarterContentPages(vertical: BusinessVertical): readonly string[] {
		return this.getConfig(vertical).starterContentPages;
	}

	getDefaultBusinessHours(
		vertical: BusinessVertical
	): readonly WeeklyHoursEntry[] {
		return this.getConfig(vertical).defaultBusinessHours;
	}

	getModuleConfig(vertical: BusinessVertical): VerticalModuleConfig {
		return this.getConfig(vertical).modules;
	}

	getThemeDefaults(vertical: BusinessVertical): VerticalThemeDefaults {
		return this.getConfig(vertical).theme;
	}

	getInquiryFormConfig(vertical: BusinessVertical): InquiryFormConfig {
		return this.getConfig(vertical).inquiryForm;
	}

	/**
	 * Build a deterministic seed plan for a new tenant.
	 * Returns the computed seed metadata without side effects.
	 */
	buildSeedPlan(vertical: BusinessVertical): SeedResult {
		const config = this.getConfig(vertical);
		return {
			vertical,
			modulesEnabled: this.getEnabledModules(vertical),
			categoriesSeeded: config.starterCategories.length,
			servicesSeeded: config.starterServices.length,
			contentPagesSeeded: config.starterContentPages.length,
			hoursApplied: config.defaultBusinessHours.length,
		};
	}

	/**
	 * Check whether a specific module is enabled for a vertical.
	 */
	isModuleEnabled(
		vertical: BusinessVertical,
		moduleName: keyof VerticalModuleConfig
	): boolean {
		const config = this.getConfig(vertical);
		return config.modules[moduleName] ?? false;
	}
}
