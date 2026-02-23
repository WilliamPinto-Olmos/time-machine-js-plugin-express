import { AsyncLocalStorage } from "async_hooks";
import {
  travel,
  returnToPresent,
  getMode,
  getOffset,
  isActive,
  type TimeMachineMode,
} from "time-machine-js";
import type { Request, Response, NextFunction } from "express";

export const timeMachineStore = new AsyncLocalStorage<{
  targetTimestamp: number;
}>();

export interface TimeMachineMiddlewareOptions {
  /**
   * Header name to look for to trigger time travel.
   * @default 'x-time-traveled-to'
   */
  headerName?: string;
}

let envTimeSet = false;

export interface TimeMachineOptions {
  mode: TimeMachineMode;
}

export function initTimeMachineFromEnv(config: TimeMachineOptions) {
  if (envTimeSet) return;

  const envDate = process.env.TIME_MACHINE_TRAVEL_TO;
  if (envDate) {
    const timestamp = new Date(envDate).getTime();
    if (!isNaN(timestamp)) {
      travel(timestamp, config.mode);
      envTimeSet = true;
    } else {
      console.warn(
        `[time-machine-js-plugin-express] Invalid date format in TIME_MACHINE_TRAVEL_TO: ${envDate}`,
      );
    }
  }
}

export function timeMachineMiddleware(
  options: TimeMachineMiddlewareOptions = {},
) {
  const headerName = (options.headerName || "x-time-traveled-to").toLowerCase();

  return (req: Request, res: Response, next: NextFunction) => {
    const headerValue = req.headers[headerName];

    const resolvedHeaderValue = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!resolvedHeaderValue || typeof resolvedHeaderValue !== "string") {
      return next();
    }

    const targetDate = new Date(resolvedHeaderValue);
    const targetTimestamp = targetDate.getTime();

    if (isNaN(targetTimestamp)) {
      console.warn(
        `[time-machine-js-plugin-express] Invalid date received in header ${headerName}: ${resolvedHeaderValue}`,
      );
      return next();
    }

    const wasActive = isActive();
    const currentMode = getMode() as TimeMachineMode | null;
    const currentOffset = getOffset();

    let originalTimestamp: number | null = null;
    if (wasActive && currentMode === "flowing" && currentOffset !== null) {
      originalTimestamp = Date.now();
    } else if (
      wasActive &&
      currentMode === "frozen" &&
      currentOffset !== null
    ) {
      originalTimestamp = currentOffset;
    }

    travel(targetTimestamp, "flowing");

    let reverted = false;
    const revertTime = () => {
      if (reverted) return;

      if (wasActive && originalTimestamp !== null && currentMode !== null) {
        travel(originalTimestamp, currentMode);
      } else if (!wasActive) {
        returnToPresent();
      }
      reverted = true;
    };
    res.on("finish", revertTime);
    res.on("close", revertTime);

    timeMachineStore.run({ targetTimestamp }, () => {
      next();
    });
  };
}
