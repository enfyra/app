import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  vite: {
    ssr: {
      noExternal: ['@material/material-color-utilities'],
    },
  },
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.kilo/**', 'tests/transport/**'],
    server: {
      deps: {
        inline: ['@material/material-color-utilities'],
      },
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
