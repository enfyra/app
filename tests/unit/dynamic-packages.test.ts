import { describe, expect, it } from 'vitest'
import { detectPackages, getGlobalNameForPackage } from '~/composables/dynamic/packages'
import {
  createPackageRegistry,
  getCanonicalPackage,
  setPackageValue,
} from '~/utils/dynamic-package-registry'

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

  it('never resolves inherited object properties as packages', () => {
    const registry = createPackageRegistry()

    expect(getCanonicalPackage(registry, 'constructor')).toBeUndefined()
    expect(Object.getPrototypeOf(registry)).toBeNull()
  })

  it('rejects colliding browser aliases', () => {
    const registry = createPackageRegistry()
    setPackageValue(registry, 'foo-bar', { source: 'first' })

    expect(() =>
      setPackageValue(registry, 'foo/bar', { source: 'second' }),
    ).toThrow('Package alias collision')
  })

  it('represents a valid null default export', () => {
    const registry = createPackageRegistry()
    setPackageValue(registry, 'null-package', null)

    expect(Object.hasOwn(registry, 'null-package')).toBe(true)
    expect(getCanonicalPackage(registry, 'null-package')).toBeNull()
  })
})
