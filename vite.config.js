import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // JS e CSS sempre da rede — nunca do cache
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.+\.(js|css)$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'assets-cache', networkTimeoutSeconds: 10 },
          },
        ],
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LimpeJá SaaS',
        short_name: 'LimpeJá',
        description: 'Gestão Profissional para Higienização',
        theme_color: '#2563eb',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://higigestor.com',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      "react-aria/private/grid/GridKeyboardDelegate": path.resolve(__dirname, "./src/dummy-react-aria.js")
    }
  }
})
