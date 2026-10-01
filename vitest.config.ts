import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  resolve: {
    alias: {
      ...Object.fromEntries([
        '@codemirror/view', '@codemirror/state', '@codemirror/language', '@codemirror/lang-javascript',
        '@codemirror/commands', '@codemirror/autocomplete', '@codemirror/lint', '@codemirror/search',
        '@codemirror/lang-vue', '@codemirror/lang-html', '@lezer/common', '@lezer/highlight', '@lezer/lr',
      ].map(name => [name, fileURLToPath(new URL(`./node_modules/${name}/dist/index.js`, import.meta.url))])),
      ...Object.fromEntries(['@uiw/codemirror-theme-vscode', '@uiw/codemirror-themes'].map(name => [name, fileURLToPath(new URL(`./node_modules/${name}/esm/index.js`, import.meta.url))])),
    },
  },
  vite: {
    ssr: {
      noExternal: ['@material/material-color-utilities', /@codemirror\//, /@lezer\//, /@uiw\/codemirror/],
    },
  },
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.kilo/**', 'tests/transport/**'],
    server: {
      deps: {
        inline: ['@material/material-color-utilities', /@codemirror\//, /@lezer\//, /@uiw\/codemirror/],
      },
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
})
