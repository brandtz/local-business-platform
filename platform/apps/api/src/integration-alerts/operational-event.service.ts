// ---------------------------------------------------------------------------
// E8-S6-T2: Operational event service — emits structured alert events.
// Instruments integration failure points without modifying their internals.
// ---------------------------------------------------------------------------

import type {
	OperationalAlertEvent,
	OperationalAlertQuery,
	AlertContext,
	IntegrationFailureType,
	OperationalAlertDashboardMetrics,
	OperationalAlertSummary,
} from "@platform/types";
import {
	classifyFailure,
	applyEscalation,
	defaultResolutionHints,
	defaultEscalationRules,
} from "@platform/types";
import { OperationalEventRepository } from "./operational-event.repository";

let idCounter = 0;

function generateAlertId(): string {
	idCounter++;
	return `opalert-${Date.now()}-${idCounter}`;
}

/**
 * Service for emitting and querying structured operational alert events.
 * This is the observability layer that makes integration failures visible
 * to platform operators without modifying the integration modules themselves.
 */
export class OperationalEventService {
	constructor(private readonly repository: OperationalEventRepository) {}

	/**
	 * Emits a structured operational alert event for a known failure type.
	 * Automatically classifies the failure, applies escalation logic,
	 * and stores the event for platform-admin consumption.
	 */
	emitFailureAlert(params: {
		failureType: IntegrationFailureType;
		tenantId: string | null;
		summary: string;
		context: AlertContext;
		resolutionHint?: string;
	}): OperationalAlertEvent {
		const { category, severity: baseSeverity } = classifyFailure(
			params.failureType,
		);

		// Count recent occurrences for escalation
		const windowMs = defaultEscalationRules[category].windowMs;
		const recentCount = this.repository.countRecentByCategory(
			category,
			params.tenantId,
			windowMs,
		);
		const occurrenceCount = recentCount + 1;

		const severity = applyEscalation(
			category,
			baseSeverity,
			occurrenceCount,
		);

		const resolutionHint =
			params.resolutionHint ??
			defaultResolutionHints[params.failureType];

		const event: OperationalAlertEvent = {
			id: generateAlertId(),
			category,
			severity,
			tenantId: params.tenantId,
			timestamp: new Date().toISOString(),
			summary: params.summary,
			context: params.context,
			resolutionHint,
			acknowledged: false,
			occurrenceCount,
		};

		this.repository.insert(event);
		return event;
	}

	/**
	 * Emits an alert for a payment connection failure.
	 */
	emitPaymentConnectionFailure(params: {
		failureType: Extract<
			IntegrationFailureType,
			| "payment-credential-verification-failed"
			| "payment-connection-suspended"
			| "payment-health-check-failed"
			| "payment-transaction-failed"
		>;
		tenantId: string;
		connectionId?: string;
		provider?: string;
		errorMessage?: string;
	}): OperationalAlertEvent {
		return this.emitFailureAlert({
			failureType: params.failureType,
			tenantId: params.tenantId,
			summary: `Payment failure: ${params.failureType} for tenant ${params.tenantId}`,
			context: {
				sourceModule: "payment",
				entityId: params.connectionId,
				entityType: "payment-connection",
				provider: params.provider,
				errorMessage: params.errorMessage,
			},
		});
	}

	/**
	 * Emits an alert for a webhook processing failure.
	 */
	emitWebhookProcessingFailure(params: {
		failureType: Extract<
			IntegrationFailureType,
			| "webhook-signature-verification-failed"
			| "webhook-processing-failed"
			| "webhook-replay-failed"
			| "webhook-dead-letter"
		>;
		tenantId: string | null;
		eventId?: string;
		provider?: string;
		retryCount?: number;
		maxRetries?: number;
		errorMessage?: string;
	}): OperationalAlertEvent {
		return this.emitFailureAlert({
			failureType: params.failureType,
			tenantId: params.tenantId,
			summary: `Webhook failure: ${params.failureType}${params.tenantId ? ` for tenant ${params.tenantId}` : ""}`,
			context: {
				sourceModule: "webhook",
				entityId: params.eventId,
				entityType: "webhook-event",
				provider: params.provider,
				retryCount: params.retryCount,
				maxRetries: params.maxRetries,
				errorMessage: params.errorMessage,
			},
		});
	}

