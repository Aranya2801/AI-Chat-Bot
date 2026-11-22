import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // the api server runs separately in dev (npm run dev starts both)
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          markdown: ["marked", "marked-highlight", "highlight.js/lib/common", "dompurify"],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
