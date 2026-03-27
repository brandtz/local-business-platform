import { Controller, Get, Param, Query, HttpException, HttpStatus } from "@nestjs/common";

const DEV_TENANT_ID = "pilot-superior-exteriors";

@Controller("staff")
export class StaffController {
	@Get()
	listStaff() {
		// Staff management service is stateless (validation/filtering only).
		// No persistence layer yet, so return empty list.
		return {
			data: [],
			total: 0,
		};
	}

	@Get(":id")
	getStaffMember(@Param("id") id: string) {
		throw new HttpException("Staff member not found", HttpStatus.NOT_FOUND);
	}

	@Get(":id/schedule")
	getSchedule(@Param("id") id: string) {
		return [];
	}
}
