import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import {
  getRichTextToolbarGroups,
  mergeRichTextEditorConfig,
  normalizeRichTextHtml,
} from '~/utils/form/rich-text-config'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '../../app')

describe('rich text editor config', () => {
  it('merges global and instance formats and actions while replacing instance buttons', () => {
    const globalAction = vi.fn()
    const instanceAction = vi.fn()

    const config = mergeRichTextEditorConfig(
      {
        plugins: ['link', 'lists'],
        customButtons: [{ name: 'global', text: 'Global' }],
        formats: {
          shared: { inline: true, tag: 'span' },
          global: { wrapper: true, tag: 'aside' },
        },
        buttonActions: {
          globalAction,
        },
      },
      {
        customButtons: [{ name: 'instance', text: 'Instance' }],
        formats: {
          shared: { block: true, tag: 'section' },
          instance: { inline: true, tag: 'mark' },
        },
        buttonActions: {
          instanceAction,
        },
      },
    )

    expect(config.plugins).toEqual(['link', 'lists'])
    expect(config.customButtons).toEqual([{ name: 'instance', text: 'Instance' }])
    expect(config.formats).toEqual({
      shared: { block: true, tag: 'section' },
      global: { wrapper: true, tag: 'aside' },
      instance: { inline: true, tag: 'mark' },
    })
    expect(config.buttonActions).toEqual({ globalAction, instanceAction })
  })

  it('uses the Nuxt UI toolbar preset and appends custom buttons when no toolbar is configured', () => {
    const implicit = mergeRichTextEditorConfig({}, {
      customButtons: [
        { name: 'callout', text: 'Callout' },
        { name: 'variable', text: 'Variable' },
      ],
    })
    const explicit = mergeRichTextEditorConfig({}, {
      toolbar: 'bold | callout',
      customButtons: [{ name: 'callout', text: 'Callout' }],
    })

    expect(implicit.toolbar).toBe('undo redo | headings lists blockquote codeblock | bold italic underline strike code | link image table | align | callout variable')
    expect(explicit.toolbar).toBe('bold | callout')
  })

  it('filters toolbar buttons by enabled feature groups', () => {
    const config = mergeRichTextEditorConfig({}, {
      plugins: ['lists'],
      toolbar: 'bold link | bullist numlist | table codeblock image',
    })

    expect(getRichTextToolbarGroups(config)).toEqual([
      ['bold'],
      ['bullist', 'numlist'],
      ['image'],
    ])
  })

  it('keeps the public HTML contract for horizontal rules', () => {
    expect(normalizeRichTextHtml('<p>Before</p><div data-type="horizontalRule"><hr></div><p>After</p>'))
      .toBe('<p>Before</p><hr><p>After</p>')
    expect(normalizeRichTextHtml('<p>Before</p><hr><p>After</p>'))
      .toBe('<p>Before</p><hr><p>After</p>')
  })

  it('styles custom tables without overriding UEditor typography', () => {
    const styles = readFileSync(join(appDir, 'assets/css/main.css'), 'utf8')

    expect(styles).toContain('.rich-text-editor .ProseMirror td,')
    expect(styles).toContain('.rich-text-editor .ProseMirror th {')
    expect(styles).toContain('border: 1px solid var(--border-default);')
    expect(styles).toContain('background: var(--surface-muted);')
    expect(styles).toContain('background-color: var(--column-resize-handle);')
  })

  it('uses the input outline focus treatment and keeps resize support', () => {
    const editor = readFileSync(join(appDir, 'components/form/RichTextEditor.vue'), 'utf8')

    expect(editor).toContain('focus-within:ring-3 focus-within:ring-inset focus-within:ring-primary')
    expect(editor).not.toContain('ring ring-inset ring-accented')
    expect(editor).not.toContain('has-[:focus-visible]:outline-3')
    expect(editor).toContain('@mousedown="handleMouseDown"')
    expect(editor).toContain('h-4 shrink-0 cursor-ns-resize')
    expect(editor).toContain('relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-control)]')
    expect(editor).not.toContain('border-t border-[var(--control-border)]')
    expect(editor).toContain('@mousedown="handleEditorShellMouseDown"')
    expect(editor).toContain('event.preventDefault()')
    expect(editor).toContain('querySelector<HTMLElement>(".ProseMirror")?.focus()')
    expect(editor).toContain("content: 'min-h-0 overflow-y-auto'")
    expect(editor).toContain("base: 'px-4 pt-4 pb-6 sm:px-4'")
    expect(editor).toContain('px-4 py-2')
    expect(editor).toContain('<UEditorToolbar')
    expect(editor).not.toContain('<UEditorDragHandle')
    expect(editor).not.toContain('extension-drag-handle')
    expect(editor).not.toContain('getButtonClass')
  })
})
