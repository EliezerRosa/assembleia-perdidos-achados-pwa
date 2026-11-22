import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const REPO_BASE = '/assembleia-perdidos-achados-pwa/';

export default defineConfig(({ command }) => {
  const base = command === 'build' ? REPO_BASE : '/';

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'Perdidos & Achados — Guarda-Volumes',
          short_name: 'Achados & GV',
          description:
            'PWA offline-first para gestão de Perdidos e Achados e Guarda-Volumes em Assembleias e Congressos com voz, fotos, etiquetas, rastreio e mesclagem multi-dispositivo.',
          theme_color: '#1e3a5f',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'any',
          lang: 'pt-BR',
          id: base,
          start_url: base,
          scope: base,
          categories: ['productivity', 'utilities'],
          icons: [
            {
              src: 'icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react'],
            xlsx: ['xlsx'],
            mermaid: ['mermaid'],
          },
        },
      },
    },
  };
});
