/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/english-adventure/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/*.svg", "icons/*.png"],
      manifest: {
        name: "My English Adventure",
        short_name: "English Adventure",
        description: "A playful, offline English adventure for young learners.",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fff8e8",
        theme_color: "#23aeb1",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          {
            src: "icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml"
          },
          {
            src: "icons/icon-maskable.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,mp3}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true
      }
    })
  ],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: []
  }
});
