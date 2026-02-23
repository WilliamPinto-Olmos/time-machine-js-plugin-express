import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { timeMachineMiddleware, initTimeMachineFromEnv } from "../src/index";
// @ts-ignore
import { returnToPresent, getOffset, isActive, travel } from "time-machine-js";

describe("time-machine-js-plugin-express middleware", () => {
  beforeEach(() => {
    returnToPresent();
  });

  afterEach(() => {
    returnToPresent();
  });

  it("should not alter time if no header is present", async () => {
    const app = express();
    app.use(timeMachineMiddleware());

    app.get("/time", (req, res) => {
      res.json({ time: Date.now() });
    });

    const now1 = Date.now();
    const response = await request(app).get("/time");
    const now2 = Date.now();

    expect(response.status).toBe(200);
    // Time should be between now1 and now2
    expect(response.body.time).toBeGreaterThanOrEqual(now1);
    expect(response.body.time).toBeLessThanOrEqual(now2 + 10);
  });

  it("should set time based on the header and revert afterwards", async () => {
    const app = express();
    app.use(timeMachineMiddleware());

    let timeInsideRequest = 0;
    app.get("/time", (req, res) => {
      timeInsideRequest = Date.now();
      res.json({ time: timeInsideRequest });
    });

    const initialRealTime = Date.now();

    const targetDate = new Date("1999-12-31T23:59:59Z");
    const response = await request(app)
      .get("/time")
      .set("x-time-traveled-to", targetDate.toISOString());

    expect(response.status).toBe(200);

    // Inside the request, time should be close to 1999-12-31T23:59:59Z
    expect(response.body.time).toBeGreaterThanOrEqual(targetDate.getTime());
    expect(response.body.time).toBeLessThan(targetDate.getTime() + 100);

    // After request completely finishes, time should be back to real time
    const timeAfterRequest = Date.now();
    expect(timeAfterRequest).toBeGreaterThanOrEqual(initialRealTime);
    expect(Math.abs(timeAfterRequest - initialRealTime)).toBeLessThan(500); // Shouldn't have jumped years
  });

  it("should restore previously mocked time instead of real time if time was already mocked", async () => {
    const app = express();
    app.use(timeMachineMiddleware());

    app.get("/time", (req, res) => {
      res.json({ time: Date.now() });
    });

    // Mock time BEFORE request
    const baseFakeDate = new Date("2020-01-01T12:00:00Z");
    travel(baseFakeDate.getTime(), "frozen");

    // Now make the request, passing a NEW time
    const requestTargetDate = new Date("2024-05-05T00:00:00Z");
    const response = await request(app)
      .get("/time")
      .set("x-time-traveled-to", requestTargetDate.toISOString());

    expect(response.status).toBe(200);

    // The request should have seen the 2024 date
    expect(response.body.time).toBeGreaterThanOrEqual(
      requestTargetDate.getTime(),
    );

    // But after the request, it should return to the 2020 date (which was frozen)
    expect(Date.now()).toBe(baseFakeDate.getTime());
  });
});
