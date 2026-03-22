# Integration Failure Operator Response Runbook

> **Document version:** 1.0.0
> **Last updated:** 2026-03-22
> **Audience:** Platform operators and on-call engineers
> **Related views:** Platform Admin → Integration Failure Dashboard

---

## Quick-Reference: Severity / Response Matrix

| Severity | Response SLA | Action Required | Escalation |
|----------|-------------|-----------------|------------|
| **Critical** | Immediate (< 15 min) | Active investigation and resolution | Escalate to engineering lead if unresolved in 30 min |
| **Warning** | Within 1 hour | Investigate root cause, monitor for escalation | Auto-escalates to critical after threshold |
| **Info** | Next business day | Review and acknowledge | No escalation required |

---

## Alert Categories

### 1. Payment Connection Failure

**Category:** `payment-connection-failure`
**Source module:** Payment connection service

#### Description
A tenant's payment provider connection has failed verification, been suspended, or failed a health check. This blocks the tenant from processing payments.

#### Typical Causes
- Invalid or expired API credentials (publishable key, secret key, access token)
- Provider account suspended or restricted
- Provider API endpoint unreachable
- Credential rotation without updating the platform
- Sandbox/production mode mismatch

#### Diagnostic Steps
1. Open the **Integration Failure Dashboard** and filter by category `payment-connection-failure`
2. Note the affected `tenantId` and `connectionId` from the alert detail
3. Check the `provider` field (Stripe or Square)
4. Review the `errorMessage` for specific error codes
5. Check the provider's status page for ongoing incidents
6. Verify that the `PAYMENT_ENCRYPTION_KEY` environment variable is set correctly

#### Resolution Procedures
1. **Credential verification failure:**
   - Contact the tenant admin to re-submit credentials through the tenant admin panel
   - Verify credentials are for the correct environment (sandbox vs production)
2. **Connection suspended:**
   - Check the `suspendedReason` in the payment connection detail
   - If caused by health check failure, attempt re-verification
   - If caused by provider account issue, contact tenant to resolve with provider
3. **Health check failure:**
   - Verify provider API endpoint is reachable from the platform
   - Check for rate limiting or IP restrictions
   - Attempt manual re-verification through the admin panel

#### Escalation Criteria
- Escalate if **3 or more** payment connection failures occur for the same tenant within 1 hour
- Escalate immediately if multiple tenants are affected simultaneously (possible provider outage)
- Escalate if re-verification fails repeatedly

---

### 2. Webhook Processing Failure

**Category:** `webhook-processing-failure`
**Source module:** Webhook ingestion and processing service

#### Description
A webhook event from a payment provider failed signature verification, processing, or has been dead-lettered after maximum retry attempts.

#### Typical Causes
- Webhook secret mismatch (rotated at provider but not updated in platform)
- Malformed webhook payload
- Timestamp drift beyond tolerance (Stripe: 300s)
- Processing logic error for unrecognized event types
- Database or queue unavailability during processing

#### Diagnostic Steps
1. Open the **Integration Failure Dashboard** and filter by category `webhook-processing-failure`
2. Note the `eventId` and `provider` from the alert detail
3. Navigate to **Webhook Inspection** view for detailed event payload
4. Check `retryCount` and `maxRetries` to understand retry state
5. Review the `errorMessage` for specific processing errors
6. Check if the event type is in the supported mapping (Stripe/Square event types)

#### Resolution Procedures
1. **Signature verification failure:**
   - Verify the webhook secret matches what's configured at the provider
   - Check for clock skew between platform servers and provider
   - If the secret was rotated, update the platform configuration
2. **Processing failure:**
   - Review the event payload in the Webhook Inspection view
   - If the event type is unrecognized, it will be skipped (no action needed)
   - If processing failed due to a transient error, use the **Replay** feature
3. **Dead-lettered events:**
   - Review the event in the Webhook Inspection view
   - Determine if manual reconciliation is needed (compare provider state with platform state)
   - After reconciliation, acknowledge the alert

#### Escalation Criteria
- Escalate if **5 or more** webhook failures occur within 1 hour
- Escalate immediately for dead-lettered events affecting payment state
- Escalate if signature verification failures suggest a security incident

---

### 3. Notification Delivery Failure

**Category:** `notification-delivery-failure`
**Source module:** Notification delivery service

#### Description
A notification failed to be delivered to a customer through email, SMS, or in-app channels. This may be a transient failure (retryable) or a permanent failure (dead-lettered).

