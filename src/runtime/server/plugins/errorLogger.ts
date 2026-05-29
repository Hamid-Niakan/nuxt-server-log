import { logger } from "../utils/logger";
import { defineNitroPlugin } from "nitropack/runtime";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", (error, event) => {
    logger.error("Nitro Error!", error, { event });
  });
});
