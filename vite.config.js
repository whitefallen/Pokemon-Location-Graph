import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/pwa-192.png", "icons/pwa-512.png", "favicon.svg"],
      devOptions: {
        enabled: true,
        type: "module",
      },
      manifest: {
        name: "Pokémon Location Encounter Graph",
        short_name: "Pokémon Graph",
        description:
          "Explore Pokémon locations and track encounter checklist progress by generation and location.",
        theme_color: "#0f1020",
        background_color: "#090911",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icons/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icons/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: function (_a) {
              var url = _a.url;
              return url.pathname.indexOf("/data/") === 0;
            },
            handler: "NetworkFirst",
            options: {
              cacheName: "dataset-json-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 24,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: function (id) {
          if (id.indexOf("node_modules") >= 0) {
            if (id.indexOf("@xyflow") >= 0 || id.indexOf("dagre") >= 0) {
              return "graph-vendor";
            }
            if (id.indexOf("@mantine") >= 0 || id.indexOf("@tabler") >= 0) {
              return "ui-vendor";
            }
            return undefined;
          }
          return undefined;
        },
      },
    },
  },
});
