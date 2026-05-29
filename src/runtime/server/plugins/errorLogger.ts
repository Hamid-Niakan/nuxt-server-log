import { defineNitroPlugin } from "#build/types/nitro-imports";
import { logger } from "../utils/logger";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", (error, event) => {
    logger.error("Nitro Error!", error, { event });
  });
});
