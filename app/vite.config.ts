import { viteCommonjs } from "@originjs/vite-plugin-commonjs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import inject from "@rollup/plugin-inject";
import path from "path";
import stdLibBrowser from "node-stdlib-browser";
import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    viteCommonjs(),
    inject({ process: "process/browser", Buffer: ["buffer", "Buffer"] }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      ...stdLibBrowser,
    },
  },
  optimizeDeps: {
    exclude: ["@midnight-ntwrk/midnight-js-level-private-state-provider"],
  },
  build: {
    target: "esnext",
  },
  worker: {
    format: "es",
    plugins: () => [wasm()],
  },
});
