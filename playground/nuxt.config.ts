export default defineNuxtConfig({
  modules: ["../src/module"],
  devtools: { enabled: true },
  compatibilityDate: "latest",
  serverLog: {
    apiTimeout: 3000,
  },
});
