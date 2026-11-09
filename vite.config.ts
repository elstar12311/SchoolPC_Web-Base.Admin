import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",
  build: {
    outDir: path.resolve(rootDirectory, "SchoolPC.Admin.Web", "wwwroot"),
    emptyOutDir: true,
    sourcemap: false,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDirectory, "src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: Number(process.env.PORT || 8443),
    strictPort: true,
    watch: {
      ignored: ["**/SchoolPC.Admin.Web/bin/**", "**/SchoolPC.Admin.Web/obj/**"],
    },
    proxy: {
      "/api": {
        target: process.env.SCHOOLPC_API_URL || "http://localhost:5100",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: Number(process.env.PORT || 8443),
  },
});
