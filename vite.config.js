import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const streamShim = path.resolve(__dirname, "src/shims/stream.js");

function publicAppUrl(env = {}) {
  const vercel = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    env.VERCEL_PROJECT_PRODUCTION_URL ||
    ""
  )
    .trim()
    .replace(/^https?:\/\//, "");
  if (vercel) return `https://${vercel}`;

  const explicit = (
    env.NEXT_PUBLIC_APP_URL ||
    env.VITE_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VITE_APP_URL ||
    ""
  ).trim();
  if (explicit && !/localhost|127\.0\.0\.1/i.test(explicit)) {
    return explicit.replace(/\/$/, "");
  }
  return "https://gestion-de-stock.vercel.app";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  plugins: [react()],
  envPrefix: ["VITE_", "NEXT_PUBLIC_", "EMAILJS_"],
  define: {
    "import.meta.env.APP_PUBLIC_URL": JSON.stringify(publicAppUrl(env)),
  },
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
};
});
