import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages project URLs and any static host.
export default defineConfig({
  base: "./",
  build: { chunkSizeWarningLimit: 900 },
});
