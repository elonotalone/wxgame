import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@wxgame": path.resolve(__dirname, "../src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3007,
    strictPort: true,
    // p3007.oceandino.com is reverse-proxied by Caddy to 127.0.0.1:3007,
    // so the dev server must allow that Host header. Same pattern as
    // p3006.oceandino.com → wxapp-preview.
    allowedHosts: [
      "p3007.oceandino.com",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      // Allow HMR to work behind the https reverse proxy.
      clientPort: 443,
      host: "p3007.oceandino.com",
      protocol: "wss",
    },
    // Watch ../src so game.js edits trigger reload of the preview.
    watch: {
      ignored: ["!**/../src/**"],
    },
    fs: {
      allow: [path.resolve(__dirname, ".."), path.resolve(__dirname, "../src")],
    },
  },
});
