import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('ProseMirror runtime dependencies', () => {
  it('does not declare the optional drag and collaboration stack directly', () => {
    const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
    }

    for (const packageName of [
      '@tiptap/extension-collaboration',
      '@tiptap/extension-node-range',
      '@tiptap/extension-drag-handle',
      '@tiptap/extension-drag-handle-vue-3',
      '@tiptap/y-tiptap',
      'y-protocols',
      'yjs',
    ]) {
      expect(packageJson.dependencies, packageName).not.toHaveProperty(packageName)
    }
  })

  it('keeps stateful ProseMirror packages on one lockfile resolution each', () => {
    const lockfile = readFileSync(join(rootDir, 'yarn.lock'), 'utf8')

    for (const packageName of [
      'prosemirror-model',
      'prosemirror-transform',
      'prosemirror-view',
    ]) {
      const entries = lockfile.match(new RegExp(`^"?${packageName}@npm:`, 'gm')) ?? []
      expect(entries, packageName).toHaveLength(1)
    }
  })

  it('prebundles the UEditor engine and Enfyra extensions in one Vite graph', () => {
    const config = readFileSync(join(rootDir, 'nuxt.config.ts'), 'utf8')

    for (const packageName of [
      '@tiptap/core',
      '@tiptap/starter-kit',
      '@tiptap/vue-3',
      '@tiptap/extension-code-block',
      '@tiptap/extension-code-block-lowlight',
      '@tiptap/extension-text-align',
      '@tiptap/extension-table',
    ]) {
      expect(config, packageName).toContain(`'${packageName}'`)
    }
    expect(config).not.toMatch(/include:\s*\[[\s\S]*?'@tiptap\/pm'/)
  })
})
