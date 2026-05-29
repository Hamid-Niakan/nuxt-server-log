import {
  defineNuxtModule,
  addServerPlugin,
  addServerHandler,
  createResolver,
} from "nuxt/kit";

export interface ModuleOptions {
  enabled?: boolean;
  logLevel?: "debug" | "info" | "warn" | "error";
  sampleRate?: number;
  excludePaths?: string[];
  apiTimeout?: number;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "nuxt-server-log",
    configKey: "serverLog",
  },
  defaults: {
    enabled: true,
    logLevel: "info",
    sampleRate: 1,
    excludePaths: ["/__nuxt_error"],
    apiTimeout: 5000,
  },
  setup(options, nuxt) {
    if (!options.enabled) return;

    const resolver = createResolver(import.meta.url);

    nuxt.options.runtimeConfig.logger = {
      enabled: options.enabled ?? true,
      logLevel: options.logLevel ?? "info",
      sampleRate: options.sampleRate ?? 1,
      excludePaths: options.excludePaths ?? ["/__nuxt_error"],
      apiTimeout: options.apiTimeout ?? 5000,
    };

    addServerHandler({
      middleware: true,
      handler: resolver.resolve("./runtime/server/middleware/logger"),
    });

    addServerPlugin(
      resolver.resolve("./runtime/server/plugins/apiInterceptor"),
    );

    addServerPlugin(resolver.resolve("./runtime/server/plugins/errorLogger"));
  },
});
