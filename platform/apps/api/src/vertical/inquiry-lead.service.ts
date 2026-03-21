import { Injectable } from "@nestjs/common";

import type { BusinessVertical, InquiryFormConfig } from "@platform/types";
import { validateInquiryLeadInput, verticalConfigs } from "@platform/types";

export class InquiryLeadError extends Error {
	constructor(
		public readonly reason: "inquiry-disabled" | "validation-failed",
		message: string
	) {
		super(message);
		this.name = "InquiryLeadError";
	}
}

export type CreateInquiryLeadInput = {
	email: string;
	message?: string | null;
	name: string;
	phone?: string | null;
	serviceInterest?: string | null;
	tenantId: string;
};

@Injectable()
export class InquiryLeadService {
	validateCreate(input: CreateInquiryLeadInput) {
		return validateInquiryLeadInput(input);
	}

	/**
	 * Get the inquiry form configuration for a vertical.
	 * Returns the form config if the vertical supports inquiry forms.
	 */
	getFormConfig(vertical: BusinessVertical): InquiryFormConfig {
		const config = verticalConfigs[vertical];
		return config.inquiryForm;
	}

	/**
	 * Check whether the inquiry form is enabled for a given vertical.
	 */
	isInquiryEnabled(vertical: BusinessVertical): boolean {
		return this.getFormConfig(vertical).enabled;
	}

	/**
	 * Validate and check that inquiry is enabled before creating a lead.
	 * Throws if the inquiry form is not enabled for this vertical.
	 */
	validateCreateForVertical(
		input: CreateInquiryLeadInput,
		vertical: BusinessVertical
	) {
		if (!this.isInquiryEnabled(vertical)) {
			throw new InquiryLeadError(
				"inquiry-disabled",
				`Inquiry form is not enabled for the ${vertical} vertical.`
			);
		}
		return this.validateCreate(input);
	}
}
