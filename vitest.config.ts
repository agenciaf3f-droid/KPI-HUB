import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // `server-only` é um guard de build do Next e não resolve fora dele.
      // Vira no-op no teste; o guard continua valendo em `next build`.
      "server-only": new URL("./src/test/server-only-stub.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
