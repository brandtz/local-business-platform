# Infrastructure & Deployment Skills

Skills for CI/CD, cloud deployment, monitoring, and DevOps for the Local Business SaaS Platform.

---

## Vercel Deploy
- **Source**: [openai/vercel-deploy](https://github.com/openai/skills/tree/main/skills/.curated/vercel-deploy)
- **Description**: Deploy applications and websites to Vercel with preview or production options.
- **Use when**: Deploying the customer portal or admin dashboard to Vercel.

## Vercel Deploy (Claimable)
- **Source**: [vercel-labs/vercel-deploy-claimable](https://github.com/vercel-labs/agent-skills/tree/main/skills/claude.ai/vercel-deploy-claimable)
- **Description**: Deploy projects to Vercel with claimable deployment links.
- **Use when**: Creating shareable preview deployments.

## Netlify Deploy
- **Source**: [openai/netlify-deploy](https://github.com/openai/skills/tree/main/skills/.curated/netlify-deploy)
- **Description**: Automate Netlify deployments with CLI auth, linking, and environment support.
- **Use when**: Deploying static sites or storefront pages to Netlify.

## Netlify Functions
- **Source**: [netlify/netlify-functions](https://github.com/netlify/context-and-tools/tree/main/skills/netlify-functions)
- **Description**: Build serverless API endpoints and background tasks.
- **Use when**: Creating edge functions or serverless API endpoints.

## Netlify Caching
- **Source**: [netlify/netlify-caching](https://github.com/netlify/context-and-tools/tree/main/skills/netlify-caching)
- **Description**: Configure CDN caching and cache purging strategies.
- **Use when**: Optimizing storefront page delivery performance.

## Netlify Frameworks
- **Source**: [netlify/netlify-frameworks](https://github.com/netlify/context-and-tools/tree/main/skills/netlify-frameworks)
- **Description**: Deploy web frameworks with SSR support.
- **Use when**: Configuring SSR for the storefront.

## Render Deploy
- **Source**: [openai/render-deploy](https://github.com/openai/skills/tree/main/skills/.curated/render-deploy)
- **Description**: Deploy applications to Render's cloud platform using Git-backed services.
- **Use when**: Deploying API services to Render.

## Cloudflare Deploy
- **Source**: [openai/cloudflare-deploy](https://github.com/openai/skills/tree/main/skills/.curated/cloudflare-deploy)
- **Description**: Deploy apps to Cloudflare using Workers, Pages, and platform services.
- **Use when**: Deploying edge workers or static assets to Cloudflare.

## Cloudflare Wrangler
- **Source**: [cloudflare/wrangler](https://github.com/cloudflare/skills/tree/main/skills/wrangler)
- **Description**: Deploy and manage Workers, KV, R2, D1, Vectorize, Queues, Workflows.
- **Use when**: Managing Cloudflare infrastructure.

## Cloudflare Web Performance
- **Source**: [cloudflare/web-perf](https://github.com/cloudflare/skills/tree/main/skills/web-perf)
- **Description**: Audit Core Web Vitals and render-blocking resources.
- **Use when**: Performance auditing the platform.

## Cloudflare Durable Objects
- **Source**: [cloudflare/durable-objects](https://github.com/cloudflare/skills/tree/main/skills/durable-objects)
- **Description**: Stateful coordination with RPC, SQLite, and WebSockets.
- **Use when**: Building real-time features like live order tracking.

## GitHub Actions CI/CD
- **Source**: [openai/gh-fix-ci](https://github.com/openai/skills/tree/main/skills/.curated/gh-fix-ci)
- **Description**: Debug and fix failing GitHub Actions PR checks using log inspection.
- **Use when**: CI pipeline failures on PRs.

## GitHub PR Comments
- **Source**: [openai/gh-address-comments](https://github.com/openai/skills/tree/main/skills/.curated/gh-address-comments)
- **Description**: Address review and issue comments on open GitHub PRs via CLI.
- **Use when**: Responding to PR review feedback.

## Ship (Release Engineer)
- **Source**: [garrytan/ship](https://github.com/garrytan/gstack/tree/main/ship)
- **Description**: Release Engineer: sync main, run tests, audit coverage, push, open PR.
- **Use when**: Shipping code to production.

## Land and Deploy
- **Source**: [garrytan/land-and-deploy](https://github.com/garrytan/gstack/tree/main/land-and-deploy)
- **Description**: Merge the PR, wait for CI and deploy, verify production health.
- **Use when**: Landing PRs and deploying to production.

## Canary Monitoring
- **Source**: [garrytan/canary](https://github.com/garrytan/gstack/tree/main/canary)
- **Description**: SRE post-deploy monitoring: console errors, performance regressions, page failures.
- **Use when**: Monitoring production after deployments.

## Benchmark
- **Source**: [garrytan/benchmark](https://github.com/garrytan/gstack/tree/main/benchmark)
- **Description**: Performance Engineer: baseline page load times, Core Web Vitals, and resource sizes.
- **Use when**: Benchmarking platform performance.

## Azure Deployment (azd)
- **Source**: [microsoft/azd-deployment](https://github.com/microsoft/skills/tree/main/.github/skills/azd-deployment)
- **Description**: Azure Container Apps deployment with azd.
- **Use when**: Deploying to Azure infrastructure.

## Terraform
- **Source**: [hashicorp/terraform-code-generation](https://github.com/hashicorp/agent-skills/tree/main/terraform/code-generation)
- **Description**: Generate and validate Terraform HCL code.
- **Use when**: Managing infrastructure as code.

## Terraform Modules
- **Source**: [hashicorp/terraform-module-generation](https://github.com/hashicorp/agent-skills/tree/main/terraform/module-generation)
- **Description**: Create and refactor Terraform modules.
- **Use when**: Building reusable infrastructure modules.

## AWS Skills
- **Source**: [zxkane/aws-skills](https://github.com/zxkane/aws-skills)
- **Description**: AWS development with infrastructure automation and cloud architecture patterns.
- **Use when**: Working with AWS services.

## MCP Builder (Anthropic)
- **Source**: [anthropics/mcp-builder](https://github.com/anthropics/skills/tree/main/skills/mcp-builder)
- **Description**: Create MCP servers to integrate external APIs and services.
- **Use when**: Building AI agent integrations.

## MCP Builder (Microsoft)
- **Source**: [microsoft/mcp-builder](https://github.com/microsoft/skills/tree/main/.github/skills/mcp-builder)
- **Description**: MCP server creation guide.
- **Use when**: Creating MCP server integrations.

## Cloudflare MCP Server
- **Source**: [cloudflare/building-mcp-server-on-cloudflare](https://github.com/cloudflare/skills/tree/main/skills/building-mcp-server-on-cloudflare)
- **Description**: Build remote MCP servers with tools and OAuth.
- **Use when**: Deploying MCP servers to Cloudflare.

## Sentry Integration
- **Source**: [openai/sentry](https://github.com/openai/skills/tree/main/skills/.curated/sentry)
- **Description**: Inspect Sentry issues, summarize production errors, and pull health data.
- **Use when**: Debugging production errors from Sentry.

## Incident Response (Rootly)
- **Source**: [Rootly-AI-Labs/rootly-incident-responder](https://github.com/Rootly-AI-Labs/Rootly-MCP-server/blob/main/examples/skills/rootly-incident-responder.md)
- **Description**: AI-powered incident response with ML similarity matching, solution suggestions, and on-call coordination.
- **Use when**: Managing production incidents.
