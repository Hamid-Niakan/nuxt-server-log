import { AsyncLocalStorage } from "node:async_hooks";
import type { H3Event } from "h3";

export interface ApiCall {
  "@timestamp": string;
  statusCode: number | null;
  url: string;
  method: string;
  duration: number;
  error?: string;
}
export interface ErrorLog {
  "@timestamp": string;
  error: string;
  type: string;
  trace: string[];
  action: "unhandled" | "caught" | "fatal";
  context?: Record<string, unknown>;
}
export interface RequestContext {
  requestId: string;
  startTime: number;
  event: H3Event;
  apiCalls: ApiCall[];
  errors: ErrorLog[];
  metaData: Record<string, unknown>;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

export function addApiCall(call: ApiCall) {
  const ctx = getRequestContext();
  ctx?.apiCalls.push(call);
}

export function addError(error: ErrorLog) {
  const ctx = getRequestContext();
  ctx?.errors.push(error);
}

export function setMetaData(key: string, value: unknown) {
  const ctx = getRequestContext();
  if (ctx) ctx.metaData[key] = value;
}
