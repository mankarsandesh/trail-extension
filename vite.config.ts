import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './public/manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest: manifest as any })],
  build: {
    rollupOptions: {
      input: {
        dashboard: 'src/dashboard/index.html'
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    },
    cors: {
      origin: '*',
      methods: ['GET', 'HEAD', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  }
})
