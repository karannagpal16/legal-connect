import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// 1. Fallback port for local development if process.env.PORT isn't set
const port = Number(process.env.PORT) || 5173;

// 2. Fallback base path so it roots correctly on localhost
const basePath = process.env.BASE_PATH || "/";

const spaOutDir = path.resolve(import.meta.dirname, "..", "api-server", "public");

/**
 * Do NOT wipe hashed assets on every build.
 * Soft SPA navigation keeps the old runtime in memory; deleting prior chunks
 * causes "Failed to fetch dynamically imported module" until a hard refresh.
 * Vite overwrites changed files; orphaned hashes are safe to leave (or prune later).
 */
function retainSpaAssets(): Plugin {
  return {
    name: "retain-spa-assets",
    buildStart() {
      // Intentionally no-op: keep previous asset hashes available post-deploy.
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    retainSpaAssets(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    // Prevent split copies of react-query (breaks QueryClientProvider across lazy chunks).
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query"],
  },
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: spaOutDir,
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@tanstack/react-query") || id.includes("@tanstack+react-query")) {
            return "tanstack-query";
          }
        },
      },
    },
  },
  server: {
    port,
    host: "127.0.0.1", // Standard localhost mapping for Windows
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "127.0.0.1",
  },
});
