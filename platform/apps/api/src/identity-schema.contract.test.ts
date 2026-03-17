import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function readSchema(): string {
  return readFileSync(path.resolve(__dirname, "..", "prisma", "schema.prisma"), "utf8");
}

describe("identity schema contract", () => {
  it("defines the core identity enums", () => {
    const schema = readSchema();

    expect(schema).toContain("enum ActorType");
    expect(schema).toContain("enum UserStatus");
    expect(schema).toContain("enum PlatformRole");
    expect(schema).toContain("enum TenantStatus");
    expect(schema).toContain("enum TenantRole");
    expect(schema).toContain("enum CredentialKind");
    expect(schema).toContain("enum SessionScope");
  });

  it("defines users, password credentials, and auth sessions", () => {
    const schema = readSchema();

    expect(schema).toContain("model User");
    expect(schema).toContain("model Tenant");
    expect(schema).toContain("model TenantMembership");
    expect(schema).toContain("model PasswordCredential");
    expect(schema).toContain("model AuthSession");
    expect(schema).toContain("normalizedEmail   String               @unique");
    expect(schema).toContain("refreshTokenHash  String       @unique");
    expect(schema).toContain("@@unique([tenantId, userId])");
  });
});
