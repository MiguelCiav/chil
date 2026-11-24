/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    testTimeout: 30000,
    hookTimeout: 30000,
    exclude: ["**/node_modules/**", "dist", "test/**/*", "functions/node_modules/**"],
    coverage: {
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}", "functions/**/*.js", "scraper-api/**/*.js"],
      exclude: [
        "**/node_modules/**",
        "dist",
        "src/test/**",
        "**/*.d.ts",
        "src/assets/**",
        "functions/node_modules/**",
        "scraper-api/node_modules/**"
      ]
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
}));
