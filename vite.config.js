import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so the static build works from any path (GitHub Pages, Vercel, etc.)
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  }
})
