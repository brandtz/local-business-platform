# Security Skills

Skills for securing the Local Business SaaS Platform — OWASP, threat modeling, code auditing, and secure defaults.

---

## Security Best Practices (OpenAI)
- **Source**: [openai/security-best-practices](https://github.com/openai/skills/tree/main/skills/.curated/security-best-practices)
- **Description**: Review code for language-specific security vulnerabilities including injection, auth bypass, and data exposure.
- **Use when**: Reviewing any code that handles user input, authentication, or sensitive data.

## Security Threat Modeling
- **Source**: [openai/security-threat-model](https://github.com/openai/skills/tree/main/skills/.curated/security-threat-model)
- **Description**: Generate repo-specific threat models identifying trust boundaries, attack surfaces, and mitigations.
- **Use when**: Designing new features with security implications (payments, multi-tenancy, API access).

## Security Ownership Map
- **Source**: [openai/security-ownership-map](https://github.com/openai/skills/tree/main/skills/.curated/security-ownership-map)
- **Description**: Map people-to-file ownership, compute bus factor, and identify security risks from ownership gaps.
- **Use when**: Auditing code ownership across the monorepo.

## CSO (Chief Security Officer)
- **Source**: [garrytan/cso](https://github.com/garrytan/gstack/tree/main/cso)
- **Description**: OWASP Top 10 + STRIDE threat model with zero false-positive exclusions.
- **Use when**: Running a comprehensive security review of the platform.

## Defense in Depth
- **Source**: [obra/defense-in-depth](https://github.com/obra/superpowers/blob/main/skills/defense-in-depth/SKILL.md)
- **Description**: Multi-layered security approaches for comprehensive protection.
- **Use when**: Designing security architecture for multi-tenant SaaS features.

## Security Blue Book Builder
- **Source**: [SHADOWPR0/security-bluebook-builder](https://github.com/SHADOWPR0/security-bluebook-builder)
- **Description**: Build security Blue Books for sensitive apps — structured security documentation.
- **Use when**: Documenting security posture for compliance or investor due diligence.

## VibeSec
- **Source**: [BehiSecc/VibeSec-Skill](https://github.com/BehiSecc/VibeSec-Skill)
- **Description**: Prevents common vulnerabilities including IDOR, XSS, SQL injection, SSRF, and weak authentication from a bug hunter's perspective.
- **Use when**: Writing code that handles user input, API endpoints, or data access controls.

## Insecure Defaults Detection
- **Source**: [trailofbits/insecure-defaults](https://github.com/trailofbits/skills/tree/main/plugins/insecure-defaults)
- **Description**: Detect insecure default configurations like hardcoded secrets, default credentials, and weak crypto.
- **Use when**: Reviewing configuration files, environment setup, or authentication defaults.

## Static Analysis
- **Source**: [trailofbits/static-analysis](https://github.com/trailofbits/skills/tree/main/plugins/static-analysis)
- **Description**: Static analysis toolkit with CodeQL, Semgrep, and SARIF for automated vulnerability detection.
- **Use when**: Setting up CI security scanning or investigating potential vulnerabilities.

## Semgrep Rule Creation
- **Source**: [trailofbits/semgrep-rule-creator](https://github.com/trailofbits/skills/tree/main/plugins/semgrep-rule-creator)
- **Description**: Create and refine Semgrep rules for vulnerability detection patterns specific to your codebase.
- **Use when**: Creating custom security linting rules for the platform.

## Differential Review (Security)
- **Source**: [trailofbits/differential-review](https://github.com/trailofbits/skills/tree/main/plugins/differential-review)
- **Description**: Security-focused diff review with git history analysis for identifying regressions.
- **Use when**: Reviewing PRs that touch security-sensitive code.

## Fix Review
- **Source**: [trailofbits/fix-review](https://github.com/trailofbits/skills/tree/main/plugins/fix-review)
- **Description**: Verify fix commits address audit findings without introducing new bugs.
- **Use when**: Validating that security fixes actually resolve the identified vulnerability.

## Sharp Edges Detection
- **Source**: [trailofbits/sharp-edges](https://github.com/trailofbits/skills/tree/main/plugins/sharp-edges)
- **Description**: Identify error-prone APIs and dangerous configurations in your dependencies.
- **Use when**: Evaluating third-party libraries or reviewing unsafe API usage patterns.

## Audit Context Building
- **Source**: [trailofbits/audit-context-building](https://github.com/trailofbits/skills/tree/main/plugins/audit-context-building)
- **Description**: Deep architectural context via ultra-granular code analysis for security audits.
- **Use when**: Preparing for a security audit or building comprehensive system understanding.

## Secure Environment Variables
- **Source**: [wrsmith108/varlock-claude-skill](https://github.com/wrsmith108/varlock-claude-skill)
- **Description**: Secure environment variable management ensuring secrets never leak to logs, terminals, or git.
- **Use when**: Handling API keys, database credentials, or any secrets across the platform.

## ClawSec Security Suite
- **Source**: [prompt-security/clawsec](https://github.com/prompt-security/clawsec)
- **Description**: Security skill suite with drift detection, automated audits, and skill integrity verification.
- **Use when**: Continuous security monitoring and automated auditing.

## Cybersecurity Skills (753 domains)
- **Source**: [mukul975/Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
- **Description**: 753 cybersecurity skills across 38 domains: cloud security, pentesting, red teaming, DFIR, malware analysis.
- **Use when**: Deep-dive into specific cybersecurity domains relevant to the platform.
