import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Demo dev server. Library proper builds via `tsc` for type emission;
// this Vite config is only for the `demo/` playground that shows the
// decoder running on a few real-world SVGs.
export default defineConfig({
  plugins: [react()],
  root: 'demo',
  publicDir: '../fixtures',
  server: {
    port: 5180,
  },
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
})
