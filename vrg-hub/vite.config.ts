import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // Inject build timestamp as version for cache busting
    __APP_VERSION__: JSON.stringify(`${Date.now()}`),
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/d2d': {
        target: 'https://d2d.visionradiology.com.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/d2d/, ''),
        ws: true,
        secure: true,
      },
      '/api/d2d': {
        target: 'https://d2d.visionradiology.com.au',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/d2d/, '/api'),
        secure: true,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('X-API-Key', 'd2d-Syx3apHoKbDi4rPwvDN0oAYjkT0q01ap9xhNK_eYk5c');
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-tanstack': ['@tanstack/react-query', '@tanstack/react-virtual'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['date-fns', 'date-fns-tz', 'dompurify', 'clsx', 'tailwind-merge'],
          'vendor-remotion': ['remotion', '@remotion/player'],
          'vendor-charts': ['recharts'],
          'vendor-quill': ['react-quill', 'quill-mention'],
          'vendor-documents': ['docx', 'jspdf', 'xlsx', 'file-saver'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
      },
    },
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    chunkSizeWarningLimit: 500,
    target: 'es2020',
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'crowdhub-logo.png', 'robots.txt'],
      manifest: {
        name: 'CrowdHub',
        short_name: 'CrowdHub',
        description: 'Your central hub for all requests and services',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/crowdhub-logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/crowdhub-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/hero-background*.svg'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Skip waiting and claim clients immediately for faster updates
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes for API data
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days for static assets
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
