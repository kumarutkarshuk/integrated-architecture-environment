import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["hooks/**/*.test.ts", "hooks/**/*.test.tsx"],
  },
});
