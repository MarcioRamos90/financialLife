/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
  server: {
    host: '0.0.0.0',   // required for Docker
    port: 5173,
    proxy: {
      // Proxy /api calls to the Go backend during development
      '/api': {
        target: 'http://api:8080',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://api:8080',
        changeOrigin: true,
      },
    },
  },
})
