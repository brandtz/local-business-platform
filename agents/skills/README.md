# Agent Skills Library

> Curated from the [Awesome Agent Skills](https://github.com/VoltAgent/awesome-agent-skills) collection.
> Skills in this library are organized by domain relevance to our **Local Business SaaS Platform**.

## Skills Path

For GitHub Copilot, skills live in `.github/skills/` or `~/.copilot/skills/`.
This collection is maintained under `agents/skills/` as our canonical source.

| Tool | Project Path | Global Path |
|------|-------------|-------------|
| GitHub Copilot | `.github/skills/` | `~/.copilot/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `.agents/skills/` | `~/.agents/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Gemini CLI | `.gemini/skills/` | `~/.gemini/skills/` |

## Directory Structure

```
skills/
├── README.md                    ← You are here
├── development/                 ← Core dev: React, Node, TypeScript, testing
├── security/                    ← OWASP, threat modeling, code audit
├── design/                      ← UI/UX, web design, accessibility
├── product-management/          ← PRDs, roadmaps, strategy, discovery
├── marketing/                   ← SEO, growth, CRO, content
├── infrastructure/              ← Deployment, CI/CD, cloud ops
├── data/                        ← PostgreSQL, analytics, data pipelines
├── workflow/                    ← Git, code review, PR workflows
├── context-engineering/         ← Prompt engineering, agent patterns
└── official/                    ← Official vendor skills (Anthropic, Vercel, etc.)
```

## Skill Quality Standards

| Area | Guideline |
|------|-----------|
| **Description** | Third person. State what the skill does and when to use it. |
| **Progressive disclosure** | Top-level metadata under ~100 tokens. Body under 500 lines. |
| **No absolute paths** | Use `$HOME`, `$PROJECT_ROOT`, or relative paths. |
| **Scoped tools** | Request only the tools the skill needs. No blanket `"tools": ["*"]`. |

## Security Notice

Skills are curated, not audited. Review before use. They may contain prompt injections or unsafe patterns.
Always validate the source before installing.
