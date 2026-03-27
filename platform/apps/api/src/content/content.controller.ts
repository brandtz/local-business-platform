import { Controller, Get, Post, Put, Delete, Param, Query, Body, HttpCode, HttpException, HttpStatus } from "@nestjs/common";

import type { ContentPageRecord, AnnouncementRecord } from "@platform/types";

const DEV_TENANT_ID = "pilot-superior-exteriors";

// In-memory stores — no persistence layer for content yet
const pages: ContentPageRecord[] = [];
const announcements: AnnouncementRecord[] = [];

function generateId(prefix: string): string {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

@Controller("content")
export class ContentController {

	// ── Pages ────────────────────────────────────────────────────────────

	@Get("pages")
	listPages(@Query() query: Record<string, string>) {
		const result = pages.filter((p) => p.tenantId === DEV_TENANT_ID);
		return { data: result, total: result.length };
	}

	@Get("pages/:id")
	getPage(@Param("id") id: string) {
		const page = pages.find((p) => p.id === id && p.tenantId === DEV_TENANT_ID);
		if (!page) throw new HttpException("Page not found", HttpStatus.NOT_FOUND);
		return page;
	}

	@Post("pages")
	createPage(@Body() body: Record<string, unknown>) {
		const now = new Date().toISOString();
		const page = {
			id: generateId("page"),
			tenantId: DEV_TENANT_ID,
			title: String(body.title ?? ""),
			slug: String(body.slug ?? ""),
			bodyHtml: String(body.bodyHtml ?? ""),
			status: String(body.status ?? "draft"),
			sortOrder: pages.length,
			templateRegion: body.templateRegion != null ? String(body.templateRegion) : null,
			metaTitle: body.metaTitle != null ? String(body.metaTitle) : null,
			metaDescription: body.metaDescription != null ? String(body.metaDescription) : null,
			createdAt: now,
			updatedAt: now,
		} as ContentPageRecord;
		pages.push(page);
		return page;
	}

	@Put("pages/:id")
	updatePage(@Param("id") id: string, @Body() body: Record<string, unknown>) {
		const idx = pages.findIndex((p) => p.id === id && p.tenantId === DEV_TENANT_ID);
		if (idx === -1) throw new HttpException("Page not found", HttpStatus.NOT_FOUND);
		pages[idx] = { ...pages[idx], ...body, updatedAt: new Date().toISOString() } as ContentPageRecord;
		return pages[idx];
	}

	@Delete("pages/:id")
	@HttpCode(204)
	deletePage(@Param("id") id: string) {
		const idx = pages.findIndex((p) => p.id === id && p.tenantId === DEV_TENANT_ID);
		if (idx === -1) throw new HttpException("Page not found", HttpStatus.NOT_FOUND);
		pages.splice(idx, 1);
	}

	// ── Announcements ───────────────────────────────────────────────────

	@Get("announcements")
	listAnnouncements() {
		const result = announcements.filter((a) => a.tenantId === DEV_TENANT_ID);
		return { data: result, total: result.length };
	}

	@Get("announcements/:id")
	getAnnouncement(@Param("id") id: string) {
		const ann = announcements.find((a) => a.id === id && a.tenantId === DEV_TENANT_ID);
		if (!ann) throw new HttpException("Announcement not found", HttpStatus.NOT_FOUND);
		return ann;
	}

	@Post("announcements")
	createAnnouncement(@Body() body: Record<string, unknown>) {
		const now = new Date().toISOString();
		const ann = {
			id: generateId("ann"),
			tenantId: DEV_TENANT_ID,
			title: String(body.title ?? ""),
			bodyHtml: String(body.bodyHtml ?? ""),
			placement: String(body.placement ?? "banner"),
			status: String(body.status ?? "draft"),
			startDate: body.startDate != null ? String(body.startDate) : null,
			endDate: body.endDate != null ? String(body.endDate) : null,
			createdAt: now,
			updatedAt: now,
		} as AnnouncementRecord;
		announcements.push(ann);
		return ann;
	}

	@Put("announcements/:id")
	updateAnnouncement(@Param("id") id: string, @Body() body: Record<string, unknown>) {
		const idx = announcements.findIndex((a) => a.id === id && a.tenantId === DEV_TENANT_ID);
		if (idx === -1) throw new HttpException("Announcement not found", HttpStatus.NOT_FOUND);
		announcements[idx] = { ...announcements[idx], ...body, updatedAt: new Date().toISOString() } as AnnouncementRecord;
		return announcements[idx];
	}

	@Delete("announcements/:id")
	@HttpCode(204)
	deleteAnnouncement(@Param("id") id: string) {
		const idx = announcements.findIndex((a) => a.id === id && a.tenantId === DEV_TENANT_ID);
		if (idx === -1) throw new HttpException("Announcement not found", HttpStatus.NOT_FOUND);
		announcements.splice(idx, 1);
	}
}
