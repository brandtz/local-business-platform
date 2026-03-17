import { describe, expect, it } from "vitest";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns a healthy status payload", () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      service: "api",
      status: "ok"
    });
  });
});
