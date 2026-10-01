import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import RichTextEditor from '~/components/form/RichTextEditor.vue'

describe('RichTextEditor', () => {
  it('previews the bordered editor body while committing the total height including its resize handle', async () => {
    const wrapper = await mountSuspended(RichTextEditor, {
      props: { modelValue: '<p>Content</p>', height: 300 }, attachTo: document.body,
      global: { stubs: { UEditorToolbar: true, FormRichTextPromptModal: true } },
    })
    try {
      const body = wrapper.get('.rich-text-editor').element as HTMLElement
      const container = body.parentElement!
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(40, 100, 600, 300))
      vi.spyOn(body, 'getBoundingClientRect').mockReturnValue(new DOMRect(45, 110, 590, 284))
      await wrapper.get('[data-resize-handle]').trigger('mousedown', { clientY: 100 })
      const preview = () => document.querySelector<HTMLElement>('.fixed.border-dashed')!
      expect(preview().style.top).toBe('110px')
      expect(preview().style.left).toBe('45px')
      expect(preview().style.width).toBe('590px')
      expect(preview().style.height).toBe('284px')
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 0 }))
      await nextTick()
      expect(preview().style.height).toBe('284px')
      document.dispatchEvent(new MouseEvent('mousemove', { clientY: 180 }))
      await nextTick()
      expect(preview().style.height).toBe('364px')
      document.dispatchEvent(new MouseEvent('mouseup', { clientY: 180 }))
      await nextTick()
      expect(container.style.height).toBe('380px')
      expect(document.querySelector('.fixed.border-dashed')).toBeNull()
      expect(wrapper.get('.ProseMirror').text()).toContain('Content')
    } finally { wrapper.unmount() }
  })

  it('inserts a resizable table without a ProseMirror decoration error', async () => {
    const wrapper = await mountSuspended(RichTextEditor, {
      props: {
        modelValue: '',
        height: 300,
      },
      attachTo: document.body,
      global: {
        stubs: {
          UEditorToolbar: true,
          FormRichTextPromptModal: true,
        },
      },
    })

    const editorComponent = wrapper.findComponent({ name: 'UEditor' })
    const editor = (editorComponent.vm as unknown as {
      editor?: {
        chain(): {
          focus(): {
            insertTable(options: { rows: number, cols: number, withHeaderRow: boolean }): {
              run(): boolean
            }
          }
        }
      }
    }).editor

    expect(editor).toBeDefined()
    expect(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())
      .not.toThrow()
    expect(wrapper.findAll('.ProseMirror table').length).toBe(1)
    expect(wrapper.findAll('.ProseMirror th').length).toBe(3)
    expect(wrapper.findAll('.ProseMirror td').length).toBe(6)

    wrapper.unmount()
  })

  it('focuses the editor from the field shell and accepts a new paragraph', async () => {
    const wrapper = await mountSuspended(RichTextEditor, {
      props: {
        modelValue: '',
        height: 300,
        id: 'field-content',
        class: 'w-full',
        placeholder: 'Content',
      },
      attachTo: document.body,
      global: {
        stubs: {
          UEditorToolbar: true,
          FormRichTextPromptModal: true,
        },
      },
    })

    expect(wrapper.attributes('id')).toBe('field-content')
    expect(wrapper.classes()).toContain('w-full')
    expect(wrapper.get('.ProseMirror p').attributes('data-placeholder')).toBe('Content')

    const shell = wrapper.get('.rich-text-editor')
    await shell.trigger('mousedown')

    const editor = wrapper.get('.ProseMirror')
    expect(document.activeElement).toBe(editor.element)

    await editor.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeDefined()

    wrapper.unmount()
  })
})
