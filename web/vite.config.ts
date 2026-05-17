import { resolve } from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repoRoot = resolve(import.meta.dirname, '..')

export default defineConfig({
  base: '/',
  plugins: [tailwindcss(), react()],
  publicDir: resolve(import.meta.dirname, '../fixtures'),
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      vectx: resolve(import.meta.dirname, '../src/index.ts'),
    },
  },
  server: {
    port: 5180,
    fs: {
      // research notes + playgrounds live at <repo>/.claude/researches/,
      // outside web/'s default fs root. allow vite to read them.
      allow: [repoRoot],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
