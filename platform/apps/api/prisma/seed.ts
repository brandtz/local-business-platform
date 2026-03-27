/**
 * Prisma seed script — Superior Exteriors & Maintenance (pilot tenant)
 *
 * Run with:  pnpm db:seed
 * Or:        npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createHash, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic IDs for easy cross-referencing
// ---------------------------------------------------------------------------
const TENANT_ID = "pilot-superior-exteriors";
const OWNER_USER_ID = "user-ryan-brown";
const MEMBERSHIP_ID = "membership-ryan-brown";
const LOCATION_ID = "loc-superior-hq";

// Staff
const STAFF_RYAN_ID = "staff-ryan-brown";

// Service categories
const CAT_ROOFING_ID = "cat-roofing";
const CAT_GUTTERS_ID = "cat-gutters";
const CAT_PRESSURE_ID = "cat-pressure-washing";

// Services
const SVC_FREE_CONSULT_ID = "svc-free-consultation";
const SVC_ROOF_INSPECT_ID = "svc-roof-inspection";
const SVC_ROOF_INSTALL_ID = "svc-roof-installation";
const SVC_ROOF_REPAIR_ID = "svc-roof-repair";
const SVC_ROOF_CLEANING_ID = "svc-roof-cleaning";
const SVC_GUTTER_INSTALL_ID = "svc-gutter-installation";
const SVC_GUTTER_REPAIR_ID = "svc-gutter-repair";
const SVC_GUTTER_CLEANING_ID = "svc-gutter-cleaning";
const SVC_GUTTER_SCREEN_ID = "svc-gutter-screen";
const SVC_PW_BUILDING_ID = "svc-pw-building";
const SVC_PW_PAVEMENT_ID = "svc-pw-pavement";
const SVC_PW_FENCE_ID = "svc-pw-fence";

// Content pages
const PAGE_HOME_ID = "page-home";
const PAGE_ABOUT_ID = "page-about";
const PAGE_SERVICES_ID = "page-services";
const PAGE_GALLERY_ID = "page-gallery";

// Portfolio
const PORT_ROOF_JOB_ID = "portfolio-roof-job-1";
const PORT_GUTTER_JOB_ID = "portfolio-gutter-job-1";

// ---------------------------------------------------------------------------
// Helper — hash a password with SHA-256 (dev-only; prod uses argon2/bcrypt)
// ---------------------------------------------------------------------------
function devPasswordHash(password: string): string {
	return createHash("sha256").update(password).digest("hex");
}

async function main() {
	console.log("🌱 Seeding Superior Exteriors & Maintenance pilot tenant…");

	// ── 1. Owner user ─────────────────────────────────────────────────────
	const ownerUser = await prisma.user.upsert({
		where: { email: "SuperiorEandMcorp@gmail.com" },
		update: {},
		create: {
			id: OWNER_USER_ID,
			email: "SuperiorEandMcorp@gmail.com",
			normalizedEmail: "superioreandmcorp@gmail.com",
			displayName: "Ryan Brown",
			actorType: "TENANT",
			status: "ACTIVE",
			isEmailVerified: true,
			passwordCredential: {
				create: {
					kind: "PASSWORD",
					passwordHash: devPasswordHash("ChangeMeOnFirstLogin!"),
					hashAlgorithm: "sha256",
					passwordVersion: 1,
				},
			},
		},
	});

	// ── 2. Tenant ─────────────────────────────────────────────────────────
	const tenant = await prisma.tenant.upsert({
		where: { slug: "superior-exteriors" },
		update: {},
		create: {
			id: TENANT_ID,
			displayName: "Superior Exteriors & Maintenance",
			slug: "superior-exteriors",
			status: "ACTIVE",
			previewSubdomain: "superior-exteriors",
		},
	});

	// ── 3. Membership (owner link) ────────────────────────────────────────
	await prisma.tenantMembership.upsert({
		where: {
			tenantId_userId: {
				tenantId: TENANT_ID,
				userId: OWNER_USER_ID,
			},
		},
		update: {},
		create: {
			id: MEMBERSHIP_ID,
			tenantId: TENANT_ID,
			userId: OWNER_USER_ID,
			role: "OWNER",
			isPrimary: true,
		},
	});

	// ── 4. Service categories ─────────────────────────────────────────────
	const categories = [
		{
			id: CAT_ROOFING_ID,
			tenantId: TENANT_ID,
			name: "Roofing",
			slug: "roofing",
			description:
				"Roof removal, installation, repairs, cleaning, treatments, and more.",
			sortOrder: 1,
		},
		{
			id: CAT_GUTTERS_ID,
			tenantId: TENANT_ID,
			name: "Gutters",
			slug: "gutters",
			description:
				"Gutter removal, installation, cleaning, repairs, and screen installation.",
			sortOrder: 2,
		},
		{
			id: CAT_PRESSURE_ID,
			tenantId: TENANT_ID,
			name: "Pressure Washing",
			slug: "pressure-washing",
			description:
				"Pressure washing for buildings, pavement, fencing, and more.",
			sortOrder: 3,
		},
	];

	for (const cat of categories) {
		await prisma.catalogCategory.upsert({
			where: {
				tenantId_slug: { tenantId: TENANT_ID, slug: cat.slug },
			},
			update: {},
			create: cat,
		});
	}

	// ── 5. Services (bookable) ────────────────────────────────────────────
	const services = [
		// Free consultation
		{
			id: SVC_FREE_CONSULT_ID,
			tenantId: TENANT_ID,
			name: "Free Consultation",
			slug: "free-consultation",
			description:
				"On-site walkthrough and project scoping — always free, no obligation.",
			durationMinutes: 60,
			price: 0,
			isBookable: true,
			bufferMinutes: 30,
			maxAdvanceDays: 30,
			minAdvanceHours: 4,
			sortOrder: 1,
		},
		// Roofing
		{
			id: SVC_ROOF_INSPECT_ID,
			tenantId: TENANT_ID,
			name: "Roof Inspection",
			slug: "roof-inspection",
			description:
				"Comprehensive roof condition assessment with photo report.",
			durationMinutes: 90,
			price: 15000,
			isBookable: true,
			bufferMinutes: 30,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 2,
		},
		{
			id: SVC_ROOF_INSTALL_ID,
			tenantId: TENANT_ID,
			name: "Roof Installation",
			slug: "roof-installation",
			description:
				"Full roof installation — shingle, metal, or flat. Quote required.",
			durationMinutes: 480,
			price: 0, // quote-based
			isBookable: false,
			bufferMinutes: 0,
			maxAdvanceDays: 60,
			minAdvanceHours: 48,
			sortOrder: 3,
		},
		{
			id: SVC_ROOF_REPAIR_ID,
			tenantId: TENANT_ID,
			name: "Roof Repair",
			slug: "roof-repair",
			description:
				"Leak repair, shingle replacement, flashing, and storm damage.",
			durationMinutes: 240,
			price: 35000,
			isBookable: true,
			bufferMinutes: 30,
			maxAdvanceDays: 14,
			minAdvanceHours: 24,
			sortOrder: 4,
		},
		{
			id: SVC_ROOF_CLEANING_ID,
			tenantId: TENANT_ID,
			name: "Roof Cleaning & Treatment",
			slug: "roof-cleaning-treatment",
			description: "Moss removal, cleaning, and protective treatment.",
			durationMinutes: 180,
			price: 25000,
			isBookable: true,
			bufferMinutes: 30,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 5,
		},
		// Gutters
		{
			id: SVC_GUTTER_INSTALL_ID,
			tenantId: TENANT_ID,
			name: "Gutter Installation",
			slug: "gutter-installation",
			description:
				"New seamless gutter installation — aluminum and copper options.",
			durationMinutes: 360,
			price: 0, // quote-based
			isBookable: false,
			bufferMinutes: 0,
			maxAdvanceDays: 60,
			minAdvanceHours: 48,
			sortOrder: 6,
		},
		{
			id: SVC_GUTTER_REPAIR_ID,
			tenantId: TENANT_ID,
			name: "Gutter Repair",
			slug: "gutter-repair",
			description:
				"Fix sagging, leaks, joint separation, and downspout issues.",
			durationMinutes: 120,
			price: 20000,
			isBookable: true,
			bufferMinutes: 15,
			maxAdvanceDays: 14,
			minAdvanceHours: 24,
			sortOrder: 7,
		},
		{
			id: SVC_GUTTER_CLEANING_ID,
			tenantId: TENANT_ID,
			name: "Gutter Cleaning",
			slug: "gutter-cleaning",
			description:
				"Full gutter and downspout flush with debris removal.",
			durationMinutes: 120,
			price: 20000,
			isBookable: true,
			bufferMinutes: 15,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 8,
		},
		{
			id: SVC_GUTTER_SCREEN_ID,
			tenantId: TENANT_ID,
			name: "Gutter Screen Installation",
			slug: "gutter-screen-installation",
			description:
				"Leaf guard / screen installation to prevent debris build-up.",
			durationMinutes: 180,
			price: 30000,
			isBookable: true,
			bufferMinutes: 15,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 9,
		},
		// Pressure Washing
		{
			id: SVC_PW_BUILDING_ID,
			tenantId: TENANT_ID,
			name: "Pressure Washing — Buildings",
			slug: "pw-buildings",
			description:
				"Exterior house, garage, and commercial building washing.",
			durationMinutes: 180,
			price: 25000,
			isBookable: true,
			bufferMinutes: 30,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 10,
		},
		{
			id: SVC_PW_PAVEMENT_ID,
			tenantId: TENANT_ID,
			name: "Pressure Washing — Pavement",
			slug: "pw-pavement",
			description:
				"Driveways, sidewalks, patios, and parking surfaces.",
			durationMinutes: 120,
			price: 18000,
			isBookable: true,
			bufferMinutes: 15,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 11,
		},
		{
			id: SVC_PW_FENCE_ID,
			tenantId: TENANT_ID,
			name: "Pressure Washing — Fencing",
			slug: "pw-fencing",
			description: "Wood, vinyl, and composite fence washing.",
			durationMinutes: 120,
			price: 15000,
			isBookable: true,
			bufferMinutes: 15,
			maxAdvanceDays: 30,
			minAdvanceHours: 24,
			sortOrder: 12,
		},
	];

	for (const svc of services) {
		await prisma.service.upsert({
			where: {
				tenantId_slug: { tenantId: TENANT_ID, slug: svc.slug },
			},
			update: {},
			create: svc,
		});
	}

	// ── 6. Staff profile (Ryan) ───────────────────────────────────────────
	await prisma.staffProfile.upsert({
		where: {
			tenantId_email: {
				tenantId: TENANT_ID,
				email: "SuperiorEandMcorp@gmail.com",
			},
		},
		update: {},
		create: {
			id: STAFF_RYAN_ID,
			tenantId: TENANT_ID,
			displayName: "Ryan Brown",
			email: "SuperiorEandMcorp@gmail.com",
			phone: "(503) 860-2218",
			role: "Owner / Lead Contractor",
			status: "ACTIVE",
			isBookable: true,
			scheduleWindows: {
				createMany: {
					data: [
						// Mon-Fri 7 AM – 6 PM (contractor early start)
						{ dayOfWeek: 1, startTime: "07:00", endTime: "18:00" },
						{ dayOfWeek: 2, startTime: "07:00", endTime: "18:00" },
						{ dayOfWeek: 3, startTime: "07:00", endTime: "18:00" },
						{ dayOfWeek: 4, startTime: "07:00", endTime: "18:00" },
						{ dayOfWeek: 5, startTime: "07:00", endTime: "18:00" },
						// Sat 8 AM – 2 PM
						{ dayOfWeek: 6, startTime: "08:00", endTime: "14:00" },
					],
				},
			},
		},
	});

	// Assign Ryan to all bookable services
	const bookableServiceIds = services
		.filter((s) => s.isBookable)
		.map((s) => s.id);

	for (const serviceId of bookableServiceIds) {
		await prisma.staffServiceAssignment.upsert({
			where: {
				staffId_serviceId: {
					staffId: STAFF_RYAN_ID,
					serviceId,
				},
			},
			update: {},
			create: {
				staffId: STAFF_RYAN_ID,
				serviceId,
			},
		});
	}

	// ── 7. Content pages ──────────────────────────────────────────────────
	const pages = [
		{
			id: PAGE_HOME_ID,
			tenantId: TENANT_ID,
			title: "Superior Exteriors & Maintenance",
			slug: "home",
			status: "PUBLISHED" as const,
			templateRegion: "hero",
			sortOrder: 0,
			seoTitle:
				"Superior Exteriors & Maintenance | Roofing, Gutters & Pressure Washing in Eugene OR",
			seoDescription:
				"Family-run exterior improvement company serving the Eugene/Springfield area. Roofing, gutter installation & repair, pressure washing. CCB #242198 — Insured and Bonded. Call (503) 860-2218 for a free quote.",
			body: JSON.parse(
				JSON.stringify({
					blocks: [
						{
							type: "hero",
							heading: "All Your Exterior Improvement Needs in One",
							subheading: "Our sweat, your equity.",
							ctaLabel: "Request a Free Quote",
							ctaUrl: "/contact",
						},
						{
							type: "features",
							items: [
								{
									title: "Roofing",
									description:
										"Removal, installation, repairs, cleaning, treatments, and more.",
								},
								{
									title: "Gutters",
									description:
										"Removal, installation, cleaning, repairs, screen installation.",
								},
								{
									title: "Pressure Washing",
									description:
										"Buildings, pavement, fencing, and more.",
								},
							],
						},
						{
							type: "trust",
							badges: [
								"CCB #242198",
								"Insured and Bonded",
								"Family-Run Business",
							],
						},
					],
				})
			),
		},
		{
			id: PAGE_ABOUT_ID,
			tenantId: TENANT_ID,
			title: "About Us",
			slug: "about",
			status: "PUBLISHED" as const,
			templateRegion: "about",
			sortOrder: 1,
			seoTitle: "About Superior Exteriors & Maintenance | Eugene OR",
			seoDescription:
				"Meet Ryan Brown and the Superior Exteriors team — a local, family-run exterior improvement business proudly serving the 97404 area.",
			body: JSON.parse(
				JSON.stringify({
					blocks: [
						{
							type: "text",
							content:
								"Superior Exteriors & Maintenance is a local, family-run business serving the Eugene/Springfield, Oregon area. Founded by Ryan Brown, we specialize in roofing, gutter services, and pressure washing. Our motto — 'Our sweat, your equity' — reflects our commitment to increasing the value and appearance of your property through hard work and quality craftsmanship.",
						},
						{
							type: "text",
							content:
								"We are fully licensed (CCB #242198), insured, and bonded. Whether you need a new roof, gutter repairs, or your property pressure washed, we provide free estimates and competitive pricing. Support local — call us today!",
						},
						{
							type: "contact",
							phone: "(503) 860-2218",
							email: "SuperiorEandMcorp@gmail.com",
							instagram: "@superiorexteriorscorp",
						},
					],
				})
			),
		},
		{
			id: PAGE_SERVICES_ID,
			tenantId: TENANT_ID,
			title: "Our Services",
			slug: "services",
			status: "PUBLISHED" as const,
			templateRegion: "services",
			sortOrder: 2,
			seoTitle:
				"Roofing, Gutter & Pressure Washing Services | Superior Exteriors",
			seoDescription:
				"Full-service roofing, gutter installation & repair, and pressure washing in the Eugene OR area. Free estimates available.",
			body: JSON.parse(
				JSON.stringify({
					blocks: [
						{
							type: "service-list",
							heading: "What We Do",
							categories: ["roofing", "gutters", "pressure-washing"],
						},
					],
				})
			),
		},
		{
			id: PAGE_GALLERY_ID,
			tenantId: TENANT_ID,
			title: "Our Work",
			slug: "gallery",
			status: "PUBLISHED" as const,
			templateRegion: "gallery",
			sortOrder: 3,
			seoTitle:
				"Project Gallery | Superior Exteriors & Maintenance",
			seoDescription:
				"See our completed roofing, gutter, and pressure washing projects in the Eugene/Springfield area.",
			body: JSON.parse(
				JSON.stringify({
					blocks: [
						{
							type: "portfolio-grid",
							heading: "Recent Projects",
						},
					],
				})
			),
		},
	];

	for (const page of pages) {
		await prisma.contentPage.upsert({
			where: {
				tenantId_slug: { tenantId: TENANT_ID, slug: page.slug },
			},
			update: {},
			create: page,
		});
	}

	// ── 8. Portfolio projects (from Instagram posts) ──────────────────────
	const portfolioProjects = [
		{
			id: PORT_ROOF_JOB_ID,
			tenantId: TENANT_ID,
			title: "Residential Metal Roof Installation",
			description: JSON.parse(
				JSON.stringify({
					blocks: [
						{
							type: "text",
							content:
								"Complete metal roof installation on a residential property in the Eugene area. New standing-seam metal panels with full flashing and trim work.",
						},
					],
				})
			),
			serviceCategories: ["Roofing"],
			location: "Eugene, OR 97404",
			status: "PUBLISHED" as const,
			sortOrder: 1,
			isFeatured: true,
			testimonialQuote:
				"Ryan and his team did an outstanding job on our new metal roof. Professional, on-time, and great price.",
			testimonialAttribution: "Homeowner, Eugene OR",
			testimonialRating: 5,
		},
		{
			id: PORT_GUTTER_JOB_ID,
			tenantId: TENANT_ID,
			title: "Gutter Replacement & Screen Install",
			description: JSON.parse(
				JSON.stringify({
					blocks: [
						{
							type: "text",
							content:
								"Full gutter replacement with new seamless aluminum gutters and leaf guard screen installation. Removed old damaged system and installed proper drainage.",
						},
					],
				})
			),
			serviceCategories: ["Gutters"],
			location: "Springfield, OR",
			status: "PUBLISHED" as const,
			sortOrder: 2,
			isFeatured: true,
		},
	];

	for (const project of portfolioProjects) {
		await prisma.portfolioProject.upsert({
			where: { id: project.id },
			update: {},
			create: project,
		});
	}

	// ── 9. Announcement banner ────────────────────────────────────────────
	await prisma.announcement.create({
		data: {
			tenantId: TENANT_ID,
			title: "Spring Special",
			body: "Book a roof inspection + gutter cleaning combo and save 15%! Call (503) 860-2218.",
			placement: "BANNER",
			isActive: true,
			displayPriority: 1,
		},
	});

	console.log("✅ Pilot tenant seeded successfully:");
	console.log(`   Tenant:     ${tenant.displayName} (${tenant.slug})`);
	console.log(`   Owner:      ${ownerUser.displayName} <${ownerUser.email}>`);
	console.log(`   Categories: ${categories.length}`);
	console.log(`   Services:   ${services.length}`);
	console.log(`   Pages:      ${pages.length}`);
	console.log(`   Portfolio:  ${portfolioProjects.length}`);
}

main()
	.catch((e) => {
		console.error("❌ Seed failed:", e);
		process.exit(1);
	})
	.finally(() => prisma.$disconnect());
