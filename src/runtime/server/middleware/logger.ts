import {
  defineEventHandler,
  getRequestURL,
  getHeaders,
  getRequestIP,
} from "h3";
import { requestContext } from "../utils/context";
import { logger } from "../utils/logger";
import { redactQueryString } from "../utils/helpers";
import { randomUUID } from "node:crypto";
import type { RequestContext } from "../utils/context";
import type { LoggerRuntimeConfig } from "../../types";
import { useRuntimeConfig } from "#imports";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig().logger as LoggerRuntimeConfig;
  const url = getRequestURL(event);

  if (config.excludePaths?.some((path) => url.pathname.startsWith(path)))
    return;

  // `?? 1` (not `|| 1`) so that sampleRate: 0 disables logging entirely
  // instead of being coerced back to "log everything".
  if (Math.random() > (config.sampleRate ?? 1)) return;

  const requestId = getHeaders(event)["x-request-id"] || randomUUID();
  const startTime = performance.now();

  const ctx: RequestContext = {
    requestId,
    startTime,
    event,
    apiCalls: [],
    errors: [],
    metaData: {},
  };

  // AsyncLocalStorage lets the fetch interceptor and logger reach the current
  // request's context without an explicit `event` reference. `enterWith` binds
  // the store to this request's async execution; each request runs in its own
  // async context, so stores do not bleed across concurrent requests.
  requestContext.enterWith(ctx);

  event.node.res.setHeader("X-Request-ID", requestId);

  let logged = false;
  const writeRequestLog = () => {
    if (logged) return;
    logged = true;

    const duration = performance.now() - startTime;
    const headers = getHeaders(event);

    const logEntry = {
      "@timestamp": new Date().toISOString(),
      requestId,
      userAgent: headers["user-agent"] || "unknown",
      statusCode: event.node.res.statusCode,
      method: event.method,
      path: url.pathname,
      query: redactQueryString(url.search, config.redactQueryKeys ?? []),
      // `xForwardedFor` trusts the X-Forwarded-For header, which is spoofable
      // unless requests pass through a trusted proxy. Set `remoteAddressHeader`
      // to read the client IP from a header your proxy controls instead.
      remoteAddress:
        (config.remoteAddressHeader
          ? headers[config.remoteAddressHeader]
          : undefined) || getRequestIP(event, { xForwardedFor: true }),
      duration: Math.round(duration),
      apiCalls: ctx.apiCalls,
      errors: ctx.errors,
      metadata: Object.keys(ctx.metaData).length > 0 ? ctx.metaData : undefined,
    };

    if (duration > config.responseDurationWarning) {
      logger.warn("Slow response detected", {
        duration: Math.round(duration),
        path: url.pathname,
      });
    }

    ctx.apiCalls.forEach((call) => {
      if (call.duration > config.apiDurationWarning) {
        logger.warn("Slow API call detected", {
          url: call.url,
          duration: Math.round(call.duration),
        });
      }
    });

    logger.logRequest(logEntry);
  };

  // `finish` fires once the response is fully sent; `close` covers aborted or
  // dropped connections that never finish. The `logged` guard emits only once.
  event.node.res.on("finish", writeRequestLog);
  event.node.res.on("close", writeRequestLog);
});
