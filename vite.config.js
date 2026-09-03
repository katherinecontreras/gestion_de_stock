import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const streamShim = path.resolve(__dirname, "src/shims/stream.js");

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_", "EMAILJS_"],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      stream: streamShim,
      "node:stream": streamShim,
    },
  },
  optimizeDeps: {
    include: ["xlsx", "xlsx-js-style"],
    esbuildOptions: {
      alias: {
        stream: streamShim,
        "node:stream": streamShim,
      },
    },
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
