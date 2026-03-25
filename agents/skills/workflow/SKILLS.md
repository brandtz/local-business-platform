# Workflow & Collaboration Skills

Skills for Git workflows, code review, PRs, documentation, and team collaboration.

---

## Code Review
- **Source**: [garrytan/review](https://github.com/garrytan/gstack/tree/main/review)
- **Description**: Staff Engineer code review: finds bugs that pass CI but blow up in production.
- **Use when**: Reviewing PRs for production readiness.

## Code Review (NeoLab)
- **Source**: [NeoLabHQ/code-review](https://github.com/NeoLabHQ/context-engineering-kit/tree/master/plugins/code-review)
- **Description**: Comprehensive PR code review using specialized agents: bug-hunter, security-auditor, code-quality-reviewer, contracts-reviewer.
- **Use when**: Running thorough automated code reviews.

## Code Review (Sentry)
- **Source**: [getsentry/code-review](https://github.com/getsentry/skills/tree/main/plugins/sentry-skills/skills/code-review)
- **Description**: Perform code reviews with Sentry team best practices.
- **Use when**: Code review with error tracking awareness.

## PR Creation
- **Source**: [getsentry/create-pr](https://github.com/getsentry/skills/tree/main/plugins/sentry-skills/skills/create-pr)
- **Description**: Create pull requests with best practices.
- **Use when**: Opening PRs with proper description and context.

## PR Iteration
- **Source**: [getsentry/iterate-pr](https://github.com/getsentry/skills/tree/main/plugins/sentry-skills/skills/iterate-pr)
- **Description**: Iterate on pull request feedback.
- **Use when**: Addressing PR review comments.

## Commit Best Practices
- **Source**: [getsentry/commit](https://github.com/getsentry/skills/tree/main/plugins/sentry-skills/skills/commit)
- **Description**: Create commits with best practices for clear history.
- **Use when**: Writing commit messages and structuring commits.

## Bug Finding
- **Source**: [getsentry/find-bugs](https://github.com/getsentry/skills/tree/main/plugins/sentry-skills/skills/find-bugs)
- **Description**: Find and identify bugs in code using systematic analysis.
- **Use when**: Proactive bug hunting before release.

## Git PR (Push and Open PR)
- **Source**: [openai/yeet](https://github.com/openai/skills/tree/main/skills/.curated/yeet)
- **Description**: Stage, commit, push code, and open a GitHub pull request via CLI.
- **Use when**: Quick ship of code changes with a PR.

## GitHub Workflow
- **Source**: [callstackincubator/github](https://github.com/callstackincubator/agent-skills/tree/main/skills/github)
- **Description**: GitHub workflow patterns for PRs, code review, branching.
- **Use when**: Following GitHub-based development workflows.

## Git Workflow Skills
- **Source**: [fvadicamo/dev-agent-skills](https://github.com/fvadicamo/dev-agent-skills)
- **Description**: Git and GitHub workflow skills for commits, PRs, and code reviews.
- **Use when**: Managing git operations.

## Using Git Worktrees
- **Source**: [obra/using-git-worktrees](https://github.com/obra/superpowers/blob/main/skills/using-git-worktrees/SKILL.md)
- **Description**: Manage multiple Git working trees for parallel work.
- **Use when**: Working on multiple features simultaneously.

## Finishing a Branch
- **Source**: [obra/finishing-a-development-branch](https://github.com/obra/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md)
- **Description**: Complete Git code branches with proper cleanup.
- **Use when**: Wrapping up feature branches for merge.

## Requesting Code Review
- **Source**: [obra/requesting-code-review](https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md)
- **Description**: Initiate code review processes with proper context.
- **Use when**: Submitting code for review.

## Receiving Code Review
- **Source**: [obra/receiving-code-review](https://github.com/obra/superpowers/blob/main/skills/receiving-code-review/SKILL.md)
- **Description**: Process and incorporate code feedback constructively.
- **Use when**: Addressing code review feedback.

## QA Lead
- **Source**: [garrytan/qa](https://github.com/garrytan/gstack/tree/main/qa)
- **Description**: QA Lead: test your app, find bugs, fix them with atomic commits, auto-generate regression tests.
- **Use when**: Running QA passes on features.

## QA Reporter
- **Source**: [garrytan/qa-only](https://github.com/garrytan/gstack/tree/main/qa-only)
- **Description**: Same methodology as QA but report only, no code changes.
- **Use when**: Generating QA reports without making fixes.

## Investigate (Root Cause)
- **Source**: [garrytan/investigate](https://github.com/garrytan/gstack/tree/main/investigate)
- **Description**: Systematic root-cause debugging: no fixes without investigation, traces data flow, tests hypotheses.
- **Use when**: Investigating production issues.

## Document Release
- **Source**: [garrytan/document-release](https://github.com/garrytan/gstack/tree/main/document-release)
- **Description**: Technical Writer: update all project docs to match what you just shipped.
- **Use when**: Updating documentation after releases.

## Engineering Retro
- **Source**: [garrytan/retro](https://github.com/garrytan/gstack/tree/main/retro)
- **Description**: Eng Manager weekly retro with per-person breakdowns and shipping streaks.
- **Use when**: Running engineering retrospectives.

## AGENTS.md Generation
- **Source**: [getsentry/agents-md](https://github.com/getsentry/skills/tree/main/plugins/sentry-skills/skills/agents-md)
- **Description**: Generate and manage AGENTS.md files for project conventions.
- **Use when**: Creating or updating AGENTS.md for the platform.

## README Generation
- **Source**: [Shpigford/readme](https://github.com/Shpigford/skills/tree/main/readme)
- **Description**: Generate comprehensive project documentation.
- **Use when**: Creating or updating README files.

## GitHub Issue Creator
- **Source**: [microsoft/github-issue-creator](https://github.com/microsoft/skills/tree/main/.github/skills/github-issue-creator)
- **Description**: Structured GitHub issue reports from notes.
- **Use when**: Creating well-structured GitHub issues.

## Linear Issue Management
- **Source**: [openai/linear](https://github.com/openai/skills/tree/main/skills/.curated/linear)
- **Description**: Manage issues, projects, and team workflows in Linear.
- **Use when**: Working with Linear for project management.

## Linear Issues (Community)
- **Source**: [wrsmith108/linear-claude-skill](https://github.com/wrsmith108/linear-claude-skill)
- **Description**: Manage Linear issues, projects, and teams.
- **Use when**: Linear integration workflows.

## Notion Integration
- **Source**: [notiondevs/Notion Skills for Claude](https://www.notion.so/notiondevs/Notion-Skills-for-Claude-28da4445d27180c7af1df7d8615723d0)
- **Description**: Skills for working with Notion. 
- **Use when**: Managing Notion-based documentation.

## Meeting Summarization
- **Source**: [phuryn/summarize-meeting](https://github.com/phuryn/pm-skills/tree/main/pm-execution/skills/summarize-meeting)
- **Description**: Summarize meeting transcripts into structured notes and actions.
- **Use when**: Processing meeting recordings or transcripts.

## Ask Questions If Underspecified
- **Source**: [trailofbits/ask-questions-if-underspecified](https://github.com/trailofbits/skills/tree/main/plugins/ask-questions-if-underspecified)
- **Description**: Prompt for clarification on ambiguous requirements before proceeding.
- **Use when**: Requirements are vague or incomplete.

## Brainstorming
- **Source**: [obra/brainstorming](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md)
- **Description**: Generate and explore ideas systematically.
- **Use when**: Ideation sessions for new features or solutions.

## Writing Skills
- **Source**: [obra/writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md)
- **Description**: Develop and document capabilities.
- **Use when**: Writing technical documentation or guides.

## Skill Creator (Anthropic)
- **Source**: [anthropics/skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator)
- **Description**: Guide for creating skills that extend Claude's capabilities.
- **Use when**: Creating custom skills for the platform.

## Skill Authoring Workflow
- **Source**: [deanpeters/skill-authoring-workflow](https://github.com/deanpeters/Product-Manager-Skills/tree/main/skills/skill-authoring-workflow)
- **Description**: Meta workflow for authoring skills: choose path, validate, update docs, package.
- **Use when**: Creating new skills for the team.

## CFO Skills
- **Source**: [EveryInc/charlie-cfo-skill](https://github.com/EveryInc/charlie-cfo-skill)
- **Description**: Bootstrapped CFO financial management inspired by Charlie Munger.
- **Use when**: Financial planning and analysis.
