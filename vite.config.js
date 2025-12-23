import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8081,
    strictPort: true,
    fs: {
      // Allow serving files from Google Drive path
      strict: false
    }
  },
  preview: {
    port: 8081,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})

