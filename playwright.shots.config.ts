import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testIgnore: undefined,
  testMatch: "**/shots.spec.ts",
  reporter: "line",
  use: {
    ...baseConfig.use,
    trace: "off",
    screenshot: "off",
    video: "off"
  }
});
