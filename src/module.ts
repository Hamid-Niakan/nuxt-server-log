import {
  defineNuxtModule,
  addServerPlugin,
  addServerHandler,
  addServerImports,
  createResolver,
} from "nuxt/kit";
import type { LoggerRuntimeConfig } from "./runtime/types";

export interface ModuleOptions {
  enabled?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  sampleRate?: number;
  excludePaths?: string[];
  apiDurationWarning?: number;
  responseDurationWarning?: number;
  remoteAddressHeader?: string;
  redactQueryKeys?: string[];
  traceDepth?: number;
}

declare module "@nuxt/schema" {
  interface RuntimeConfig {
    logger: LoggerRuntimeConfig;
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-server-log",
    configKey: "serverLog",
    compatibility: {
      nuxt: ">=3.16.0",
    },
  },
  defaults: {
    enabled: true,
    logLevel: "info",
    sampleRate: 1,
    excludePaths: ["/__nuxt_error"],
    apiDurationWarning: 1500,
    responseDurationWarning: 3000,
    redactQueryKeys: [
      "token",
      "password",
      "secret",
      "apiKey",
      "api_key",
      "auth",
      "authorization",
      "access_token",
      "refresh_token",
    ],
    traceDepth: 10,
  },
  setup(options, nuxt) {
    if (!options.enabled) return;

    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.logger = { ...options } as LoggerRuntimeConfig;

    addServerHandler({
      middleware: true,
      handler: resolver.resolve("./runtime/server/middleware/logger"),
    });

    addServerPlugin(
      resolver.resolve("./runtime/server/plugins/apiInterceptor"),
    );

    addServerPlugin(resolver.resolve("./runtime/server/plugins/errorLogger"));

    addServerImports([
      {
        name: "logger",
        from: resolver.resolve("./runtime/server/utils/logger"),
      },
    ]);
  },
});
