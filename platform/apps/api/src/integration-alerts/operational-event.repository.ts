// ---------------------------------------------------------------------------
// E8-S6-T2: Operational event repository — in-memory store.
// Stores structured operational alert events for querying by platform views.
// ---------------------------------------------------------------------------

import type {
	OperationalAlertEvent,
	OperationalAlertQuery,
	AlertCategory,
	AlertSeverity,
} from "@platform/types";

/**
 * In-memory operational event store.
 * Provides CRUD operations for operational alert events.
 */
export class OperationalEventRepository {
	private readonly events: OperationalAlertEvent[] = [];

	/**
	 * Stores a new operational alert event.
	 */
	insert(event: OperationalAlertEvent): void {
		this.events.push(event);
	}

	/**
	 * Retrieves a single event by ID.
	 */
	findById(id: string): OperationalAlertEvent | null {
		return this.events.find((e) => e.id === id) ?? null;
	}

	/**
	 * Lists events matching the given query with pagination.
	 */
	list(query: OperationalAlertQuery): {
		events: OperationalAlertEvent[];
		total: number;
	} {
		let filtered = [...this.events];

		if (query.category) {
			filtered = filtered.filter((e) => e.category === query.category);
		}
		if (query.severity) {
			filtered = filtered.filter((e) => e.severity === query.severity);
		}
		if (query.tenantId) {
			filtered = filtered.filter((e) => e.tenantId === query.tenantId);
		}
		if (query.acknowledged !== undefined) {
			filtered = filtered.filter(
				(e) => e.acknowledged === query.acknowledged,
			);
		}
		if (query.startDate) {
			filtered = filtered.filter((e) => e.timestamp >= query.startDate!);
		}
		if (query.endDate) {
			filtered = filtered.filter((e) => e.timestamp <= query.endDate!);
		}

		// Sort by timestamp descending (most recent first)
		filtered.sort(
			(a, b) =>
				new Date(b.timestamp).getTime() -
				new Date(a.timestamp).getTime(),
		);

		const total = filtered.length;
		const limit = query.limit ?? 50;
		const offset = query.offset ?? 0;
		const events = filtered.slice(offset, offset + limit);

		return { events, total };
	}

	/**
	 * Counts occurrences of a specific category for a tenant within a time window.
	 * Used for severity escalation logic.
	 */
	countRecentByCategory(
		category: AlertCategory,
		tenantId: string | null,
		windowMs: number,
	): number {
		const cutoff = new Date(Date.now() - windowMs).toISOString();
		return this.events.filter(
			(e) =>
				e.category === category &&
				e.tenantId === tenantId &&
				e.timestamp >= cutoff,
		).length;
	}

	/**
	 * Acknowledges an event by ID.
	 */
	acknowledge(id: string): boolean {
		const event = this.events.find((e) => e.id === id);
		if (!event) return false;
		event.acknowledged = true;
		return true;
	}

	/**
	 * Returns severity distribution across all (or filtered) events.
	 */
	getSeverityDistribution(query?: {
		startDate?: string;
		endDate?: string;
	}): Record<AlertSeverity, number> {
		let filtered = [...this.events];
		if (query?.startDate) {
			filtered = filtered.filter((e) => e.timestamp >= query.startDate!);
		}
		if (query?.endDate) {
			filtered = filtered.filter((e) => e.timestamp <= query.endDate!);
		}

		const result: Record<AlertSeverity, number> = {
			critical: 0,
			warning: 0,
			info: 0,
		};
		for (const event of filtered) {
			result[event.severity]++;
		}
		return result;
	}

	/**
	 * Returns category distribution across all (or filtered) events.
	 */
	getCategoryDistribution(query?: {
		startDate?: string;
		endDate?: string;
	}): Record<AlertCategory, number> {
		let filtered = [...this.events];
		if (query?.startDate) {
			filtered = filtered.filter((e) => e.timestamp >= query.startDate!);
		}
		if (query?.endDate) {
			filtered = filtered.filter((e) => e.timestamp <= query.endDate!);
		}

		const result: Record<AlertCategory, number> = {
			"payment-connection-failure": 0,
			"webhook-processing-failure": 0,
			"notification-delivery-failure": 0,
			"provider-api-outage": 0,
		};
		for (const event of filtered) {
			result[event.category]++;
		}
		return result;
	}

	/**
	 * Returns the most recent critical alerts.
	 */
	getRecentCritical(limit: number = 5): OperationalAlertEvent[] {
		return this.events
			.filter((e) => e.severity === "critical")
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() -
					new Date(a.timestamp).getTime(),
			)
			.slice(0, limit);
	}

	/**
	 * Returns total count of unacknowledged events.
	 */
	countUnacknowledged(): number {
		return this.events.filter((e) => !e.acknowledged).length;
	}

	/**
	 * Returns all events (for testing).
	 */
	getAll(): readonly OperationalAlertEvent[] {
		return this.events;
	}

	/**
	 * Clears all events (for testing).
	 */
	clear(): void {
		this.events.length = 0;
	}
}
