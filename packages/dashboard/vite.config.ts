import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8433",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        // SSE requires these settings to avoid buffering
        ws: true,
        headers: {
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      },
    },
  },
});
