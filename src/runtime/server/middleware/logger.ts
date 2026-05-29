import {
  defineEventHandler,
  getRequestURL,
  getHeaders,
  getRequestIP,
} from "h3";
import { requestContext } from "../utils/context";
import { logger } from "../utils/logger";
import { randomUUID } from "node:crypto";
import type { RequestContext } from "../utils/context";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().logger;
  const url = getRequestURL(event);

  if (
    config.excludePaths?.some((path: string) => url.pathname.startsWith(path))
  )
    return;

  if (Math.random() > (config.sampleRate || 1)) return;

  const requestId = getHeaders(event)["x-request-id"] || randomUUID();
  const startTime = performance.now();

  const ctx: RequestContext = {
    requestId: requestId,
    startTime: startTime,
    event,
    apiCalls: [],
    errors: [],
    metaData: {},
  };

  requestContext.enterWith(ctx);

  event.node.res.setHeader("X-Request-ID", requestId);

  event.node.res.on("finish", () => {
    const duration = performance.now() - startTime;
    const headers = getHeaders(event);

    const logEntry = {
      "@timestamp": new Date().toISOString(),
      requestId: requestId,
      userAgent: headers["user-agent"] || "unknown",
      statusCode: event.node.res.statusCode,
      method: event.method,
      path: url.pathname,
      query: url.search,
      remoteAddress:
        headers["ar-real-ip"] || getRequestIP(event, { xForwardedFor: true }),
      duration: Math.round(duration),
      apiCalls: ctx.apiCalls,
      errors: ctx.errors,
      metadata: Object.keys(ctx.metaData).length > 0 ? ctx.metaData : undefined,
    };

    if (duration > 3000) {
      logger.warn("Slow request detected", {
        duration: Math.round(duration),
        path: url.pathname,
      });
    }

    ctx.apiCalls.forEach((call) => {
      if (call.duration > (config.apiTimeout || 5000)) {
        logger.warn("Slow API call detected", {
          url: call.url,
          duration: Math.round(call.duration),
        });
      }
    });

    logger.logRequest(logEntry);
  });
});
