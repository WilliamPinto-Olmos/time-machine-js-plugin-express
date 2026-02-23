import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { returnToPresent, getMode, isActive } from "time-machine-js";

describe("time-machine-js-plugin-express env map", () => {
  beforeEach(() => {
    vi.resetModules();
    returnToPresent();
  });

  afterEach(() => {
    delete process.env.TIME_MACHINE_TRAVEL_TO;
    returnToPresent();
  });

  it("should initialize time from process.env if available", async () => {
    process.env.TIME_MACHINE_TRAVEL_TO = "2020-05-01T00:00:00Z";
    await import("../src/index");

    expect(isActive()).toBe(true);
    expect(getMode()).toBe("flowing");

    const now = Date.now();
    const expected = new Date("2020-05-01T00:00:00Z").getTime();

    expect(now).toBeGreaterThanOrEqual(expected);
    expect(now).toBeLessThan(expected + 100);
  });
});
