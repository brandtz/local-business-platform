import { Injectable } from "@nestjs/common";

import { validateInquiryLeadInput } from "@platform/types";

export class InquiryLeadError extends Error {
	constructor(
		public readonly reason: "validation-failed",
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
}
