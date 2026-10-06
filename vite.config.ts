import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Our own worker (src/sw.ts) implements the network-first page update
      // strategy; the plugin injects the precache list and registers it.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: 'script-defer',
      // The glob below already picks up the icons; don't list them twice.
      includeManifestIcons: false,
      injectManifest: {
        // Precache build assets and icons, but not index.html: the page is
        // network-first so it's always current when online.
        globPatterns: ['**/*.{js,css,svg,png}'],
      },
      manifest: {
        name: 'Guitar Theory Trainer',
        short_name: 'GTT',
        description:
          'Practice guitar theory: notes on the neck, chords, scales, sheet music, ear training, and drones.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f4ef',
        theme_color: '#f6f4ef',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
