import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.WEB_PORT ?? 3130),
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3131",
      },
    },
  },
});
