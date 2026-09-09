import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        ws: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    // Skip printing compressed sizes — speeds up CI builds
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom') || id.includes('react-router') || id.includes('@remix-run')) {
              return 'vendor-router';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('axios') || id.includes('zustand')) {
              return 'vendor-core';
            }
            if (id.includes('socket.io-client')) {
              return 'vendor-socket';
            }
            // Group remaining large node_modules into a separate utils chunk
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('lodash')) {
              return 'vendor-utils';
            }
          }
        },
      },
    },
    // Increased from 800 — lucide-react is inherently large at ~146 kB gzipped
    chunkSizeWarningLimit: 1000,
  },
});
