import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to './' so the build works on GitHub Pages or any static host
// served from a subpath.
export default defineConfig({
  base: './',
  plugins: [react()],
})
