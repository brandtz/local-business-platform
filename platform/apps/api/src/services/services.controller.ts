import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpException, HttpStatus } from "@nestjs/common";

import type { ServiceRecord, ServiceListFilter, ServiceStatus } from "@platform/types";

const DEV_TENANT_ID = "dev-tenant-001";

// In-memory store for services (no persistence layer exists yet)
const services: ServiceRecord[] = [];
let nextSortOrder = 0;

function generateId(): string {
	return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Controller("services")
export class ServicesController {
	@Get()
	listServices(@Query() query: Record<string, string>) {
		let result = services.filter((s) => s.tenantId === DEV_TENANT_ID);

		if (query.status) {
			result = result.filter((s) => s.status === query.status);
		}
		if (query.search) {
			const q = query.search.toLowerCase();
			result = result.filter(
				(s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q),
			);
		}

		return { data: result, total: result.length };
	}

	@Get(":id")
	getService(@Param("id") id: string) {
		const svc = services.find((s) => s.id === id && s.tenantId === DEV_TENANT_ID);
		if (!svc) throw new HttpException("Service not found", HttpStatus.NOT_FOUND);
		return svc;
	}

	@Post()
	createService(@Body() body: Record<string, unknown>) {
		const now = new Date().toISOString();
		const svc: ServiceRecord = {
			id: generateId(),
			tenantId: DEV_TENANT_ID,
			name: String(body.name ?? ""),
			slug: String(body.slug ?? ""),
			description: body.description != null ? String(body.description) : null,
			price: Number(body.price) || 0,
			durationMinutes: Number(body.durationMinutes) || 60,
			bufferMinutes: Number(body.bufferMinutes) || 0,
			isBookable: body.isBookable !== false,
			maxAdvanceDays: Number(body.maxAdvanceDays) || 30,
			minAdvanceHours: Number(body.minAdvanceHours) || 0,
			sortOrder: nextSortOrder++,
			status: (body.status as ServiceStatus) ?? "active",
			createdAt: now,
			updatedAt: now,
		};
		services.push(svc);
		return svc;
	}

	@Put(":id")
	updateService(@Param("id") id: string, @Body() body: Record<string, unknown>) {
		const idx = services.findIndex((s) => s.id === id && s.tenantId === DEV_TENANT_ID);
		if (idx === -1) throw new HttpException("Service not found", HttpStatus.NOT_FOUND);

		const existing = services[idx];
		const updated: ServiceRecord = {
			...existing,
			name: body.name != null ? String(body.name) : existing.name,
			slug: body.slug != null ? String(body.slug) : existing.slug,
			description: body.description !== undefined ? (body.description != null ? String(body.description) : null) : existing.description,
			price: body.price != null ? Number(body.price) : existing.price,
			durationMinutes: body.durationMinutes != null ? Number(body.durationMinutes) : existing.durationMinutes,
			bufferMinutes: body.bufferMinutes != null ? Number(body.bufferMinutes) : existing.bufferMinutes,
			isBookable: body.isBookable != null ? Boolean(body.isBookable) : existing.isBookable,
			maxAdvanceDays: body.maxAdvanceDays != null ? Number(body.maxAdvanceDays) : existing.maxAdvanceDays,
			minAdvanceHours: body.minAdvanceHours != null ? Number(body.minAdvanceHours) : existing.minAdvanceHours,
			status: body.status != null ? (body.status as ServiceStatus) : existing.status,
			updatedAt: new Date().toISOString(),
		};
		services[idx] = updated;
		return updated;
	}

	@Delete(":id")
	@HttpCode(204)
	deleteService(@Param("id") id: string) {
		const idx = services.findIndex((s) => s.id === id && s.tenantId === DEV_TENANT_ID);
		if (idx === -1) throw new HttpException("Service not found", HttpStatus.NOT_FOUND);
		services.splice(idx, 1);
	}

	@Post("availability")
	getAvailability(@Body() body: unknown) {
		// Availability not yet implemented
		return [];
	}
}
