import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

function readAppFile(path: string) {
  return readFileSync(join(appDir, path), 'utf8')
}

function stripCoarseScopedTargets(content: string) {
  return content.replace(/pointer-coarse:!?min-[hw]-\[44px\]/g, '')
}

const compactComponents = [
  'components/form/MethodSelector.vue',
  'components/file/grid/FileGridCard.vue',
  'components/file/grid/FileGridEditableName.vue',
  'components/folder/grid/Card.vue',
  'components/folder/grid/EditableName.vue',
  'components/filter/DatePicker.vue',
  'components/filter/SavedFilters.vue',
  'components/form/permission/Group.vue',
  'components/form/permission/RoutePicker.vue',
  'components/guard/TreeNode.vue',
  'components/log/LogDetailViewer.vue',
  'components/menu/MenuVisualEditorItem.vue',
  'components/permission/PermissionManager.vue',
  'components/column-rule/ManageModal.vue',
  'components/field-permission/ManageModal.vue',
  'components/table/Columns.vue',
  'components/table/Constraints.vue',
  'components/table/Relations.vue',
  'pages/settings/guards/[id].vue',
  'pages/settings/runtime.vue',
]

describe('touch target scoping', () => {
  it('keeps 44px touch targets scoped to coarse pointers so desktop stays compact', () => {
    for (const path of compactComponents) {
      const content = stripCoarseScopedTargets(readAppFile(path))
      expect(content, `${path} must not use unconditional 44px targets`).not.toMatch(/min-[hw]-\[44px\]/)
    }
  })

  it('keeps method chips compact on desktop with 44px only on coarse pointers', () => {
    const selector = readAppFile('components/form/MethodSelector.vue')
    expect(selector).toContain('inline-flex h-7 items-center')
    expect(selector).toContain('pointer-coarse:h-11')
    expect(selector).toContain('!size-7')
    expect(selector).toContain('pointer-coarse:!size-11')
  })

  it('keeps menu editor rows compact on desktop with 44px handles only on coarse pointers', () => {
    const item = readAppFile('components/menu/MenuVisualEditorItem.vue')
    expect(item).toContain('grid-template-columns: auto 36px minmax(220px, 1fr) auto;')
    expect(item).toContain('grid-template-columns: auto 32px minmax(180px, 1fr) auto;')
    expect(item).toContain('@media (pointer: coarse)')
  })

  it('aligns menu visual editor rows and nested children with the skeleton geometry', () => {
    const editor = readAppFile('components/menu/MenuVisualEditor.vue')
    const item = readAppFile('components/menu/MenuVisualEditorItem.vue')

    expect(editor).toContain('class="menu-visual-skeleton-node"')
    expect(editor).toContain('class="menu-visual-skeleton-item"')
    expect(editor).toContain('.menu-visual-skeleton-children')
    expect(item).toContain('class="menu-row-lead"')
    expect(item).toContain('class="menu-row-subtitle"')
    expect(item).toContain('.menu-editor-row.is-child')
    expect(item).toContain('background: var(--surface-muted);')
    expect(item).toContain('margin-left: 28px;')
    expect(item).toContain('border-left: 1px solid var(--border-subtle);')
    expect(item).toContain('padding-left: 12px;')
  })
})
