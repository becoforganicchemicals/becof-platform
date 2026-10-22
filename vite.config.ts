import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  // Build-time prerender bundle (src/entry-server.tsx, run in Node by
  // scripts/prerender.mjs): bundle dependencies in, since several ship as
  // CommonJS that Node's ESM loader can't import by name. jsdom stays external.
  ssr: {
    noExternal: true,
    external: ["jsdom"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
