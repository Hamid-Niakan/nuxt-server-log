import { getRequestContext } from "./context";
import { parseStackTrace, safeStringify } from "./helpers";
import type { ErrorLog } from "./context";
import type { LoggerRuntimeConfig } from "../../types";
import { useRuntimeConfig } from "#imports";

class Logger {
  private static instance: Logger;
  private logLevel?: number;
  private levels = { debug: 0, info: 1, warn: 2, error: 3 };

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) Logger.instance = new Logger();
    return Logger.instance;
  }

  private resolveLogLevel(): number {
    if (this.logLevel === undefined) {
      const level = (
        useRuntimeConfig().logger as LoggerRuntimeConfig | undefined
      )?.logLevel;
      this.logLevel = level !== undefined ? (this.levels[level] ?? 1) : 1;
    }
    return this.logLevel;
  }

  private shouldLog(level: keyof typeof this.levels): boolean {
    return this.levels[level] >= this.resolveLogLevel();
  }

  private formatLog(
    level: string,
    message: string,
    data?: Record<string, unknown>,
  ) {
    const ctx = getRequestContext();
    const baseLog = {
      "@timestamp": new Date().toISOString(),
      level,
      message,
      requestId: ctx?.requestId,
      ...data,
    };
    return safeStringify(baseLog);
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (this.shouldLog("debug"))
      console.log(this.formatLog("debug", message, data));
  }

  info(message: string, data?: Record<string, unknown>) {
    if (this.shouldLog("info"))
      console.log(this.formatLog("info", message, data));
  }

  warn(message: string, data?: Record<string, unknown>) {
    if (this.shouldLog("warn"))
      console.warn(this.formatLog("warn", message, data));
  }

  error(
    message: string,
    error?: Error,
    data?: Record<string, unknown>,
    action: ErrorLog["action"] = "unhandled",
  ) {
    if (this.shouldLog("error")) {
      const config = useRuntimeConfig().logger as
        | LoggerRuntimeConfig
        | undefined;
      const errorLog: ErrorLog = {
        "@timestamp": new Date().toISOString(),
        error: error?.message || message,
        type: error?.name || "Error",
        trace: parseStackTrace(error?.stack, config?.traceDepth),
        action,
        context: error?.cause ? { cause: error.cause } : undefined,
      };

      const ctx = getRequestContext();
      if (ctx) ctx.errors.push(errorLog);

      console.error(
        this.formatLog("error", message, { error: errorLog, data }),
      );
    }
  }

  logRequest(data: Record<string, unknown>) {
    console.log(safeStringify(data));
  }
}

export const logger = Logger.getInstance();
