import { describe, it, expect } from "vitest";

describe("Example Test Suite", () => {
  it("should pass a basic test", () => {
    expect(true).toBe(true);
  });

  it("should perform basic math", () => {
    expect(2 + 2).toBe(4);
  });

  it("should handle strings", () => {
    expect("HSK System").toContain("HSK");
  });
});
