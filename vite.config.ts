import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/pwa-192.svg', 'icons/pwa-512.svg', 'favicon.svg'],
      manifest: {
        name: 'Pokémon Location Encounter Graph',
        short_name: 'Pokémon Graph',
        description: 'Explore Pokémon locations and track encounter checklist progress by generation and location.',
        theme_color: '#0f1020',
        background_color: '#090911',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,webmanifest}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.indexOf('node_modules') >= 0) {
            if (id.indexOf('@xyflow') >= 0 || id.indexOf('dagre') >= 0) {
              return 'graph-vendor';
            }
            if (id.indexOf('@mantine') >= 0 || id.indexOf('@tabler') >= 0) {
              return 'ui-vendor';
            }
            return undefined;
          }
          return undefined;
        }
      }
    }
  }
});