import { addApiCall } from "../utils/context";
import type { ApiCall } from "../utils/context";
import { defineNitroPlugin } from "nitropack/runtime";

export default defineNitroPlugin(() => {
  const originalNativeFetch = globalThis.fetch;

  globalThis.fetch = new Proxy(originalNativeFetch, {
    apply: async (target, thisArg, args: [RequestInfo | URL, RequestInit?]) => {
      const [input, init = {}] = args;
      const startTime = performance.now();
      const timestamp = new Date().toISOString();
      const method =
        init.method ||
        (typeof input === "object" && "method" in input ? input.method : "GET");
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      let status: number | null = null;
      let error: string | undefined;

      try {
        const response = await Reflect.apply(target, thisArg, args);
        status = response.status;
        if (!response.ok)
          error = `HTTP Error ${status}: ${response.statusText || "Unknown Error"}`;
        return response;
      } catch (err) {
        if (err instanceof Error) error = err.message;
        else error = String(err);
        status = null;
        throw err;
      } finally {
        const duration = performance.now() - startTime;

        const apiCall: ApiCall = {
          "@timestamp": timestamp,
          statusCode: status,
          url: url,
          method: method.toUpperCase(),
          duration: Math.round(duration),
          error,
        };

        addApiCall(apiCall);
      }
    },
  });
});