	/**
	 * Emits an alert for a notification delivery failure.
	 */
	emitNotificationDeliveryFailure(params: {
		failureType: Extract<
			IntegrationFailureType,
			| "notification-delivery-failed"
			| "notification-delivery-bounced"
			| "notification-delivery-dead-letter"
			| "notification-provider-error"
		>;
		tenantId: string;
		deliveryId?: string;
		channel?: string;
		retryCount?: number;
		maxRetries?: number;
		errorMessage?: string;
	}): OperationalAlertEvent {
		return this.emitFailureAlert({
			failureType: params.failureType,
			tenantId: params.tenantId,
			summary: `Notification failure: ${params.failureType} for tenant ${params.tenantId}`,
			context: {
				sourceModule: "notification",
				entityId: params.deliveryId,
				entityType: "notification-delivery",
				retryCount: params.retryCount,
				maxRetries: params.maxRetries,
				errorMessage: params.errorMessage,
				metadata: params.channel ? { channel: params.channel } : undefined,
			},
		});
	}

	/**
	 * Emits an alert for a provider API outage.
	 */
	emitProviderOutage(params: {
		failureType: Extract<
			IntegrationFailureType,
			| "provider-api-timeout"
			| "provider-api-error"
			| "provider-rate-limited"
		>;
		tenantId: string | null;
		provider: string;
		errorMessage?: string;
		errorCode?: string;
	}): OperationalAlertEvent {
		return this.emitFailureAlert({
			failureType: params.failureType,
			tenantId: params.tenantId,
			summary: `Provider outage: ${params.failureType} for ${params.provider}`,
			context: {
				sourceModule: "provider",
				provider: params.provider,
				errorMessage: params.errorMessage,
				errorCode: params.errorCode,
			},
		});
	}

	// -----------------------------------------------------------------------
	// Query methods for platform-admin views (E8-S6-T3)
	// -----------------------------------------------------------------------

	/**
	 * Lists operational alert events with filtering and pagination.
	 */
	listAlerts(query: OperationalAlertQuery): {
		alerts: OperationalAlertSummary[];
		total: number;
		limit: number;
		offset: number;
	} {
		const { events, total } = this.repository.list(query);
		const alerts: OperationalAlertSummary[] = events.map((e) => ({
			id: e.id,
			category: e.category,
			severity: e.severity,
			tenantId: e.tenantId,
			summary: e.summary,
			occurrenceCount: e.occurrenceCount,
			acknowledged: e.acknowledged,
			timestamp: e.timestamp,
		}));

		return {
			alerts,
			total,
			limit: query.limit ?? 50,
			offset: query.offset ?? 0,
		};
	}

	/**
	 * Returns the full detail of a single alert event.
	 */
	getAlertDetail(
		id: string,
	): (OperationalAlertSummary & {
		context: AlertContext;
		resolutionHint: string;
	}) | null {
		const event = this.repository.findById(id);
		if (!event) return null;
		return {
			id: event.id,
			category: event.category,
			severity: event.severity,
			tenantId: event.tenantId,
			summary: event.summary,
			occurrenceCount: event.occurrenceCount,
			acknowledged: event.acknowledged,
			timestamp: event.timestamp,
			context: event.context,
			resolutionHint: event.resolutionHint,
		};
	}

	/**
	 * Acknowledges an alert event.
	 */
	acknowledgeAlert(id: string): boolean {
		return this.repository.acknowledge(id);
	}

	/**
	 * Returns aggregated dashboard metrics.
	 */
	getDashboardMetrics(): OperationalAlertDashboardMetrics {
		const bySeverity = this.repository.getSeverityDistribution();
		const byCategory = this.repository.getCategoryDistribution();
		const recentCritical = this.repository.getRecentCritical(5).map(
			(e) => ({
				id: e.id,
				category: e.category,
				severity: e.severity,
				tenantId: e.tenantId,
				summary: e.summary,
				occurrenceCount: e.occurrenceCount,
				acknowledged: e.acknowledged,
				timestamp: e.timestamp,
			}),
		);

		return {
			totalAlerts:
				bySeverity.critical + bySeverity.warning + bySeverity.info,
			unacknowledgedCount: this.repository.countUnacknowledged(),
			bySeverity,
			byCategory,
			recentCritical,
		};
	}
}
