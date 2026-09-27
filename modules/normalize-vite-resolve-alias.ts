import { defineNuxtModule } from '@nuxt/kit'
import type { ViteConfig } from 'nuxt/schema'

export default defineNuxtModule({
  meta: { name: 'normalize-vite-resolve-alias' },
  setup(_options, nuxt) {
    nuxt.hook('imports:extend', (imports) => {
      for (const entry of imports) {
        // The published package registers a .ts path but ships this composable as .js.
        if (entry.name === 'useNuxtCodeMirror' && entry.from.endsWith('/nuxt-codemirror/dist/runtime/composables/useNuxtCodeMirror.ts')) {
          entry.from = entry.from.replace(/\.ts$/, '.js')
        }
      }
    })
    nuxt.hook('vite:extendConfig', (config: ViteConfig) => {
      const alias = config.resolve?.alias
      if (!Array.isArray(alias)) return
      if (alias.some(entry => typeof entry.find !== 'string' || entry.customResolver)) return
      if (new Set(alias.map(entry => entry.find)).size !== alias.length) return

      // Nuxt's test resolver merges aliases as an object; retain richer Vite entries intact.
      config.resolve = config.resolve ?? {}
      config.resolve.alias = Object.fromEntries(
        alias.map(entry => [entry.find, entry.replacement]),
      )
    })
  },
})
