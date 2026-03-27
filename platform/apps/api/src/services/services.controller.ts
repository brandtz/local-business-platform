import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpException, HttpStatus } from "@nestjs/common";

import type { ServiceRecord, ServiceListFilter, ServiceStatus } from "@platform/types";

const DEV_TENANT_ID = "pilot-superior-exteriors";

// In-memory store for services with seed data
const services: ServiceRecord[] = [
	{ id: "svc-free-consultation", tenantId: DEV_TENANT_ID, name: "Free Consultation", slug: "free-consultation", description: "On-site walkthrough and project scoping — always free, no obligation.", price: 0, durationMinutes: 60, bufferMinutes: 30, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 4, sortOrder: 1, status: "active" as ServiceRecord["status"] },
	{ id: "svc-roof-inspection", tenantId: DEV_TENANT_ID, name: "Roof Inspection", slug: "roof-inspection", description: "Comprehensive roof condition assessment with photo report.", price: 15000, durationMinutes: 90, bufferMinutes: 30, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 2, status: "active" as ServiceRecord["status"] },
	{ id: "svc-roof-repair", tenantId: DEV_TENANT_ID, name: "Roof Repair", slug: "roof-repair", description: "Leak repair, shingle replacement, flashing, and storm damage.", price: 35000, durationMinutes: 240, bufferMinutes: 30, isBookable: true, maxAdvanceDays: 14, minAdvanceHours: 24, sortOrder: 3, status: "active" as ServiceRecord["status"] },
	{ id: "svc-roof-cleaning", tenantId: DEV_TENANT_ID, name: "Roof Cleaning & Treatment", slug: "roof-cleaning-treatment", description: "Moss removal, cleaning, and protective treatment.", price: 25000, durationMinutes: 180, bufferMinutes: 30, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 4, status: "active" as ServiceRecord["status"] },
	{ id: "svc-gutter-repair", tenantId: DEV_TENANT_ID, name: "Gutter Repair", slug: "gutter-repair", description: "Fix sagging, leaks, joint separation, and downspout issues.", price: 20000, durationMinutes: 120, bufferMinutes: 15, isBookable: true, maxAdvanceDays: 14, minAdvanceHours: 24, sortOrder: 5, status: "active" as ServiceRecord["status"] },
	{ id: "svc-gutter-cleaning", tenantId: DEV_TENANT_ID, name: "Gutter Cleaning", slug: "gutter-cleaning", description: "Full gutter and downspout flush with debris removal.", price: 20000, durationMinutes: 120, bufferMinutes: 15, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 6, status: "active" as ServiceRecord["status"] },
	{ id: "svc-gutter-screen", tenantId: DEV_TENANT_ID, name: "Gutter Screen Installation", slug: "gutter-screen-installation", description: "Leaf guard / screen installation to prevent debris build-up.", price: 30000, durationMinutes: 180, bufferMinutes: 15, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 7, status: "active" as ServiceRecord["status"] },
	{ id: "svc-pw-buildings", tenantId: DEV_TENANT_ID, name: "Pressure Washing — Buildings", slug: "pw-buildings", description: "Exterior house, garage, and commercial building washing.", price: 25000, durationMinutes: 180, bufferMinutes: 30, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 8, status: "active" as ServiceRecord["status"] },
	{ id: "svc-pw-pavement", tenantId: DEV_TENANT_ID, name: "Pressure Washing — Pavement", slug: "pw-pavement", description: "Driveways, sidewalks, patios, and parking surfaces.", price: 18000, durationMinutes: 120, bufferMinutes: 15, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 9, status: "active" as ServiceRecord["status"] },
	{ id: "svc-pw-fencing", tenantId: DEV_TENANT_ID, name: "Pressure Washing — Fencing", slug: "pw-fencing", description: "Wood, vinyl, and composite fence washing.", price: 15000, durationMinutes: 120, bufferMinutes: 15, isBookable: true, maxAdvanceDays: 30, minAdvanceHours: 24, sortOrder: 10, status: "active" as ServiceRecord["status"] },
];
let nextSortOrder = 11;

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
