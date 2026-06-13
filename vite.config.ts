import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the build works at any mount point
  // (GitHub Pages serves under /orrery/).
  base: './',
  plugins: [react(), glsl()],
})
