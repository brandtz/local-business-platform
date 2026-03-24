import { Controller, Get, Param, Query, HttpException, HttpStatus } from "@nestjs/common";

import { CustomerService, CustomerNotFoundError } from "./customer.service";

const DEV_TENANT_ID = "dev-tenant-001";

@Controller("customers")
export class CustomerController {
	private readonly customerService = new CustomerService();

	@Get()
	listCustomers(@Query() query: Record<string, string>) {
		// The customer service doesn't have a list method for admin use,
		// so we return an empty list for now.
		return {
			data: [],
			total: 0,
			page: Number(query.page) || 1,
			pageSize: Number(query.pageSize) || 20,
			hasMore: false,
		};
	}

	@Get("metrics")
	getMetrics() {
		return {
			totalCustomers: 0,
			activeCustomers: 0,
			newCustomersThisMonth: 0,
			averageOrderValue: 0,
		};
	}

	@Get(":id")
	getCustomer(@Param("id") id: string) {
		try {
			return this.customerService.getProfile(DEV_TENANT_ID, id);
		} catch (err) {
			if (err instanceof CustomerNotFoundError) {
				throw new HttpException(err.message, HttpStatus.NOT_FOUND);
			}
			throw new HttpException("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}
