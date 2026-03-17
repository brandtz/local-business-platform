import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  packageName,
  workspaceDependencyRules,
  type WorkspacePackageName
} from "./index";

type PackageManifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  peerDependencies?: Record<string, string>;
};

type WorkspaceManifest = {
  internalDependencies: WorkspacePackageName[];
  name: WorkspacePackageName;
};

const WORKSPACE_PACKAGE_NAMES = Object.keys(
  workspaceDependencyRules
) as WorkspacePackageName[];

function readManifest(workspacePathSegments: string[]): PackageManifest {
  const manifestPath = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    ...workspacePathSegments,
    "package.json"
  );

  return JSON.parse(readFileSync(manifestPath, "utf8")) as PackageManifest;
}

function readWorkspaceManifests(): WorkspaceManifest[] {
  const workspacePaths: Array<{ name: WorkspacePackageName; segments: string[] }> = [
    { name: "@platform/config", segments: ["packages", "config"] },
    { name: "@platform/types", segments: ["packages", "types"] },
    { name: "@platform/utils", segments: ["packages", "utils"] },
    { name: "@platform/ui", segments: ["packages", "ui"] },
    { name: "@platform/sdk", segments: ["packages", "sdk"] },
    { name: "@platform/api", segments: ["apps", "api"] },
    { name: "@platform/worker", segments: ["apps", "worker"] },
    { name: "@platform/web-customer", segments: ["apps", "web-customer"] },
    { name: "@platform/web-admin", segments: ["apps", "web-admin"] },
    {
      name: "@platform/web-platform-admin",
      segments: ["apps", "web-platform-admin"]
    }
  ];

  return workspacePaths.map(({ name, segments }) => {
    const manifest = readManifest(segments);
    const dependencyNames = [
      ...Object.keys(manifest.dependencies || {}),
      ...Object.keys(manifest.devDependencies || {}),
      ...Object.keys(manifest.peerDependencies || {})
    ].filter((dependencyName): dependencyName is WorkspacePackageName =>
      WORKSPACE_PACKAGE_NAMES.includes(dependencyName as WorkspacePackageName)
    );

    return {
      internalDependencies: [...new Set(dependencyNames)],
      name
    };
  });
}

function assertAcyclicGraph(workspaceManifests: WorkspaceManifest[]): void {
  const graph = new Map(
    workspaceManifests.map(({ internalDependencies, name }) => [name, internalDependencies])
  );
  const visiting = new Set<WorkspacePackageName>();
  const visited = new Set<WorkspacePackageName>();

  function visit(node: WorkspacePackageName): void {
    if (visited.has(node)) {
      return;
    }

    if (visiting.has(node)) {
      throw new Error(`Detected circular workspace dependency involving ${node}`);
    }

    visiting.add(node);

    for (const dependencyName of graph.get(node) || []) {
      visit(dependencyName);
    }

    visiting.delete(node);
    visited.add(node);
  }

  for (const workspaceName of graph.keys()) {
    visit(workspaceName);
  }
}

describe("workspace dependency rules", () => {
  it("defines dependency rules for every shared package and app shell", () => {
    expect(packageName).toBe("@platform/config");
    expect(Object.keys(workspaceDependencyRules)).toEqual([
      "@platform/config",
      "@platform/types",
      "@platform/utils",
      "@platform/ui",
      "@platform/sdk",
      "@platform/api",
      "@platform/worker",
      "@platform/web-customer",
      "@platform/web-admin",
      "@platform/web-platform-admin"
    ]);
  });

  it("keeps declared internal dependencies inside the allowed layer graph", () => {
    for (const workspaceManifest of readWorkspaceManifests()) {
      expect(workspaceManifest.internalDependencies).toEqual(
        expect.arrayContaining(workspaceManifest.internalDependencies)
      );

      for (const dependencyName of workspaceManifest.internalDependencies) {
        expect(workspaceDependencyRules[workspaceManifest.name]).toContain(dependencyName);
      }
    }
  });

  it("keeps the declared internal dependency graph acyclic", () => {
    expect(() => assertAcyclicGraph(readWorkspaceManifests())).not.toThrow();
  });
});