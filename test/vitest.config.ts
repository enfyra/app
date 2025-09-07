import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import vue from '@vitejs/plugin-vue'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [resolve(__dirname, 'helpers/setup.ts')],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      }
    }
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '../app'),
      '@': resolve(__dirname, '../app'),
      '#app': resolve(__dirname, '../.nuxt'),
      '#ui': resolve(__dirname, '../node_modules/@nuxt/ui'),
      '#imports': resolve(__dirname, '../.nuxt/imports.d.ts')
    }
  }
})