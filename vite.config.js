import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  // Needed for FFmpeg WASM: SharedArrayBuffer requires COOP/COEP headers
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/cf-api': {
        target: 'https://api.cloudflare.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/cf-api/, '')
      }
    }
  },
  // Optimize large WASM dependencies
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
});

