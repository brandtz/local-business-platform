# Worker

Asynchronous processing service.

Primary concerns:
- import and publish jobs
- payment and domain webhooks
- notification delivery
- retries, backoff, and replay-safe processing

Ownership boundary:
- owns background job execution and async integration handling
- consumes durable contracts from API and shared packages
- must keep jobs idempotent, replay-safe, and auditable where privilege or money is involved
