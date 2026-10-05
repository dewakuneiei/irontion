import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Pure TypeScript and rune stores (.svelte.ts); the Svelte plugin compiles the runes.
export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { $lib: fileURLToPath(new URL("./src/lib", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"] },
});
