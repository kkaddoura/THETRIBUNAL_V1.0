import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["artifacts/**/src/**/*.test.{ts,tsx}", "lib/**/src/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "artifacts/tmh-platform/src"),
    },
  },
})
