import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite 8 uses Rolldown as the default bundler.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  // @rtc/packages is a linked workspace package that ships raw .ts source —
  // let Vite transform it as part of the module graph instead of pre-bundling.
  optimizeDeps: {
    exclude: ["@rtc/packages"],
  },
});
