import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function surfaceClasses(file: string, marker: string) {
  const source = readFileSync(join(appDir, 'components/table', file), 'utf8')
  const tag = source.match(/<div\b[^>]*>/g)?.find(element => element.includes(marker))
  expect(tag, `${file}: ${marker}`).toBeDefined()
  return tag!.match(/\bclass="([^"]*)"/)![1]!.split(/\s+/)
}

describe('schema field surfaces', () => {
  it.each([
    ['Columns.vue', 'v-if="!isDesktop && displayColumns.length"'],
    ['Columns.vue', 'v-for="(column, index) in displayColumns"'],
    ['Relations.vue', 'v-if="!isDesktop && relations.length"'],
    ['Relations.vue', 'v-for="(rel, index) in relations"'],
    ['Relations.vue', 'v-if="!isDesktop && incomingRelations.length"'],
    ['Relations.vue', 'v-for="incoming in incomingRelations"'],
  ])('matches native input tint and outline for %s %s', (file, marker) => {
    const classes = surfaceClasses(file, marker)
    expect(classes).toContain('bg-[var(--control-bg)]')
    expect(classes).toContain('border-[var(--control-border)]')
    expect(classes).toContain('rounded-[var(--radius-control)]')
    expect(classes).toContain('shadow-theme-xs')
    expect(classes).not.toContain('bg-default')
    expect(classes).not.toContain('border-default')
    expect(classes).not.toContain('border-[var(--border-default)]')
    expect(classes).not.toContain('hover:bg-[var(--surface-muted)]')
    expect(classes).not.toContain('opacity-60')
  })

  it('retains dashed incoming-relation boundaries on both layouts', () => {
    for (const marker of ['v-if="!isDesktop && incomingRelations.length"', 'v-for="incoming in incomingRelations"']) {
      expect(surfaceClasses('Relations.vue', marker)).toContain('border-dashed')
    }
  })
})
