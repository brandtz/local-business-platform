import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(...segments: string[]): string {
  return readFileSync(path.resolve(__dirname, "..", "..", "..", "..", ...segments), "utf8");
}

describe("repository governance contract", () => {
  it("documents pull request and merge expectations", () => {
    const contributing = readRepoFile("CONTRIBUTING.md");
    const pullRequestTemplate = readRepoFile(".github", "pull_request_template.md");

    expect(contributing).toContain("## Pull Request Quality Gates");
    expect(contributing).toContain("## Merge Requirements");
    expect(contributing).toContain("## Artifact Visibility");
    expect(pullRequestTemplate).toContain("## Quality Gates");
    expect(pullRequestTemplate).toContain("## Failure Reporting");
  });

  it("documents engineering conventions and ADR workflow", () => {
    const engineeringConventions = readRepoFile("platform", "docs", "engineering-conventions.md");
    const adrReadme = readRepoFile("platform", "docs", "adr", "README.md");
    const adrTemplate = readRepoFile("platform", "docs", "adr", "0000-template.md");
    const featureDeliveryStandard = readRepoFile(
      "platform",
      "docs",
      "feature-delivery-standard.md"
    );
    const agentExecutionNorms = readRepoFile("platform", "docs", "agent-execution-norms.md");

    expect(engineeringConventions).toContain("## Module Ownership");
    expect(engineeringConventions).toContain("## Layering Rules");
    expect(engineeringConventions).toContain("## Naming Rules");
    expect(adrReadme).toContain("Status values:");
    expect(adrTemplate).toContain("## Context");
    expect(adrTemplate).toContain("## Decision");
    expect(featureDeliveryStandard).toContain("## Required Delivery Areas");
    expect(featureDeliveryStandard).toContain("## Observability Expectation");
    expect(agentExecutionNorms).toContain("## Before Editing");
    expect(agentExecutionNorms).toContain("## At Task Completion");
  });
});