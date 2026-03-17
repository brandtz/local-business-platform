import { describe, expect, it } from "vitest";

import { packageName, parsePositiveInteger, trimToUndefined } from "./index";

describe("utils package public entrypoint", () => {
  it("exposes reusable parsing helpers", () => {
    expect(packageName).toBe("@platform/utils");
    expect(trimToUndefined(" value ")).toBe("value");
    expect(parsePositiveInteger("4", 1, "test value")).toBe(4);
  });

  it("rejects invalid positive integers", () => {
    expect(() => parsePositiveInteger("0", 1, "test value")).toThrow(
      "Invalid test value: 0"
    );
  });
});