#### Typical Causes
- Invalid recipient address (email bounced, invalid phone number)
- Delivery provider error (SMTP failure, SMS gateway error)
- Rate limiting by the delivery provider
- Content rejected by provider (spam filter, content policy)
- Provider configuration error (missing API key, wrong endpoint)

#### Diagnostic Steps
1. Open the **Integration Failure Dashboard** and filter by category `notification-delivery-failure`
2. Note the `deliveryId` and `channel` from the alert detail
3. Check the `retryCount` to see how many attempts have been made
4. Review the `errorMessage` for provider-specific error details
5. Check the notification delivery log for the affected tenant

#### Resolution Procedures
1. **Invalid recipient:**
   - Bounced notifications indicate the recipient address is invalid
   - No platform action required — the customer needs to update their contact info
   - Mark the alert as acknowledged after review
2. **Provider error:**
   - Check the delivery provider's status page
   - Verify provider API credentials are valid and not expired
   - If transient, the retry mechanism will handle it automatically
3. **Dead-lettered notifications:**
   - Review the notification event and delivery record
   - Determine if the notification is still relevant
   - If needed, create a new notification event to retrigger delivery
4. **Rate limiting:**
   - Review the sending rate and adjust if necessary
   - Contact the provider to increase rate limits if needed

#### Escalation Criteria
- Escalate if **10 or more** delivery failures occur within 1 hour
- Escalate immediately for dead-lettered notifications affecting critical flows (payment confirmations)
- Escalate if provider errors suggest a platform-wide configuration issue

---

### 4. Provider API Outage

**Category:** `provider-api-outage`
**Source module:** Provider adapter layer

#### Description
An external provider API (payment gateway, notification provider) is returning errors, timing out, or rate-limiting requests. This may affect multiple tenants.

#### Typical Causes
- Provider service degradation or outage
- Network connectivity issues between platform and provider
- Provider rate limiting due to high request volume
- Provider API version deprecation
- DNS resolution failure

#### Diagnostic Steps
1. Open the **Integration Failure Dashboard** and filter by category `provider-api-outage`
2. Note the affected `provider` from the alert detail
3. Check the provider's public status page for reported incidents
4. Review the `errorCode` and `errorMessage` for specific error details
5. Check if multiple tenants are affected (platform-wide issue)
6. Verify network connectivity from the platform to the provider

#### Resolution Procedures
1. **Provider outage:**
   - Monitor the provider's status page for updates
   - No platform action required — the retry mechanism and failover will handle recovery
   - Communicate with affected tenants if the outage is extended
2. **Rate limiting:**
   - Review current request rates
   - Implement request queuing or throttling if needed
   - Contact the provider to increase rate limits
3. **Timeout errors:**
   - Check network connectivity and latency
   - Consider increasing timeout thresholds if appropriate
   - If persistent, investigate infrastructure issues

#### Escalation Criteria
- Escalate if **3 or more** provider failures occur within 30 minutes
- Escalate immediately if the provider status page confirms an outage
- Escalate if the issue affects payment processing for any tenant

---

## On-Call Checklist

When receiving an integration failure alert:

1. **Assess severity** — Check the severity level in the alert
2. **Open the dashboard** — Navigate to Platform Admin → Integration Failure Dashboard
3. **Identify scope** — Determine if this affects one tenant or multiple
4. **Review details** — Click into the alert detail for context and resolution hints
5. **Follow the runbook** — Use the category-specific section above
6. **Acknowledge** — Mark the alert as acknowledged once reviewed
7. **Escalate if needed** — Follow escalation criteria for the category
8. **Document** — Record any manual interventions taken

## Manual Intervention Procedures

### Replaying a Failed Webhook
1. Navigate to Platform Admin → Webhook Inspection
2. Filter by status `failed`
3. Select the event to replay
4. Click **Replay** — the event will be reprocessed from the stored payload
5. Verify the new status is `processed`

### Re-verifying a Payment Connection
1. Navigate to the tenant's payment connections through the admin panel
2. Select the affected connection
3. Trigger re-verification
4. Monitor the connection status change

### Retriggering a Failed Notification
1. Note the original notification event details from the alert
2. Create a new notification event through the API
3. Monitor the delivery status in the notification delivery log

---

## Escalation Paths

| Level | Contact | When |
|-------|---------|------|
| **L1: On-call operator** | Platform operations team | First responder for all alerts |
| **L2: Engineering on-call** | Backend engineering team | Unresolved critical alerts after 30 min |
| **L3: Engineering lead** | Technical lead | Provider outages affecting multiple tenants, security incidents |
| **L4: Management** | Engineering management | Extended outages (> 2 hours), data integrity concerns |
