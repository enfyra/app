import { describe, expect, it } from 'vitest'
import { detectPackages, getGlobalNameForPackage } from '~/composables/dynamic/packages'

describe('dynamic package helpers', () => {
  it('detects packages from getPackages usage and import statements', () => {
    const code = `
      import { debounce } from "lodash-es"
      import { ref } from "vue"
      import type { Editor } from "@tiptap/core"
      import "./local.css"
      const pkg = await import("dayjs")
      const direct = await getPackages(["marked", "@tiptap/vue-3"])
      const { zod, "bad": ignored } = await getPackages()
      const packages = await getPackages()
      packages["date-fns"].format(new Date(), "yyyy")
      packages.nanoid.nanoid()
    `

    expect(detectPackages(code)).toEqual([
      'marked',
      '@tiptap/vue-3',
      'zod',
      'bad',
      'date-fns',
      'nanoid',
      'lodash-es',
      'dayjs',
    ])
  })

  it('creates browser-safe global names for scoped packages', () => {
    expect(getGlobalNameForPackage('@tiptap/vue-3')).toBe('_tiptap_vue_3')
    expect(getGlobalNameForPackage('3d-force-graph')).toBe('_3d_force_graph')
  })
})
